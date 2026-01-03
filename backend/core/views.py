"""Core views including health check."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from .models import Workspace
from .serializers import WorkspaceSerializer, WorkspaceCreateSerializer


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
