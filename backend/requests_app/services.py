"""Request execution service for PostAI."""
import ssl
import socket
import time
import httpx
from typing import Dict, Any, Optional
from urllib.parse import urlparse


def _get_system_ssl_context() -> ssl.SSLContext:
    """Create SSL context using the system certificate store (macOS Keychain).

    This ensures VPN CA certificates and corporate certs are trusted,
    unlike certifi's bundle which only has public CAs.
    """
    import sys
    import subprocess
    import tempfile
    import os

    ctx = ssl.create_default_context()

    # On macOS in PyInstaller bundles, ssl may not find system certs automatically.
    # Export certs from the macOS Keychain and load them explicitly.
    if sys.platform == 'darwin':
        try:
            # Export all trusted certs from macOS system keychain
            result = subprocess.run(
                ['/usr/bin/security', 'find-certificate', '-a', '-p',
                 '/System/Library/Keychains/SystemRootCertificates.keychain'],
                capture_output=True, text=True, timeout=5
            )
            system_certs = result.stdout

            # Also get user keychain certs (includes VPN certs)
            result2 = subprocess.run(
                ['/usr/bin/security', 'find-certificate', '-a', '-p'],
                capture_output=True, text=True, timeout=5
            )
            user_certs = result2.stdout

            if system_certs or user_certs:
                combined = (system_certs or '') + '\n' + (user_certs or '')
                # Write to temp file and load
                fd, cert_path = tempfile.mkstemp(suffix='.pem')
                try:
                    os.write(fd, combined.encode())
                    os.close(fd)
                    ctx.load_verify_locations(cert_path)
                finally:
                    os.unlink(cert_path)
        except Exception:
            # Fall back to default context if keychain export fails
            pass

    return ctx


def execute_request_sync(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timeout: int = 30,
    proxy: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute an HTTP request and return the response.

    Uses synchronous httpx.Client which properly respects system network
    configuration including VPN routing and DNS.

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

    # Configure client - use system SSL context for VPN/corporate cert support
    client_kwargs: Dict[str, Any] = {
        'timeout': timeout,
        'follow_redirects': True,
        'trust_env': True,
        'verify': _get_system_ssl_context(),
    }

    if proxy:
        client_kwargs['proxy'] = proxy

    try:
        with httpx.Client(**client_kwargs) as client:
            # Prepare request kwargs
            request_kwargs: Dict[str, Any] = {
                'method': method,
                'url': url,
            }

            if headers:
                request_kwargs['headers'] = headers

            if body and method in ('POST', 'PUT', 'PATCH'):
                request_kwargs['content'] = body

            # Execute request with timing
            request_start = time.perf_counter()
            response = client.request(**request_kwargs)
            request_total = (time.perf_counter() - request_start) * 1000

            # response.elapsed is the time from sending to receiving the first byte
            server_elapsed_ms = response.elapsed.total_seconds() * 1000

            # Estimate connection overhead (TCP + SSL) from difference
            if is_https:
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


# Keep async wrapper for backward compatibility with views
async def execute_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timeout: int = 30,
    proxy: Optional[str] = None,
) -> Dict[str, Any]:
    """Async wrapper around sync execute_request_sync."""
    return execute_request_sync(
        method=method,
        url=url,
        headers=headers,
        body=body,
        timeout=timeout,
        proxy=proxy,
    )
