"""Anthropic Claude AI provider."""
from typing import AsyncGenerator, List, Optional
import anthropic
from .base import BaseAiProvider, ChatMessage, ChatResponse


class AnthropicProvider(BaseAiProvider):
    """Anthropic Claude provider implementation."""

    MODELS = [
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
    ]

    DEFAULT_MODEL = 'claude-sonnet-4-20250514'

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, base_url)
        self.client = anthropic.Anthropic(api_key=api_key)
        self.async_client = anthropic.AsyncAnthropic(api_key=api_key)

    async def chat(
        self,
        messages: List[ChatMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> ChatResponse:
        """Send a chat completion request to Claude."""
        self.validate_messages(messages)
        model = model or self.DEFAULT_MODEL

        # Extract system message (Anthropic handles it separately)
        system = None
        chat_messages = []

        for msg in messages:
            if msg.role == 'system':
                system = msg.content
            else:
                chat_messages.append({
                    'role': msg.role,
                    'content': msg.content
                })

        # Make API call
        response = await self.async_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system if system else anthropic.NOT_GIVEN,
            messages=chat_messages
        )

        return ChatResponse(
            content=response.content[0].text,
            tokens_used=response.usage.input_tokens + response.usage.output_tokens,
            model=model,
            finish_reason=response.stop_reason or 'stop'
        )

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion response from Claude."""
        self.validate_messages(messages)
        model = model or self.DEFAULT_MODEL

        # Extract system message
        system = None
        chat_messages = []

        for msg in messages:
            if msg.role == 'system':
                system = msg.content
            else:
                chat_messages.append({
                    'role': msg.role,
                    'content': msg.content
                })

        # Stream response
        async with self.async_client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system if system else anthropic.NOT_GIVEN,
            messages=chat_messages
        ) as stream:
            async for text in stream.text_stream:
                yield text

    def get_available_models(self) -> List[str]:
        """Get available Claude models."""
        return self.MODELS

    async def test_connection(self) -> bool:
        """Test connection to Anthropic API."""
        try:
            response = await self.chat(
                messages=[ChatMessage(role='user', content='Hi')],
                max_tokens=10
            )
            return bool(response.content)
        except Exception:
            return False
