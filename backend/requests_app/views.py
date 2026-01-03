"""Request views for PostAI."""
import asyncio
import hashlib
import hmac as hmac_lib
import base64
import uuid
import time
from urllib.parse import urlparse
import httpx
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import execute_request
from .models import RequestHistory
from core.models import Workspace


class ExecuteRequestView(APIView):
    """Execute an HTTP request."""

    def post(self, request):
        """Execute a request and return the response."""
        method = request.data.get('method', 'GET')
        url = request.data.get('url')
        headers = request.data.get('headers', {})
        body = request.data.get('body')
        timeout = request.data.get('timeout', 30)
        proxy = request.data.get('proxy')
        save_history = request.data.get('save_history', True)
        hmac_auth = request.data.get('hmac_auth')
        workspace_id = request.data.get('workspace_id')

        if not url:
            return Response(
                {'error': 'URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply HMAC authentication if configured
        if hmac_auth:
            headers = self._apply_hmac_auth(method, url, headers, body, hmac_auth)

        # Execute request asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                execute_request(
                    method=method,
                    url=url,
                    headers=headers,
                    body=body,
                    timeout=timeout,
                    proxy=proxy,
                )
            )
        finally:
            loop.close()

        # Save to history if requested
        if save_history:
            # Get workspace if provided
            workspace = None
            if workspace_id:
                try:
                    workspace = Workspace.objects.get(pk=workspace_id)
                except Workspace.DoesNotExist:
                    pass

            RequestHistory.objects.create(
                workspace=workspace,
                method=method,
                url=url,
                resolved_url=url,
                headers=headers,
                body=body,
                status_code=result.get('status_code'),
                status_text=result.get('status_text', ''),
                response_headers=result.get('headers', {}),
                response_body=result.get('body', ''),
                response_size=result.get('size', 0),
                response_time=result.get('time', 0),
                proxy_used=proxy,
                error_message=result.get('error'),
            )

        # Include the actual request headers in the response (including HMAC)
        result['request_headers'] = headers

        return Response(result)

    def _apply_hmac_auth(self, method, url, headers, body, hmac_config):
        """Apply HMAC authentication to the request."""
        headers = dict(headers)  # Make a copy

        algorithm = hmac_config.get('algorithm', 'sha256')
        secret_key = hmac_config.get('secretKey', '')
        components = hmac_config.get('signatureComponents', [])
        signature_header = hmac_config.get('signatureHeader', 'X-Signature')
        timestamp_header = hmac_config.get('timestampHeader', 'X-Timestamp')
        nonce_header = hmac_config.get('nonceHeader', 'X-Nonce')
        encoding = hmac_config.get('encoding', 'hex')

        # Generate timestamp and nonce
        timestamp = str(int(time.time()))
        nonce = str(uuid.uuid4())

        # Build the message to sign
        message_parts = []
        parsed_url = urlparse(url)

        for component in components:
            if component == 'method':
                message_parts.append(method.upper())
            elif component == 'path':
                path = parsed_url.path or '/'
                if parsed_url.query:
                    path += '?' + parsed_url.query
                message_parts.append(path)
            elif component == 'timestamp':
                message_parts.append(timestamp)
            elif component == 'body':
                message_parts.append(body or '')
            elif component == 'nonce':
                message_parts.append(nonce)

        message = '\n'.join(message_parts)

        # Select hash algorithm
        hash_algorithms = {
            'sha256': hashlib.sha256,
            'sha512': hashlib.sha512,
            'sha1': hashlib.sha1,
            'md5': hashlib.md5,
        }
        hash_func = hash_algorithms.get(algorithm, hashlib.sha256)

        # Compute HMAC signature
        signature = hmac_lib.new(
            secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hash_func
        )

        # Encode the signature
        if encoding == 'base64':
            signature_value = base64.b64encode(signature.digest()).decode('utf-8')
        else:  # hex
            signature_value = signature.hexdigest()

        # Add signature header
        if signature_header:
            headers[signature_header] = signature_value

        # Add timestamp header if timestamp is in components
        if 'timestamp' in components and timestamp_header:
            headers[timestamp_header] = timestamp

        # Add nonce header if nonce is in components
        if 'nonce' in components and nonce_header:
            headers[nonce_header] = nonce

        return headers


