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
    api_key = models.CharField(max_length=500, blank=True, default='')  # Manual API key
    api_base_url = models.URLField(blank=True, default='')
    default_model = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    max_requests_per_minute = models.IntegerField(default=60)

    # GitHub OAuth fields (for Copilot)
    github_oauth_token = models.CharField(max_length=500, blank=True, default='')
    github_username = models.CharField(max_length=100, blank=True, default='')

    def get_auth_token(self):
        """Get the authentication token (OAuth token takes precedence)."""
        return self.github_oauth_token or self.api_key

    @property
    def is_oauth_authenticated(self):
        """Check if provider is authenticated via OAuth."""
        return bool(self.github_oauth_token)

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
