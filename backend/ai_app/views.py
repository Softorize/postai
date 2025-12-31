"""AI views."""
import asyncio
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse

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
