from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Q
import io


class DashboardSummaryView(APIView):
    """City-wide dashboard stats for admin"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.trees.models import Tree
        from apps.tasks.models import MaintenanceTask
        from apps.zones.models import Zone

        today = timezone.now().date()

        total_trees = Tree.objects.count()
        healthy = Tree.objects.filter(current_health='healthy').count()
        at_risk = Tree.objects.filter(current_health='at_risk').count()
        dead = Tree.objects.filter(current_health='dead').count()

        survival_rate = round(((healthy + at_risk) / total_trees * 100), 1) if total_trees else 0

        pending_tasks = MaintenanceTask.objects.filter(status='pending').count()
        overdue_tasks = MaintenanceTask.objects.filter(
            status='pending', due_date__lt=today
        ).count()
        completed_this_month = MaintenanceTask.objects.filter(
            status='completed',
            completed_at__month=today.month,
            completed_at__year=today.year
        ).count()

        # Trees planted this month
        planted_this_month = Tree.objects.filter(
            planted_date__month=today.month,
            planted_date__year=today.year
        ).count()

        # Zone breakdown
        zones = Zone.objects.annotate(
            total=Count('trees'),
            healthy_count=Count('trees', filter=Q(trees__current_health='healthy')),
            at_risk_count=Count('trees', filter=Q(trees__current_health='at_risk')),
            dead_count=Count('trees', filter=Q(trees__current_health='dead')),
        ).values('id', 'name', 'city', 'total', 'healthy_count', 'at_risk_count', 'dead_count')

        # Recent health changes (last 7 days)
        from apps.trees.models import HealthLog
        recent_changes = HealthLog.objects.filter(
            logged_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).select_related('tree', 'logged_by').order_by('-logged_at')[:10]

        recent_activity = [
            {
                'tree_tag': log.tree.tag_number,
                'from': log.previous_health,
                'to': log.health_status,
                'by': log.logged_by.get_full_name() if log.logged_by else 'Unknown',
                'at': log.logged_at.isoformat(),
            }
            for log in recent_changes
        ]

        return Response({
            'trees': {
                'total': total_trees,
                'healthy': healthy,
                'at_risk': at_risk,
                'dead': dead,
                'survival_rate': survival_rate,
                'planted_this_month': planted_this_month,
            },
            'tasks': {
                'pending': pending_tasks,
                'overdue': overdue_tasks,
                'completed_this_month': completed_this_month,
            },
            'zones': list(zones),
            'recent_activity': recent_activity,
        })


class MonthlyTrendView(APIView):
    """Monthly tree planting and health trends"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.trees.models import Tree
        from django.db.models.functions import TruncMonth

        months = Tree.objects.annotate(
            month=TruncMonth('planted_date')
        ).values('month').annotate(
            planted=Count('id'),
            healthy=Count('id', filter=Q(current_health='healthy')),
            dead=Count('id', filter=Q(current_health='dead')),
        ).order_by('month')[-12:]

        return Response(list(months))


class ExportReportView(APIView):
    """Export PDF summary report"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.units import inch
        except ImportError:
            return Response({'error': 'reportlab not installed'}, status=500)

        from apps.trees.models import Tree
        from apps.zones.models import Zone
        from django.db.models import Count, Q

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph("🌳 Tree & Green Asset Tracker", styles['Title']))
        story.append(Paragraph(
            f"Summary Report — Generated on {timezone.now().strftime('%B %d, %Y')}",
            styles['Normal']
        ))
        story.append(Spacer(1, 0.3 * inch))

        # City-wide stats
        total = Tree.objects.count()
        healthy = Tree.objects.filter(current_health='healthy').count()
        at_risk = Tree.objects.filter(current_health='at_risk').count()
        dead = Tree.objects.filter(current_health='dead').count()
        survival = round(((healthy + at_risk) / total * 100), 1) if total else 0

        story.append(Paragraph("City-Wide Summary", styles['Heading2']))
        summary_data = [
            ['Metric', 'Count'],
            ['Total Trees', str(total)],
            ['Healthy', str(healthy)],
            ['At Risk', str(at_risk)],
            ['Dead', str(dead)],
            ['Survival Rate', f"{survival}%"],
        ]
        t = Table(summary_data, colWidths=[3 * inch, 2 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d6a4f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f0')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3 * inch))

        # Zone breakdown
        story.append(Paragraph("Zone-wise Breakdown", styles['Heading2']))
        zones = Zone.objects.annotate(
            total=Count('trees'),
            h=Count('trees', filter=Q(trees__current_health='healthy')),
            r=Count('trees', filter=Q(trees__current_health='at_risk')),
            d=Count('trees', filter=Q(trees__current_health='dead')),
        )

        zone_data = [['Zone', 'Total', 'Healthy', 'At Risk', 'Dead', 'Survival %']]
        for z in zones:
            sr = round(((z.h + z.r) / z.total * 100), 1) if z.total else 0
            zone_data.append([z.name, z.total, z.h, z.r, z.d, f"{sr}%"])

        zt = Table(zone_data, colWidths=[2 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch, 0.7 * inch, 1 * inch])
        zt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#52b788')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f0')]),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
        ]))
        story.append(zt)

        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="tree-tracker-report-{timezone.now().date()}.pdf"'
        return response


class ExportCSVView(APIView):
    """Export all trees as CSV"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import csv
        from apps.trees.models import Tree

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="trees-{timezone.now().date()}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Tag Number', 'Species', 'Zone', 'Latitude', 'Longitude',
            'Health Status', 'Planted Date', 'Height (cm)', 'Location Description',
            'Planted By', 'Notes'
        ])

        trees = Tree.objects.select_related('species', 'zone', 'planted_by').all()
        for tree in trees:
            writer.writerow([
                tree.tag_number,
                tree.species.common_name if tree.species else '',
                tree.zone.name,
                tree.latitude,
                tree.longitude,
                tree.current_health,
                tree.planted_date,
                tree.height_cm or '',
                tree.location_description,
                tree.planted_by.get_full_name() if tree.planted_by else '',
                tree.notes,
            ])

        return response
