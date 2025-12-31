"""Request history models for PostAI."""
from django.db import models
from core.models import BaseModel
from collections_app.models import Request


class RequestHistory(BaseModel):
    """History of executed requests."""
    request = models.ForeignKey(
        Request,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history'
    )

    # Snapshot of request at execution time
    method = models.CharField(max_length=10)
    url = models.TextField()
    resolved_url = models.TextField()
    headers = models.JSONField(default=dict)
    body = models.TextField(blank=True, null=True)

    # Response data
    status_code = models.IntegerField(null=True)
    status_text = models.CharField(max_length=100, blank=True, default='')
    response_headers = models.JSONField(default=dict)
    response_body = models.TextField(blank=True, null=True)
    response_size = models.IntegerField(default=0)
    response_time = models.IntegerField(default=0)  # milliseconds

    # Metadata
    environment_snapshot = models.JSONField(default=dict)
    proxy_used = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Request histories'

    def __str__(self):
        return f"{self.method} {self.resolved_url} - {self.status_code}"
