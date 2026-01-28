from rest_framework import serializers


class LicenseStatusSerializer(serializers.Serializer):
    trial_started_at = serializers.DateTimeField()
    days_remaining = serializers.IntegerField()
    is_trial = serializers.BooleanField()
    is_activated = serializers.BooleanField()
    is_expired = serializers.BooleanField()


class LicenseActivateSerializer(serializers.Serializer):
    license_key = serializers.CharField(max_length=100)
