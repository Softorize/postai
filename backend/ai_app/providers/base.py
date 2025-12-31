"""Base AI provider interface."""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class ChatMessage:
    """A message in a chat conversation."""
    role: str  # 'user', 'assistant', 'system'
    content: str


@dataclass
class ChatResponse:
    """Response from an AI chat completion."""
    content: str
    tokens_used: int
    model: str
    finish_reason: str


class BaseAiProvider(ABC):
    """Abstract base class for AI providers."""

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url

    @abstractmethod
    async def chat(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> ChatResponse:
        """Send a chat completion request.

        Args:
            messages: List of chat messages
            model: Model identifier to use
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            ChatResponse with the completion
        """
        pass

    @abstractmethod
    async def chat_stream(
        self,
        messages: List[ChatMessage],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion response.

        Yields chunks of the response text as they arrive.
        """
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models for this provider."""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test if the API connection works.

        Returns:
            True if connection is successful
        """
        pass

    def validate_messages(self, messages: List[ChatMessage]) -> None:
        """Validate message list."""
        if not messages:
            raise ValueError("Messages list cannot be empty")

        for msg in messages:
            if msg.role not in ('user', 'assistant', 'system'):
                raise ValueError(f"Invalid message role: {msg.role}")
            if not msg.content:
                raise ValueError("Message content cannot be empty")
