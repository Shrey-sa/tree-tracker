from rest_framework import serializers
from .models import Zone


class ZoneSerializer(serializers.ModelSerializer):
    tree_count = serializers.ReadOnlyField()
    healthy_count = serializers.ReadOnlyField()
    survival_rate = serializers.ReadOnlyField()

    class Meta:
        model = Zone
        fields = ['id', 'name', 'city', 'description', 'center_lat', 'center_lng',
                  'area_sq_km', 'tree_count', 'healthy_count', 'survival_rate',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ZoneStatsSerializer(serializers.ModelSerializer):
    total_trees = serializers.SerializerMethodField()
    healthy_trees = serializers.SerializerMethodField()
    at_risk_trees = serializers.SerializerMethodField()
    dead_trees = serializers.SerializerMethodField()
    survival_rate = serializers.ReadOnlyField()
    pending_tasks = serializers.SerializerMethodField()
    overdue_tasks = serializers.SerializerMethodField()

    class Meta:
        model = Zone
        fields = ['id', 'name', 'city', 'total_trees', 'healthy_trees',
                  'at_risk_trees', 'dead_trees', 'survival_rate',
                  'pending_tasks', 'overdue_tasks']

    def get_total_trees(self, obj):
        return obj.trees.count()

    def get_healthy_trees(self, obj):
        return obj.trees.filter(current_health='healthy').count()

    def get_at_risk_trees(self, obj):
        return obj.trees.filter(current_health='at_risk').count()

    def get_dead_trees(self, obj):
        return obj.trees.filter(current_health='dead').count()

    def get_pending_tasks(self, obj):
        return obj.maintenance_tasks.filter(status='pending').count()

    def get_overdue_tasks(self, obj):
        from django.utils import timezone
        return obj.maintenance_tasks.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).count()
