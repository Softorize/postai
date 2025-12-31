"""MCP serializers."""
from rest_framework import serializers
from .models import McpServer, McpServerCapabilities, McpToolExecution


class McpServerCapabilitiesSerializer(serializers.ModelSerializer):
    """Serializer for MCP server capabilities."""

    class Meta:
        model = McpServerCapabilities
        fields = ['tools', 'resources', 'prompts', 'last_refreshed_at']
        read_only_fields = ['last_refreshed_at']


class McpServerSerializer(serializers.ModelSerializer):
    """Serializer for MCP server."""

    capabilities = McpServerCapabilitiesSerializer(read_only=True)

    class Meta:
        model = McpServer
        fields = [
            'id', 'name', 'description', 'transport_type',
            'command', 'args', 'url', 'headers', 'env_vars',
            'is_connected', 'last_connected_at', 'capabilities',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_connected', 'last_connected_at', 'created_at', 'updated_at']


class McpServerListSerializer(serializers.ModelSerializer):
    """Serializer for MCP server list (without capabilities)."""

    tool_count = serializers.SerializerMethodField()
    resource_count = serializers.SerializerMethodField()

    class Meta:
        model = McpServer
        fields = [
            'id', 'name', 'description', 'transport_type',
            'is_connected', 'last_connected_at',
            'tool_count', 'resource_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_connected', 'last_connected_at', 'created_at', 'updated_at']

    def get_tool_count(self, obj):
        if hasattr(obj, 'capabilities') and obj.capabilities:
            return len(obj.capabilities.tools)
        return 0

    def get_resource_count(self, obj):
        if hasattr(obj, 'capabilities') and obj.capabilities:
            return len(obj.capabilities.resources)
        return 0


class McpToolExecutionSerializer(serializers.ModelSerializer):
    """Serializer for MCP tool execution."""

    server_name = serializers.CharField(source='server.name', read_only=True)

    class Meta:
        model = McpToolExecution
        fields = [
            'id', 'server', 'server_name', 'tool_name',
            'arguments', 'result', 'error_message',
            'execution_time', 'created_at'
        ]
        read_only_fields = ['id', 'result', 'error_message', 'execution_time', 'created_at']


class ExecuteToolRequestSerializer(serializers.Serializer):
    """Serializer for tool execution request."""

    tool_name = serializers.CharField(required=True)
    arguments = serializers.JSONField(default=dict)


class GetPromptRequestSerializer(serializers.Serializer):
    """Serializer for get prompt request."""

    prompt_name = serializers.CharField(required=True)
    arguments = serializers.JSONField(default=dict)


class ReadResourceRequestSerializer(serializers.Serializer):
    """Serializer for read resource request."""

    uri = serializers.CharField(required=True)


class TestConnectionRequestSerializer(serializers.Serializer):
    """Serializer for testing MCP connection without saving."""

    transport_type = serializers.ChoiceField(choices=McpServer.TransportType.choices)
    command = serializers.CharField(required=False, allow_blank=True)
    args = serializers.ListField(child=serializers.CharField(), default=list)
    url = serializers.URLField(required=False, allow_blank=True)
    headers = serializers.JSONField(default=dict)
    env_vars = serializers.JSONField(default=dict)
