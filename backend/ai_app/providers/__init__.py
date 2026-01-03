"""AI providers for PostAI."""
from .base import BaseAiProvider, ChatMessage, ChatResponse
from .anthropic_provider import AnthropicProvider
from .deepseek_provider import DeepSeekProvider
from .copilot_provider import CopilotProvider
from .openai_provider import OpenAIProvider

PROVIDER_REGISTRY = {
    'anthropic': AnthropicProvider,
    'deepseek': DeepSeekProvider,
    'copilot': CopilotProvider,
    'openai': OpenAIProvider,
}


def get_provider(provider_type: str, api_key: str, base_url: str = None) -> BaseAiProvider:
    """Factory function to get provider instance."""
    provider_class = PROVIDER_REGISTRY.get(provider_type)
    if not provider_class:
        raise ValueError(f"Unknown provider: {provider_type}. Available: {list(PROVIDER_REGISTRY.keys())}")
    return provider_class(api_key=api_key, base_url=base_url)


__all__ = [
    'BaseAiProvider',
    'ChatMessage',
    'ChatResponse',
    'AnthropicProvider',
    'DeepSeekProvider',
    'CopilotProvider',
    'OpenAIProvider',
    'get_provider',
    'PROVIDER_REGISTRY',
]
