"""AI chat service for PostAI."""
from typing import AsyncGenerator, Optional, Dict, Any
from asgiref.sync import sync_to_async
from ..providers import get_provider, ChatMessage
from ..models import AiProvider, AiConversation, AiMessage

API_ASSISTANT_SYSTEM = """You are an AI assistant for PostAI, an advanced API testing application.

Help users with:
- Understanding API endpoints and how to use them
- Debugging API requests and responses
- Writing test scripts and assertions
- Explaining HTTP status codes and errors
- Suggesting best practices for API design
- Generating sample request bodies
- Understanding authentication flows (OAuth, JWT, API keys)

When the user provides context about their current collection or request, use it to give specific, relevant advice.

Be concise and practical. Provide code examples when helpful."""


async def chat(
    conversation_id: str,
    user_message: str,
    provider_id: str,
    stream: bool = False
) -> str | AsyncGenerator[str, None]:
    """Send a message in a chat conversation.

    Args:
        conversation_id: ID of the conversation
        user_message: The user's message
        provider_id: ID of the AI provider to use
        stream: Whether to stream the response

    Returns:
        The assistant's response (or async generator if streaming)
    """
    conversation = await sync_to_async(AiConversation.objects.get)(id=conversation_id)
    provider_config = await sync_to_async(AiProvider.objects.get)(id=provider_id)
    provider = get_provider(
        provider_config.provider_type,
        provider_config.api_key,
        provider_config.api_base_url or None
    )

    # Build message history
    messages = [ChatMessage(role='system', content=API_ASSISTANT_SYSTEM)]

    # Add context if available
    if conversation.context:
        context_str = _format_context(conversation.context)
        if context_str:
            messages.append(ChatMessage(role='user', content=f"Current context:\n{context_str}"))
            messages.append(ChatMessage(
                role='assistant',
                content="I understand the context. How can I help you?"
            ))

    # Add conversation history (last 20 messages to avoid token limits)
    history = await sync_to_async(list)(conversation.messages.order_by('created_at')[:20])
    for msg in history:
        messages.append(ChatMessage(role=msg.role, content=msg.content))

    # Add new user message
    messages.append(ChatMessage(role='user', content=user_message))

    # Save user message
    await sync_to_async(AiMessage.objects.create)(
        conversation=conversation,
        role='user',
        content=user_message
    )

    if stream:
        return _stream_response(
            provider=provider,
            messages=messages,
            model=provider_config.default_model,
            conversation=conversation
        )
    else:
        response = await provider.chat(
            messages=messages,
            model=provider_config.default_model
        )

        # Save assistant response
        await sync_to_async(AiMessage.objects.create)(
            conversation=conversation,
            role='assistant',
            content=response.content,
            tokens_used=response.tokens_used
        )

        return response.content


async def _stream_response(
    provider,
    messages,
    model: str,
    conversation: AiConversation
) -> AsyncGenerator[str, None]:
    """Stream response and save when complete."""
    full_response = []

    async for chunk in provider.chat_stream(messages=messages, model=model):
        full_response.append(chunk)
        yield chunk

    # Save complete response
    await sync_to_async(AiMessage.objects.create)(
        conversation=conversation,
        role='assistant',
        content=''.join(full_response)
    )


def _format_context(context: Dict[str, Any]) -> str:
    """Format context for the AI."""
    parts = []

    if 'collection' in context:
        parts.append(f"Collection: {context['collection'].get('name', 'Unknown')}")

    if 'request' in context:
        req = context['request']
        parts.append(f"Current Request: {req.get('method', 'GET')} {req.get('url', '')}")

        if req.get('body'):
            parts.append(f"Request Body: {str(req['body'])[:500]}")

    if 'response' in context:
        resp = context['response']
        parts.append(f"Last Response: {resp.get('status_code', '')} {resp.get('status_text', '')}")

        if resp.get('body'):
            parts.append(f"Response Body (truncated): {str(resp['body'])[:500]}")

    if 'environment' in context:
        parts.append(f"Active Environment: {context['environment'].get('name', 'None')}")

    return '\n'.join(parts) if parts else ''


async def create_conversation(
    title: str = '',
    provider_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> AiConversation:
    """Create a new AI conversation."""
    return await sync_to_async(AiConversation.objects.create)(
        title=title,
        provider_id=provider_id,
        context=context or {}
    )


async def update_conversation_context(
    conversation_id: str,
    context: Dict[str, Any]
) -> None:
    """Update the context for a conversation."""
    conversation = await sync_to_async(AiConversation.objects.get)(id=conversation_id)
    conversation.context = context
    await sync_to_async(conversation.save)()
