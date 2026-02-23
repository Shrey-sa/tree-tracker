"""
Test your SES email configuration.
Usage: python manage.py test_email your@email.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify SES is configured correctly'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to send test to')

    def handle(self, *args, **options):
        to_email = options['email']

        self.stdout.write(f'Sending test email to {to_email}...')
        self.stdout.write(f'Using backend: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'Using host: {settings.EMAIL_HOST}')
        self.stdout.write(f'From: {settings.DEFAULT_FROM_EMAIL}')

        html_body = """
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif; background:#f9fafb; padding:32px;">
            <div style="max-width:500px; margin:0 auto; background:white;
                        border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="background:#14532d; padding:24px 32px;">
                    <div style="font-size:22px; font-weight:700; color:white;">🌳 Tree Tracker</div>
                </div>
                <div style="padding:32px;">
                    <h2 style="color:#14532d; margin:0 0 16px 0;">✅ Email is working!</h2>
                    <p style="color:#374151; font-size:15px;">
                        Your AWS SES configuration is set up correctly.
                        Automated alerts for overdue tasks and tree inspections will now be delivered.
                    </p>
                    <hr style="border:none; border-top:1px solid #f0f0f0; margin:24px 0;">
                    <p style="color:#9ca3af; font-size:12px; margin:0;">
                        Sent from Tree Tracker via AWS SES
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = "✅ Tree Tracker email is working! Your AWS SES configuration is correct."

        try:
            msg = EmailMultiAlternatives(
                subject='✅ Tree Tracker — Email Test Successful',
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send()
            self.stdout.write(self.style.SUCCESS(f'\n✅ Test email sent successfully to {to_email}!'))
            self.stdout.write('Check your inbox (and spam folder just in case).')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Failed to send email: {e}'))
            self.stdout.write('\nCommon fixes:')
            self.stdout.write('1. Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env')
            self.stdout.write('2. Make sure the FROM email is verified in SES')
            self.stdout.write('3. Make sure the TO email is verified (sandbox mode)')
