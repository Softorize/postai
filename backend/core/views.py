"""Core views including health check."""
from rest_framework.views import APIView
from rest_framework.response import Response


class HealthCheckView(APIView):
    """Health check endpoint."""

    def get(self, request):
        return Response({'status': 'ok', 'service': 'postai'})
