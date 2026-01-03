"""Core URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView, WorkspaceViewSet

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('', include(router.urls)),
]
