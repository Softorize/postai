from django.db import models
from core.models import BaseModel


class License(BaseModel):
    trial_started_at = models.DateTimeField(auto_now_add=True)
    license_key = models.CharField(max_length=100, blank=True, default='')
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        if self.license_key:
            return f'License (activated)'
        return f'License (trial)'

    @classmethod
    def get_instance(cls):
        instance = cls.objects.first()
        if not instance:
            instance = cls.objects.create()
        return instance
