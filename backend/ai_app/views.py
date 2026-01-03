"""AI views."""
import asyncio
import httpx
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse
from django.conf import settings

from .models import AiProvider, AiConversation, AiMessage
from .serializers import (
    AiProviderSerializer,
    AiProviderCreateSerializer,
    AiConversationSerializer,
    AiConversationListSerializer,
    AiMessageSerializer,
    ChatRequestSerializer,
    GenerateRequestSerializer,
    AnalyzeResponseSerializer,
    TestConnectionSerializer,
)
from .providers import get_provider, ChatMessage
from .services import (
    chat,
    create_conversation,
    update_conversation_context,
    generate_request_from_text,
    analyze_response,
)


class AiProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for AI providers."""

    queryset = AiProvider.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AiProviderCreateSerializer
        return AiProviderSerializer

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test connection to the AI provider."""
        provider_config = self.get_object()
        provider = get_provider(
            provider_config.provider_type,
            provider_config.api_key,
            provider_config.api_base_url or None
        )

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            is_connected = loop.run_until_complete(provider.test_connection())
            loop.close()

            return Response({
                'success': is_connected,
                'message': 'Connection successful' if is_connected else 'Connection failed'
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def models(self, request, pk=None):
        """Get available models for this provider."""
        provider_config = self.get_object()
        provider = get_provider(
            provider_config.provider_type,
            provider_config.api_key,
            provider_config.api_base_url or None
        )

        return Response({
            'models': provider.get_available_models()
        })


class AiConversationViewSet(viewsets.ModelViewSet):
    """ViewSet for AI conversations."""

    queryset = AiConversation.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return AiConversationListSerializer
        return AiConversationSerializer

    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        """Send a message in the conversation."""
        conversation = self.get_object()
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data['message']
        provider_id = str(serializer.validated_data['provider_id'])
        stream = serializer.validated_data.get('stream', False)

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            if stream:
                # Return streaming response
                async_gen = loop.run_until_complete(
                    chat(
                        conversation_id=str(conversation.id),
                        user_message=message,
                        provider_id=provider_id,
                        stream=True
                    )
                )

                def generate():
                    try:
                        while True:
                            chunk = loop.run_until_complete(async_gen.__anext__())
                            yield f"data: {chunk}\n\n"
                    except StopAsyncIteration:
                        yield "data: [DONE]\n\n"
                    finally:
                        loop.close()

                return StreamingHttpResponse(
                    generate(),
                    content_type='text/event-stream'
                )
            else:
                response_content = loop.run_until_complete(
                    chat(
                        conversation_id=str(conversation.id),
                        user_message=message,
                        provider_id=provider_id,
                        stream=False
                    )
                )
                loop.close()

                return Response({
                    'response': response_content,
                    'conversation_id': str(conversation.id)
                })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_context(self, request, pk=None):
        """Update conversation context."""
        conversation = self.get_object()
        context = request.data.get('context', {})

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                update_conversation_context(str(conversation.id), context)
            )
            loop.close()

            return Response({'status': 'context updated'})
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def clear_messages(self, request, pk=None):
        """Clear all messages in conversation."""
        conversation = self.get_object()
        conversation.messages.all().delete()
        return Response({'status': 'messages cleared'})


class GenerateRequestView(APIView):
    """View for generating API requests from text."""

    def post(self, request):
        """Generate an API request from natural language."""
        serializer = GenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text = serializer.validated_data['text']
        provider_id = str(serializer.validated_data['provider_id'])
        context = serializer.validated_data.get('context', {})

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                generate_request_from_text(text, provider_id, context)
            )
            loop.close()

            return Response(result)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class AnalyzeResponseView(APIView):
    """View for analyzing API responses."""

    def post(self, request):
        """Analyze an API response."""
        serializer = AnalyzeResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response_data = serializer.validated_data['response_data']
        provider_id = str(serializer.validated_data['provider_id'])
        request_context = serializer.validated_data.get('request_context', {})

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            analysis = loop.run_until_complete(
                analyze_response(response_data, provider_id, request_context)
            )
            loop.close()

            return Response({
                'analysis': analysis
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class TestProviderConnectionView(APIView):
    """View for testing provider connection without saving."""

    def post(self, request):
        """Test connection to an AI provider."""
        serializer = TestConnectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider_type = serializer.validated_data['provider_type']
        api_key = serializer.validated_data['api_key']
        api_base_url = serializer.validated_data.get('api_base_url', '')

        try:
            provider = get_provider(
                provider_type,
                api_key,
                api_base_url or None
            )

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            is_connected = loop.run_until_complete(provider.test_connection())
            loop.close()

            return Response({
                'success': is_connected,
                'message': 'Connection successful' if is_connected else 'Connection failed',
                'models': provider.get_available_models()
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class GitHubDeviceCodeView(APIView):
    """Initiate GitHub OAuth device flow."""

    GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98'  # VS Code Copilot client ID

    def post(self, request):
        """Request device and user codes from GitHub."""
        try:
            response = httpx.post(
                'https://github.com/login/device/code',
                data={
                    'client_id': self.GITHUB_CLIENT_ID,
                    'scope': 'read:user'
                },
                headers={'Accept': 'application/json'}
            )
            response.raise_for_status()
            data = response.json()

            return Response({
                'device_code': data['device_code'],
                'user_code': data['user_code'],
                'verification_uri': data['verification_uri'],
                'expires_in': data['expires_in'],
                'interval': data['interval']
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class GitHubPollTokenView(APIView):
    """Poll for GitHub OAuth access token."""

    GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98'  # VS Code Copilot client ID

    def post(self, request):
        """Poll GitHub for the access token."""
        device_code = request.data.get('device_code')
        provider_id = request.data.get('provider_id')

        if not device_code:
            return Response({
                'error': 'device_code is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = httpx.post(
                'https://github.com/login/oauth/access_token',
                data={
                    'client_id': self.GITHUB_CLIENT_ID,
                    'device_code': device_code,
                    'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'
                },
                headers={'Accept': 'application/json'}
            )
            data = response.json()

            if 'error' in data:
                # Still waiting for user authorization
                return Response({
                    'status': 'pending',
                    'error': data['error'],
                    'error_description': data.get('error_description', '')
                })

            # Got the token!
            access_token = data['access_token']

            # Get GitHub user info
            user_response = httpx.get(
                'https://api.github.com/user',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json'
                }
            )
            user_data = user_response.json()
            github_username = user_data.get('login', '')

            # Get Copilot token using GitHub token
            copilot_token = self._get_copilot_token(access_token)

            # Update or create provider if provider_id is given
            if provider_id:
                try:
                    provider = AiProvider.objects.get(id=provider_id)
                    provider.github_oauth_token = copilot_token or access_token
                    provider.github_username = github_username
                    provider.is_active = True
                    provider.save()
                except AiProvider.DoesNotExist:
                    pass

            return Response({
                'status': 'success',
                'access_token': copilot_token or access_token,
                'github_username': github_username
            })

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def _get_copilot_token(self, github_token):
        """Exchange GitHub token for Copilot API token."""
        try:
            response = httpx.get(
                'https://api.github.com/copilot_internal/v2/token',
                headers={
                    'Authorization': f'token {github_token}',
                    'Accept': 'application/json',
                    'Editor-Version': 'vscode/1.85.0',
                    'Editor-Plugin-Version': 'copilot/1.0.0'
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('token')
        except:
            pass
        return None


class GitHubLogoutView(APIView):
    """Logout from GitHub OAuth."""

    def post(self, request):
        """Clear GitHub OAuth credentials."""
        provider_id = request.data.get('provider_id')

        if not provider_id:
            return Response({
                'error': 'provider_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            provider = AiProvider.objects.get(id=provider_id)
            provider.github_oauth_token = ''
            provider.github_username = ''
            provider.save()

            return Response({
                'status': 'success',
                'message': 'Logged out from GitHub'
            })
        except AiProvider.DoesNotExist:
            return Response({
                'error': 'Provider not found'
            }, status=status.HTTP_404_NOT_FOUND)
