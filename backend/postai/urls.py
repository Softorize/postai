"""
URL configuration for PostAI project.
"""
from django.urls import path, include

urlpatterns = [
    path('api/v1/', include([
        path('health/', include('core.urls')),
        path('collections/', include('collections_app.urls')),
        path('environments/', include('environments_app.urls')),
        path('requests/', include('requests_app.urls')),
        path('workflows/', include('workflows_app.urls')),
        path('mcp/', include('mcp_app.urls')),
        path('ai/', include('ai_app.urls')),
        path('proxy/', include('proxy_app.urls')),
        path('sync/', include('sync_app.urls')),
    ])),
]
