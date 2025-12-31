"""Request execution service for PostAI."""
import time
import httpx
from typing import Dict, Any, Optional


async def execute_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timeout: int = 30,
    proxy: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute an HTTP request and return the response.

    Args:
        method: HTTP method (GET, POST, PUT, etc.)
        url: The URL to request
        headers: Optional headers dict
        body: Optional request body
        timeout: Request timeout in seconds
        proxy: Optional proxy URL

    Returns:
        Dict with response data including status, headers, body, time, size
    """
    start_time = time.time()

    # Configure client
    client_kwargs = {
        'timeout': timeout,
        'follow_redirects': True,
    }

    if proxy:
        client_kwargs['proxy'] = proxy

    try:
        async with httpx.AsyncClient(**client_kwargs) as client:
            # Prepare request kwargs
            request_kwargs = {
                'method': method,
                'url': url,
            }

            if headers:
                request_kwargs['headers'] = headers

            if body and method in ('POST', 'PUT', 'PATCH'):
                # Check if it's JSON
                if headers and headers.get('Content-Type', '').startswith('application/json'):
                    request_kwargs['content'] = body
                else:
                    request_kwargs['content'] = body

            # Execute request
            response = await client.request(**request_kwargs)

            # Calculate metrics
            elapsed_time = int((time.time() - start_time) * 1000)
            response_body = response.text
            response_size = len(response.content)

            return {
                'status_code': response.status_code,
                'status_text': response.reason_phrase,
                'headers': dict(response.headers),
                'body': response_body,
                'size': response_size,
                'time': elapsed_time,
                'cookies': [
                    {
                        'name': name,
                        'value': value,
                        'domain': response.url.host,
                        'path': '/',
                    }
                    for name, value in response.cookies.items()
                ],
            }

    except httpx.TimeoutException:
        elapsed_time = int((time.time() - start_time) * 1000)
        return {
            'status_code': 0,
            'status_text': 'Timeout',
            'headers': {},
            'body': '',
            'size': 0,
            'time': elapsed_time,
            'error': f'Request timed out after {timeout} seconds',
        }

    except httpx.ConnectError as e:
        elapsed_time = int((time.time() - start_time) * 1000)
        return {
            'status_code': 0,
            'status_text': 'Connection Error',
            'headers': {},
            'body': '',
            'size': 0,
            'time': elapsed_time,
            'error': f'Connection failed: {str(e)}',
        }

    except Exception as e:
        elapsed_time = int((time.time() - start_time) * 1000)
        return {
            'status_code': 0,
            'status_text': 'Error',
            'headers': {},
            'body': '',
            'size': 0,
            'time': elapsed_time,
            'error': str(e),
        }
