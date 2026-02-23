from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django_filters import rest_framework as django_filters
from .models import MaintenanceTask
from .serializers import MaintenanceTaskSerializer, TaskCompleteSerializer
from apps.accounts.permissions import IsAdminOrSupervisor


class TaskFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    zone = django_filters.NumberFilter(field_name='zone')
    task_type = django_filters.CharFilter(field_name='task_type')
    priority = django_filters.CharFilter(field_name='priority')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to')
    overdue = django_filters.BooleanFilter(method='filter_overdue')

    def filter_overdue(self, queryset, name, value):
        if value:
            return queryset.filter(status='pending', due_date__lt=timezone.now().date())
        return queryset

    class Meta:
        model = MaintenanceTask
        fields = ['status', 'zone', 'task_type', 'priority', 'assigned_to']


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = MaintenanceTaskSerializer
    filterset_class = TaskFilter
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'priority', 'created_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrSupervisor()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = MaintenanceTask.objects.select_related(
            'assigned_to', 'created_by', 'zone', 'tree'
        ).all()

        # Field workers only see their own tasks
        if user.role == 'field_worker':
            queryset = queryset.filter(assigned_to=user)

        return queryset


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceTask.objects.select_related('assigned_to', 'created_by', 'zone', 'tree').all()
    serializer_class = MaintenanceTaskSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminOrSupervisor()]
        return [permissions.IsAuthenticated()]


class TaskCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = MaintenanceTask.objects.get(pk=pk)

        # Only assigned worker, supervisor, or admin can complete
        if (request.user.role == 'field_worker' and task.assigned_to != request.user):
            return Response(
                {'detail': 'You can only complete tasks assigned to you.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TaskCompleteSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            task = serializer.complete_task(task, serializer.validated_data, request.user)
            return Response(MaintenanceTaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
