from django.contrib import admin
from .models import Tree, HealthLog, Species


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ['common_name', 'scientific_name', 'watering_frequency_days', 'native']
    search_fields = ['common_name', 'scientific_name']


@admin.register(Tree)
class TreeAdmin(admin.ModelAdmin):
    list_display = ['tag_number', 'species', 'zone', 'current_health', 'planted_date', 'planted_by']
    list_filter = ['current_health', 'zone', 'species']
    search_fields = ['tag_number', 'location_description', 'notes']
    readonly_fields = ['tag_number', 'created_at', 'updated_at']


@admin.register(HealthLog)
class HealthLogAdmin(admin.ModelAdmin):
    list_display = ['tree', 'health_status', 'previous_health', 'logged_by', 'logged_at']
    list_filter = ['health_status']
