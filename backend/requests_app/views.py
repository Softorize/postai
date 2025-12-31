"""Request views for PostAI."""
import asyncio
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import execute_request
from .models import RequestHistory


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

        if not url:
            return Response(
                {'error': 'URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
            RequestHistory.objects.create(
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

        return Response(result)


class RequestHistoryView(APIView):
    """View request history."""

    def get(self, request):
        """Get request history."""
        limit = int(request.query_params.get('limit', 50))
        history = RequestHistory.objects.all()[:limit]

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
