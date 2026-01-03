"""AI serializers."""
from rest_framework import serializers
from .models import AiProvider, AiConversation, AiMessage


class AiProviderSerializer(serializers.ModelSerializer):
    """Serializer for AI provider."""

    # Don't expose full API key in responses
    api_key_masked = serializers.SerializerMethodField()
    is_oauth_authenticated = serializers.BooleanField(read_only=True)

    class Meta:
        model = AiProvider
        fields = [
            'id', 'name', 'provider_type', 'api_key_masked',
            'api_base_url', 'default_model', 'is_active',
            'max_requests_per_minute', 'github_username',
            'is_oauth_authenticated', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'api_key_masked', 'is_oauth_authenticated']

    def get_api_key_masked(self, obj):
        """Return masked API key."""
        if obj.api_key:
            return f"{obj.api_key[:8]}...{obj.api_key[-4:]}"
        return None


class AiProviderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AI provider (includes api_key)."""

    class Meta:
        model = AiProvider
        fields = [
            'id', 'name', 'provider_type', 'api_key',
            'api_base_url', 'default_model', 'is_active',
            'max_requests_per_minute'
        ]
        extra_kwargs = {
            'api_key': {'write_only': True}
        }


class AiMessageSerializer(serializers.ModelSerializer):
    """Serializer for AI message."""

    class Meta:
        model = AiMessage
        fields = ['id', 'role', 'content', 'tokens_used', 'created_at']
        read_only_fields = ['id', 'created_at']


class AiConversationSerializer(serializers.ModelSerializer):
    """Serializer for AI conversation."""

    messages = AiMessageSerializer(many=True, read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True)

    class Meta:
        model = AiConversation
        fields = [
            'id', 'title', 'provider', 'provider_name',
            'context', 'messages', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AiConversationListSerializer(serializers.ModelSerializer):
    """Serializer for AI conversation list (without messages)."""

    provider_name = serializers.CharField(source='provider.name', read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AiConversation
        fields = [
            'id', 'title', 'provider', 'provider_name',
            'message_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatRequestSerializer(serializers.Serializer):
    """Serializer for chat request."""

    message = serializers.CharField(required=True)
    provider_id = serializers.UUIDField(required=True)
    stream = serializers.BooleanField(default=False)


class GenerateRequestSerializer(serializers.Serializer):
    """Serializer for request generation."""

    text = serializers.CharField(required=True)
    provider_id = serializers.UUIDField(required=True)
    context = serializers.JSONField(required=False, default=dict)


class AnalyzeResponseSerializer(serializers.Serializer):
    """Serializer for response analysis."""

    response_data = serializers.JSONField(required=True)
    provider_id = serializers.UUIDField(required=True)
    request_context = serializers.JSONField(required=False, default=dict)


class TestConnectionSerializer(serializers.Serializer):
    """Serializer for testing provider connection."""

    provider_type = serializers.ChoiceField(choices=AiProvider.ProviderType.choices)
    api_key = serializers.CharField(required=True)
    api_base_url = serializers.URLField(required=False, allow_blank=True)


class GenerateWorkflowSerializer(serializers.Serializer):
    """Serializer for workflow generation."""

    text = serializers.CharField(required=True, help_text="Natural language description of the workflow")
    provider_id = serializers.UUIDField(required=True, help_text="ID of the AI provider to use")
    context = serializers.JSONField(required=False, default=dict, help_text="Optional context information")
