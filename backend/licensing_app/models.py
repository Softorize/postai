from django.db import models
from core.models import BaseModel


class License(BaseModel):
    trial_started_at = models.DateTimeField()
    license_key = models.CharField(max_length=100, blank=True, default='')
    activated_at = models.DateTimeField(null=True, blank=True)
    row_signature = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        if self.license_key:
            return f'License (activated)'
        return f'License (trial)'

    def save(self, **kwargs):
        from django.utils import timezone
        from .services import sign_license
        if not self.trial_started_at:
            self.trial_started_at = timezone.now()
        sign_license(self)
        super().save(**kwargs)

    @classmethod
    def get_instance(cls):
        instance = cls.objects.first()
        if not instance:
            instance = cls.objects.create()
        return instance
