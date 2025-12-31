"""Proxy URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProxyConfigurationViewSet, TestProxyConnectionView

router = DefaultRouter()
router.register(r'proxies', ProxyConfigurationViewSet, basename='proxies')

urlpatterns = [
    path('', include(router.urls)),
    path('test-connection/', TestProxyConnectionView.as_view(), name='proxy-test-connection'),
]
