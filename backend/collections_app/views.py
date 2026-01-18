"""Collection views for PostAI."""
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import Workspace
from .models import Collection, Folder, Request
from .serializers import (
    CollectionSerializer,
    CollectionCreateSerializer,
    FolderSerializer,
    RequestSerializer,
)
from .services.postman_importer import import_postman_file, import_postman_environment
from environments_app.models import Environment
from environments_app.serializers import EnvironmentSerializer


class CollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for Collection CRUD operations."""
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer

    def get_queryset(self):
        """Filter collections by workspace if specified."""
        queryset = Collection.objects.all()
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return CollectionCreateSerializer
        return CollectionSerializer

    def perform_create(self, serializer):
        """Assign collection to active workspace."""
        workspace = Workspace.get_or_create_default()
        serializer.save(workspace=workspace)

    @action(detail=False, methods=['post'], url_path='import')
    def import_collection(self, request):
        """Import a Postman collection from JSON."""
        # Get file content from request
        file_content = request.data.get('content')
        if not file_content:
            # Try to get from file upload
            file = request.FILES.get('file')
            if file:
                file_content = file.read().decode('utf-8')

        if not file_content:
            return Response(
                {'error': 'No collection data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get workspace - from request or use default/active
        workspace_id = request.data.get('workspace_id')
        workspace = None
        if workspace_id:
            try:
                workspace = Workspace.objects.get(pk=workspace_id)
            except Workspace.DoesNotExist:
                pass
        if not workspace:
            workspace = Workspace.get_or_create_default()

        # Import the collection
        result = import_postman_file(file_content, workspace)

        if result.success:
            # Fetch the imported collection
            collection = Collection.objects.get(id=result.collection_id)
            return Response({
                'success': True,
                'collection': CollectionSerializer(collection).data,
                'requests_imported': result.requests_imported,
                'folders_imported': result.folders_imported,
                'warnings': result.warnings
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'errors': result.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='set-environment')
    def set_environment(self, request, pk=None):
        """Set the active environment for this collection.

        POST body:
            environment_id: ID of environment to activate (must be collection-scoped to this collection)
                            Pass null or omit to clear the active environment.
        """
        collection = self.get_object()
        environment_id = request.data.get('environment_id')

        if environment_id is None or environment_id == '':
            # Clear active environment
            collection.active_environment = None
            collection.save()
            return Response(CollectionSerializer(collection).data)

        # Validate that the environment belongs to this collection
        try:
            environment = Environment.objects.get(pk=environment_id, collection=collection)
        except Environment.DoesNotExist:
            return Response(
                {'error': 'Environment not found or does not belong to this collection'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collection.active_environment = environment
        collection.save()
        return Response(CollectionSerializer(collection).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Export collection in Postman or PostAI format.

        Query params:
            export_format: 'postman' (default) or 'postai'
            include_environments: 'true' to include collection environments (PostAI only)
        """
        collection = self.get_object()
        export_format = request.query_params.get('export_format', 'postman')
        include_environments = request.query_params.get('include_environments', 'true').lower() == 'true'

        if export_format == 'postai':
            # PostAI format - full fidelity export
            postai_collection = {
                '_postai_format': True,
                '_postai_version': '1.0',
                'info': {
                    'id': str(collection.id),
                    'name': collection.name,
                    'description': collection.description,
                    'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
                },
                'item': self._export_items(collection),
                'variable': collection.variables or [],
                'active_environment_id': str(collection.active_environment_id) if collection.active_environment_id else None,
            }

            if collection.auth:
                postai_collection['auth'] = self._export_auth(collection.auth)

            # Include collection-scoped environments if requested
            if include_environments:
                environments_data = []
                for env in collection.environments.all():
                    env_data = {
                        'id': str(env.id),
                        'name': env.name,
                        'description': env.description or '',
                        'values': []
                    }
                    for variable in env.variables.all():
                        env_data['values'].append({
                            'key': variable.key,
                            'values': variable.values or [],
                            'selected_value_index': variable.selected_value_index or 0,
                            'enabled': variable.enabled,
                            'is_secret': variable.is_secret,
                        })
                    environments_data.append(env_data)
                postai_collection['environments'] = environments_data

            return Response(postai_collection)

        # Postman format (default) - standard Postman collection format
        # Note: Postman format does not support collection-scoped environments
        postman_collection = {
            'info': {
                '_postman_id': str(collection.id),
                'name': collection.name,
                'description': collection.description,
                'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            'item': self._export_items(collection),
            'variable': collection.variables or []
        }

        if collection.auth:
            postman_collection['auth'] = self._export_auth(collection.auth)

        return Response(postman_collection)

    def _export_items(self, collection):
        """Export collection items (folders and requests)."""
        items = []

        # Export root folders
        for folder in collection.folders.filter(parent__isnull=True):
            items.append(self._export_folder(folder))

        # Export root requests
        for req in collection.requests.filter(folder__isnull=True):
            items.append(self._export_request(req))

        return items

    def _export_folder(self, folder):
        """Export a folder and its contents."""
        item = {
            'name': folder.name,
            'description': folder.description,
            'item': []
        }

        # Add subfolders
        for subfolder in folder.subfolders.all():
            item['item'].append(self._export_folder(subfolder))

        # Add requests
        for req in folder.requests.all():
            item['item'].append(self._export_request(req))

        return item

    def _export_request(self, req):
        """Export a request."""
        item = {
            'name': req.name,
            'request': {
                'method': req.method,
                'header': [
                    {'key': h['key'], 'value': h['value'], 'disabled': not h.get('enabled', True)}
                    for h in (req.headers or [])
                ],
                'url': {
                    'raw': req.url,
                    'query': [
                        {'key': p['key'], 'value': p['value'], 'disabled': not p.get('enabled', True)}
                        for p in (req.params or [])
                    ]
                }
            }
        }

        if req.body:
            item['request']['body'] = req.body

        if req.auth:
            item['request']['auth'] = self._export_auth(req.auth)

        return item

    def _export_auth(self, auth):
        """Export auth configuration."""
        if not auth:
            return {'type': 'noauth'}
        return auth


class FolderViewSet(viewsets.ModelViewSet):
    """ViewSet for Folder CRUD operations."""
    serializer_class = FolderSerializer

    def get_queryset(self):
        collection_id = self.kwargs.get('collection_pk')
        return Folder.objects.filter(collection_id=collection_id)

    def perform_create(self, serializer):
        collection_id = self.kwargs.get('collection_pk')
        serializer.save(collection_id=collection_id)


class RequestViewSet(viewsets.ModelViewSet):
    """ViewSet for Request CRUD operations."""
    serializer_class = RequestSerializer

    def get_queryset(self):
        collection_id = self.kwargs.get('collection_pk')
        return Request.objects.filter(collection_id=collection_id)

    def perform_create(self, serializer):
        collection_id = self.kwargs.get('collection_pk')
        serializer.save(collection_id=collection_id)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, collection_pk=None, pk=None):
        """Duplicate a request."""
        original = self.get_object()
        duplicate = Request.objects.create(
            collection=original.collection,
            folder=original.folder,
            name=f"{original.name} (Copy)",
            description=original.description,
            method=original.method,
            url=original.url,
            headers=original.headers,
            params=original.params,
            body=original.body,
            auth=original.auth,
            pre_request_script=original.pre_request_script,
            test_script=original.test_script,
            order=original.order + 1,
        )
        return Response(RequestSerializer(duplicate).data, status=status.HTTP_201_CREATED)
