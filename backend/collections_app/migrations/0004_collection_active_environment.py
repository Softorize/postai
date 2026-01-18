"""Add active_environment FK to Collection for per-collection env selection."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('environments_app', '0004_environment_collection'),
        ('collections_app', '0003_alter_request_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='active_environment',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='active_for_collections',
                to='environments_app.environment'
            ),
        ),
    ]
