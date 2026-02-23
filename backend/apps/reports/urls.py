from django.urls import path
from .views import DashboardSummaryView, MonthlyTrendView, ExportReportView, ExportCSVView

urlpatterns = [
    path('reports/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('reports/trends/', MonthlyTrendView.as_view(), name='monthly_trends'),
    path('reports/export/pdf/', ExportReportView.as_view(), name='export_pdf'),
    path('reports/export/csv/', ExportCSVView.as_view(), name='export_csv'),
]
