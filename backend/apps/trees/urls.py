from django.urls import path
from .views import (
    TreeListCreateView, TreeDetailView, TreeHealthUpdateView,
    SpeciesListCreateView, MapDataView, TreeBulkCreateView,
    SatelliteDetectionProxyView
)

urlpatterns = [
    path('trees/map/', MapDataView.as_view(), name='tree_map'),
    path('trees/bulk-create/', TreeBulkCreateView.as_view(), name='tree_bulk_create'),
    path('trees/detect-satellite/', SatelliteDetectionProxyView.as_view(), name='tree_detect_satellite'),
    path('trees/', TreeListCreateView.as_view(), name='tree_list'),
    path('trees/<int:pk>/', TreeDetailView.as_view(), name='tree_detail'),
    path('trees/<int:pk>/health/', TreeHealthUpdateView.as_view(), name='tree_health'),
    path('species/', SpeciesListCreateView.as_view(), name='species_list'),
]
