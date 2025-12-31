"""MCP views."""
import asyncio
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import McpServer, McpServerCapabilities, McpToolExecution
from .serializers import (
    McpServerSerializer,
    McpServerListSerializer,
    McpToolExecutionSerializer,
    ExecuteToolRequestSerializer,
    GetPromptRequestSerializer,
    ReadResourceRequestSerializer,
    TestConnectionRequestSerializer,
)
from .client.mcp_client import McpClient, test_mcp_connection


class McpServerViewSet(viewsets.ModelViewSet):
    """ViewSet for MCP servers."""

    queryset = McpServer.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return McpServerListSerializer
        return McpServerSerializer

    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        """Connect to the MCP server and refresh capabilities."""
        server = self.get_object()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                test_mcp_connection(
                    transport_type=server.transport_type,
                    command=server.command,
                    args=server.args,
                    url=server.url,
                    headers=server.headers,
                    env_vars=server.env_vars
                )
            )
            loop.close()

            if result['success']:
                # Update server connection status
                server.is_connected = True
                server.last_connected_at = timezone.now()
                server.save()

                # Update or create capabilities
                McpServerCapabilities.objects.update_or_create(
                    server=server,
                    defaults={
                        'tools': result.get('tools', []),
                        'resources': result.get('resources', []),
                        'prompts': result.get('prompts', [])
                    }
                )

                return Response({
                    'success': True,
                    'message': 'Connected successfully',
                    'tools': result.get('tools', []),
                    'resources': result.get('resources', []),
                    'prompts': result.get('prompts', [])
                })
            else:
                server.is_connected = False
                server.save()
                return Response({
                    'success': False,
                    'error': result.get('error', 'Connection failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            loop.close()
            server.is_connected = False
            server.save()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """Mark server as disconnected."""
        server = self.get_object()
        server.is_connected = False
        server.save()
        return Response({'success': True, 'message': 'Disconnected'})

    @action(detail=True, methods=['get'])
    def tools(self, request, pk=None):
        """Get available tools from the server."""
        server = self.get_object()
        if hasattr(server, 'capabilities') and server.capabilities:
            return Response({'tools': server.capabilities.tools})
        return Response({'tools': []})

    @action(detail=True, methods=['get'])
    def resources(self, request, pk=None):
        """Get available resources from the server."""
        server = self.get_object()
        if hasattr(server, 'capabilities') and server.capabilities:
            return Response({'resources': server.capabilities.resources})
        return Response({'resources': []})

    @action(detail=True, methods=['get'])
    def prompts(self, request, pk=None):
        """Get available prompts from the server."""
        server = self.get_object()
        if hasattr(server, 'capabilities') and server.capabilities:
            return Response({'prompts': server.capabilities.prompts})
        return Response({'prompts': []})

    @action(detail=True, methods=['post'])
    def execute_tool(self, request, pk=None):
        """Execute a tool on the MCP server."""
        server = self.get_object()
        serializer = ExecuteToolRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tool_name = serializer.validated_data['tool_name']
        arguments = serializer.validated_data.get('arguments', {})

        client = McpClient(
            transport_type=server.transport_type,
            command=server.command,
            args=server.args,
            url=server.url,
            headers=server.headers,
            env_vars=server.env_vars
        )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            async def execute():
                async with client.connect():
                    return await client.call_tool(tool_name, arguments)

            result = loop.run_until_complete(execute())
            loop.close()

            # Save execution history
            execution = McpToolExecution.objects.create(
                server=server,
                tool_name=tool_name,
                arguments=arguments,
                result=result.result if result.success else None,
                error_message=result.error if not result.success else None,
                execution_time=result.execution_time_ms
            )

            if result.success:
                return Response({
                    'success': True,
                    'result': result.result,
                    'execution_time_ms': result.execution_time_ms,
                    'execution_id': str(execution.id)
                })
            else:
                return Response({
                    'success': False,
                    'error': result.error,
                    'execution_time_ms': result.execution_time_ms,
                    'execution_id': str(execution.id)
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            loop.close()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def read_resource(self, request, pk=None):
        """Read a resource from the MCP server."""
        server = self.get_object()
        serializer = ReadResourceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uri = serializer.validated_data['uri']

        client = McpClient(
            transport_type=server.transport_type,
            command=server.command,
            args=server.args,
            url=server.url,
            headers=server.headers,
            env_vars=server.env_vars
        )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            async def read():
                async with client.connect():
                    return await client.read_resource(uri)

            result = loop.run_until_complete(read())
            loop.close()

            return Response({
                'success': True,
                'contents': result.get('contents', [])
            })

        except Exception as e:
            loop.close()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def get_prompt(self, request, pk=None):
        """Get a prompt from the MCP server."""
        server = self.get_object()
        serializer = GetPromptRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        prompt_name = serializer.validated_data['prompt_name']
        arguments = serializer.validated_data.get('arguments', {})

        client = McpClient(
            transport_type=server.transport_type,
            command=server.command,
            args=server.args,
            url=server.url,
            headers=server.headers,
            env_vars=server.env_vars
        )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            async def get():
                async with client.connect():
                    return await client.get_prompt(prompt_name, arguments)

            result = loop.run_until_complete(get())
            loop.close()

            return Response({
                'success': True,
                'description': result.get('description'),
                'messages': result.get('messages', [])
            })

        except Exception as e:
            loop.close()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """Get tool execution history for this server."""
        server = self.get_object()
        executions = server.tool_executions.all()[:50]
        serializer = McpToolExecutionSerializer(executions, many=True)
        return Response(serializer.data)


class TestMcpConnectionView(APIView):
    """View for testing MCP connection without saving."""

    def post(self, request):
        """Test connection to an MCP server."""
        serializer = TestConnectionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                test_mcp_connection(
                    transport_type=serializer.validated_data['transport_type'],
                    command=serializer.validated_data.get('command', ''),
                    args=serializer.validated_data.get('args', []),
                    url=serializer.validated_data.get('url', ''),
                    headers=serializer.validated_data.get('headers', {}),
                    env_vars=serializer.validated_data.get('env_vars', {})
                )
            )
            loop.close()

            if result['success']:
                return Response({
                    'success': True,
                    'tools': result.get('tools', []),
                    'resources': result.get('resources', []),
                    'prompts': result.get('prompts', [])
                })
            else:
                return Response({
                    'success': False,
                    'error': result.get('error', 'Connection failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            loop.close()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
