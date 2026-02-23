from django.urls import path
from .views import ZoneListCreateView, ZoneDetailView, ZoneStatsView

urlpatterns = [
    path('zones/', ZoneListCreateView.as_view(), name='zone_list'),
    path('zones/<int:pk>/', ZoneDetailView.as_view(), name='zone_detail'),
    path('zones/<int:pk>/stats/', ZoneStatsView.as_view(), name='zone_stats'),
]
