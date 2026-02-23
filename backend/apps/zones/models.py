from django.db import models


class Zone(models.Model):
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    # Store as JSON: {"lat": 12.97, "lng": 77.59, "radius_km": 5}
    # For production with PostGIS: use gis_models.PolygonField()
    center_lat = models.FloatField(default=0)
    center_lng = models.FloatField(default=0)
    area_sq_km = models.FloatField(default=0, help_text="Area in square kilometers")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name}, {self.city}"

    @property
    def tree_count(self):
        return self.trees.count()

    @property
    def healthy_count(self):
        return self.trees.filter(current_health='healthy').count()

    @property
    def survival_rate(self):
        total = self.tree_count
        if total == 0:
            return 0
        alive = self.trees.exclude(current_health='dead').count()
        return round((alive / total) * 100, 1)
