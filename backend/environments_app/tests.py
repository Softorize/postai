"""Tests for environment export functionality."""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Environment, EnvironmentVariable
from core.models import Workspace


class EnvironmentExportTests(APITestCase):
    """Test cases for environment export endpoint."""

    def setUp(self):
        """Set up test data."""
        self.workspace = Workspace.objects.create(name='Test Workspace')
        self.environment = Environment.objects.create(
            name='Test Environment',
            description='Test description',
            workspace=self.workspace,
        )
        # Create variables with different configurations
        self.var_simple = EnvironmentVariable.objects.create(
            environment=self.environment,
            key='api_url',
            values=['https://api.example.com'],
            selected_value_index=0,
            enabled=True,
            is_secret=False,
        )
        self.var_secret = EnvironmentVariable.objects.create(
            environment=self.environment,
            key='api_key',
            values=['secret-key-123'],
            selected_value_index=0,
            enabled=True,
            is_secret=True,
        )
        self.var_multi = EnvironmentVariable.objects.create(
            environment=self.environment,
            key='env_type',
            values=['dev', 'staging', 'production'],
            selected_value_index=1,  # staging is selected
            enabled=True,
            is_secret=False,
        )
        self.var_disabled = EnvironmentVariable.objects.create(
            environment=self.environment,
            key='disabled_var',
            values=['value'],
            selected_value_index=0,
            enabled=False,
            is_secret=False,
        )

    def test_export_postman_format_default(self):
        """Test export defaults to Postman format."""
        url = f'/api/v1/environments/{self.environment.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check Postman format markers
        self.assertEqual(data['_postman_variable_scope'], 'environment')
        self.assertIn('_postman_exported_at', data)
        self.assertEqual(data['name'], 'Test Environment')
        self.assertEqual(data['id'], str(self.environment.id))

    def test_export_postman_format_explicit(self):
        """Test export with explicit Postman format."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postman'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['_postman_variable_scope'], 'environment')

    def test_export_postman_single_value(self):
        """Test Postman export converts multi-value to single value."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postman'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find the multi-value variable
        env_type_var = next(v for v in data['values'] if v['key'] == 'env_type')

        # Should have single 'value' field, not 'values' array
        self.assertIn('value', env_type_var)
        self.assertNotIn('values', env_type_var)
        # Should be the selected value (index 1 = 'staging')
        self.assertEqual(env_type_var['value'], 'staging')

    def test_export_postman_secret_type(self):
        """Test Postman export marks secret variables correctly."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postman'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find secret variable
        api_key_var = next(v for v in data['values'] if v['key'] == 'api_key')
        self.assertEqual(api_key_var['type'], 'secret')

        # Find non-secret variable
        api_url_var = next(v for v in data['values'] if v['key'] == 'api_url')
        self.assertEqual(api_url_var['type'], 'default')

    def test_export_postman_enabled_field(self):
        """Test Postman export includes enabled field."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postman'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find enabled variable
        api_url_var = next(v for v in data['values'] if v['key'] == 'api_url')
        self.assertTrue(api_url_var['enabled'])

        # Find disabled variable
        disabled_var = next(v for v in data['values'] if v['key'] == 'disabled_var')
        self.assertFalse(disabled_var['enabled'])

    def test_export_postai_format(self):
        """Test export with PostAI format."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postai'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check PostAI format markers
        self.assertTrue(data['_postai_format'])
        self.assertEqual(data['_postai_version'], '1.0')
        self.assertIn('_exported_at', data)
        self.assertEqual(data['name'], 'Test Environment')
        self.assertEqual(data['description'], 'Test description')

    def test_export_postai_multi_value(self):
        """Test PostAI export preserves multi-value variables."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postai'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find the multi-value variable
        env_type_var = next(v for v in data['values'] if v['key'] == 'env_type')

        # Should have 'values' array, not single 'value'
        self.assertIn('values', env_type_var)
        self.assertNotIn('value', env_type_var)
        # Should preserve all values
        self.assertEqual(env_type_var['values'], ['dev', 'staging', 'production'])
        # Should preserve selected index
        self.assertEqual(env_type_var['selected_value_index'], 1)

    def test_export_postai_is_secret_field(self):
        """Test PostAI export uses is_secret field."""
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postai'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find secret variable
        api_key_var = next(v for v in data['values'] if v['key'] == 'api_key')
        self.assertTrue(api_key_var['is_secret'])

        # Find non-secret variable
        api_url_var = next(v for v in data['values'] if v['key'] == 'api_url')
        self.assertFalse(api_url_var['is_secret'])

    def test_export_nonexistent_environment(self):
        """Test export returns 404 for nonexistent environment."""
        url = '/api/v1/environments/00000000-0000-0000-0000-000000000000/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_export_empty_environment(self):
        """Test export works for environment with no variables."""
        empty_env = Environment.objects.create(
            name='Empty Environment',
            workspace=self.workspace,
        )
        url = f'/api/v1/environments/{empty_env.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['values'], [])

    def test_export_variable_with_empty_values(self):
        """Test export handles variable with empty values array."""
        var_empty = EnvironmentVariable.objects.create(
            environment=self.environment,
            key='empty_var',
            values=[],
            selected_value_index=0,
            enabled=True,
            is_secret=False,
        )

        # Postman format should return empty string
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postman'
        response = self.client.get(url)
        data = response.json()
        empty_var = next(v for v in data['values'] if v['key'] == 'empty_var')
        self.assertEqual(empty_var['value'], '')

        # PostAI format should return empty array
        url = f'/api/v1/environments/{self.environment.id}/export/?export_format=postai'
        response = self.client.get(url)
        data = response.json()
        empty_var = next(v for v in data['values'] if v['key'] == 'empty_var')
        self.assertEqual(empty_var['values'], [])


class EnvironmentModelTests(TestCase):
    """Test cases for Environment model."""

    def test_environment_creation(self):
        """Test environment can be created."""
        workspace = Workspace.objects.create(name='Test')
        env = Environment.objects.create(
            name='Test Env',
            workspace=workspace,
        )
        self.assertEqual(str(env.name), 'Test Env')

    def test_variable_creation(self):
        """Test environment variable can be created."""
        workspace = Workspace.objects.create(name='Test')
        env = Environment.objects.create(name='Test Env', workspace=workspace)
        var = EnvironmentVariable.objects.create(
            environment=env,
            key='test_key',
            values=['value1', 'value2'],
            selected_value_index=0,
        )
        self.assertEqual(var.key, 'test_key')
        self.assertEqual(len(var.values), 2)
