from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import License
from .services import validate_license_key, generate_license_key


class LicenseKeyValidationTest(TestCase):
    def test_valid_generated_key(self):
        key = generate_license_key()
        self.assertTrue(validate_license_key(key))

    def test_invalid_key_bad_checksum(self):
        self.assertFalse(validate_license_key('POSTAI-AAAAA-BBBBB-CCCCC-DDDDD'))

    def test_invalid_key_bad_format(self):
        self.assertFalse(validate_license_key('INVALID-KEY'))

    def test_invalid_key_empty(self):
        self.assertFalse(validate_license_key(''))


class LicenseModelTest(TestCase):
    def test_singleton(self):
        a = License.get_instance()
        b = License.get_instance()
        self.assertEqual(a.pk, b.pk)


class LicenseAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_status_fresh_trial(self):
        resp = self.client.get('/api/v1/license/status/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['is_trial'])
        self.assertFalse(data['is_activated'])
        self.assertFalse(data['is_expired'])
        self.assertEqual(data['days_remaining'], 30)

    def test_status_expired_trial(self):
        instance = License.get_instance()
        instance.trial_started_at = timezone.now() - timedelta(days=31)
        instance.save()

        resp = self.client.get('/api/v1/license/status/')
        data = resp.json()
        self.assertTrue(data['is_expired'])
        self.assertEqual(data['days_remaining'], 0)

    def test_activate_valid_key(self):
        key = generate_license_key()
        resp = self.client.post('/api/v1/license/activate/', {'license_key': key}, format='json')
        self.assertEqual(resp.status_code, 200)

        resp = self.client.get('/api/v1/license/status/')
        data = resp.json()
        self.assertTrue(data['is_activated'])
        self.assertFalse(data['is_expired'])

    def test_activate_invalid_key(self):
        resp = self.client.post('/api/v1/license/activate/', {'license_key': 'POSTAI-AAAAA-BBBBB-CCCCC-DDDDD'}, format='json')
        self.assertEqual(resp.status_code, 400)
