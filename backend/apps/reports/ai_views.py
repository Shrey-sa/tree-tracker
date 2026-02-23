"""
AI-powered features using Google Gemini API
1. Health Diagnosis - analyze tree photo
2. Maintenance Advisor - suggest tasks for a zone
3. Report Summarizer - generate insights from dashboard data
"""
import os
import json
import base64
import urllib.request
import urllib.error
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response


GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_TEXT_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key={GEMINI_API_KEY}'
GEMINI_VISION_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key={GEMINI_API_KEY}'


def call_gemini(payload):
    """Make a call to Gemini API"""
    api_key = os.environ.get('GEMINI_API_KEY', '')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key={api_key}'

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result['candidates'][0]['content']['parts'][0]['text']
    except urllib.error.HTTPError as e:
        error = e.read().decode()
        raise Exception(f"Gemini API error {e.code}: {error}")


class AIHealthDiagnosisView(APIView):
    """
    Analyze a tree photo and suggest health status + diagnosis.
    POST /api/ai/health-diagnosis/
    Body: { "image_base64": "...", "image_mime": "image/jpeg", "tree_info": {...} }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not os.environ.get('GEMINI_API_KEY'):
            return Response({'error': 'AI features not configured'}, status=503)

        image_base64 = request.data.get('image_base64')
        image_mime = request.data.get('image_mime', 'image/jpeg')
        tree_info = request.data.get('tree_info', {})

        if not image_base64:
            return Response({'error': 'image_base64 is required'}, status=400)

        species = tree_info.get('species', 'Unknown species')
        zone = tree_info.get('zone', 'Unknown zone')
        current_health = tree_info.get('current_health', 'unknown')

        prompt = f"""You are an expert urban arborist and tree health specialist.

Analyze this tree photo and provide a detailed health assessment.

Tree Information:
- Species: {species}
- Zone: {zone}
- Current recorded health: {current_health}

