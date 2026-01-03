"""Base models for PostAI."""
import uuid
from django.db import models


class BaseModel(models.Model):
    """Abstract base model with common fields."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Workspace(BaseModel):
    """Workspace for organizing collections and environments."""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Ensure only one workspace is active at a time."""
        if self.is_active:
            # Deactivate all other workspaces
            Workspace.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_or_create_default(cls):
        """Get the default workspace, creating it if necessary."""
        workspace = cls.objects.filter(is_active=True).first()
        if not workspace:
            workspace = cls.objects.first()
        if not workspace:
            workspace = cls.objects.create(
                name='Default Workspace',
                description='Default workspace for your collections and environments',
                is_active=True
            )
        return workspace
