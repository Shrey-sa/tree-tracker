from django.urls import path
from . import ai_views

urlpatterns = [
    path('ai/health-diagnosis/', ai_views.AIHealthDiagnosisView.as_view(), name='ai_health_diagnosis'),
    path('ai/maintenance-advisor/', ai_views.AIMaintenanceAdvisorView.as_view(), name='ai_maintenance_advisor'),
    path('ai/report-summary/', ai_views.AIReportSummarizerView.as_view(), name='ai_report_summary'),
]
