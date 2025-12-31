"""Workflow URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet, WorkflowExecutionViewSet

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflows')
router.register(r'executions', WorkflowExecutionViewSet, basename='workflow-executions')

urlpatterns = [
    path('', include(router.urls)),
]