class RequestHistoryView(APIView):
    """View request history."""

    def get(self, request):
        """Get request history."""
        limit = int(request.query_params.get('limit', 50))
        workspace_id = request.query_params.get('workspace')

        history = RequestHistory.objects.all()

        # Filter by workspace if provided
        if workspace_id:
            history = history.filter(workspace_id=workspace_id)

        history = history[:limit]

        data = [
            {
                'id': str(h.id),
                'method': h.method,
                'url': h.url,
                'resolved_url': h.resolved_url,
                'status_code': h.status_code,
                'status_text': h.status_text,
                'response_time': h.response_time,
                'response_size': h.response_size,
                'created_at': h.created_at.isoformat(),
                'error_message': h.error_message,
            }
            for h in history
        ]

        return Response(data)

    def delete(self, request):
        """Clear all history."""
        workspace_id = request.query_params.get('workspace')
        if workspace_id:
            RequestHistory.objects.filter(workspace_id=workspace_id).delete()
        else:
            RequestHistory.objects.all().delete()
        return Response({'status': 'cleared'})


class RequestHistoryDetailView(APIView):
    """View single history entry."""

    def get(self, request, pk):
        """Get a single history entry with full response."""
        try:
            history = RequestHistory.objects.get(pk=pk)
        except RequestHistory.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'id': str(history.id),
            'method': history.method,
            'url': history.url,
            'resolved_url': history.resolved_url,
            'headers': history.headers,
            'body': history.body,
            'status_code': history.status_code,
            'status_text': history.status_text,
            'response_headers': history.response_headers,
            'response_body': history.response_body,
            'response_size': history.response_size,
            'response_time': history.response_time,
            'created_at': history.created_at.isoformat(),
            'error_message': history.error_message,
        })

    def delete(self, request, pk):
        """Delete a history entry."""
        try:
            history = RequestHistory.objects.get(pk=pk)
            history.delete()
            return Response({'status': 'deleted'})
        except RequestHistory.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class OAuth2TokenView(APIView):
    """Fetch OAuth2 access tokens."""

    def post(self, request):
        """Fetch an OAuth2 access token."""
        grant_type = request.data.get('grant_type', 'client_credentials')
        access_token_url = request.data.get('access_token_url')
        client_id = request.data.get('client_id')
        client_secret = request.data.get('client_secret', '')
        scope = request.data.get('scope', '')
        username = request.data.get('username', '')
        password = request.data.get('password', '')

        if not access_token_url:
            return Response(
                {'error': 'Access Token URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not client_id:
            return Response(
                {'error': 'Client ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build the token request data
        data = {
            'grant_type': grant_type,
            'client_id': client_id,
        }

        if client_secret:
            data['client_secret'] = client_secret

        if scope:
            data['scope'] = scope

        # Add grant-type specific fields
        if grant_type == 'password':
            if not username or not password:
                return Response(
                    {'error': 'Username and password are required for password grant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            data['username'] = username
            data['password'] = password

        # Execute the token request
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                self._fetch_token(access_token_url, data, client_id, client_secret)
            )
        finally:
            loop.close()

        return Response(result)

    async def _fetch_token(self, url, data, client_id, client_secret):
        """Fetch OAuth2 token asynchronously."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Try form-encoded first (most common)
                response = await client.post(
                    url,
                    data=data,
                    headers={
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                    },
                )

                # Try with Basic Auth if form-encoded fails
                if response.status_code == 401 and client_secret:
                    response = await client.post(
                        url,
                        data=data,
                        auth=(client_id, client_secret),
                        headers={
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json',
                        },
                    )

                if response.status_code >= 400:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error_description') or error_data.get('error') or response.text
                    except Exception:
                        error_msg = response.text or f'HTTP {response.status_code}'
                    return {'error': error_msg}

                try:
                    token_data = response.json()
                    return {
                        'access_token': token_data.get('access_token'),
                        'refresh_token': token_data.get('refresh_token'),
                        'token_type': token_data.get('token_type', 'Bearer'),
                        'expires_in': token_data.get('expires_in'),
                        'scope': token_data.get('scope'),
                    }
                except Exception:
                    return {'error': 'Invalid JSON response from token endpoint'}

        except httpx.TimeoutException:
            return {'error': 'Request timed out'}
        except httpx.RequestError as e:
            return {'error': f'Request failed: {str(e)}'}
