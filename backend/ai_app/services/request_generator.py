"""AI-powered request generation service."""
import json
import re
from typing import Dict, Any, Optional
from ..providers import get_provider, ChatMessage
from ..models import AiProvider

SYSTEM_PROMPT = """You are an API request generator for PostAI, an advanced API testing tool.

Your task is to convert natural language descriptions into valid API request configurations.

Always respond with a JSON object in this exact format:
{
    "method": "GET|POST|PUT|PATCH|DELETE",
    "url": "https://example.com/api/endpoint",
    "headers": {"key": "value"},
    "params": {"key": "value"},
    "body": null or {} or "string"
}

Guidelines:
1. Infer the HTTP method from the action described (create=POST, update=PUT/PATCH, delete=DELETE, read=GET)
2. If the URL is not fully specified, use a placeholder domain
3. Include appropriate Content-Type headers when body is present
4. For JSON body, always set Content-Type to application/json
5. Use environment variable syntax {{variable}} when appropriate
6. Only output valid JSON, no explanations

Example:
User: "Create a new user with email test@example.com and name John"
Response:
{
    "method": "POST",
    "url": "{{baseUrl}}/users",
    "headers": {"Content-Type": "application/json"},
    "params": {},
    "body": {"email": "test@example.com", "name": "John"}
}"""


async def generate_request_from_text(
    text: str,
    provider_id: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generate an API request configuration from natural language.

    Args:
        text: Natural language description of the request
        provider_id: ID of the AI provider to use
        context: Optional context (e.g., available endpoints, collection info)

    Returns:
        Dict with request configuration (method, url, headers, params, body)
    """
    # Get provider configuration
    provider_config = AiProvider.objects.get(id=provider_id)
    provider = get_provider(
        provider_config.provider_type,
        provider_config.api_key,
        provider_config.api_base_url or None
    )

    # Build messages
    messages = [
        ChatMessage(role='system', content=SYSTEM_PROMPT),
    ]

    # Add context if provided
    if context:
        context_str = f"Available API context:\n{json.dumps(context, indent=2)}"
        messages.append(ChatMessage(role='user', content=context_str))
        messages.append(ChatMessage(
            role='assistant',
            content="I understand the API context. I'll use it to generate accurate requests."
        ))

    # Add the user's request
    messages.append(ChatMessage(
        role='user',
        content=f"Generate an API request for: {text}"
    ))

    # Get response
    response = await provider.chat(
        messages=messages,
        model=provider_config.default_model,
        temperature=0.3  # Lower temperature for more consistent output
    )

    # Parse JSON from response
    return _parse_request_json(response.content)


def _parse_request_json(content: str) -> Dict[str, Any]:
    """Extract and parse JSON from AI response."""
    # Try to find JSON in markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
    if json_match:
        content = json_match.group(1)

    # Try to find raw JSON object
    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        content = json_match.group(0)

    try:
        data = json.loads(content)

        # Validate and normalize the response
        return {
            'method': data.get('method', 'GET').upper(),
            'url': data.get('url', ''),
            'headers': data.get('headers', {}),
            'params': data.get('params', {}),
            'body': data.get('body'),
        }
    except json.JSONDecodeError:
        # Return a default GET request if parsing fails
        return {
            'method': 'GET',
            'url': '',
            'headers': {},
            'params': {},
            'body': None,
            'error': 'Failed to parse AI response as JSON'
        }


ANALYZE_PROMPT = """You are an API response analyzer for PostAI, an advanced API testing tool.

Analyze the provided API response and give helpful insights:
1. Explain what the response means
2. Identify any errors or issues
3. Suggest potential fixes for error responses
4. Point out interesting data patterns

Be concise and practical. Focus on actionable insights."""


async def analyze_response(
    response_data: Dict[str, Any],
    provider_id: str,
    request_context: Optional[Dict[str, Any]] = None
) -> str:
    """Analyze an API response and provide insights.

    Args:
        response_data: The API response (status, headers, body)
        provider_id: ID of the AI provider to use
        request_context: Optional context about the original request

    Returns:
        Analysis text
    """
    provider_config = AiProvider.objects.get(id=provider_id)
    provider = get_provider(
        provider_config.provider_type,
        provider_config.api_key,
        provider_config.api_base_url or None
    )

    # Build the analysis prompt
    response_summary = f"""
Status: {response_data.get('status_code')} {response_data.get('status_text', '')}
Response Time: {response_data.get('time', 0)}ms
Size: {response_data.get('size', 0)} bytes

Headers:
{json.dumps(response_data.get('headers', {}), indent=2)}

Body (truncated to 2000 chars):
{str(response_data.get('body', ''))[:2000]}
"""

    messages = [
        ChatMessage(role='system', content=ANALYZE_PROMPT),
    ]

    if request_context:
        messages.append(ChatMessage(
            role='user',
            content=f"Original request: {request_context.get('method', 'GET')} {request_context.get('url', '')}"
        ))

    messages.append(ChatMessage(
        role='user',
        content=f"Analyze this API response:\n{response_summary}"
    ))

    response = await provider.chat(
        messages=messages,
        model=provider_config.default_model,
        temperature=0.5
    )

    return response.content
