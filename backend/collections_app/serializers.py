"""Collection serializers for PostAI."""
from rest_framework import serializers
from .models import Collection, Folder, Request


class RequestSerializer(serializers.ModelSerializer):
    """Serializer for Request model."""

    class Meta:
        model = Request
        fields = [
            'id', 'collection', 'folder', 'name', 'description',
            'method', 'url', 'headers', 'params', 'body', 'auth',
            'pre_request_script', 'test_script', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'collection', 'created_at', 'updated_at']
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False},
            'method': {'required': False},
            'url': {'required': False, 'allow_blank': True},
            'headers': {'required': False},
            'params': {'required': False},
            'body': {'required': False},
            'auth': {'required': False},
            'folder': {'required': False},
            'pre_request_script': {'required': False},
            'test_script': {'required': False},
            'order': {'required': False},
        }


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model."""
    requests = RequestSerializer(many=True, read_only=True)
    subfolders = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'collection', 'parent', 'name', 'description',
            'auth', 'pre_request_script', 'test_script', 'order',
            'requests', 'subfolders', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'collection', 'created_at', 'updated_at']

    def get_subfolders(self, obj):
        """Recursively get subfolders."""
        return FolderSerializer(obj.subfolders.all(), many=True).data


class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for Collection model."""
    folders = serializers.SerializerMethodField()
    requests = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            'id', 'name', 'description', 'postman_id', 'schema_version',
            'variables', 'auth', 'pre_request_script', 'test_script',
            'folders', 'requests', 'sync_id', 'last_synced_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_folders(self, obj):
        """Get root-level folders only."""
        root_folders = obj.folders.filter(parent__isnull=True)
        return FolderSerializer(root_folders, many=True).data

    def get_requests(self, obj):
        """Get root-level requests only."""
        root_requests = obj.requests.filter(folder__isnull=True)
        return RequestSerializer(root_requests, many=True).data


class CollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating collections."""

    class Meta:
        model = Collection
        fields = ['id', 'name', 'description', 'folders', 'requests', 'created_at', 'updated_at']
        read_only_fields = ['id', 'folders', 'requests', 'created_at', 'updated_at']

    folders = serializers.SerializerMethodField()
    requests = serializers.SerializerMethodField()

    def get_folders(self, obj):
        """Return empty list for new collections."""
        return []

    def get_requests(self, obj):
        """Return empty list for new collections."""
        return []
