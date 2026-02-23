from django.contrib import admin
from .models import Zone


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'tree_count', 'survival_rate', 'area_sq_km']
    search_fields = ['name', 'city']
