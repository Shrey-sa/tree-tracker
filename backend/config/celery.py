import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('treetracker')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'daily-overdue-alerts': {
        'task': 'apps.tasks.tasks.send_overdue_task_alerts',
        'schedule': crontab(hour=8, minute=0),
    },
    'daily-health-check-reminders': {
        'task': 'apps.trees.tasks.send_health_check_reminders',
        'schedule': crontab(hour=9, minute=0),
    },
}
