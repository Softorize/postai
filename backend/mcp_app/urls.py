"""MCP URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import McpServerViewSet, TestMcpConnectionView

router = DefaultRouter()
router.register(r'servers', McpServerViewSet, basename='mcp-servers')

urlpatterns = [
    path('', include(router.urls)),
    path('test-connection/', TestMcpConnectionView.as_view(), name='mcp-test-connection'),
]
