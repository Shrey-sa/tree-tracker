from rest_framework import serializers
from django.utils import timezone
from .models import MaintenanceTask


class MaintenanceTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    zone_name = serializers.SerializerMethodField()
    tree_tag = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = MaintenanceTask
        fields = [
            'id', 'title', 'description', 'task_type', 'priority',
            'created_by', 'created_by_name', 'assigned_to', 'assigned_to_name',
            'zone', 'zone_name', 'tree', 'tree_tag',
            'due_date', 'status', 'is_overdue',
            'completion_notes', 'completion_photo', 'completed_at', 'completed_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by',
                            'completed_at', 'completed_by']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone else None

    def get_tree_tag(self, obj):
        return obj.tree.tag_number if obj.tree else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskCompleteSerializer(serializers.Serializer):
    completion_notes = serializers.CharField(required=False, allow_blank=True)
    completion_photo = serializers.ImageField(required=False)

    def complete_task(self, task, validated_data, user):
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.completed_by = user
        task.completion_notes = validated_data.get('completion_notes', '')
        if 'completion_photo' in validated_data:
            task.completion_photo = validated_data['completion_photo']
        task.save()
        return task
