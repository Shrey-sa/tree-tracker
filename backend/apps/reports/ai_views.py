"""
AI-powered features using Groq API (free tier) with LangChain-style prompting.
Models: llama-3.3-70b-versatile (text), llava-v1.5-7b-4096-preview (vision)
"""
import os
import json
import base64
import urllib.request
import urllib.error
import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
TEXT_MODEL = 'llama-3.3-70b-versatile'
VISION_MODEL = 'llama-4-scout-17b-16e-instruct'  # supports vision on Groq


def call_groq(messages, model=None, temperature=0.3, max_tokens=800):
    """Call Groq API — OpenAI-compatible format, completely free"""
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment")

    if model is None:
        model = TEXT_MODEL

    payload = json.dumps({
        'model': model,
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens,
        'response_format': {'type': 'json_object'},  # force JSON output
    }).encode('utf-8')

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            text = result['choices'][0]['message']['content']
            return text
    except urllib.error.HTTPError as e:
        error = e.read().decode()
        raise Exception(f"Groq API error {e.code}: {error}")


def call_groq_vision(image_base64, image_mime, prompt):
    """Call Groq vision model for image analysis"""
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment")

    payload = json.dumps({
        'model': VISION_MODEL,
        'messages': [{
            'role': 'user',
            'content': [
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': f'data:{image_mime};base64,{image_base64}'
                    }
                },
                {'type': 'text', 'text': prompt}
            ]
        }],
        'temperature': 0.2,
        'max_tokens': 600,
        'response_format': {'type': 'json_object'},
    }).encode('utf-8')

    req = urllib.request.Request(
        GROQ_API_URL,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result['choices'][0]['message']['content']
    except urllib.error.HTTPError as e:
        error = e.read().decode()
        raise Exception(f"Groq Vision API error {e.code}: {error}")


def parse_json_response(text):
    """Safely parse JSON from LLM response"""
    text = text.strip()
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
    return json.loads(text.strip())


class AIHealthDiagnosisView(APIView):
    """
    Analyze a tree photo with Groq vision model.
    POST /api/ai/health-diagnosis/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not os.environ.get('GROQ_API_KEY'):
            return Response({'error': 'AI features not configured. Set GROQ_API_KEY.'}, status=503)

        image_base64 = request.data.get('image_base64')
        image_mime = request.data.get('image_mime', 'image/jpeg')
        tree_info = request.data.get('tree_info', {})

        if not image_base64:
            return Response({'error': 'image_base64 is required'}, status=400)

        species = tree_info.get('species', 'Unknown')
        zone = tree_info.get('zone', 'Unknown')
        current_health = tree_info.get('current_health', 'unknown')

        prompt = f"""You are an expert urban arborist analyzing a tree photo.

Tree context: Species={species}, Zone={zone}, Current recorded health={current_health}

Analyze the photo carefully and respond with ONLY this JSON (no extra text):
{{
  "health_status": "healthy" or "at_risk" or "dead",
  "confidence": "high" or "medium" or "low",
  "diagnosis": "2-3 sentence description of what you observe",
  "issues_detected": ["issue1", "issue2"],
  "recommended_action": "Specific actionable recommendation",
  "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "none",
  "urgency": "urgent" or "high" or "medium" or "low"
}}"""

        try:
            print(f"[AI] Health diagnosis request for {species}")
            text = call_groq_vision(image_base64, image_mime, prompt)
            result = parse_json_response(text)
            print(f"[AI] Health diagnosis: {result.get('health_status')}")
            return Response({'success': True, 'diagnosis': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[AI] Health diagnosis error:\n{tb}")
            return Response({'error': str(e)}, status=500)


class AIMaintenanceAdvisorView(APIView):
    """
    Agentic maintenance advisor — reads zone data and suggests tasks.
    POST /api/ai/maintenance-advisor/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not os.environ.get('GROQ_API_KEY'):
            return Response({'error': 'AI features not configured. Set GROQ_API_KEY.'}, status=503)

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
        today = timezone.now().date()
        cutoff = timezone.now() - timedelta(days=14)

        total = trees.count()
        healthy = trees.filter(current_health='healthy').count()
        at_risk = trees.filter(current_health='at_risk').count()
        dead = trees.filter(current_health='dead').count()
        survival_rate = round((healthy / total * 100) if total else 0, 1)

        pending_tasks = MaintenanceTask.objects.filter(zone=zone, status='pending').count()
        overdue_tasks = MaintenanceTask.objects.filter(
            zone=zone, status='pending', due_date__lt=today
        ).count()
        uninspected = trees.exclude(health_logs__logged_at__gte=cutoff).distinct().count()

        species_list = list(
            trees.values_list('species__common_name', flat=True).distinct()
        )[:5]

        system_prompt = """You are an expert urban forestry maintenance advisor for a city municipality.
Your job is to analyze zone data and recommend specific, actionable maintenance tasks.
Always respond with valid JSON only."""

        user_prompt = f"""Analyze this zone and suggest maintenance tasks:

Zone: {zone.name}, {zone.city}
Total Trees: {total}
Healthy: {healthy} ({survival_rate}% survival rate)
At Risk: {at_risk} trees need attention
Dead: {dead} trees
Not Inspected in 14 Days: {uninspected} trees
Pending Tasks: {pending_tasks} ({overdue_tasks} overdue)
Species Present: {', '.join(s for s in species_list if s)}

Respond with ONLY this JSON:
{{
  "summary": "2-3 sentence analysis of zone situation",
  "priority_level": "urgent" or "high" or "medium" or "low",
  "recommended_tasks": [
    {{
      "title": "Task title",
      "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "remove",
      "priority": "urgent" or "high" or "medium" or "low",
      "reason": "Why this task is needed",
      "tree_count": number,
      "due_in_days": number
    }}
  ],
  "insights": ["insight1", "insight2", "insight3"]
}}"""

        try:
            print(f"[AI] Maintenance advisor for zone: {zone.name}")
            text = call_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ])
            result = parse_json_response(text)
            print(f"[AI] Advisor: {len(result.get('recommended_tasks', []))} tasks suggested")
            return Response({'success': True, 'zone': zone.name, 'advice': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[AI] Maintenance advisor error:\n{tb}")
            return Response({'error': str(e)}, status=500)


class AIReportSummarizerView(APIView):
    """
    Agentic report summarizer — reads all city data and generates executive insights.
    GET /api/ai/report-summary/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not os.environ.get('GROQ_API_KEY'):
            return Response({'error': 'AI features not configured. Set GROQ_API_KEY.'}, status=503)

        from apps.trees.models import Tree
        from apps.tasks.models import MaintenanceTask
        from apps.zones.models import Zone
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        this_month = today.replace(day=1)
        last_month = (this_month - timedelta(days=1)).replace(day=1)

        total = Tree.objects.count()
        healthy = Tree.objects.filter(current_health='healthy').count()
        at_risk = Tree.objects.filter(current_health='at_risk').count()
        dead = Tree.objects.filter(current_health='dead').count()
        survival_rate = round((healthy / total * 100) if total else 0, 1)

        planted_this_month = Tree.objects.filter(planted_date__gte=this_month).count()
        planted_last_month = Tree.objects.filter(
            planted_date__gte=last_month, planted_date__lt=this_month
        ).count()

        pending_tasks = MaintenanceTask.objects.filter(status='pending').count()
        overdue_tasks = MaintenanceTask.objects.filter(
            status='pending', due_date__lt=today
        ).count()
        completed_this_month = MaintenanceTask.objects.filter(
            status='completed', completed_at__date__gte=this_month
        ).count()

        zone_stats = []
        for z in Zone.objects.all():
            zt = Tree.objects.filter(zone=z)
            ztotal = zt.count()
            zhealthy = zt.filter(current_health='healthy').count()
            zone_stats.append({
                'name': z.name,
                'total': ztotal,
                'survival_rate': round((zhealthy / ztotal * 100) if ztotal else 0, 1)
            })
        zone_stats.sort(key=lambda x: x['survival_rate'])

        system_prompt = """You are a senior urban forestry analyst writing executive reports for city officials.
Be specific with numbers. Highlight both achievements and concerns.
Always respond with valid JSON only."""

        user_prompt = f"""Generate an executive report summary for this city's urban forest:

CITY TREE DATA:
Total Trees: {total}
Healthy: {healthy} ({survival_rate}% survival rate)
At Risk: {at_risk}
Dead: {dead}
Planted This Month: {planted_this_month} (vs {planted_last_month} last month)

MAINTENANCE STATUS:
Pending Tasks: {pending_tasks}
Overdue Tasks: {overdue_tasks}
Completed This Month: {completed_this_month}

ZONE PERFORMANCE (sorted worst to best):
{json.dumps(zone_stats, indent=2)}

Respond with ONLY this JSON:
{{
  "headline": "One punchy sentence summarizing city tree health",
  "overall_assessment": "excellent" or "good" or "concerning" or "critical",
  "executive_summary": "3-4 sentence paragraph for city officials with specific numbers",
  "key_wins": ["win1", "win2"],
  "key_concerns": ["concern1", "concern2"],
  "action_items": [
    {{"priority": "urgent" or "high" or "medium", "action": "Specific action"}}
  ],
  "month_comparison": "One sentence comparing this month vs last month"
}}"""

        try:
            print("[AI] Generating report summary...")
            text = call_groq([
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ], max_tokens=1000)
            result = parse_json_response(text)
            print(f"[AI] Report: {result.get('overall_assessment')}")
            return Response({'success': True, 'report': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[AI] Report summarizer error:\n{tb}")
            return Response({'error': str(e)}, status=500)