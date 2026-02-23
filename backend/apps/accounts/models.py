from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('supervisor', 'Supervisor'),
        ('field_worker', 'Field Worker'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='field_worker')
    phone = models.CharField(max_length=15, blank=True)
    zone = models.ForeignKey(
        'zones.Zone',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workers'
    )
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_supervisor(self):
        return self.role == 'supervisor'

    @property
    def is_field_worker(self):
        return self.role == 'field_worker'
