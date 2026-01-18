"""Add collection FK to Environment for collection-scoped environments."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('collections_app', '0003_alter_request_url'),
        ('environments_app', '0003_environment_workspace'),
    ]

    operations = [
        migrations.AddField(
            model_name='environment',
            name='collection',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='environments',
                to='collections_app.collection'
            ),
        ),
    ]
