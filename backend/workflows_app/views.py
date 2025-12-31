"""Workflow views."""
import asyncio
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Workflow, WorkflowExecution
from .serializers import (
    WorkflowSerializer,
    WorkflowListSerializer,
    WorkflowExecutionSerializer,
    ExecuteWorkflowRequestSerializer,
)
from .engine import WorkflowExecutor


class WorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for workflows."""

    queryset = Workflow.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowListSerializer
        return WorkflowSerializer

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a workflow."""
        workflow = self.get_object()
        serializer = ExecuteWorkflowRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        input_variables = serializer.validated_data.get('input_variables', {})

        # Create execution record
        execution = WorkflowExecution.objects.create(
            workflow=workflow,
            status=WorkflowExecution.Status.RUNNING,
            started_at=timezone.now(),
            input_variables=input_variables
        )

        # Execute workflow
        executor = WorkflowExecutor({
            'nodes': workflow.nodes,
            'edges': workflow.edges,
            'variables': workflow.variables
        })

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                executor.execute(input_variables)
            )
            loop.close()

            # Update execution record
            if result['success']:
                execution.status = WorkflowExecution.Status.COMPLETED
            else:
                execution.status = WorkflowExecution.Status.FAILED
                execution.error_message = result.get('error', 'Unknown error')

            execution.completed_at = timezone.now()
            execution.execution_log = result.get('execution_log', [])
            execution.output_variables = result.get('output_variables', {})
            execution.save()

            return Response({
                'execution_id': str(execution.id),
                'success': result['success'],
                'error': result.get('error'),
                'execution_log': result.get('execution_log', []),
                'output_variables': result.get('output_variables', {})
            })

        except Exception as e:
            loop.close()
            execution.status = WorkflowExecution.Status.FAILED
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
            execution.save()

            return Response({
                'execution_id': str(execution.id),
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """Get execution history for this workflow."""
        workflow = self.get_object()
        executions = workflow.executions.all()[:50]
        serializer = WorkflowExecutionSerializer(executions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a workflow."""
        workflow = self.get_object()

        new_workflow = Workflow.objects.create(
            name=f"{workflow.name} (Copy)",
            description=workflow.description,
            nodes=workflow.nodes,
            edges=workflow.edges,
            viewport=workflow.viewport,
            variables=workflow.variables
        )

        serializer = WorkflowSerializer(new_workflow)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkflowExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for workflow executions (read-only)."""

    queryset = WorkflowExecution.objects.all()
    serializer_class = WorkflowExecutionSerializer

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a running execution."""
        execution = self.get_object()

        if execution.status != WorkflowExecution.Status.RUNNING:
            return Response({
                'error': 'Only running executions can be cancelled'
            }, status=status.HTTP_400_BAD_REQUEST)

        execution.status = WorkflowExecution.Status.CANCELLED
        execution.completed_at = timezone.now()
        execution.save()

        return Response({'status': 'cancelled'})
