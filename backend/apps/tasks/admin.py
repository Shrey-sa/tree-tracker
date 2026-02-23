from django.contrib import admin
from .models import MaintenanceTask


@admin.register(MaintenanceTask)
class MaintenanceTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task_type', 'priority', 'zone', 'assigned_to', 'due_date', 'status', 'is_overdue']
    list_filter = ['status', 'task_type', 'priority', 'zone']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
