from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from django.conf import settings


def send_html_email(subject, to_email, text_body, html_body):
    """Helper to send HTML email via SES"""
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


@shared_task
def send_overdue_task_alerts():
    """Send email digests for overdue maintenance tasks every morning"""
    from .models import MaintenanceTask
    from django.contrib.auth import get_user_model

    User = get_user_model()
    today = timezone.now().date()

    overdue_tasks = MaintenanceTask.objects.filter(
        status='pending',
        due_date__lt=today
    ).select_related('assigned_to', 'zone', 'tree')

    if not overdue_tasks.exists():
        return "No overdue tasks found"

    supervisors = User.objects.filter(role__in=['supervisor', 'admin'], email__isnull=False)

    sent_count = 0
    for supervisor in supervisors:
        if not supervisor.email:
            continue

        tasks = overdue_tasks if supervisor.role == 'admin' else overdue_tasks.filter(
            zone__workers=supervisor
        )

        if not tasks.exists():
            continue

        # Build task rows for HTML table
        task_rows = ""
        for t in tasks[:30]:
            days_overdue = (today - t.due_date).days
            priority_color = {
                'urgent': '#dc2626',
                'high': '#ea580c',
                'medium': '#2563eb',
                'low': '#6b7280',
            }.get(t.priority, '#6b7280')

            task_rows += f"""
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 12px; font-size: 13px; color: #111;">{t.title}</td>
                <td style="padding: 10px 12px;">
                    <span style="background:{priority_color}; color:white; padding:2px 8px;
                                 border-radius:12px; font-size:11px; font-weight:600;">
                        {t.priority.upper()}
                    </span>
                </td>
                <td style="padding: 10px 12px; font-size: 13px; color: #555;">{t.zone.name}</td>
                <td style="padding: 10px 12px; font-size: 13px; color: #dc2626; font-weight:600;">
                    {days_overdue} day{'s' if days_overdue != 1 else ''} overdue
                </td>
                <td style="padding: 10px 12px; font-size: 13px; color: #555;">
                    {t.assigned_to.get_full_name() if t.assigned_to else 'Unassigned'}
                </td>
            </tr>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont,
                     'Segoe UI', sans-serif; background:#f9fafb;">
            <div style="max-width:640px; margin:32px auto; background:white;
                        border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">

                <!-- Header -->
                <div style="background:#14532d; padding:24px 32px;">
                    <div style="font-size:22px; font-weight:700; color:white;">
                        🌳 Tree Tracker
                    </div>
                    <div style="color:#86efac; font-size:13px; margin-top:4px;">
                        Green Asset Management System
                    </div>
                </div>

                <!-- Alert banner -->
                <div style="background:#fef2f2; border-left:4px solid #dc2626;
                            padding:16px 32px; margin:0;">
                    <div style="font-weight:600; color:#dc2626; font-size:15px;">
                        ⚠️ {tasks.count()} Overdue Maintenance Task{'s' if tasks.count() != 1 else ''}
                    </div>
                    <div style="color:#6b7280; font-size:13px; margin-top:4px;">
                        These tasks were due before {today.strftime('%B %d, %Y')} and need immediate attention.
                    </div>
                </div>

                <!-- Body -->
                <div style="padding:24px 32px;">
                    <p style="color:#374151; font-size:14px; margin:0 0 20px 0;">
                        Hello {supervisor.get_full_name() or supervisor.username},
                    </p>

                    <!-- Task table -->
                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
                        <thead>
                            <tr style="background:#f9fafb;">
                                <th style="padding:10px 12px; text-align:left; color:#6b7280;
                                           font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
                                    Task
                                </th>
                                <th style="padding:10px 12px; text-align:left; color:#6b7280;
                                           font-size:11px; text-transform:uppercase;">Priority</th>
                                <th style="padding:10px 12px; text-align:left; color:#6b7280;
                                           font-size:11px; text-transform:uppercase;">Zone</th>
                                <th style="padding:10px 12px; text-align:left; color:#6b7280;
                                           font-size:11px; text-transform:uppercase;">Overdue</th>
                                <th style="padding:10px 12px; text-align:left; color:#6b7280;
                                           font-size:11px; text-transform:uppercase;">Assigned To</th>
                            </tr>
                        </thead>
                        <tbody>
                            {task_rows}
                        </tbody>
                    </table>

                    <!-- CTA -->
                    <div style="margin-top:28px; text-align:center;">
                        <a href="http://localhost:5173/tasks"
                           style="background:#15803d; color:white; padding:12px 28px;
                                  border-radius:8px; text-decoration:none; font-weight:600;
                                  font-size:14px; display:inline-block;">
                            View All Tasks →
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background:#f9fafb; padding:16px 32px; border-top:1px solid #f0f0f0;">
                    <p style="margin:0; font-size:12px; color:#9ca3af; text-align:center;">
                        This is an automated alert from Tree Tracker.
                        You're receiving this because you're a {supervisor.role.replace('_', ' ')}.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
Hello {supervisor.get_full_name() or supervisor.username},

You have {tasks.count()} overdue maintenance tasks that need attention:

{''.join([f"- [{t.priority.upper()}] {t.title} | {t.zone.name} | Due: {t.due_date} | Assigned: {t.assigned_to.get_full_name() if t.assigned_to else 'Unassigned'}" + chr(10) for t in tasks[:30]])}

Please log in to Tree Tracker to take action.

Tree Tracker System
        """

        try:
            send_html_email(
                subject=f'[Tree Tracker] ⚠️ {tasks.count()} overdue task{"s" if tasks.count() != 1 else ""} need attention',
                to_email=supervisor.email,
                text_body=text_body,
                html_body=html_body,
            )
            sent_count += 1
        except Exception as e:
            print(f"Failed to send email to {supervisor.email}: {e}")

    return f"Sent {sent_count} overdue task alert emails"
