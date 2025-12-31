"""Proxy views."""
import httpx
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProxyConfiguration
from .serializers import (
    ProxyConfigurationSerializer,
    ProxyConfigurationCreateSerializer,
    TestProxySerializer,
)


class ProxyConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for proxy configurations."""

    queryset = ProxyConfiguration.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProxyConfigurationCreateSerializer
        return ProxyConfigurationSerializer

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set this proxy as the default."""
        proxy = self.get_object()
        proxy.is_default = True
        proxy.save()  # This will unset other defaults
        return Response({'status': 'default set'})

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test the proxy connection."""
        proxy = self.get_object()
        test_url = request.data.get('test_url', 'https://httpbin.org/ip')

        return self._test_proxy(
            proxy_type=proxy.proxy_type,
            host=proxy.host,
            port=proxy.port,
            username=proxy.username,
            password=proxy.password,
            test_url=test_url
        )

    def _test_proxy(self, proxy_type, host, port, username='', password='', test_url='https://httpbin.org/ip'):
        """Test a proxy connection."""
        try:
            auth = ''
            if username:
                auth = f"{username}:{password}@"
            proxy_url = f"{proxy_type}://{auth}{host}:{port}"

            with httpx.Client(
                proxies={'all://': proxy_url},
                timeout=10.0
            ) as client:
                response = client.get(test_url)

                return Response({
                    'success': True,
                    'status_code': response.status_code,
                    'response': response.text[:500],
                    'message': 'Proxy connection successful'
                })

        except httpx.ProxyError as e:
            return Response({
                'success': False,
                'error': f'Proxy error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except httpx.ConnectError as e:
            return Response({
                'success': False,
                'error': f'Connection error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default proxy configuration."""
        proxy = ProxyConfiguration.objects.filter(is_default=True, enabled=True).first()
        if proxy:
            serializer = ProxyConfigurationSerializer(proxy)
            return Response(serializer.data)
        return Response(None)


class TestProxyConnectionView(APIView):
    """View for testing proxy connection without saving."""

    def post(self, request):
        """Test a proxy connection."""
        serializer = TestProxySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        try:
            auth = ''
            if data.get('username'):
                auth = f"{data['username']}:{data.get('password', '')}@"

            proxy_url = f"{data['proxy_type']}://{auth}{data['host']}:{data['port']}"

            with httpx.Client(
                proxies={'all://': proxy_url},
                timeout=10.0
            ) as client:
                response = client.get(data.get('test_url', 'https://httpbin.org/ip'))

                return Response({
                    'success': True,
                    'status_code': response.status_code,
                    'response': response.text[:500],
                    'message': 'Proxy connection successful'
                })

        except httpx.ProxyError as e:
            return Response({
                'success': False,
                'error': f'Proxy error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except httpx.ConnectError as e:
            return Response({
                'success': False,
                'error': f'Connection error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
