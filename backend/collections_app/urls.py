"""Collection URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import CollectionViewSet, FolderViewSet, RequestViewSet

router = DefaultRouter()
router.register(r'', CollectionViewSet, basename='collection')

# Nested routers for folders and requests
collection_router = nested_routers.NestedDefaultRouter(router, r'', lookup='collection')
collection_router.register(r'folders', FolderViewSet, basename='collection-folders')
collection_router.register(r'requests', RequestViewSet, basename='collection-requests')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(collection_router.urls)),
]
