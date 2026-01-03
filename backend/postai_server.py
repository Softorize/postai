#!/usr/bin/env python3
"""
PostAI Backend Server Entry Point

This script serves as the entry point for the bundled Django backend.
It handles database migrations and starts the Django development server.
"""
import os
import sys
import argparse


def get_base_path():
    """Get the base path for the application."""
    if getattr(sys, 'frozen', False):
        # Running as bundled executable
        return os.path.dirname(sys.executable)
    else:
        # Running as script
        return os.path.dirname(os.path.abspath(__file__))


def setup_django():
    """Configure Django settings."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'postai.settings')

    # Set database path from environment or use default
    if 'POSTAI_DB_PATH' not in os.environ:
        base_path = get_base_path()
        os.environ['POSTAI_DB_PATH'] = os.path.join(base_path, 'postai.db')

    import django
    django.setup()


def run_migrations():
    """Run database migrations."""
    from django.core.management import call_command
    print("Running database migrations...")
    try:
        call_command('migrate', '--run-syncdb', verbosity=1)
        print("Migrations completed successfully.")
    except Exception as e:
        print(f"Migration warning: {e}")


def run_server(host='127.0.0.1', port=8765):
    """Start the Django development server."""
    from django.core.management import call_command
    print(f"Starting PostAI backend server on {host}:{port}")
    call_command('runserver', f'{host}:{port}', '--noreload')


def main():
    parser = argparse.ArgumentParser(description='PostAI Backend Server')
    parser.add_argument('command', nargs='?', default='runserver',
                        choices=['runserver', 'migrate', 'shell'],
                        help='Command to run (default: runserver)')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8765, help='Port to bind to')
    parser.add_argument('--skip-migrations', action='store_true',
                        help='Skip running migrations on startup')

    args = parser.parse_args()

    setup_django()

    if args.command == 'migrate':
        run_migrations()
    elif args.command == 'shell':
        from django.core.management import call_command
        call_command('shell')
    else:  # runserver
        if not args.skip_migrations:
            run_migrations()
        run_server(args.host, args.port)


if __name__ == '__main__':
    main()
