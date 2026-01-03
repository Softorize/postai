"""Postman collection importer for PostAI.

Supports Postman Collection Format v2.0 and v2.1.
Reference: https://schema.postman.com/collection/json/v2.1.0/draft-07/docs/index.html
"""
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from ..models import Collection, Folder, Request
from core.models import Workspace


@dataclass
class ImportResult:
    """Result of import operation."""
    success: bool
    collection_id: Optional[str] = None
    requests_imported: int = 0
    folders_imported: int = 0
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


class PostmanImporter:
    """Import Postman collections (v2.0 and v2.1 format)."""

    SUPPORTED_VERSIONS = ['v2.0.0', 'v2.1.0', '2.0.0', '2.1.0']

    def __init__(self):
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.requests_count = 0
        self.folders_count = 0

    def import_collection(self, data: Dict[str, Any], workspace: Optional[Workspace] = None) -> ImportResult:
        """Import a Postman collection from JSON data."""
        try:
            # Validate schema version
            info = data.get('info', {})
            schema = info.get('schema', '')

            if not self._is_supported_version(schema):
                return ImportResult(
                    success=False,
                    errors=[f"Unsupported schema version: {schema}. Supported: {self.SUPPORTED_VERSIONS}"]
                )

            # Get workspace - use provided or get default
            if workspace is None:
                workspace = Workspace.get_or_create_default()

            # Create collection
            collection = Collection.objects.create(
                name=info.get('name', 'Imported Collection'),
                description=self._get_description(info.get('description')),
                workspace=workspace,
                postman_id=info.get('_postman_id'),
                schema_version=self._extract_version(schema),
                variables=self._convert_variables(data.get('variable', [])),
                auth=self._convert_auth(data.get('auth')),
                pre_request_script=self._extract_script(data.get('event', []), 'prerequest'),
                test_script=self._extract_script(data.get('event', []), 'test')
            )

            # Process items (folders and requests)
            self._process_items(
                items=data.get('item', []),
                collection=collection,
                parent_folder=None
            )

            return ImportResult(
                success=True,
                collection_id=str(collection.id),
                requests_imported=self.requests_count,
                folders_imported=self.folders_count,
                warnings=self.warnings if self.warnings else []
            )

        except Exception as e:
            return ImportResult(
                success=False,
                errors=[str(e)]
            )

    def _process_items(
        self,
        items: List[Dict],
        collection: Collection,
        parent_folder: Optional[Folder]
    ):
        """Recursively process items (can be folders or requests)."""
        for idx, item in enumerate(items):
            if 'item' in item:
                # This is a folder
                folder = self._create_folder(item, collection, parent_folder, idx)
                self.folders_count += 1
                # Recursively process folder contents
                self._process_items(item['item'], collection, folder)
            else:
                # This is a request
                self._create_request(item, collection, parent_folder, idx)
                self.requests_count += 1

    def _create_folder(
        self,
        item: Dict,
        collection: Collection,
        parent: Optional[Folder],
        order: int
    ) -> Folder:
        """Create a folder from Postman item."""
        return Folder.objects.create(
            collection=collection,
            parent=parent,
            name=item.get('name', 'Unnamed Folder'),
            description=self._get_description(item.get('description')),
            auth=self._convert_auth(item.get('auth')),
            pre_request_script=self._extract_script(item.get('event', []), 'prerequest'),
            test_script=self._extract_script(item.get('event', []), 'test'),
            order=order
        )

    def _create_request(
        self,
        item: Dict,
        collection: Collection,
        folder: Optional[Folder],
        order: int
    ) -> Request:
        """Create a request from Postman item."""
        request_data = item.get('request', {})

        # Handle string request (just URL)
        if isinstance(request_data, str):
            request_data = {'url': request_data, 'method': 'GET'}

        # Handle URL (can be string or object)
        url = request_data.get('url', '')
        if isinstance(url, dict):
            raw_url = url.get('raw', '')
            params = self._convert_query_params(url.get('query', []))
        else:
            raw_url = url
            params = []

        return Request.objects.create(
            collection=collection,
            folder=folder,
            name=item.get('name', 'Unnamed Request'),
            description=self._get_description(request_data.get('description')),
            method=request_data.get('method', 'GET'),
            url=raw_url,
            headers=self._convert_headers(request_data.get('header', [])),
            params=params,
            body=self._convert_body(request_data.get('body')),
            auth=self._convert_auth(request_data.get('auth')),
            pre_request_script=self._extract_script(item.get('event', []), 'prerequest'),
            test_script=self._extract_script(item.get('event', []), 'test'),
            order=order
        )

    def _get_description(self, desc) -> str:
        """Extract description from various formats."""
        if not desc:
            return ''
        if isinstance(desc, str):
            return desc
        if isinstance(desc, dict):
            return desc.get('content', '')
        return ''

    def _convert_headers(self, headers: List[Dict]) -> List[Dict]:
        """Convert Postman headers to internal format."""
        if not headers:
            return []
        return [
            {
                'key': h.get('key', ''),
                'value': h.get('value', ''),
                'enabled': not h.get('disabled', False),
                'description': self._get_description(h.get('description'))
            }
            for h in headers
            if isinstance(h, dict)
        ]

    def _convert_query_params(self, params: List[Dict]) -> List[Dict]:
        """Convert Postman query params to internal format."""
        if not params:
            return []
        return [
            {
                'key': p.get('key', ''),
                'value': p.get('value', ''),
                'enabled': not p.get('disabled', False),
                'description': self._get_description(p.get('description'))
            }
            for p in params
            if isinstance(p, dict)
        ]

    def _convert_body(self, body: Optional[Dict]) -> Optional[Dict]:
        """Convert Postman body to internal format."""
        if not body:
            return None

        mode = body.get('mode', 'raw')
        result = {'mode': mode}

        if mode == 'raw':
            result['raw'] = body.get('raw', '')
            options = body.get('options', {})
            if 'raw' in options:
                result['language'] = options['raw'].get('language', 'json')

        elif mode == 'formdata':
            result['formdata'] = [
                {
                    'key': f.get('key', ''),
                    'value': f.get('value', ''),
                    'type': f.get('type', 'text'),
                    'enabled': not f.get('disabled', False)
                }
                for f in body.get('formdata', [])
                if isinstance(f, dict)
            ]

        elif mode == 'urlencoded':
            result['urlencoded'] = [
                {
                    'key': u.get('key', ''),
                    'value': u.get('value', ''),
                    'enabled': not u.get('disabled', False)
                }
                for u in body.get('urlencoded', [])
                if isinstance(u, dict)
            ]

        elif mode == 'graphql':
            graphql = body.get('graphql', {})
            result['graphql'] = {
                'query': graphql.get('query', ''),
                'variables': graphql.get('variables', '')
            }

        elif mode == 'file':
            self.warnings.append("File upload body mode not fully supported")
            result['raw'] = ''

        return result

    def _convert_auth(self, auth: Optional[Dict]) -> Optional[Dict]:
        """Convert Postman auth to internal format."""
        if not auth:
            return None

        auth_type = auth.get('type', 'noauth')

        if auth_type == 'noauth':
            return None

        result = {'type': auth_type}

        # Auth data can be in an array with key-value pairs
        auth_data = auth.get(auth_type, [])
        if isinstance(auth_data, list):
            for item in auth_data:
                if isinstance(item, dict):
                    key = item.get('key')
                    value = item.get('value')
                    if key:
                        result[key] = value

        # Map to our internal format
        if auth_type == 'basic':
            result = {
                'type': 'basic',
                'basic': {
                    'username': result.get('username', ''),
                    'password': result.get('password', '')
                }
            }
        elif auth_type == 'bearer':
            result = {
                'type': 'bearer',
                'bearer': {
                    'token': result.get('token', '')
                }
            }
        elif auth_type == 'apikey':
            result = {
                'type': 'apikey',
                'apikey': {
                    'key': result.get('key', ''),
                    'value': result.get('value', ''),
                    'in': result.get('in', 'header')
                }
            }
        elif auth_type == 'oauth2':
            result = {
                'type': 'oauth2',
                'oauth2': {
                    'accessTokenUrl': result.get('accessTokenUrl', ''),
                    'clientId': result.get('clientId', ''),
                    'clientSecret': result.get('clientSecret', ''),
                    'scope': result.get('scope', ''),
                    'grantType': result.get('grant_type', 'authorization_code')
                }
            }
        else:
            self.warnings.append(f"Auth type '{auth_type}' may not be fully supported")

        return result

    def _convert_variables(self, variables: List[Dict]) -> List[Dict]:
        """Convert Postman variables to internal format."""
        if not variables:
            return []
        return [
            {
                'key': v.get('key', ''),
                'value': v.get('value', ''),
                'type': v.get('type', 'string'),
                'description': self._get_description(v.get('description'))
            }
            for v in variables
            if isinstance(v, dict)
        ]

    def _extract_script(self, events: List[Dict], event_type: str) -> str:
        """Extract script from Postman events."""
        if not events:
            return ''
        for event in events:
            if isinstance(event, dict) and event.get('listen') == event_type:
                script = event.get('script', {})
                exec_lines = script.get('exec', [])
                if isinstance(exec_lines, list):
                    return '\n'.join(exec_lines)
                return exec_lines or ''
        return ''

    def _is_supported_version(self, schema: str) -> bool:
        """Check if schema version is supported."""
        if not schema:
            # Allow import without schema (try anyway)
            self.warnings.append("No schema version found, attempting import anyway")
            return True
        for version in self.SUPPORTED_VERSIONS:
            if version in schema:
                return True
        return False

    def _extract_version(self, schema: str) -> str:
        """Extract version from schema URL."""
        for version in self.SUPPORTED_VERSIONS:
            if version in schema:
                return version.replace('.0', '') if version.startswith('v') else f"v{version}"
        return 'v2.1.0'


def import_postman_file(file_content: str, workspace: Optional[Workspace] = None) -> ImportResult:
    """Import Postman collection from file content."""
    try:
        data = json.loads(file_content)
        importer = PostmanImporter()
        return importer.import_collection(data, workspace)
    except json.JSONDecodeError as e:
        return ImportResult(success=False, errors=[f"Invalid JSON: {str(e)}"])


def import_postman_environment(file_content: str) -> Dict[str, Any]:
    """Import Postman environment file.

    Returns dict with environment data to be created.
    """
    try:
        data = json.loads(file_content)

        name = data.get('name', 'Imported Environment')
        values = data.get('values', [])

        # Convert to our multi-value format
        variables = []
        for v in values:
            if isinstance(v, dict) and v.get('key'):
                variables.append({
                    'key': v.get('key'),
                    'values': [v.get('value', '')],  # Single value as array
                    'selected_value_index': 0,
                    'enabled': v.get('enabled', True),
                    'is_secret': v.get('type') == 'secret'
                })

        return {
            'success': True,
            'name': name,
            'variables': variables
        }

    except json.JSONDecodeError as e:
        return {'success': False, 'error': f"Invalid JSON: {str(e)}"}
