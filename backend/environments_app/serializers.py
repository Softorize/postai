"""Environment serializers for PostAI."""
from rest_framework import serializers
from .models import Environment, EnvironmentVariable


class EnvironmentVariableSerializer(serializers.ModelSerializer):
    """Serializer for EnvironmentVariable model with multi-value support."""
    current_value = serializers.ReadOnlyField()

    class Meta:
        model = EnvironmentVariable
        fields = [
            'id', 'environment', 'key', 'values', 'selected_value_index',
            'current_value', 'description', 'is_secret', 'enabled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'environment', 'created_at', 'updated_at', 'current_value']

    def to_representation(self, instance):
        """Mask secret values in response."""
        data = super().to_representation(instance)
        if instance.is_secret:
            data['values'] = ['*' * 8] * len(instance.values) if instance.values else []
            data['current_value'] = '*' * 8 if instance.current_value else None
        return data


class EnvironmentSerializer(serializers.ModelSerializer):
    """Serializer for Environment model."""
    variables = EnvironmentVariableSerializer(many=True, read_only=True)

    class Meta:
        model = Environment
        fields = [
            'id', 'name', 'description', 'is_active', 'variables',
            'sync_id', 'last_synced_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EnvironmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating environments."""

    class Meta:
        model = Environment
        fields = ['name', 'description']


class SelectValueSerializer(serializers.Serializer):
    """Serializer for selecting a variable value."""
    index = serializers.IntegerField(min_value=0)
