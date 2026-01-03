"""Workflow models for PostAI."""
from django.db import models
from core.models import BaseModel, Workspace


class Workflow(BaseModel):
    """Visual workflow definition."""
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='workflows',
        null=True,  # Nullable initially for migration
        blank=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    # React Flow compatible structure
    nodes = models.JSONField(default=list)
    edges = models.JSONField(default=list)
    viewport = models.JSONField(default=dict)  # {x, y, zoom}
    variables = models.JSONField(default=dict)
    sync_id = models.CharField(max_length=255, blank=True, null=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class WorkflowExecution(BaseModel):
    """Record of workflow execution."""

    class Status(models.TextChoices):
        PENDING = 'pending'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'

    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    input_variables = models.JSONField(default=dict)
    output_variables = models.JSONField(default=dict)
    execution_log = models.JSONField(default=list)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.workflow.name} - {self.status}"
