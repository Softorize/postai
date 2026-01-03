"""AI-powered workflow generation service."""
import json
import re
from typing import Dict, Any, Optional, List
from asgiref.sync import sync_to_async
from ..providers import get_provider, ChatMessage
from ..models import AiProvider

WORKFLOW_SYSTEM_PROMPT = """You are a workflow generator for PostAI, an advanced API testing application.

Your task is to convert natural language descriptions into valid workflow configurations.

IMPORTANT - USING PROVIDED CONTEXT:
When context is provided, you MUST use it to generate accurate workflows:

1. ENVIRONMENT VARIABLES: If the context includes "environmentVariables", use the EXACT variable names provided.
   - If user has "base_url" in their environment, use {{base_url}} NOT {{baseUrl}}
   - If user has "api_key" in their environment, use {{api_key}} NOT {{apiKey}}
   - Always match the exact casing and naming from the environment

2. AVAILABLE REQUESTS: If the context includes "availableRequests", use the ACTUAL endpoints:
   - Match the exact URL paths from existing requests (e.g., "/api/v1/categories/" not "/categories")
   - Use the same HTTP methods as the existing requests
   - Reference request names when relevant

3. If no context is provided, use sensible defaults like {{baseUrl}} for the base URL.

ALWAYS respond with a JSON object in this exact format:
{
  "name": "Workflow Name",
  "description": "Brief description of what the workflow does",
  "nodes": [...],
  "edges": [...],
  "variables": {}
}

NODE TYPES AND DATA STRUCTURES:

1. START NODE (required, always id="start-1"):
{
  "id": "start-1",
  "type": "start",
  "position": {"x": 250, "y": 50},
  "data": {"label": "Start"}
}

2. END NODE (required, always id="end-1"):
{
  "id": "end-1",
  "type": "end",
  "position": {"x": 250, "y": <calculated based on workflow length>},
  "data": {
    "result_variable": "optional_variable_name_to_return",
    "result_label": "Optional Result Label"
  }
}

3. REQUEST NODE (for HTTP requests):
{
  "id": "request-<unique_number>",
  "type": "request",
  "position": {"x": 250, "y": <calculated>},
  "data": {
    "node_name": "Descriptive Name",
    "method": "GET|POST|PUT|PATCH|DELETE",
    "url": "{{baseUrl}}/endpoint",
    "request_name": "Request Display Name",
    "output_variable": "variableName",
    "headers": [{"key": "Content-Type", "value": "application/json", "enabled": true}],
    "params": [],
    "body": {"mode": "raw", "raw": "{}", "language": "json"},
    "auth": null
  }
}

4. CONDITION NODE (for branching):
{
  "id": "condition-<unique_number>",
  "type": "condition",
  "position": {"x": 250, "y": <calculated>},
  "data": {
    "node_name": "Check Condition",
    "condition_type": "equals|not_equals|contains|greater_than|less_than|is_empty|is_not_empty",
    "left": "{{variableName.field}}",
    "right": "expected_value"
  }
}

5. DELAY NODE (for waiting):
{
  "id": "delay-<unique_number>",
  "type": "delay",
  "position": {"x": 250, "y": <calculated>},
  "data": {
    "node_name": "Wait",
    "delay_ms": 1000
  }
}

6. VARIABLE NODE (for setting variables):
{
  "id": "variable-<unique_number>",
  "type": "variable",
  "position": {"x": 250, "y": <calculated>},
  "data": {
    "node_name": "Set Variable",
    "name": "variableName",
    "value": "value or {{expression}}"
  }
}

EDGE FORMAT:
{
  "id": "e-<source_id>-<target_id>",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": null
}

For condition nodes, use sourceHandle to specify the branch:
- sourceHandle: "true" for the true branch
- sourceHandle: "false" for the false branch

RULES:
1. Every workflow MUST have exactly one start node (id="start-1") and one end node (id="end-1")
2. All nodes must be connected via edges - no disconnected nodes
3. Condition nodes have two outputs: "true" and "false" (use sourceHandle)
4. Use {{variableName}} syntax for referencing variables
5. Use {{variableName.field}} to access nested fields in response data (e.g., {{user.body.id}})
6. Position nodes vertically with 150px spacing starting from y=50
7. Use descriptive node_name values that explain what the node does
8. For request nodes, store response in output_variable for use in later nodes
9. Response data includes: status_code, headers, body, time_ms
10. Only output valid JSON, no explanations or markdown

EXAMPLE:
User: "Create a workflow that gets a user by ID and checks if they are admin"
Response:
{
  "name": "Check User Admin Status",
  "description": "Fetches user by ID and verifies admin status",
  "nodes": [
    {"id": "start-1", "type": "start", "position": {"x": 250, "y": 50}, "data": {"label": "Start"}},
    {"id": "request-1", "type": "request", "position": {"x": 250, "y": 200}, "data": {"node_name": "Get User", "method": "GET", "url": "{{baseUrl}}/users/{{userId}}", "request_name": "Get User", "output_variable": "user", "headers": [], "params": [], "body": null, "auth": null}},
    {"id": "condition-1", "type": "condition", "position": {"x": 250, "y": 350}, "data": {"node_name": "Is Admin?", "condition_type": "equals", "left": "{{user.body.role}}", "right": "admin"}},
    {"id": "end-1", "type": "end", "position": {"x": 250, "y": 500}, "data": {"result_variable": "user.body.role", "result_label": "User Role"}}
  ],
  "edges": [
    {"id": "e-start-1-request-1", "source": "start-1", "target": "request-1", "sourceHandle": null},
    {"id": "e-request-1-condition-1", "source": "request-1", "target": "condition-1", "sourceHandle": null},
    {"id": "e-condition-1-end-1-true", "source": "condition-1", "target": "end-1", "sourceHandle": "true"},
    {"id": "e-condition-1-end-1-false", "source": "condition-1", "target": "end-1", "sourceHandle": "false"}
  ],
  "variables": {}
}"""


