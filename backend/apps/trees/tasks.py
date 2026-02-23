from celery import shared_task
from django.utils import timezone
from datetime import timedelta


def send_health_check_reminders_resend(send_fn):
    """Send inspection reminders using provided send function"""
    from .models import Tree, HealthLog
    from django.contrib.auth import get_user_model
    User = get_user_model()

    cutoff = timezone.now() - timedelta(days=14)
    today = timezone.now().date()

    recently_logged_ids = HealthLog.objects.filter(
        logged_at__gte=cutoff
    ).values_list('tree_id', flat=True)

    trees_needing = Tree.objects.exclude(
        current_health='dead'
    ).exclude(
        id__in=recently_logged_ids
    ).select_related('zone', 'species')

    if not trees_needing.exists():
        return "All trees recently inspected"

    supervisors = User.objects.filter(
        role__in=['supervisor', 'admin']
    ).exclude(email='').exclude(email__isnull=True)

    sent_count = 0
    for supervisor in supervisors:
        zone_trees = trees_needing if supervisor.role == 'admin' else \
            trees_needing.filter(zone__isnull=False)

        if not zone_trees.exists():
            continue

        tree_rows = ""
        for t in zone_trees[:20]:
            last_log = HealthLog.objects.filter(tree=t).order_by('-logged_at').first()
            days_since = (timezone.now() - last_log.logged_at).days if last_log else 'Never'
            health_color = {'healthy': '#16a34a', 'at_risk': '#d97706'}.get(t.current_health, '#6b7280')

            tree_rows += f"""
            <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 12px;font-size:13px;">
                    <span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:11px;">
                        {t.tag_number}
                    </span>
                </td>
                <td style="padding:10px 12px;font-size:13px;">{t.species.common_name if t.species else 'Unknown'}</td>
                <td style="padding:10px 12px;font-size:13px;">{t.zone.name if t.zone else 'N/A'}</td>
                <td style="padding:10px 12px;">
                    <span style="color:{health_color};font-weight:600;font-size:13px;">
                        {t.current_health.replace('_', ' ').title()}
                    </span>
                </td>
                <td style="padding:10px 12px;font-size:13px;color:#dc2626;font-weight:600;">
                    {days_since} days
                </td>
            </tr>"""

        html_body = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;">
<div style="max-width:640px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#14532d;padding:24px 32px;">
        <div style="font-size:22px;font-weight:700;color:white;">🌳 Tree Tracker</div>
        <div style="color:#86efac;font-size:13px;margin-top:4px;">Green Asset Management System</div>
    </div>
    <div style="background:#fffbeb;border-left:4px solid #d97706;padding:16px 32px;">
        <div style="font-weight:600;color:#d97706;font-size:15px;">
            🔍 {zone_trees.count()} Tree{'s' if zone_trees.count() != 1 else ''} Need Inspection
        </div>
        <div style="color:#6b7280;font-size:13px;margin-top:4px;">
            These trees haven't been inspected in over 14 days.
        </div>
    </div>
    <div style="padding:24px 32px;">
        <p style="color:#374151;font-size:14px;margin:0 0 20px 0;">
            Hello {supervisor.get_full_name() or supervisor.username},
        </p>
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;">Tag</th>
                    <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;">Species</th>
                    <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;">Zone</th>
                    <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;">Health</th>
                    <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;">Last Checked</th>
                </tr>
            </thead>
            <tbody>{tree_rows}</tbody>
        </table>
        <div style="margin-top:28px;text-align:center;">
            <a href="https://tree-tracker-wheat.vercel.app/trees"
               style="background:#15803d;color:white;padding:12px 28px;border-radius:8px;
                      text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
                View Trees →
            </a>
        </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Automated reminder · Tree Tracker · {today.strftime('%B %d, %Y')}
        </p>
    </div>
</div>
</body>
</html>"""

        try:
            send_fn(
                to_email=supervisor.email,
                subject=f'[Tree Tracker] 🔍 {zone_trees.count()} tree{"s" if zone_trees.count() != 1 else ""} need inspection',
                html_body=html_body,
            )
            sent_count += 1
            print(f"Sent inspection reminder to {supervisor.email}")
        except Exception as e:
            print(f"Failed to send to {supervisor.email}: {e}")

    return f"Sent {sent_count} inspection reminder emails"


@shared_task
def send_health_check_reminders():
    """Celery version - kept for compatibility"""
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings

    def django_send(to_email, subject, html_body):
        msg = EmailMultiAlternatives(
            subject=subject, body='Please enable HTML email.',
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email]
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send()

    return send_health_check_reminders_resend(django_send)