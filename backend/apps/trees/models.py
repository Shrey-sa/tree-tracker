from django.db import models
from django.conf import settings


class Species(models.Model):
    common_name = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    watering_frequency_days = models.IntegerField(default=7)
    native = models.BooleanField(default=True)
    icon = models.CharField(max_length=10, default='🌳')

    class Meta:
        verbose_name_plural = 'Species'
        ordering = ['common_name']

    def __str__(self):
        return f"{self.common_name} ({self.scientific_name})"


class Tree(models.Model):
    HEALTH_CHOICES = [
        ('healthy', 'Healthy'),
        ('at_risk', 'At Risk'),
        ('dead', 'Dead'),
    ]

    species = models.ForeignKey(Species, on_delete=models.SET_NULL, null=True, related_name='trees')
    zone = models.ForeignKey('zones.Zone', on_delete=models.CASCADE, related_name='trees')
    planted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='planted_trees'
    )

    # Location
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_description = models.CharField(max_length=255, blank=True,
                                            help_text="e.g. Near Gate 3, South side")

    # Status
    current_health = models.CharField(max_length=20, choices=HEALTH_CHOICES, default='healthy')
    planted_date = models.DateField()
    height_cm = models.IntegerField(null=True, blank=True)
    tag_number = models.CharField(max_length=50, unique=True, blank=True, null=True,
                                  help_text="Physical tag on the tree")

    # Media
    photo = models.ImageField(upload_to='trees/%Y/%m/', blank=True, null=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Tree #{self.id} - {self.species} ({self.zone})"

    def save(self, *args, **kwargs):
        # Auto-generate tag if not provided
        if not self.tag_number:
            super().save(*args, **kwargs)
            self.tag_number = f"TRK-{self.id:05d}"
            Tree.objects.filter(pk=self.pk).update(tag_number=self.tag_number)
        else:
            super().save(*args, **kwargs)


class HealthLog(models.Model):
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='health_logs')
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    previous_health = models.CharField(max_length=20, blank=True)
    health_status = models.CharField(max_length=20, choices=Tree.HEALTH_CHOICES)
    photo = models.ImageField(upload_to='health_logs/%Y/%m/', blank=True, null=True)
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']

    def __str__(self):
        return f"Health log for Tree #{self.tree_id} - {self.health_status}"
