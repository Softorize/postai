"""AI models for PostAI."""
from django.db import models
from core.models import BaseModel


class AiProvider(BaseModel):
    """AI provider configuration."""

    class ProviderType(models.TextChoices):
        ANTHROPIC = 'anthropic'
        DEEPSEEK = 'deepseek'
        OPENAI = 'openai'
        COPILOT = 'copilot'
        CUSTOM = 'custom'

    name = models.CharField(max_length=255)
    provider_type = models.CharField(max_length=50, choices=ProviderType.choices)
    api_key = models.CharField(max_length=500)  # Should be encrypted in production
    api_base_url = models.URLField(blank=True, default='')
    default_model = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    max_requests_per_minute = models.IntegerField(default=60)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.provider_type})"


class AiConversation(BaseModel):
    """AI chat conversation."""
    title = models.CharField(max_length=255, blank=True, default='')
    provider = models.ForeignKey(
        AiProvider,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conversations'
    )
    context = models.JSONField(default=dict)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class AiMessage(BaseModel):
    """Message in AI conversation."""

    class Role(models.TextChoices):
        USER = 'user'
        ASSISTANT = 'assistant'
        SYSTEM = 'system'

    conversation = models.ForeignKey(
        AiConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    tokens_used = models.IntegerField(default=0)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."
