"""Environment models for PostAI with multi-value variable support."""
from django.db import models
from core.models import BaseModel


class Environment(BaseModel):
    """Environment configuration."""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=False)
    sync_id = models.CharField(max_length=255, blank=True, null=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Ensure only one active environment
        if self.is_active:
            Environment.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class EnvironmentVariable(BaseModel):
    """Environment variable with multi-value support.

    The `values` field is a JSON array of possible values for this variable.
    The `selected_value_index` indicates which value is currently active.
    This allows users to quickly switch between different values (e.g., different usernames)
    without having to edit the variable each time.
    """
    environment = models.ForeignKey(
        Environment,
        on_delete=models.CASCADE,
        related_name='variables'
    )
    key = models.CharField(max_length=255)
    # Multi-value support: array of possible values
    values = models.JSONField(default=list)  # ["value1", "value2", "value3"]
    selected_value_index = models.IntegerField(default=0)
    description = models.TextField(blank=True, default='')
    is_secret = models.BooleanField(default=False)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ['key']
        unique_together = ['environment', 'key']

    def __str__(self):
        return f"{self.environment.name}.{self.key}"

    @property
    def current_value(self):
        """Get the currently selected value."""
        if self.values and 0 <= self.selected_value_index < len(self.values):
            return self.values[self.selected_value_index]
        return None

    def add_value(self, value):
        """Add a new value option."""
        if not self.values:
            self.values = []
        self.values.append(value)
        self.save()

    def remove_value(self, index):
        """Remove a value option by index."""
        if self.values and 0 <= index < len(self.values):
            self.values.pop(index)
            # Adjust selected index if needed
            if self.selected_value_index >= len(self.values):
                self.selected_value_index = max(0, len(self.values) - 1)
            self.save()

    def select_value(self, index):
        """Select a value by index."""
        if self.values and 0 <= index < len(self.values):
            self.selected_value_index = index
            self.save()
