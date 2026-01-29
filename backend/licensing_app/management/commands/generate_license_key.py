from django.core.management.base import BaseCommand

from licensing_app.services import generate_license_key


class Command(BaseCommand):
    help = 'Generate a valid PostAI license key'

    def add_arguments(self, parser):
        parser.add_argument(
            '-n', '--count',
            type=int,
            default=1,
            help='Number of keys to generate (default: 1)',
        )

    def handle(self, *args, **options):
        for _ in range(options['count']):
            self.stdout.write(generate_license_key())
