"""AI URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AiProviderViewSet,
    AiConversationViewSet,
    GenerateRequestView,
    GenerateWorkflowView,
    AnalyzeResponseView,
    TestProviderConnectionView,
    GitHubDeviceCodeView,
    GitHubPollTokenView,
    GitHubLogoutView,
)

router = DefaultRouter()
router.register(r'providers', AiProviderViewSet, basename='ai-providers')
router.register(r'conversations', AiConversationViewSet, basename='ai-conversations')

urlpatterns = [
    path('', include(router.urls)),
    path('generate-request/', GenerateRequestView.as_view(), name='ai-generate-request'),
    path('generate-workflow/', GenerateWorkflowView.as_view(), name='ai-generate-workflow'),
    path('analyze-response/', AnalyzeResponseView.as_view(), name='ai-analyze-response'),
    path('test-connection/', TestProviderConnectionView.as_view(), name='ai-test-connection'),
    path('github/device-code/', GitHubDeviceCodeView.as_view(), name='github-device-code'),
    path('github/poll-token/', GitHubPollTokenView.as_view(), name='github-poll-token'),
    path('github/logout/', GitHubLogoutView.as_view(), name='github-logout'),
]
