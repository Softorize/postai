"""Environment URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import EnvironmentViewSet, EnvironmentVariableViewSet, ActiveEnvironmentView

router = DefaultRouter()
router.register(r'', EnvironmentViewSet, basename='environment')

# Nested router for variables
environment_router = nested_routers.NestedDefaultRouter(router, r'', lookup='environment')
environment_router.register(r'variables', EnvironmentVariableViewSet, basename='environment-variables')

urlpatterns = [
    path('active/', ActiveEnvironmentView.as_view(), name='active-environment'),
    path('', include(router.urls)),
    path('', include(environment_router.urls)),
]
