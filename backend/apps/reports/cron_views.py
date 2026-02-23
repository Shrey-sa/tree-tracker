"""
Secure endpoints for GitHub Actions cron jobs to trigger email tasks.
Returns immediately and runs email task in a background thread.
"""
import os
import threading
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def verify_cron_token(request):
    token = request.headers.get('X-Cron-Token') or request.GET.get('token')
    expected = os.environ.get('CRON_SECRET_TOKEN', '')
    return token == expected and expected != ''


def run_in_background(fn):
    """Run a function in a background thread"""
    t = threading.Thread(target=fn, daemon=True)
    t.start()


@method_decorator(csrf_exempt, name='dispatch')
class SendOverdueAlertsView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        def task():
            try:
                from apps.tasks.tasks import send_overdue_task_alerts
                result = send_overdue_task_alerts()
                print(f"[CRON] Overdue alerts: {result}")
            except Exception as e:
                print(f"[CRON] Overdue alerts error: {e}")

        run_in_background(task)
        return JsonResponse({'status': 'accepted', 'message': 'Overdue alerts job started'})


@method_decorator(csrf_exempt, name='dispatch')
class SendInspectionRemindersView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        def task():
            try:
                from apps.trees.tasks import send_health_check_reminders
                result = send_health_check_reminders()
                print(f"[CRON] Inspection reminders: {result}")
            except Exception as e:
                print(f"[CRON] Inspection reminders error: {e}")

        run_in_background(task)
        return JsonResponse({'status': 'accepted', 'message': 'Inspection reminders job started'})