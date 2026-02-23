from rest_framework import serializers
from .models import Tree, HealthLog, Species


class SpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Species
        fields = '__all__'


class HealthLogSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = HealthLog
        fields = ['id', 'tree', 'logged_by', 'logged_by_name', 'previous_health',
                  'health_status', 'photo', 'notes', 'logged_at']
        read_only_fields = ['id', 'logged_at', 'logged_by', 'previous_health']

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            return obj.logged_by.get_full_name() or obj.logged_by.username
        return None


class TreeListSerializer(serializers.ModelSerializer):
    species_name = serializers.SerializerMethodField()
    zone_name = serializers.SerializerMethodField()
    planted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Tree
        fields = ['id', 'tag_number', 'species', 'species_name', 'zone', 'zone_name',
                  'latitude', 'longitude', 'current_health', 'planted_date',
                  'photo', 'planted_by_name', 'location_description', 'created_at']

    def get_species_name(self, obj):
        return obj.species.common_name if obj.species else None

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone else None

    def get_planted_by_name(self, obj):
        if obj.planted_by:
            return obj.planted_by.get_full_name() or obj.planted_by.username
        return None


class TreeDetailSerializer(serializers.ModelSerializer):
    species_detail = SpeciesSerializer(source='species', read_only=True)
    health_logs = HealthLogSerializer(many=True, read_only=True)
    zone_name = serializers.SerializerMethodField()
    planted_by_name = serializers.SerializerMethodField()
    days_since_planted = serializers.SerializerMethodField()

    class Meta:
        model = Tree
        fields = ['id', 'tag_number', 'species', 'species_detail', 'zone', 'zone_name',
                  'planted_by', 'planted_by_name', 'latitude', 'longitude',
                  'location_description', 'current_health', 'planted_date',
                  'days_since_planted', 'height_cm', 'photo', 'notes',
                  'health_logs', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tag_number', 'created_at', 'updated_at']

    def get_zone_name(self, obj):
        return obj.zone.name if obj.zone else None

    def get_planted_by_name(self, obj):
        if obj.planted_by:
            return obj.planted_by.get_full_name() or obj.planted_by.username
        return None

    def get_days_since_planted(self, obj):
        from django.utils import timezone
        delta = timezone.now().date() - obj.planted_date
        return delta.days


class TreeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tree
        fields = ['species', 'zone', 'latitude', 'longitude', 'location_description',
                  'planted_date', 'height_cm', 'photo', 'notes', 'current_health']

    def create(self, validated_data):
        validated_data['planted_by'] = self.context['request'].user
        return super().create(validated_data)


class HealthUpdateSerializer(serializers.Serializer):
    health_status = serializers.ChoiceField(choices=Tree.HEALTH_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
    photo = serializers.ImageField(required=False)

    def update_tree_health(self, tree, validated_data):
        previous_health = tree.current_health
        new_health = validated_data['health_status']

        # Create health log
        HealthLog.objects.create(
            tree=tree,
            logged_by=self.context['request'].user,
            previous_health=previous_health,
            health_status=new_health,
            notes=validated_data.get('notes', ''),
            photo=validated_data.get('photo')
        )

        # Update tree
        tree.current_health = new_health
        tree.save(update_fields=['current_health', 'updated_at'])
        return tree
