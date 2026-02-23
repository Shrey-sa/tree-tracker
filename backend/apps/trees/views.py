from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from .models import Tree, HealthLog, Species
from .serializers import (
    TreeListSerializer, TreeDetailSerializer, TreeCreateSerializer,
    HealthUpdateSerializer, HealthLogSerializer, SpeciesSerializer
)


class TreeFilter(django_filters.FilterSet):
    health = django_filters.CharFilter(field_name='current_health')
    zone = django_filters.NumberFilter(field_name='zone')
    species = django_filters.NumberFilter(field_name='species')
    planted_after = django_filters.DateFilter(field_name='planted_date', lookup_expr='gte')
    planted_before = django_filters.DateFilter(field_name='planted_date', lookup_expr='lte')

    class Meta:
        model = Tree
        fields = ['health', 'zone', 'species', 'planted_after', 'planted_before']


class TreeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = TreeFilter
    search_fields = ['tag_number', 'location_description', 'notes']
    ordering_fields = ['planted_date', 'created_at', 'current_health']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TreeCreateSerializer
        return TreeListSerializer

    def get_queryset(self):
        return Tree.objects.select_related('species', 'zone', 'planted_by').all()


class TreeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TreeCreateSerializer
        return TreeDetailSerializer

    def get_queryset(self):
        return Tree.objects.select_related(
            'species', 'zone', 'planted_by'
        ).prefetch_related('health_logs__logged_by').all()


class TreeHealthUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        tree = Tree.objects.get(pk=pk)
        serializer = HealthUpdateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            updated_tree = serializer.update_tree_health(tree, serializer.validated_data)
            return Response(TreeDetailSerializer(updated_tree).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SpeciesListCreateView(generics.ListCreateAPIView):
    queryset = Species.objects.all()
    serializer_class = SpeciesSerializer
    permission_classes = [permissions.IsAuthenticated]


class MapDataView(APIView):
    """Returns lightweight tree data optimized for map rendering"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Tree.objects.select_related('species', 'zone').all()

        # Apply filters
        zone = request.query_params.get('zone')
        health = request.query_params.get('health')
        if zone:
            queryset = queryset.filter(zone=zone)
        if health:
            queryset = queryset.filter(current_health=health)

        data = queryset.values(
            'id', 'latitude', 'longitude', 'current_health',
            'tag_number', 'species__common_name', 'zone__name',
            'planted_date', 'photo'
        )
        return Response(list(data))


class TreeCeleryTaskView(APIView):
    """Celery tasks placeholder"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .tasks import send_health_check_reminders
        send_health_check_reminders.delay()
        return Response({'message': 'Health check reminder task queued.'})
