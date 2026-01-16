"""Environment views for PostAI."""
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import Workspace
from .models import Environment, EnvironmentVariable
from .serializers import (
    EnvironmentSerializer,
    EnvironmentCreateSerializer,
    EnvironmentVariableSerializer,
    SelectValueSerializer,
)
from collections_app.services.postman_importer import import_postman_environment


class EnvironmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Environment CRUD operations."""
    queryset = Environment.objects.all()
    serializer_class = EnvironmentSerializer

    def get_queryset(self):
        """Filter environments by workspace if specified."""
        queryset = Environment.objects.all()
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return EnvironmentCreateSerializer
        return EnvironmentSerializer

    def perform_create(self, serializer):
        """Assign environment to active workspace."""
        workspace = Workspace.get_or_create_default()
        serializer.save(workspace=workspace)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this environment as active."""
        environment = self.get_object()
        environment.is_active = True
        environment.save()
        return Response(EnvironmentSerializer(environment).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Export environment in Postman-compatible format."""
        environment = self.get_object()

        # Build Postman environment format
        postman_env = {
            'id': str(environment.id),
            'name': environment.name,
            'values': [],
            '_postman_variable_scope': 'environment',
            '_postman_exported_at': environment.updated_at.isoformat() if environment.updated_at else None,
        }

        # Convert variables to Postman format
        for variable in environment.variables.all():
            # Get currently selected value (multi-value -> single value)
            values = variable.values or []
            selected_index = variable.selected_value_index or 0
            current_value = values[selected_index] if selected_index < len(values) else ''

            postman_var = {
                'key': variable.key,
                'value': current_value,
                'enabled': variable.enabled,
                'type': 'secret' if variable.is_secret else 'default',
            }
            postman_env['values'].append(postman_var)

        return Response(postman_env)

    @action(detail=False, methods=['post'], url_path='import')
    def import_environment(self, request):
        """Import a Postman environment from JSON."""
        file_content = request.data.get('content')
        if not file_content:
            file = request.FILES.get('file')
            if file:
                file_content = file.read().decode('utf-8')

        if not file_content:
            return Response(
                {'error': 'No environment data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = import_postman_environment(file_content)

        if not result.get('success'):
            return Response(
                {'success': False, 'error': result.get('error', 'Import failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the environment with workspace
        workspace = Workspace.get_or_create_default()
        environment = Environment.objects.create(
            name=result['name'],
            description=f"Imported from Postman",
            workspace=workspace
        )

        # Create variables
        variables_created = 0
        for var_data in result.get('variables', []):
            EnvironmentVariable.objects.create(
                environment=environment,
                key=var_data['key'],
                values=var_data.get('values', ['']),
                selected_value_index=var_data.get('selected_value_index', 0),
                enabled=var_data.get('enabled', True),
                is_secret=var_data.get('is_secret', False)
            )
            variables_created += 1

        return Response({
            'success': True,
            'environment': EnvironmentSerializer(environment).data,
            'variables_imported': variables_created
        }, status=status.HTTP_201_CREATED)


class ActiveEnvironmentView(APIView):
    """View for getting the active environment."""

    def get(self, request):
        """Get the currently active environment."""
        environment = Environment.objects.filter(is_active=True).first()
        if environment:
            return Response(EnvironmentSerializer(environment).data)
        return Response(None, status=status.HTTP_204_NO_CONTENT)


class EnvironmentVariableViewSet(viewsets.ModelViewSet):
    """ViewSet for EnvironmentVariable CRUD operations."""
    serializer_class = EnvironmentVariableSerializer

    def get_queryset(self):
        environment_id = self.kwargs.get('environment_pk')
        return EnvironmentVariable.objects.filter(environment_id=environment_id)

    def perform_create(self, serializer):
        environment_id = self.kwargs.get('environment_pk')
        serializer.save(environment_id=environment_id)

    @action(detail=True, methods=['post'], url_path='select-value')
    def select_value(self, request, environment_pk=None, pk=None):
        """Select a value from the multi-value array.

        This is the key feature for multi-value environment variables.
        Users can have multiple values for a variable (e.g., multiple usernames)
        and use this endpoint to switch between them.
        """
        variable = self.get_object()
        serializer = SelectValueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        index = serializer.validated_data['index']
        if not variable.values or index >= len(variable.values):
            return Response(
                {'error': 'Invalid index'},
                status=status.HTTP_400_BAD_REQUEST
            )

        variable.select_value(index)
        return Response(EnvironmentVariableSerializer(variable).data)

    @action(detail=True, methods=['post'], url_path='add-value')
    def add_value(self, request, environment_pk=None, pk=None):
        """Add a new value to the multi-value array."""
        variable = self.get_object()
        value = request.data.get('value')
        if value is None:
            return Response(
                {'error': 'Value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        variable.add_value(value)
        return Response(EnvironmentVariableSerializer(variable).data)

    @action(detail=True, methods=['post'], url_path='remove-value')
    def remove_value(self, request, environment_pk=None, pk=None):
        """Remove a value from the multi-value array."""
        variable = self.get_object()
        index = request.data.get('index')
        if index is None:
            return Response(
                {'error': 'Index is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        variable.remove_value(index)
        return Response(EnvironmentVariableSerializer(variable).data)
