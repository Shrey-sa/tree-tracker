import os
import json
import threading
import traceback
import urllib.request
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def verify_cron_token(request):
    token = request.headers.get('X-Cron-Token') or request.GET.get('token')
    expected = os.environ.get('CRON_SECRET_TOKEN', '')
    return token == expected and expected != ''


def send_email_via_resend(to_email, subject, html_body):
    """Send email using Resend HTTP API (port 443 - not blocked by Render)"""
    api_key = os.environ.get('RESEND_API_KEY', '')
    if not api_key:
        raise ValueError("RESEND_API_KEY not set")

    from_email = os.environ.get('DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')
    # Extract just the email if format is "Name <email>"
    if '<' in from_email:
        from_email = from_email.split('<')[1].strip('>')

    payload = json.dumps({
        'from': from_email,
        'to': [to_email],
        'subject': subject,
        'html': html_body,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.resend.com/emails',
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
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise Exception(f"Resend API error {e.code}: {error_body}")


@method_decorator(csrf_exempt, name='dispatch')
class SendOverdueAlertsView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            print("[CRON] Starting overdue alerts...")
            from apps.tasks.tasks import send_overdue_task_alerts_resend
            result = send_overdue_task_alerts_resend(send_email_via_resend)
            print(f"[CRON] Done: {result}")
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[CRON] FAILED:\n{tb}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class SendInspectionRemindersView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            print("[CRON] Starting inspection reminders...")
            from apps.trees.tasks import send_health_check_reminders_resend
            result = send_health_check_reminders_resend(send_email_via_resend)
            print(f"[CRON] Done: {result}")
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[CRON] FAILED:\n{tb}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)