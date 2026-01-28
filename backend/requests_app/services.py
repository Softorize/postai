"""Request execution service for PostAI."""
import socket
import time
import httpx
from typing import Dict, Any, Optional
from urllib.parse import urlparse


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
    timings: Dict[str, float] = {}

    # DNS lookup timing
    parsed = urlparse(url)
    hostname = parsed.hostname or ''
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)
    is_https = parsed.scheme == 'https'

    try:
        dns_start = time.perf_counter()
        socket.getaddrinfo(hostname, port)
        timings['dns_lookup'] = round((time.perf_counter() - dns_start) * 1000, 2)
    except socket.gaierror:
        timings['dns_lookup'] = 0

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

            # Execute request with timing
            request_start = time.perf_counter()
            response = await client.request(**request_kwargs)
            request_total = (time.perf_counter() - request_start) * 1000

            # response.elapsed is the time from sending to receiving the first byte
            server_elapsed_ms = response.elapsed.total_seconds() * 1000

            # Estimate connection overhead (TCP + SSL) from difference
            connection_overhead = max(0, server_elapsed_ms - timings.get('dns_lookup', 0))
            if is_https:
                # Roughly split: TCP ~40%, SSL ~60% of connection overhead
                # but cap connection overhead to a reasonable portion of TTFB
                overhead_estimate = max(0, server_elapsed_ms * 0.3)
                timings['tcp_handshake'] = round(overhead_estimate * 0.4, 2)
                timings['ssl_handshake'] = round(overhead_estimate * 0.6, 2)
            else:
                overhead_estimate = max(0, server_elapsed_ms * 0.2)
                timings['tcp_handshake'] = round(overhead_estimate, 2)
                timings['ssl_handshake'] = 0

            timings['ttfb'] = round(server_elapsed_ms, 2)
            timings['download'] = round(max(0, request_total - server_elapsed_ms), 2)
            timings['total'] = round(request_total, 2)

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
                'timings': timings,
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
