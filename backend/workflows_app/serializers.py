"""Workflow serializers."""
from rest_framework import serializers
from .models import Workflow, WorkflowExecution


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for workflows."""

    execution_count = serializers.SerializerMethodField()
    last_execution = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'nodes', 'edges',
            'viewport', 'variables', 'execution_count', 'last_execution',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_execution_count(self, obj):
        return obj.executions.count()

    def get_last_execution(self, obj):
        last = obj.executions.first()
        if last:
            return {
                'id': str(last.id),
                'status': last.status,
                'created_at': last.created_at.isoformat()
            }
        return None


class WorkflowListSerializer(serializers.ModelSerializer):
    """Serializer for workflow list."""

    node_count = serializers.SerializerMethodField()
    execution_count = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'node_count',
            'execution_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_node_count(self, obj):
        return len(obj.nodes) if obj.nodes else 0

    def get_execution_count(self, obj):
        return obj.executions.count()


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    """Serializer for workflow executions."""

    workflow_name = serializers.CharField(source='workflow.name', read_only=True)

    class Meta:
        model = WorkflowExecution
        fields = [
            'id', 'workflow', 'workflow_name', 'status',
            'started_at', 'completed_at', 'input_variables',
            'output_variables', 'execution_log', 'error_message',
            'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'started_at', 'completed_at',
            'output_variables', 'execution_log', 'error_message', 'created_at'
        ]


class ExecuteWorkflowRequestSerializer(serializers.Serializer):
    """Serializer for workflow execution request."""

    input_variables = serializers.JSONField(default=dict)
    environment_id = serializers.UUIDField(required=False, allow_null=True)