class WorkflowGenerationError(Exception):
    """Custom exception for workflow generation errors."""
    pass


async def generate_workflow_from_text(
    text: str,
    provider_id: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generate a workflow configuration from natural language.

    Args:
        text: Natural language description of the workflow
        provider_id: ID of the AI provider to use
        context: Optional context (e.g., available requests, environment info)

    Returns:
        Dict with workflow configuration (name, description, nodes, edges, variables)
    """
    # Get provider configuration
    provider_config = await sync_to_async(AiProvider.objects.get)(id=provider_id)
    auth_token = await sync_to_async(provider_config.get_auth_token)()
    provider = get_provider(
        provider_config.provider_type,
        auth_token,
        provider_config.api_base_url or None
    )

    # Build messages
    messages = [
        ChatMessage(role='system', content=WORKFLOW_SYSTEM_PROMPT),
    ]

    # Add context if provided
    if context:
        context_str = f"Available context:\n{json.dumps(context, indent=2)}"
        messages.append(ChatMessage(role='user', content=context_str))
        messages.append(ChatMessage(
            role='assistant',
            content="I understand the context. I'll use it to generate an accurate workflow."
        ))

    # Add the user's request
    messages.append(ChatMessage(
        role='user',
        content=f"Generate a workflow for: {text}"
    ))

    # Get response
    response = await provider.chat(
        messages=messages,
        model=provider_config.default_model,
        temperature=0.3  # Lower temperature for more consistent output
    )

    # Parse and validate the workflow JSON
    workflow_data = _parse_workflow_json(response.content)
    validated_data = _validate_workflow_structure(workflow_data)

    # Auto-layout nodes if positions are off
    validated_data['nodes'] = _calculate_node_positions(validated_data['nodes'])

    return validated_data


def _parse_workflow_json(content: str) -> Dict[str, Any]:
    """Extract and parse JSON from AI response."""
    # Try to find JSON in markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
    if json_match:
        content = json_match.group(1)

    # Try to find raw JSON object
    json_match = re.search(r'\{[\s\S]*\}', content)
    if json_match:
        content = json_match.group(0)

    try:
        data = json.loads(content)
        return data
    except json.JSONDecodeError as e:
        raise WorkflowGenerationError(f"Failed to parse AI response as JSON: {str(e)}")


def _validate_workflow_structure(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize workflow structure."""
    # Check required top-level fields
    if 'nodes' not in data:
        raise WorkflowGenerationError("Workflow must have 'nodes' array")
    if 'edges' not in data:
        raise WorkflowGenerationError("Workflow must have 'edges' array")

    nodes = data.get('nodes', [])
    edges = data.get('edges', [])

    # Check for start and end nodes
    node_ids = {node['id'] for node in nodes}
    node_types = {node['id']: node['type'] for node in nodes}

    has_start = any(n.get('type') == 'start' for n in nodes)
    has_end = any(n.get('type') == 'end' for n in nodes)

    if not has_start:
        raise WorkflowGenerationError("Workflow must have a 'start' node")
    if not has_end:
        raise WorkflowGenerationError("Workflow must have an 'end' node")

    # Validate all node IDs are unique
    if len(node_ids) != len(nodes):
        raise WorkflowGenerationError("All node IDs must be unique")

    # Validate edges reference valid nodes
    for edge in edges:
        if edge.get('source') not in node_ids:
            raise WorkflowGenerationError(f"Edge references invalid source node: {edge.get('source')}")
        if edge.get('target') not in node_ids:
            raise WorkflowGenerationError(f"Edge references invalid target node: {edge.get('target')}")

    # Validate node-specific requirements
    valid_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
    valid_condition_types = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']

    for node in nodes:
        node_type = node.get('type')
        node_data = node.get('data', {})

        if node_type == 'request':
            method = node_data.get('method', 'GET').upper()
            if method not in valid_methods:
                raise WorkflowGenerationError(f"Invalid HTTP method: {method}")
            # Normalize method to uppercase
            node_data['method'] = method

        elif node_type == 'condition':
            condition_type = node_data.get('condition_type', 'equals')
            if condition_type not in valid_condition_types:
                raise WorkflowGenerationError(f"Invalid condition type: {condition_type}")

        elif node_type == 'delay':
            delay_ms = node_data.get('delay_ms', 1000)
            if not isinstance(delay_ms, (int, float)) or delay_ms < 0:
                node_data['delay_ms'] = 1000  # Default to 1 second

    # Return normalized structure
    return {
        'name': data.get('name', 'Generated Workflow'),
        'description': data.get('description', ''),
        'nodes': nodes,
        'edges': edges,
        'variables': data.get('variables', {}),
        'viewport': data.get('viewport', {'x': 0, 'y': 0, 'zoom': 1})
    }


def _calculate_node_positions(nodes: List[Dict]) -> List[Dict]:
    """Auto-layout nodes vertically with proper spacing."""
    # Sort nodes by type priority and current y position
    type_priority = {
        'start': 0,
        'variable': 1,
        'request': 2,
        'condition': 3,
        'delay': 4,
        'end': 99
    }

    # Find start and end nodes
    start_node = None
    end_node = None
    middle_nodes = []

    for node in nodes:
        if node.get('type') == 'start':
            start_node = node
        elif node.get('type') == 'end':
            end_node = node
        else:
            middle_nodes.append(node)

    # Sort middle nodes by their y position (preserve order from AI)
    middle_nodes.sort(key=lambda n: n.get('position', {}).get('y', 0))

    # Recalculate positions
    result = []
    y = 50
    x = 250
    spacing = 150

    if start_node:
        start_node['position'] = {'x': x, 'y': y}
        result.append(start_node)
        y += spacing

    for node in middle_nodes:
        node['position'] = {'x': x, 'y': y}
        result.append(node)
        y += spacing

    if end_node:
        end_node['position'] = {'x': x, 'y': y}
        result.append(end_node)

    return result
