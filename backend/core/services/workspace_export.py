"""Workspace export/import services."""
import uuid
from datetime import datetime

from core.models import Workspace
from collections_app.models import Collection, Folder, Request
from environments_app.models import Environment, EnvironmentVariable
from mcp_app.models import McpServer
from workflows_app.models import Workflow


class WorkspaceExportService:
    """Exports an entire workspace to a JSON-serializable dict."""

    def __init__(self, workspace, include_collections=True, include_environments=True,
                 include_mcp_servers=True, include_workflows=True):
        self.workspace = workspace
        self.include_collections = include_collections
        self.include_environments = include_environments
        self.include_mcp_servers = include_mcp_servers
        self.include_workflows = include_workflows

    def export(self):
        return {
            '_postai_format': True,
            '_postai_version': '1.0',
            '_postai_type': 'workspace',
            '_exported_at': datetime.utcnow().isoformat() + 'Z',
            'workspace': {
                'name': self.workspace.name,
                'description': self.workspace.description,
            },
            'collections': self._export_collections() if self.include_collections else [],
            'environments': self._export_global_environments() if self.include_environments else [],
            'mcp_servers': self._export_mcp_servers() if self.include_mcp_servers else [],
            'workflows': self._export_workflows() if self.include_workflows else [],
        }

    def _export_global_environments(self):
        envs = Environment.objects.filter(
            workspace=self.workspace, collection__isnull=True
        ).prefetch_related('variables')
        return [self._export_environment(env) for env in envs]

    def _export_environment(self, env):
        return {
            'id': str(env.id),
            'name': env.name,
            'description': env.description or '',
            'is_active': env.is_active,
            'values': [
                {
                    'key': v.key,
                    'values': v.values or [],
                    'selected_value_index': v.selected_value_index or 0,
                    'enabled': v.enabled,
                    'is_secret': v.is_secret,
                    'link_group': v.link_group,
                }
                for v in env.variables.all()
            ],
        }

    def _export_collections(self):
        collections = Collection.objects.filter(
            workspace=self.workspace
        ).prefetch_related(
            'folders', 'folders__subfolders', 'folders__requests',
            'requests', 'environments', 'environments__variables',
        )
        return [self._export_collection(c) for c in collections]

    def _export_collection(self, collection):
        data = {
            'id': str(collection.id),
            'name': collection.name,
            'description': collection.description or '',
            'variables': collection.variables or [],
            'auth': collection.auth,
            'pre_request_script': collection.pre_request_script or '',
            'test_script': collection.test_script or '',
            'active_environment_ref': str(collection.active_environment_id) if collection.active_environment_id else None,
            'items': self._export_items(collection),
            'environments': [
                self._export_environment(env)
                for env in collection.environments.all()
            ],
        }
        return data

    def _export_items(self, collection):
        items = []
        for folder in collection.folders.filter(parent__isnull=True):
            items.append(self._export_folder(folder))
        for req in collection.requests.filter(folder__isnull=True):
            items.append(self._export_request(req))
        return items

    def _export_folder(self, folder):
        item = {
            'type': 'folder',
            'id': str(folder.id),
            'name': folder.name,
            'description': folder.description or '',
            'auth': folder.auth,
            'pre_request_script': folder.pre_request_script or '',
            'test_script': folder.test_script or '',
            'order': folder.order,
            'items': [],
        }
        for subfolder in folder.subfolders.all():
            item['items'].append(self._export_folder(subfolder))
        for req in folder.requests.all():
            item['items'].append(self._export_request(req))
        return item

    def _export_request(self, req):
        return {
            'type': 'request',
            'id': str(req.id),
            'name': req.name,
            'description': req.description or '',
            'method': req.method,
            'url': req.url,
            'headers': req.headers or [],
            'params': req.params or [],
            'body': req.body,
            'auth': req.auth,
            'pre_request_script': req.pre_request_script or '',
            'test_script': req.test_script or '',
            'order': req.order,
        }

    def _export_mcp_servers(self):
        servers = McpServer.objects.filter(workspace=self.workspace)
        return [
            {
                'name': s.name,
                'description': s.description or '',
                'transport_type': s.transport_type,
                'command': s.command or '',
                'args': s.args or [],
                'url': s.url or '',
                'headers': s.headers or {},
                'env_vars': s.env_vars or {},
            }
            for s in servers
        ]

    def _export_workflows(self):
        workflows = Workflow.objects.filter(workspace=self.workspace)
        return [
            {
                'id': str(w.id),
                'name': w.name,
                'description': w.description or '',
                'nodes': w.nodes or [],
                'edges': w.edges or [],
                'viewport': w.viewport or {},
                'variables': w.variables or {},
            }
            for w in workflows
        ]


