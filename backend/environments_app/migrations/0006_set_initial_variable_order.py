"""Data migration to set initial order for existing environment variables."""
from django.db import migrations


def set_initial_order(apps, schema_editor):
    EnvironmentVariable = apps.get_model('environments_app', 'EnvironmentVariable')
    # Group by environment and order alphabetically by key
    env_ids = EnvironmentVariable.objects.values_list(
        'environment_id', flat=True
    ).distinct()
    for env_id in env_ids:
        variables = EnvironmentVariable.objects.filter(
            environment_id=env_id
        ).order_by('key')
        for index, var in enumerate(variables):
            var.order = index + 1
            var.save(update_fields=['order'])


class Migration(migrations.Migration):

    dependencies = [
        ('environments_app', '0005_add_order_to_environmentvariable'),
    ]

    operations = [
        migrations.RunPython(set_initial_order, migrations.RunPython.noop),
    ]
