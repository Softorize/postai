"""Sync models for PostAI."""
from django.db import models
from core.models import BaseModel


class SyncConfiguration(BaseModel):
    """Cloud sync configuration."""
    backend_url = models.URLField()
    api_key = models.CharField(max_length=500)
    user_id = models.CharField(max_length=255)
    enabled = models.BooleanField(default=False)
    auto_sync = models.BooleanField(default=True)
    sync_interval_minutes = models.IntegerField(default=5)
    last_sync_at = models.DateTimeField(null=True)

    class Meta:
        verbose_name = 'Sync configuration'
        verbose_name_plural = 'Sync configurations'

    def __str__(self):
        return f"Sync: {self.backend_url}"


class SyncLog(BaseModel):
    """Log of sync operations."""

    class Operation(models.TextChoices):
        PUSH = 'push'
        PULL = 'pull'
        CONFLICT = 'conflict'

    operation = models.CharField(max_length=20, choices=Operation.choices)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    status = models.CharField(max_length=20)
    details = models.JSONField(default=dict)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.operation} {self.entity_type} - {self.status}"
