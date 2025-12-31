"""Request URL configuration."""
from django.urls import path
from .views import ExecuteRequestView, RequestHistoryView, RequestHistoryDetailView

urlpatterns = [
    path('execute/', ExecuteRequestView.as_view(), name='execute-request'),
    path('history/', RequestHistoryView.as_view(), name='request-history'),
    path('history/<uuid:pk>/', RequestHistoryDetailView.as_view(), name='request-history-detail'),
]
