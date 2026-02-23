from django.db import models
from django.conf import settings


class MaintenanceTask(models.Model):
    TASK_TYPES = [
        ('water', 'Water'),
        ('prune', 'Prune'),
        ('treat', 'Treat for Disease'),
        ('fertilize', 'Fertilize'),
        ('inspect', 'Inspect'),
        ('remove', 'Remove Dead Tree'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')

    # Assignment
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_tasks'
    )
    zone = models.ForeignKey(
        'zones.Zone',
        on_delete=models.CASCADE,
        related_name='maintenance_tasks'
    )
    tree = models.ForeignKey(
        'trees.Tree',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks',
        help_text="Leave blank for zone-wide tasks"
    )

    # Timing
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Completion
    completion_notes = models.TextField(blank=True)
    completion_photo = models.ImageField(upload_to='task_completions/%Y/%m/', blank=True, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_tasks'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', '-priority']

    def __str__(self):
        return f"{self.title} - {self.zone.name} ({self.status})"

    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == 'pending' and self.due_date < timezone.now().date()
