"""AI URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AiProviderViewSet,
    AiConversationViewSet,
    GenerateRequestView,
    AnalyzeResponseView,
    TestProviderConnectionView,
)

router = DefaultRouter()
router.register(r'providers', AiProviderViewSet, basename='ai-providers')
router.register(r'conversations', AiConversationViewSet, basename='ai-conversations')

urlpatterns = [
    path('', include(router.urls)),
    path('generate-request/', GenerateRequestView.as_view(), name='ai-generate-request'),
    path('analyze-response/', AnalyzeResponseView.as_view(), name='ai-analyze-response'),
    path('test-connection/', TestProviderConnectionView.as_view(), name='ai-test-connection'),
]
