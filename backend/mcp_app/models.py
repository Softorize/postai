"""MCP models for PostAI."""
from django.db import models
from core.models import BaseModel


class McpServer(BaseModel):
    """MCP server connection configuration."""

    class TransportType(models.TextChoices):
        STDIO = 'stdio'
        SSE = 'sse'
        HTTP = 'http'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    transport_type = models.CharField(
        max_length=20,
        choices=TransportType.choices,
        default=TransportType.STDIO
    )
    # Connection configuration
    command = models.CharField(max_length=500, blank=True, default='')
    args = models.JSONField(default=list)
    url = models.URLField(blank=True, default='')
    headers = models.JSONField(default=dict)
    env_vars = models.JSONField(default=dict)
    # Connection state
    is_connected = models.BooleanField(default=False)
    last_connected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class McpServerCapabilities(BaseModel):
    """Cached capabilities from MCP server."""
    server = models.OneToOneField(
        McpServer,
        on_delete=models.CASCADE,
        related_name='capabilities'
    )
    tools = models.JSONField(default=list)
    resources = models.JSONField(default=list)
    prompts = models.JSONField(default=list)
    last_refreshed_at = models.DateTimeField(auto_now=True)


class McpToolExecution(BaseModel):
    """History of MCP tool executions."""
    server = models.ForeignKey(
        McpServer,
        on_delete=models.CASCADE,
        related_name='tool_executions'
    )
    tool_name = models.CharField(max_length=255)
    arguments = models.JSONField(default=dict)
    result = models.JSONField(null=True)
    error_message = models.TextField(blank=True, null=True)
    execution_time = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.server.name} - {self.tool_name}"