class WorkspaceImportService:
    """Imports a workspace from exported JSON data."""

    def __init__(self, data, target_workspace=None):
        self.data = data
        self.target_workspace = target_workspace
        self.id_map = {}  # old_uuid_str -> new_uuid

    def execute(self):
        # Validate format
        if not self.data.get('_postai_format') or self.data.get('_postai_type') != 'workspace':
            raise ValueError('Invalid workspace export format')

        # Create workspace
        ws_data = self.data.get('workspace', {})
        if self.target_workspace:
            workspace = self.target_workspace
        else:
            workspace = Workspace.objects.create(
                name=ws_data.get('name', 'Imported Workspace') + ' (Copy)',
                description=ws_data.get('description', ''),
            )

        # Import order matters: global envs, then collections (with scoped envs), then MCP, then workflows
        self._import_global_environments(workspace)
        self._import_collections(workspace)
        self._import_mcp_servers(workspace)
        self._import_workflows(workspace)

        return workspace

    def _import_global_environments(self, workspace):
        for env_data in self.data.get('environments', []):
            self._import_environment(env_data, workspace, collection=None)

    def _import_environment(self, env_data, workspace, collection):
        old_id = env_data.get('id')
        env = Environment.objects.create(
            workspace=workspace,
            collection=collection,
            name=env_data.get('name', ''),
            description=env_data.get('description', ''),
            is_active=env_data.get('is_active', False),
        )
        if old_id:
            self.id_map[old_id] = env.id

        for var_data in env_data.get('values', []):
            EnvironmentVariable.objects.create(
                environment=env,
                key=var_data.get('key', ''),
                values=var_data.get('values', []),
                selected_value_index=var_data.get('selected_value_index', 0),
                enabled=var_data.get('enabled', True),
                is_secret=var_data.get('is_secret', False),
                link_group=var_data.get('link_group'),
            )
        return env

    def _import_collections(self, workspace):
        for col_data in self.data.get('collections', []):
            old_id = col_data.get('id')
            collection = Collection.objects.create(
                workspace=workspace,
                name=col_data.get('name', ''),
                description=col_data.get('description', ''),
                variables=col_data.get('variables', []),
                auth=col_data.get('auth'),
                pre_request_script=col_data.get('pre_request_script', ''),
                test_script=col_data.get('test_script', ''),
            )
            if old_id:
                self.id_map[old_id] = collection.id

            # Import collection-scoped environments
            for env_data in col_data.get('environments', []):
                self._import_environment(env_data, workspace, collection=collection)

            # Set active environment ref after environments are imported
            active_env_ref = col_data.get('active_environment_ref')
            if active_env_ref and active_env_ref in self.id_map:
                collection.active_environment_id = self.id_map[active_env_ref]
                collection.save()

            # Import items (folders and requests)
            self._import_items(col_data.get('items', []), collection, parent_folder=None)

    def _import_items(self, items, collection, parent_folder):
        for item_data in items:
            if item_data.get('type') == 'folder':
                self._import_folder(item_data, collection, parent_folder)
            elif item_data.get('type') == 'request':
                self._import_request(item_data, collection, parent_folder)

    def _import_folder(self, folder_data, collection, parent_folder):
        old_id = folder_data.get('id')
        folder = Folder.objects.create(
            collection=collection,
            parent=parent_folder,
            name=folder_data.get('name', ''),
            description=folder_data.get('description', ''),
            auth=folder_data.get('auth'),
            pre_request_script=folder_data.get('pre_request_script', ''),
            test_script=folder_data.get('test_script', ''),
            order=folder_data.get('order', 0),
        )
        if old_id:
            self.id_map[old_id] = folder.id
        self._import_items(folder_data.get('items', []), collection, parent_folder=folder)

    def _import_request(self, req_data, collection, parent_folder):
        old_id = req_data.get('id')
        req = Request.objects.create(
            collection=collection,
            folder=parent_folder,
            name=req_data.get('name', ''),
            description=req_data.get('description', ''),
            method=req_data.get('method', 'GET'),
            url=req_data.get('url', ''),
            headers=req_data.get('headers', []),
            params=req_data.get('params', []),
            body=req_data.get('body'),
            auth=req_data.get('auth'),
            pre_request_script=req_data.get('pre_request_script', ''),
            test_script=req_data.get('test_script', ''),
            order=req_data.get('order', 0),
        )
        if old_id:
            self.id_map[old_id] = req.id

    def _import_mcp_servers(self, workspace):
        for s_data in self.data.get('mcp_servers', []):
            McpServer.objects.create(
                workspace=workspace,
                name=s_data.get('name', ''),
                description=s_data.get('description', ''),
                transport_type=s_data.get('transport_type', 'stdio'),
                command=s_data.get('command', ''),
                args=s_data.get('args', []),
                url=s_data.get('url', ''),
                headers=s_data.get('headers', {}),
                env_vars=s_data.get('env_vars', {}),
            )

    def _import_workflows(self, workspace):
        for w_data in self.data.get('workflows', []):
            old_id = w_data.get('id')
            nodes = self._remap_workflow_nodes(w_data.get('nodes', []))
            workflow = Workflow.objects.create(
                workspace=workspace,
                name=w_data.get('name', ''),
                description=w_data.get('description', ''),
                nodes=nodes,
                edges=w_data.get('edges', []),
                viewport=w_data.get('viewport', {}),
                variables=w_data.get('variables', {}),
            )
            if old_id:
                self.id_map[old_id] = workflow.id

    def _remap_workflow_nodes(self, nodes):
        """Remap requestId and collectionId references in workflow nodes."""
        remapped = []
        for node in nodes:
            node = dict(node)  # shallow copy
            data = node.get('data')
            if data and isinstance(data, dict):
                data = dict(data)
                for key in ('requestId', 'collectionId'):
                    old_ref = data.get(key)
                    if old_ref and old_ref in self.id_map:
                        data[key] = str(self.id_map[old_ref])
                node['data'] = data
            remapped.append(node)
        return remapped
