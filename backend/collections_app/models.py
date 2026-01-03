"""Collection models for PostAI."""
from django.db import models
from core.models import BaseModel, Workspace


class Collection(BaseModel):
    """API collection container."""
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='collections',
        null=True,  # Nullable initially for migration
        blank=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    postman_id = models.CharField(max_length=255, blank=True, null=True)
    schema_version = models.CharField(max_length=50, default='v2.1.0')
    variables = models.JSONField(default=list)
    auth = models.JSONField(null=True, blank=True)
    pre_request_script = models.TextField(blank=True, default='')
    test_script = models.TextField(blank=True, default='')
    sync_id = models.CharField(max_length=255, blank=True, null=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Folder(BaseModel):
    """Folder within a collection for organizing requests."""
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='folders'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subfolders'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    auth = models.JSONField(null=True, blank=True)
    pre_request_script = models.TextField(blank=True, default='')
    test_script = models.TextField(blank=True, default='')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.collection.name}/{self.name}"


class Request(BaseModel):
    """API request definition."""

    class Method(models.TextChoices):
        GET = 'GET'
        POST = 'POST'
        PUT = 'PUT'
        PATCH = 'PATCH'
        DELETE = 'DELETE'
        HEAD = 'HEAD'
        OPTIONS = 'OPTIONS'

    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='requests'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.GET)
    url = models.TextField(blank=True, default='')
    headers = models.JSONField(default=list)
    params = models.JSONField(default=list)
    body = models.JSONField(null=True, blank=True)
    auth = models.JSONField(null=True, blank=True)
    pre_request_script = models.TextField(blank=True, default='')
    test_script = models.TextField(blank=True, default='')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.method} {self.name}"
