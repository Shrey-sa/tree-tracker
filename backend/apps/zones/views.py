from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Zone
from .serializers import ZoneSerializer, ZoneStatsSerializer
from apps.accounts.permissions import IsAdminOrSupervisor


class ZoneListCreateView(generics.ListCreateAPIView):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrSupervisor()]
        return [permissions.IsAuthenticated()]


class ZoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminOrSupervisor()]
        return [permissions.IsAuthenticated()]


class ZoneStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        zone = Zone.objects.get(pk=pk)
        serializer = ZoneStatsSerializer(zone)
        return Response(serializer.data)