Please respond in this EXACT JSON format (no markdown, no extra text):
{{
  "health_status": "healthy" or "at_risk" or "dead",
  "confidence": "high" or "medium" or "low",
  "diagnosis": "2-3 sentence description of what you observe in the photo",
  "issues_detected": ["issue1", "issue2"],
  "recommended_action": "Specific actionable recommendation",
  "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "none",
  "urgency": "urgent" or "high" or "medium" or "low"
}}"""

        payload = {
            "contents": [{
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": image_mime,
                            "data": image_base64
                        }
                    },
                    {"text": prompt}
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 500,
            }
        }

        try:
            text = call_gemini(payload)
            # Clean JSON if wrapped in markdown
            text = text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            result = json.loads(text.strip())
            return Response({'success': True, 'diagnosis': result})
        except json.JSONDecodeError:
            return Response({'success': True, 'diagnosis': {'raw_response': text}})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AIMaintenanceAdvisorView(APIView):
    """
    Analyze a zone's tree data and suggest maintenance tasks.
    POST /api/ai/maintenance-advisor/
    Body: { "zone_id": 1 }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not os.environ.get('GEMINI_API_KEY'):
            return Response({'error': 'AI features not configured'}, status=503)

        zone_id = request.data.get('zone_id')
        if not zone_id:
            return Response({'error': 'zone_id is required'}, status=400)

        from apps.zones.models import Zone
        from apps.trees.models import Tree
        from apps.tasks.models import MaintenanceTask
        from django.utils import timezone
        from datetime import timedelta

        try:
            zone = Zone.objects.get(id=zone_id)
        except Zone.DoesNotExist:
            return Response({'error': 'Zone not found'}, status=404)

        trees = Tree.objects.filter(zone=zone).select_related('species')
        tasks = MaintenanceTask.objects.filter(zone=zone, status='pending')
        today = timezone.now().date()
        cutoff = timezone.now() - timedelta(days=14)

        # Build zone summary
        total = trees.count()
        healthy = trees.filter(current_health='healthy').count()
        at_risk = trees.filter(current_health='at_risk').count()
        dead = trees.filter(current_health='dead').count()
        pending_tasks = tasks.count()
        overdue_tasks = tasks.filter(due_date__lt=today).count()
        uninspected = trees.exclude(
            health_logs__logged_at__gte=cutoff
        ).count()

        species_breakdown = {}
        for t in trees:
            name = t.species.common_name if t.species else 'Unknown'
            species_breakdown[name] = species_breakdown.get(name, 0) + 1

        prompt = f"""You are an expert urban forestry maintenance advisor for a city municipality.

Analyze this zone data and suggest specific maintenance tasks:

Zone: {zone.name}, {zone.city}
Total Trees: {total}
Health Status: {healthy} healthy ({round(healthy/total*100) if total else 0}%), {at_risk} at risk ({round(at_risk/total*100) if total else 0}%), {dead} dead ({round(dead/total*100) if total else 0}%)
Trees Not Inspected in 14 Days: {uninspected}
Pending Tasks: {pending_tasks} ({overdue_tasks} overdue)
Species: {json.dumps(species_breakdown)}

Based on this data, suggest 3-5 specific maintenance tasks. Consider:
- At-risk trees need immediate attention
- Uninspected trees need inspection
- Overdue tasks are critical
- Dead trees may need removal

Respond in this EXACT JSON format (no markdown, no extra text):
{{
  "summary": "2-3 sentence analysis of the zone's current situation",
  "priority_level": "urgent" or "high" or "medium" or "low",
  "recommended_tasks": [
    {{
      "title": "Task title",
      "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "remove",
      "priority": "urgent" or "high" or "medium" or "low",
      "reason": "Why this task is needed",
      "tree_count": number of trees this applies to,
      "due_in_days": suggested days until due
    }}
  ],
  "insights": ["insight1", "insight2", "insight3"]
}}"""

        try:
            text = call_gemini({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800}
            })
            text = text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            result = json.loads(text.strip())
            return Response({'success': True, 'zone': zone.name, 'advice': result})
        except json.JSONDecodeError:
            return Response({'success': True, 'advice': {'raw_response': text}})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AIReportSummarizerView(APIView):
    """
    Generate natural language insights from dashboard data.
    GET /api/ai/report-summary/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not os.environ.get('GEMINI_API_KEY'):
            return Response({'error': 'AI features not configured'}, status=503)

        from apps.trees.models import Tree
        from apps.tasks.models import MaintenanceTask
        from apps.zones.models import Zone
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

        # Gather stats
        total_trees = Tree.objects.count()
        healthy = Tree.objects.filter(current_health='healthy').count()
        at_risk = Tree.objects.filter(current_health='at_risk').count()
        dead = Tree.objects.filter(current_health='dead').count()
        survival_rate = round((healthy / total_trees * 100) if total_trees else 0, 1)

        planted_this_month = Tree.objects.filter(planted_date__gte=this_month_start).count()
        planted_last_month = Tree.objects.filter(
            planted_date__gte=last_month_start,
            planted_date__lt=this_month_start
        ).count()

        pending_tasks = MaintenanceTask.objects.filter(status='pending').count()
        overdue_tasks = MaintenanceTask.objects.filter(
            status='pending', due_date__lt=today
        ).count()
        completed_this_month = MaintenanceTask.objects.filter(
            status='completed',
            completed_at__date__gte=this_month_start
        ).count()

        zones = Zone.objects.all()
        zone_stats = []
        for z in zones:
            ztrees = Tree.objects.filter(zone=z)
            ztotal = ztrees.count()
            zhealthy = ztrees.filter(current_health='healthy').count()
            zone_stats.append({
                'name': z.name,
                'total': ztotal,
                'survival_rate': round((zhealthy / ztotal * 100) if ztotal else 0, 1)
            })

        # Sort zones by survival rate
        zone_stats.sort(key=lambda x: x['survival_rate'])
        worst_zone = zone_stats[0] if zone_stats else None
        best_zone = zone_stats[-1] if zone_stats else None

        prompt = f"""You are an expert urban forestry analyst writing a report for city officials.

Current City Tree Data:
- Total Trees: {total_trees}
- Healthy: {healthy} ({survival_rate}% survival rate)
- At Risk: {at_risk}
- Dead: {dead}
- Planted This Month: {planted_this_month} (vs {planted_last_month} last month)

Maintenance:
- Pending Tasks: {pending_tasks}
- Overdue Tasks: {overdue_tasks}
- Completed This Month: {completed_this_month}

Zone Performance:
- Best Zone: {best_zone['name'] if best_zone else 'N/A'} ({best_zone['survival_rate'] if best_zone else 0}% survival)
- Worst Zone: {worst_zone['name'] if worst_zone else 'N/A'} ({worst_zone['survival_rate'] if worst_zone else 0}% survival)
- All Zones: {json.dumps(zone_stats)}

Write a professional report summary. Be specific with numbers. Highlight concerns and wins.

Respond in this EXACT JSON format (no markdown, no extra text):
{{
  "headline": "One punchy sentence summarizing the city's tree health",
  "overall_assessment": "good" or "concerning" or "critical" or "excellent",
  "executive_summary": "3-4 sentence paragraph for city officials",
  "key_wins": ["win1", "win2"],
  "key_concerns": ["concern1", "concern2"],
  "action_items": [
    {{"priority": "urgent" or "high" or "medium", "action": "Specific action to take"}}
  ],
  "month_comparison": "One sentence comparing this month to last month"
}}"""

        try:
            text = call_gemini({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 800}
            })
            text = text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            result = json.loads(text.strip())
            return Response({'success': True, 'report': result})
        except json.JSONDecodeError:
            return Response({'success': True, 'report': {'raw_response': text}})
        except Exception as e:
            return Response({'error': str(e)}, status=500)