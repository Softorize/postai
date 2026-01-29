"""Core views including health check."""
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from .models import Workspace
from .serializers import WorkspaceSerializer, WorkspaceCreateSerializer
from .services.workspace_export import WorkspaceExportService, WorkspaceImportService


class HealthCheckView(APIView):
    """Health check endpoint."""

    def get(self, request):
        return Response({'status': 'ok', 'service': 'postai'})


class WorkspaceViewSet(viewsets.ModelViewSet):
    """ViewSet for Workspace CRUD operations."""
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def create(self, request, *args, **kwargs):
        """Create a new workspace and return full serializer data."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save()
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        """List all workspaces, creating default if none exist."""
        # Ensure at least one workspace exists
        if not Workspace.objects.exists():
            Workspace.get_or_create_default()
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this workspace as active."""
        workspace = self.get_object()
        workspace.is_active = True
        workspace.save()
        return Response(WorkspaceSerializer(workspace).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active workspace."""
        workspace = Workspace.objects.filter(is_active=True).first()
        if not workspace:
            workspace = Workspace.get_or_create_default()
        return Response(WorkspaceSerializer(workspace).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Export entire workspace as JSON."""
        workspace = self.get_object()
        service = WorkspaceExportService(
            workspace,
            include_collections=request.query_params.get('collections', 'true') == 'true',
            include_environments=request.query_params.get('environments', 'true') == 'true',
            include_mcp_servers=request.query_params.get('mcp_servers', 'true') == 'true',
            include_workflows=request.query_params.get('workflows', 'true') == 'true',
        )
        return Response(service.export())

    @action(detail=False, methods=['post'], url_path='import')
    def import_workspace(self, request):
        """Import a workspace from exported JSON.

        POST body: { "content": "<json_string>" } or { "content": {<json_object>} }
        """
        content = request.data.get('content')
        if not content:
            file = request.FILES.get('file')
            if file:
                content = file.read().decode('utf-8')

        if not content:
            return Response(
                {'error': 'No workspace data provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if isinstance(content, str):
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                return Response(
                    {'error': 'Invalid JSON'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            data = content

        try:
            service = WorkspaceImportService(data)
            workspace = service.execute()
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {'error': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'success': True,
                'workspace': WorkspaceSerializer(workspace).data,
            },
            status=status.HTTP_201_CREATED,
        )
