import os
import threading
import traceback
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def verify_cron_token(request):
    token = request.headers.get('X-Cron-Token') or request.GET.get('token')
    expected = os.environ.get('CRON_SECRET_TOKEN', '')
    return token == expected and expected != ''


@method_decorator(csrf_exempt, name='dispatch')
class SendOverdueAlertsView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        # Run synchronously so errors show in logs
        try:
            print("[CRON] Starting overdue alerts task...")
            from apps.tasks.tasks import send_overdue_task_alerts
            result = send_overdue_task_alerts()
            print(f"[CRON] Overdue alerts done: {result}")
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[CRON] Overdue alerts FAILED:\n{tb}")
            return JsonResponse({'status': 'error', 'message': str(e), 'traceback': tb}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class SendInspectionRemindersView(View):
    def post(self, request):
        if not verify_cron_token(request):
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        try:
            print("[CRON] Starting inspection reminders task...")
            from apps.trees.tasks import send_health_check_reminders
            result = send_health_check_reminders()
            print(f"[CRON] Inspection reminders done: {result}")
            return JsonResponse({'status': 'success', 'result': result})
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[CRON] Inspection reminders FAILED:\n{tb}")
            return JsonResponse({'status': 'error', 'message': str(e), 'traceback': tb}, status=500)