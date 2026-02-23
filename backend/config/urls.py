from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.reports import cron_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.zones.urls')),
    path('api/', include('apps.trees.urls')),
    path('api/', include('apps.tasks.urls')),
    path('api/', include('apps.reports.urls')),
    path('api/cron/overdue-alerts/', cron_views.SendOverdueAlertsView.as_view()),
    path('api/cron/inspection-reminders/', cron_views.SendInspectionRemindersView.as_view()),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
