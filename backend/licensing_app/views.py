from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import License
from .serializers import LicenseActivateSerializer
from .services import validate_license_key

TRIAL_DAYS = 30


class LicenseStatusView(APIView):
    def get(self, request):
        instance = License.get_instance()
        is_activated = bool(instance.license_key)

        if is_activated:
            data = {
                'trial_started_at': instance.trial_started_at,
                'days_remaining': 0,
                'is_trial': False,
                'is_activated': True,
                'is_expired': False,
            }
        else:
            elapsed = (timezone.now() - instance.trial_started_at).days
            days_remaining = max(TRIAL_DAYS - elapsed, 0)
            data = {
                'trial_started_at': instance.trial_started_at,
                'days_remaining': days_remaining,
                'is_trial': True,
                'is_activated': False,
                'is_expired': days_remaining <= 0,
            }

        return Response(data)


class LicenseActivateView(APIView):
    def post(self, request):
        serializer = LicenseActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        key = serializer.validated_data['license_key']

        if not validate_license_key(key):
            return Response(
                {'detail': 'Invalid license key.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance = License.get_instance()
        instance.license_key = key
        instance.activated_at = timezone.now()
        instance.save()

        return Response({'detail': 'License activated successfully.'})
