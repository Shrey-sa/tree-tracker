"""
Secure endpoints for GitHub Actions cron jobs to trigger email tasks.
Protected by a secret token so only authorized callers can trigger them.
"""
import os
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def verify_cron_token(request):
    """Check the request has the correct cron secret token"""
    token = request.headers.get('X-Cron-Token') or request.GET.get('token')
    expected = os.environ.get('CRON_SECRET_TOKEN', '')
    return token == expected and expected != ''


@method_decorator(csrf_exempt, name='dispatch')
class SendOverdueAlertsView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            from apps.tasks.tasks import send_overdue_task_alerts
            result = send_overdue_task_alerts()
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class SendInspectionRemindersView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            from apps.trees.tasks import send_health_check_reminders
            result = send_health_check_reminders()
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
