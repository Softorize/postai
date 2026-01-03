"""Core serializers for PostAI."""
from rest_framework import serializers
from .models import Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer for Workspace model."""
    collections_count = serializers.SerializerMethodField()
    environments_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'description', 'is_active',
            'collections_count', 'environments_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_collections_count(self, obj):
        return obj.collections.count()

    def get_environments_count(self, obj):
        return obj.environments.count()


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workspaces."""

    class Meta:
        model = Workspace
        fields = ['name', 'description']
