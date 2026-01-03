"""MCP client implementation using the official MCP Python SDK."""
import asyncio
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from contextlib import asynccontextmanager

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client


@dataclass
class ToolInfo:
    """Information about an MCP tool."""
    name: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class ResourceInfo:
    """Information about an MCP resource."""
    uri: str
    name: str
    description: str
    mime_type: Optional[str] = None


@dataclass
class PromptInfo:
    """Information about an MCP prompt."""
    name: str
    description: str
    arguments: List[Dict[str, Any]]


@dataclass
class ToolExecutionResult:
    """Result of executing an MCP tool."""
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: int = 0


class McpClient:
    """Client for connecting to MCP servers."""

    def __init__(
        self,
        transport_type: str,
        command: Optional[str] = None,
        args: Optional[List[str]] = None,
        url: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
        env_vars: Optional[Dict[str, str]] = None
    ):
        self.transport_type = transport_type
        self.command = command
        self.args = args or []
        self.url = url
        self.headers = headers or {}
        self.env_vars = env_vars or {}
        self._session: Optional[ClientSession] = None
        self._read_stream = None
        self._write_stream = None

    @asynccontextmanager
    async def connect(self):
        """Connect to the MCP server."""
        if self.transport_type == 'stdio':
            if not self.command:
                raise ValueError("Command is required for stdio transport")

            server_params = StdioServerParameters(
                command=self.command,
                args=self.args,
                env=self.env_vars if self.env_vars else None
            )

            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    self._session = session
                    yield self
                    self._session = None

        elif self.transport_type == 'sse':
            if not self.url:
                raise ValueError("URL is required for SSE transport")

            async with sse_client(self.url, headers=self.headers) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    self._session = session
                    yield self
                    self._session = None

        else:
            raise ValueError(f"Unsupported transport type: {self.transport_type}")

    async def list_tools(self) -> List[ToolInfo]:
        """List available tools from the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        result = await self._session.list_tools()
        return [
            ToolInfo(
                name=tool.name,
                description=tool.description or '',
                input_schema=tool.inputSchema if hasattr(tool, 'inputSchema') else {}
            )
            for tool in result.tools
        ]

    async def list_resources(self) -> List[ResourceInfo]:
        """List available resources from the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        result = await self._session.list_resources()
        return [
            ResourceInfo(
                uri=resource.uri,
                name=resource.name,
                description=resource.description or '',
                mime_type=getattr(resource, 'mimeType', None)
            )
            for resource in result.resources
        ]

    async def list_prompts(self) -> List[PromptInfo]:
        """List available prompts from the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        result = await self._session.list_prompts()
        return [
            PromptInfo(
                name=prompt.name,
                description=prompt.description or '',
                arguments=[
                    {
                        'name': arg.name,
                        'description': arg.description or '',
                        'required': getattr(arg, 'required', False)
                    }
                    for arg in (prompt.arguments or [])
                ]
            )
            for prompt in result.prompts
        ]

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> ToolExecutionResult:
        """Execute a tool on the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        start_time = time.time()
        try:
            result = await self._session.call_tool(tool_name, arguments)
            execution_time = int((time.time() - start_time) * 1000)

            # Extract content from result
            content = []
            for item in result.content:
                if hasattr(item, 'text'):
                    content.append(item.text)
                elif hasattr(item, 'data'):
                    content.append(item.data)
                else:
                    content.append(str(item))

            return ToolExecutionResult(
                success=True,
                result=content[0] if len(content) == 1 else content,
                execution_time_ms=execution_time
            )
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return ToolExecutionResult(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )

    async def read_resource(self, uri: str) -> Dict[str, Any]:
        """Read a resource from the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        result = await self._session.read_resource(uri)
        contents = []
        for content in result.contents:
            if hasattr(content, 'text'):
                contents.append({
                    'type': 'text',
                    'text': content.text,
                    'uri': content.uri,
                    'mimeType': getattr(content, 'mimeType', None)
                })
            elif hasattr(content, 'blob'):
                contents.append({
                    'type': 'blob',
                    'data': content.blob,
                    'uri': content.uri,
                    'mimeType': getattr(content, 'mimeType', None)
                })

        return {'contents': contents}

    async def get_prompt(
        self,
        prompt_name: str,
        arguments: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Get a prompt from the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected to MCP server")

        result = await self._session.get_prompt(prompt_name, arguments or {})
        messages = []
        for msg in result.messages:
            content = msg.content
            if hasattr(content, 'text'):
                messages.append({
                    'role': msg.role,
                    'content': content.text
                })
            else:
                messages.append({
                    'role': msg.role,
                    'content': str(content)
                })

        return {
            'description': result.description,
            'messages': messages
        }


async def test_mcp_connection(
    transport_type: str,
    command: Optional[str] = None,
    args: Optional[List[str]] = None,
    url: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    env_vars: Optional[Dict[str, str]] = None,
    timeout: float = 10.0
) -> Dict[str, Any]:
    """Test connection to an MCP server and return capabilities."""
    client = McpClient(
        transport_type=transport_type,
        command=command,
        args=args,
        url=url,
        headers=headers,
        env_vars=env_vars
    )

    result_data: Dict[str, Any] = {}

    async def do_connect():
        nonlocal result_data
        async with asyncio.timeout(timeout):
            async with client.connect():
                tools = await client.list_tools()
                resources = await client.list_resources()
                prompts = await client.list_prompts()

                result_data = {
                    'success': True,
                    'tools': [
                        {'name': t.name, 'description': t.description, 'inputSchema': t.input_schema}
                        for t in tools
                    ],
                    'resources': [
                        {'uri': r.uri, 'name': r.name, 'description': r.description, 'mimeType': r.mime_type}
                        for r in resources
                    ],
                    'prompts': [
                        {'name': p.name, 'description': p.description, 'arguments': p.arguments}
                        for p in prompts
                    ]
                }

    try:
        await do_connect()
    except asyncio.TimeoutError:
        if result_data.get('success'):
            return result_data
        return {'success': False, 'error': 'Connection timed out'}
    except BaseExceptionGroup as eg:
        # Handle asyncio TaskGroup exceptions - if we got data, cleanup error is ok
        if result_data.get('success'):
            return result_data
        errors = [str(exc) for exc in eg.exceptions]
        return {'success': False, 'error': '; '.join(errors) if errors else str(eg)}
    except Exception as e:
        if result_data.get('success'):
            return result_data
        return {'success': False, 'error': str(e)}

    return result_data
