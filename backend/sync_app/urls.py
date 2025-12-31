"""Sync URL configuration."""
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response

class SyncPlaceholderView(APIView):
    def get(self, request):
        return Response({'status': 'Sync coming soon'})

urlpatterns = [
    path('', SyncPlaceholderView.as_view(), name='sync'),
]
