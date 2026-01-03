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
                # Get the result variable if specified
                result_variable = node_data.get('result_variable', '')
                result_label = node_data.get('result_label', 'Result')

                end_output = {
                    'message': 'Workflow completed',
                    'result_label': result_label,
                }

                if result_variable:
                    # Resolve the result variable
                    result_value = self._resolve_variables(f'{{{{{result_variable}}}}}', context)
                    # If it resolved to the same string, try direct lookup
                    if result_value == f'{{{{{result_variable}}}}}':
                        result_value = context.variables.get(result_variable)
                    end_output['result_variable'] = result_variable
                    end_output['result'] = result_value

                return NodeExecutionResult(success=True, output=end_output)

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
                original_value = node_data.get('value', '')
                var_value = self._resolve_variables(original_value, context)
                context.variables[var_name] = var_value
                return NodeExecutionResult(
                    success=True,
                    output={
                        'variable': var_name,
                        'original': original_value,
                        'resolved': var_value,
                        'available_vars': list(context.variables.keys())
                    }
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

        # Start with base headers from the request
        # Handle both dict format {"key": "value"} and list format [{"key": "k", "value": "v"}]
        raw_headers = node_data.get('headers', {})
        headers = {}
        if isinstance(raw_headers, dict):
            headers = {
                k: self._resolve_variables(v, context)
                for k, v in raw_headers.items()
            }
        elif isinstance(raw_headers, list):
            for header in raw_headers:
                key = header.get('key', '').strip()
                value = header.get('value', '')
                enabled = header.get('enabled', True)
                if key and enabled:
                    headers[key] = self._resolve_variables(value, context)

        # Apply custom headers (override or add)
        custom_headers = node_data.get('custom_headers', [])
        for header in custom_headers:
            key = header.get('key', '').strip()
            value = header.get('value', '')
            if key:
                headers[key] = self._resolve_variables(value, context)

        # Use custom_body if provided, otherwise use the request's body
        custom_body = node_data.get('custom_body')
        if custom_body and isinstance(custom_body, str) and custom_body.strip():
            body = self._resolve_variables(custom_body, context)
        else:
            body = node_data.get('body')
            if body and isinstance(body, str):
                body = self._resolve_variables(body, context)

        # Auto-add Content-Type header for JSON body if not already set
        if body and 'Content-Type' not in headers and 'content-type' not in headers:
            headers['Content-Type'] = 'application/json'

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
                    'time_ms': execution_time,
                    'request_headers': headers,  # Debug: show what headers were sent
                    'request_url': url,  # Debug: show resolved URL
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
        """Replace {{variable}} or {{variable.path.to.value}} placeholders with actual values."""
        if not isinstance(text, str):
            return text

        import re
        import json as json_module

        # Pattern supports nested paths like {{resp.body.token}}
        pattern = r'\{\{([\w.]+)\}\}'

        def get_nested_value(obj: Any, path: str) -> Any:
            """Get a nested value from dict/object using dot notation."""
            parts = path.split('.')
            current = obj

            for part in parts:
                if current is None:
                    return None
                if isinstance(current, dict):
                    current = current.get(part)
                elif isinstance(current, str):
                    # Try to parse as JSON if accessing nested property
                    try:
                        parsed = json_module.loads(current)
                        if isinstance(parsed, dict):
                            current = parsed.get(part)
                        else:
                            return None
                    except (json_module.JSONDecodeError, TypeError):
                        return None
                else:
                    return None
            return current

        def replace_var(match):
            var_path = match.group(1)

            # Check if it's a nested path
            if '.' in var_path:
                parts = var_path.split('.', 1)
                root_var = parts[0]
                nested_path = parts[1]

                root_value = context.variables.get(root_var)
                if root_value is not None:
                    nested_value = get_nested_value(root_value, nested_path)
                    if nested_value is not None:
                        if isinstance(nested_value, (dict, list)):
                            return json_module.dumps(nested_value)
                        return str(nested_value)

                return match.group(0)  # Return original if not found
            else:
                value = context.variables.get(var_path, match.group(0))
                if isinstance(value, (dict, list)):
                    return json_module.dumps(value)
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
