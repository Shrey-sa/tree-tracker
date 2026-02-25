from rest_framework import generics, permissions, filters, status
from rest_framework.permissions import IsAuthenticated
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


class TreeBulkCreateView(APIView):
    """
    Bulk create trees from satellite detection results.
    POST /api/trees/bulk-create/
    Body: { trees: [{latitude, longitude, confidence}, ...], source: "satellite_detection" }
    Auto-assigns zone based on closest zone center.
    Auto-generates tag numbers.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.zones.models import Zone
        import math

        trees_data = request.data.get('trees', [])
        source_note = request.data.get('source', 'satellite_detection')

        if not trees_data:
            return Response({'error': 'No trees provided'}, status=400)

        if len(trees_data) > 200:
            return Response({'error': 'Max 200 trees per batch'}, status=400)

        zones = list(Zone.objects.all())
        if not zones:
            return Response({'error': 'No zones configured'}, status=400)

        def closest_zone(lat, lng):
            """Find nearest zone by Euclidean distance to center"""
            return min(zones, key=lambda z: math.sqrt(
                (z.center_lat - lat) ** 2 + (z.center_lng - lng) ** 2
            ))

        created = []
        skipped = 0

        for t in trees_data:
            lat = t.get('latitude')
            lng = t.get('longitude')
            confidence = t.get('confidence', 0)

            if lat is None or lng is None:
                skipped += 1
                continue

            # Skip very low confidence detections
            if confidence < 0.3:
                skipped += 1
                continue

            zone = closest_zone(lat, lng)

            tree = Tree.objects.create(
                latitude=round(lat, 6),
                longitude=round(lng, 6),
                zone=zone,
                planted_by=request.user,
                current_health='at_risk',  # Will be properly assessed after field inspection
                notes=f"Auto-detected via satellite imagery. Confidence: {round(confidence * 100)}%. Source: {source_note}",
            )
            created.append({
                'id': tree.id,
                'tag_number': tree.tag_number,
                'latitude': tree.latitude,
                'longitude': tree.longitude,
                'zone': zone.name,
            })

        return Response({
            'success': True,
            'created': len(created),
            'skipped': skipped,
            'trees': created,
        }, status=201)


class SatelliteDetectionProxyView(APIView):
    """
    Proxy endpoint for Hugging Face tree detection.
    Receives base64 image from frontend, forwards to HF API server-side
    (avoids CORS block on direct browser→HF calls).
    POST /api/trees/detect-satellite/
    Body: { image_base64: "...", mime_type: "image/jpeg" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import urllib.request
        import urllib.error
        import base64
        import os
        import json

        image_b64 = request.data.get('image_base64')
        mime_type = request.data.get('mime_type', 'image/jpeg')

        if not image_b64:
            return Response({'error': 'image_base64 required'}, status=400)

        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return Response({'error': 'Invalid base64 image'}, status=400)

        hf_token = os.environ.get('HF_TOKEN', '')
        url = 'https://api-inference.huggingface.co/models/facebook/detr-resnet-50'

        headers = {'Content-Type': mime_type}
        if hf_token:
            headers['Authorization'] = f'Bearer {hf_token}'

        try:
            req = urllib.request.Request(url, data=image_bytes, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode())
            return Response(result)

        except urllib.error.HTTPError as e:
            body = e.read().decode()
            # Model loading (cold start) — tell frontend to retry
            if e.code == 503:
                return Response({'error': 'model_loading', 'message': 'Model is warming up, retry in 10s'}, status=503)
            return Response({'error': f'HF API error {e.code}: {body}'}, status=502)

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class SatelliteDetectView(APIView):
    """
    Backend proxy for Hugging Face tree detection.
    Avoids CORS — browser can't call HF directly.
    POST /api/trees/detect-satellite/
    Body: { image_base64: "...", mime_type: "image/jpeg" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import urllib.request
        import base64
        import json
        import os

        image_base64 = request.data.get('image_base64')
        mime_type = request.data.get('mime_type', 'image/jpeg')

        if not image_base64:
            return Response({'error': 'image_base64 required'}, status=400)

        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            return Response({'error': 'Invalid base64 image'}, status=400)

        hf_token = os.environ.get('HF_TOKEN', '')
        headers = {'Content-Type': mime_type}
        if hf_token:
            headers['Authorization'] = f'Bearer {hf_token}'

        url = 'https://api-inference.huggingface.co/models/facebook/detr-resnet-50'

        try:
            req = urllib.request.Request(url, data=image_bytes, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode())
                return Response(result)

        except urllib.error.HTTPError as e:
            body = e.read().decode()
            # Model loading — tell frontend to retry
            if e.code == 503:
                return Response({'error': 'model_loading', 'message': 'Model warming up, retry in 15s'}, status=503)
            return Response({'error': f'HF API error {e.code}: {body}'}, status=502)

        except Exception as e:
            return Response({'error': str(e)}, status=500)
