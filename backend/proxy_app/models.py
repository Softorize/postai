"""Proxy models for PostAI."""
from django.db import models
from core.models import BaseModel


class ProxyConfiguration(BaseModel):
    """Proxy server configuration."""

    class ProxyType(models.TextChoices):
        HTTP = 'http'
        HTTPS = 'https'
        SOCKS4 = 'socks4'
        SOCKS5 = 'socks5'

    name = models.CharField(max_length=255)
    proxy_type = models.CharField(max_length=20, choices=ProxyType.choices, default=ProxyType.HTTP)
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    username = models.CharField(max_length=255, blank=True, default='')
    password = models.CharField(max_length=255, blank=True, default='')  # Should be encrypted
    is_default = models.BooleanField(default=False)
    enabled = models.BooleanField(default=True)
    bypass_list = models.JSONField(default=list)  # ["localhost", "*.internal.com"]

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.proxy_type}://{self.host}:{self.port})"

    def save(self, *args, **kwargs):
        # Ensure only one default proxy
        if self.is_default:
            ProxyConfiguration.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def get_url(self):
        """Get the proxy URL for use with httpx."""
        auth = ''
        if self.username:
            auth = f"{self.username}:{self.password}@"
        return f"{self.proxy_type}://{auth}{self.host}:{self.port}"
