"""Environment views for PostAI."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Environment, EnvironmentVariable
from .serializers import (
    EnvironmentSerializer,
    EnvironmentCreateSerializer,
    EnvironmentVariableSerializer,
    SelectValueSerializer,
)


class EnvironmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Environment CRUD operations."""
    queryset = Environment.objects.all()
    serializer_class = EnvironmentSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return EnvironmentCreateSerializer
        return EnvironmentSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this environment as active."""
        environment = self.get_object()
        environment.is_active = True
        environment.save()
        return Response(EnvironmentSerializer(environment).data)


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
