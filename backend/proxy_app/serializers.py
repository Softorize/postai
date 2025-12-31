"""Proxy serializers."""
from rest_framework import serializers
from .models import ProxyConfiguration


class ProxyConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for proxy configuration."""

    # Don't expose password in responses
    password_set = serializers.SerializerMethodField()

    class Meta:
        model = ProxyConfiguration
        fields = [
            'id', 'name', 'proxy_type', 'host', 'port',
            'username', 'password_set', 'is_default', 'enabled',
            'bypass_list', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'password_set']

    def get_password_set(self, obj):
        return bool(obj.password)


class ProxyConfigurationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating proxy configuration."""

    class Meta:
        model = ProxyConfiguration
        fields = [
            'id', 'name', 'proxy_type', 'host', 'port',
            'username', 'password', 'is_default', 'enabled',
            'bypass_list'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }


class TestProxySerializer(serializers.Serializer):
    """Serializer for testing proxy connection."""

    proxy_type = serializers.ChoiceField(choices=ProxyConfiguration.ProxyType.choices)
    host = serializers.CharField(required=True)
    port = serializers.IntegerField(required=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True)
    test_url = serializers.URLField(default='https://httpbin.org/ip')
