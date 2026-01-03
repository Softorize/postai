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

    def get_queryset(self):
        """Filter by workspace if provided."""
        queryset = McpServer.objects.all()
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset

    @action(detail=True, methods=['post'])
    def connect(self, request, pk=None):
        """Connect to the MCP server and refresh capabilities."""
        server = self.get_object()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        result = None
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
        except BaseException as e:
            # Catch all exceptions including BaseExceptionGroup
            if result and result.get('success'):
                # We got data before the cleanup error
                pass
            else:
                try:
                    loop.close()
                except:
                    pass
                server.is_connected = False
                server.save()
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                loop.close()
            except:
                pass

        if result and result.get('success'):
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
                'error': result.get('error', 'Connection failed') if result else 'Connection failed'
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

        result = None
        execution_error = None
        try:
            async def execute():
                nonlocal result
                try:
                    async with client.connect():
                        result = await client.call_tool(tool_name, arguments)
                except BaseExceptionGroup as eg:
                    # Handle TaskGroup cleanup errors - if we got result, it's ok
                    if result is None:
                        raise
                except Exception as e:
                    if result is None:
                        raise

            loop.run_until_complete(execute())
        except BaseExceptionGroup as eg:
            # TaskGroup exceptions during cleanup - check if we got data
            if result is None:
                execution_error = '; '.join(str(exc) for exc in eg.exceptions)
        except BaseException as e:
            if result is None:
                execution_error = str(e)
        finally:
            try:
                loop.close()
            except:
                pass

        # Handle execution error
        if execution_error and result is None:
            return Response({
                'success': False,
                'error': execution_error
            }, status=status.HTTP_400_BAD_REQUEST)

        if result and result.success:
            # Save execution history
            execution = McpToolExecution.objects.create(
                server=server,
                tool_name=tool_name,
                arguments=arguments,
                result=result.result,
                error_message=None,
                execution_time=result.execution_time_ms
            )

            return Response({
                'success': True,
                'result': result.result,
                'execution_time_ms': result.execution_time_ms,
                'execution_id': str(execution.id)
            })
        else:
            # Save failed execution
            execution = McpToolExecution.objects.create(
                server=server,
                tool_name=tool_name,
                arguments=arguments,
                result=None,
                error_message=result.error if result else 'Unknown error',
                execution_time=result.execution_time_ms if result else 0
            )

            return Response({
                'success': False,
                'error': result.error if result else 'Unknown error',
                'execution_time_ms': result.execution_time_ms if result else 0,
                'execution_id': str(execution.id)
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

        result = None
        try:
            async def read():
                async with client.connect():
                    return await client.read_resource(uri)

            result = loop.run_until_complete(read())
        except BaseException as e:
            if result:
                pass  # We got data before cleanup error
            else:
                try:
                    loop.close()
                except:
                    pass
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                loop.close()
            except:
                pass

        return Response({
            'success': True,
            'contents': result.get('contents', []) if result else []
        })

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

        result = None
        try:
            async def get():
                async with client.connect():
                    return await client.get_prompt(prompt_name, arguments)

            result = loop.run_until_complete(get())
        except BaseException as e:
            if result:
                pass  # We got data before cleanup error
            else:
                try:
                    loop.close()
                except:
                    pass
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                loop.close()
            except:
                pass

        return Response({
            'success': True,
            'description': result.get('description') if result else None,
            'messages': result.get('messages', []) if result else []
        })

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

        result = None
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
        except BaseException as e:
            if result and result.get('success'):
                pass  # We got data before cleanup error
            else:
                try:
                    loop.close()
                except:
                    pass
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                loop.close()
            except:
                pass

        if result and result.get('success'):
            return Response({
                'success': True,
                'tools': result.get('tools', []),
                'resources': result.get('resources', []),
                'prompts': result.get('prompts', [])
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Connection failed') if result else 'Connection failed'
            }, status=status.HTTP_400_BAD_REQUEST)
