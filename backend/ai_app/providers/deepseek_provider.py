"""DeepSeek AI provider."""
from typing import AsyncGenerator, List, Optional
import httpx
import json
from .base import BaseAiProvider, ChatMessage, ChatResponse


class DeepSeekProvider(BaseAiProvider):
    """DeepSeek AI provider implementation."""

    DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'

    MODELS = [
        'deepseek-chat',
        'deepseek-coder',
    ]

    DEFAULT_MODEL = 'deepseek-chat'

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        super().__init__(api_key, base_url or self.DEFAULT_BASE_URL)

    async def chat(
        self,
        messages: List[ChatMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> ChatResponse:
        """Send a chat completion request to DeepSeek."""
        self.validate_messages(messages)
        model = model or self.DEFAULT_MODEL

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [
                        {'role': m.role, 'content': m.content}
                        for m in messages
                    ],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
            )

            response.raise_for_status()
            data = response.json()

            return ChatResponse(
                content=data['choices'][0]['message']['content'],
                tokens_used=data.get('usage', {}).get('total_tokens', 0),
                model=model,
                finish_reason=data['choices'][0].get('finish_reason', 'stop')
            )

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion response from DeepSeek."""
        self.validate_messages(messages)
        model = model or self.DEFAULT_MODEL

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                'POST',
                f"{self.base_url}/chat/completions",
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [
                        {'role': m.role, 'content': m.content}
                        for m in messages
                    ],
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                    'stream': True
                }
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        data_str = line[6:]
                        if data_str == '[DONE]':
                            break

                        try:
                            data = json.loads(data_str)
                            delta = data['choices'][0].get('delta', {})
                            content = delta.get('content')
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

    def get_available_models(self) -> List[str]:
        """Get available DeepSeek models."""
        return self.MODELS

    async def test_connection(self) -> bool:
        """Test connection to DeepSeek API."""
        try:
            response = await self.chat(
                messages=[ChatMessage(role='user', content='Hi')],
                max_tokens=10
            )
            return bool(response.content)
        except Exception:
            return False
