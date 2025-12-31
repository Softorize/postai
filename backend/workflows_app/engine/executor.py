"""Workflow execution engine."""
import asyncio
import time
import httpx
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from django.utils import timezone


@dataclass
class NodeExecutionResult:
    """Result of executing a workflow node."""
    success: bool
    output: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: int = 0


@dataclass
class WorkflowContext:
    """Context for workflow execution."""
    variables: Dict[str, Any] = field(default_factory=dict)
    execution_log: List[Dict[str, Any]] = field(default_factory=list)
    current_node_id: Optional[str] = None


class WorkflowExecutor:
    """Executes workflow definitions."""

    def __init__(self, workflow_data: Dict[str, Any]):
        self.nodes = {node['id']: node for node in workflow_data.get('nodes', [])}
        self.edges = workflow_data.get('edges', [])
        self.initial_variables = workflow_data.get('variables', {})

    def get_start_node(self) -> Optional[Dict[str, Any]]:
        """Find the start node in the workflow."""
        for node in self.nodes.values():
            if node.get('type') == 'start':
                return node
        return None

    def get_outgoing_edges(self, node_id: str) -> List[Dict[str, Any]]:
        """Get all edges leaving a node."""
        return [e for e in self.edges if e['source'] == node_id]

    def get_next_node(
        self,
        current_node_id: str,
        context: WorkflowContext,
        condition_result: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Determine the next node to execute."""
        outgoing = self.get_outgoing_edges(current_node_id)

        if not outgoing:
            return None

        # For condition nodes, follow the appropriate branch
        if condition_result is not None:
            for edge in outgoing:
                edge_data = edge.get('data', {})
                if condition_result and edge_data.get('condition') == 0:
                    return self.nodes.get(edge['target'])
                elif not condition_result and edge_data.get('condition') == 1:
                    return self.nodes.get(edge['target'])

        # Default: follow the first edge
        if outgoing:
            return self.nodes.get(outgoing[0]['target'])

        return None

    async def execute_node(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """Execute a single workflow node."""
        node_type = node.get('type', '')
        node_data = node.get('data', {})
        start_time = time.time()

        try:
            if node_type == 'start':
                return NodeExecutionResult(success=True, output={'message': 'Workflow started'})

            elif node_type == 'end':
                return NodeExecutionResult(success=True, output={'message': 'Workflow completed'})

            elif node_type == 'request':
                result = await self._execute_request_node(node_data, context)
                return result

            elif node_type == 'condition':
                result = await self._execute_condition_node(node_data, context)
                return result

            elif node_type == 'delay':
                delay_ms = node_data.get('delay_ms', 1000)
                await asyncio.sleep(delay_ms / 1000)
                return NodeExecutionResult(
                    success=True,
                    output={'delayed_ms': delay_ms},
                    execution_time_ms=delay_ms
                )

            elif node_type == 'variable':
                var_name = node_data.get('name', '')
                var_value = self._resolve_variables(node_data.get('value', ''), context)
                context.variables[var_name] = var_value
                return NodeExecutionResult(
                    success=True,
                    output={'variable': var_name, 'value': var_value}
                )

            elif node_type == 'script':
                # Execute JavaScript-like expressions (simplified)
                script = node_data.get('script', '')
                # For safety, we only support simple variable assignments
                result = self._execute_simple_script(script, context)
                return NodeExecutionResult(success=True, output=result)

            elif node_type == 'loop':
                # Loop nodes are handled specially in the main execution
                return NodeExecutionResult(
                    success=True,
                    output={'loop_start': True}
                )

            else:
                return NodeExecutionResult(
                    success=False,
                    error=f"Unknown node type: {node_type}"
                )

        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return NodeExecutionResult(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )

    async def _execute_request_node(
        self,
        node_data: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """Execute an HTTP request node."""
        start_time = time.time()

        method = node_data.get('method', 'GET').upper()
        url = self._resolve_variables(node_data.get('url', ''), context)
        headers = {
            k: self._resolve_variables(v, context)
            for k, v in node_data.get('headers', {}).items()
        }
        body = node_data.get('body')
        if body and isinstance(body, str):
            body = self._resolve_variables(body, context)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    content=body if method in ['POST', 'PUT', 'PATCH'] else None
                )

                execution_time = int((time.time() - start_time) * 1000)

                # Store response in context
                response_data = {
                    'status_code': response.status_code,
                    'headers': dict(response.headers),
                    'body': response.text,
                    'time_ms': execution_time
                }

                # Auto-assign to variable if specified
                output_var = node_data.get('output_variable')
                if output_var:
                    context.variables[output_var] = response_data

                return NodeExecutionResult(
                    success=response.status_code < 400,
                    output=response_data,
                    execution_time_ms=execution_time
                )

        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return NodeExecutionResult(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )

    async def _execute_condition_node(
        self,
        node_data: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeExecutionResult:
        """Execute a condition node."""
        condition_type = node_data.get('condition_type', 'equals')
        left = self._resolve_variables(str(node_data.get('left', '')), context)
        right = self._resolve_variables(str(node_data.get('right', '')), context)

        result = False

        if condition_type == 'equals':
            result = left == right
        elif condition_type == 'not_equals':
            result = left != right
        elif condition_type == 'contains':
            result = right in left
        elif condition_type == 'greater_than':
            try:
                result = float(left) > float(right)
            except ValueError:
                result = False
        elif condition_type == 'less_than':
            try:
                result = float(left) < float(right)
            except ValueError:
                result = False
        elif condition_type == 'is_empty':
            result = not left or left.strip() == ''
        elif condition_type == 'is_not_empty':
            result = bool(left and left.strip())

        return NodeExecutionResult(
            success=True,
            output={'condition_result': result}
        )

    def _resolve_variables(self, text: str, context: WorkflowContext) -> str:
        """Replace {{variable}} placeholders with actual values."""
        if not isinstance(text, str):
            return text

        import re
        pattern = r'\{\{(\w+)\}\}'

        def replace_var(match):
            var_name = match.group(1)
            value = context.variables.get(var_name, match.group(0))
            if isinstance(value, (dict, list)):
                import json
                return json.dumps(value)
            return str(value)

        return re.sub(pattern, replace_var, text)

    def _execute_simple_script(
        self,
        script: str,
        context: WorkflowContext
    ) -> Dict[str, Any]:
        """Execute a simple script (variable assignments only)."""
        # Very basic parser for safety
        # Only supports: variable = value
        results = {}
        for line in script.strip().split('\n'):
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    var_name = parts[0].strip()
                    var_value = self._resolve_variables(parts[1].strip(), context)
                    context.variables[var_name] = var_value
                    results[var_name] = var_value
        return results

    async def execute(
        self,
        input_variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute the entire workflow."""
        context = WorkflowContext(
            variables={**self.initial_variables, **(input_variables or {})}
        )

        start_node = self.get_start_node()
        if not start_node:
            return {
                'success': False,
                'error': 'No start node found',
                'execution_log': context.execution_log,
                'output_variables': context.variables
            }

        current_node = start_node
        max_iterations = 1000  # Safety limit
        iteration = 0

        while current_node and iteration < max_iterations:
            iteration += 1
            context.current_node_id = current_node['id']

            start_time = time.time()
            result = await self.execute_node(current_node, context)
            execution_time = int((time.time() - start_time) * 1000)

            # Log execution
            log_entry = {
                'node_id': current_node['id'],
                'node_type': current_node.get('type', ''),
                'success': result.success,
                'output': result.output,
                'error': result.error,
                'execution_time_ms': result.execution_time_ms or execution_time,
                'timestamp': timezone.now().isoformat()
            }
            context.execution_log.append(log_entry)

            # Handle failure
            if not result.success:
                return {
                    'success': False,
                    'error': result.error,
                    'failed_node_id': current_node['id'],
                    'execution_log': context.execution_log,
                    'output_variables': context.variables
                }

            # Check for end node
            if current_node.get('type') == 'end':
                break

            # Determine next node
            condition_result = None
            if current_node.get('type') == 'condition' and result.output:
                condition_result = result.output.get('condition_result')

            current_node = self.get_next_node(
                current_node['id'],
                context,
                condition_result
            )

        return {
            'success': True,
            'execution_log': context.execution_log,
            'output_variables': context.variables
        }
