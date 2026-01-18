"""Tests for collection export functionality."""
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Collection, Folder, Request
from core.models import Workspace


class CollectionExportTests(APITestCase):
    """Test cases for collection export endpoint."""

    def setUp(self):
        """Set up test data."""
        self.workspace = Workspace.objects.create(name='Test Workspace')
        self.collection = Collection.objects.create(
            name='Test Collection',
            description='Test description',
            workspace=self.workspace,
            variables=[
                {'key': 'base_url', 'value': 'https://api.example.com'},
            ],
        )

        # Create a folder
        self.folder = Folder.objects.create(
            collection=self.collection,
            name='Auth',
            description='Authentication endpoints',
        )

        # Create a subfolder
        self.subfolder = Folder.objects.create(
            collection=self.collection,
            parent=self.folder,
            name='OAuth',
            description='OAuth endpoints',
        )

        # Create root-level request
        self.root_request = Request.objects.create(
            collection=self.collection,
            name='Health Check',
            method='GET',
            url='{{base_url}}/health',
            headers=[
                {'key': 'Accept', 'value': 'application/json', 'enabled': True},
            ],
            params=[
                {'key': 'verbose', 'value': 'true', 'enabled': True},
            ],
        )

        # Create request in folder
        self.folder_request = Request.objects.create(
            collection=self.collection,
            folder=self.folder,
            name='Login',
            method='POST',
            url='{{base_url}}/auth/login',
            headers=[
                {'key': 'Content-Type', 'value': 'application/json', 'enabled': True},
            ],
            body={
                'mode': 'raw',
                'raw': '{"email": "test@test.com", "password": "password"}',
            },
        )

        # Create request in subfolder
        self.subfolder_request = Request.objects.create(
            collection=self.collection,
            folder=self.subfolder,
            name='OAuth Token',
            method='POST',
            url='{{base_url}}/auth/oauth/token',
        )

    def test_export_returns_postman_format(self):
        """Test export returns Postman v2.1 format."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Check Postman format structure
        self.assertIn('info', data)
        self.assertIn('item', data)
        self.assertEqual(
            data['info']['schema'],
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        )

    def test_export_info_section(self):
        """Test export info section contains correct data."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['info']['name'], 'Test Collection')
        self.assertEqual(data['info']['description'], 'Test description')
        self.assertEqual(data['info']['_postman_id'], str(self.collection.id))

    def test_export_includes_variables(self):
        """Test export includes collection variables."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('variable', data)
        self.assertEqual(len(data['variable']), 1)
        self.assertEqual(data['variable'][0]['key'], 'base_url')

    def test_export_root_level_requests(self):
        """Test export includes root-level requests."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find root-level request (not in folder)
        root_items = [
            item for item in data['item']
            if item.get('name') == 'Health Check'
        ]
        self.assertEqual(len(root_items), 1)

        request_item = root_items[0]
        self.assertEqual(request_item['request']['method'], 'GET')
        self.assertEqual(request_item['request']['url']['raw'], '{{base_url}}/health')

    def test_export_folders(self):
        """Test export includes folders with nested structure."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find Auth folder
        auth_folder = next(
            (item for item in data['item'] if item.get('name') == 'Auth'),
            None
        )
        self.assertIsNotNone(auth_folder)
        self.assertIn('item', auth_folder)

        # Check subfolder exists in Auth folder
        oauth_folder = next(
            (item for item in auth_folder['item'] if item.get('name') == 'OAuth'),
            None
        )
        self.assertIsNotNone(oauth_folder)

    def test_export_requests_in_folders(self):
        """Test export includes requests inside folders."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find Auth folder
        auth_folder = next(
            (item for item in data['item'] if item.get('name') == 'Auth'),
            None
        )

        # Find Login request in Auth folder
        login_request = next(
            (item for item in auth_folder['item'] if item.get('name') == 'Login'),
            None
        )
        self.assertIsNotNone(login_request)
        self.assertEqual(login_request['request']['method'], 'POST')

    def test_export_request_headers(self):
        """Test export includes request headers."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find Health Check request
        health_request = next(
            (item for item in data['item'] if item.get('name') == 'Health Check'),
            None
        )

        headers = health_request['request']['header']
        self.assertEqual(len(headers), 1)
        self.assertEqual(headers[0]['key'], 'Accept')
        self.assertEqual(headers[0]['value'], 'application/json')

    def test_export_request_params(self):
        """Test export includes request query params."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find Health Check request
        health_request = next(
            (item for item in data['item'] if item.get('name') == 'Health Check'),
            None
        )

        query_params = health_request['request']['url']['query']
        self.assertEqual(len(query_params), 1)
        self.assertEqual(query_params[0]['key'], 'verbose')
        self.assertEqual(query_params[0]['value'], 'true')

    def test_export_request_body(self):
        """Test export includes request body."""
        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find Auth folder and Login request
        auth_folder = next(
            (item for item in data['item'] if item.get('name') == 'Auth'),
            None
        )
        login_request = next(
            (item for item in auth_folder['item'] if item.get('name') == 'Login'),
            None
        )

        self.assertIn('body', login_request['request'])
        self.assertEqual(login_request['request']['body']['mode'], 'raw')

    def test_export_nonexistent_collection(self):
        """Test export returns 404 for nonexistent collection."""
        url = '/api/v1/collections/00000000-0000-0000-0000-000000000000/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_export_empty_collection(self):
        """Test export works for collection with no items."""
        empty_collection = Collection.objects.create(
            name='Empty Collection',
            workspace=self.workspace,
        )
        url = f'/api/v1/collections/{empty_collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['item'], [])

    def test_export_disabled_headers(self):
        """Test export handles disabled headers correctly."""
        request_with_disabled = Request.objects.create(
            collection=self.collection,
            name='Request With Disabled Header',
            method='GET',
            url='{{base_url}}/test',
            headers=[
                {'key': 'Enabled-Header', 'value': 'value1', 'enabled': True},
                {'key': 'Disabled-Header', 'value': 'value2', 'enabled': False},
            ],
        )

        url = f'/api/v1/collections/{self.collection.id}/export/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find the request
        test_request = next(
            (item for item in data['item']
             if item.get('name') == 'Request With Disabled Header'),
            None
        )

        headers = test_request['request']['header']
        enabled_header = next(h for h in headers if h['key'] == 'Enabled-Header')
        disabled_header = next(h for h in headers if h['key'] == 'Disabled-Header')

        self.assertFalse(enabled_header.get('disabled', False))
        self.assertTrue(disabled_header.get('disabled', False))


class CollectionModelTests(TestCase):
    """Test cases for Collection model."""

    def test_collection_creation(self):
        """Test collection can be created."""
        workspace = Workspace.objects.create(name='Test')
        collection = Collection.objects.create(
            name='Test Collection',
            workspace=workspace,
        )
        self.assertEqual(str(collection), 'Test Collection')

    def test_folder_creation(self):
        """Test folder can be created."""
        workspace = Workspace.objects.create(name='Test')
        collection = Collection.objects.create(name='Test', workspace=workspace)
        folder = Folder.objects.create(
            collection=collection,
            name='Test Folder',
        )
        self.assertEqual(str(folder), 'Test/Test Folder')

    def test_request_creation(self):
        """Test request can be created."""
        workspace = Workspace.objects.create(name='Test')
        collection = Collection.objects.create(name='Test', workspace=workspace)
        request = Request.objects.create(
            collection=collection,
            name='Test Request',
            method='GET',
            url='https://api.example.com',
        )
        self.assertEqual(str(request), 'GET Test Request')

    def test_nested_folders(self):
        """Test nested folder structure."""
        workspace = Workspace.objects.create(name='Test')
        collection = Collection.objects.create(name='Test', workspace=workspace)
        parent_folder = Folder.objects.create(
            collection=collection,
            name='Parent',
        )
        child_folder = Folder.objects.create(
            collection=collection,
            parent=parent_folder,
            name='Child',
        )
        self.assertEqual(child_folder.parent, parent_folder)
        self.assertIn(child_folder, parent_folder.subfolders.all())


class CollectionCreateTests(APITestCase):
    """Test cases for collection creation endpoint."""

    def setUp(self):
        """Set up test data."""
        self.workspace = Workspace.objects.create(name='Test Workspace')

    def test_create_collection_returns_id(self):
        """Test that collection creation returns the id field.

        This is critical - frontend needs the id to create requests in the collection.
        """
        url = '/api/v1/collections/'
        response = self.client.post(url, {'name': 'New Collection'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        # Must have id for frontend to create requests
        self.assertIn('id', data)
        self.assertIsNotNone(data['id'])

    def test_create_collection_returns_empty_folders_and_requests(self):
        """Test that new collection returns empty folders and requests arrays."""
        url = '/api/v1/collections/'
        response = self.client.post(url, {'name': 'New Collection'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertIn('folders', data)
        self.assertIn('requests', data)
        self.assertEqual(data['folders'], [])
        self.assertEqual(data['requests'], [])

    def test_create_collection_returns_timestamps(self):
        """Test that collection creation returns timestamps."""
        url = '/api/v1/collections/'
        response = self.client.post(url, {'name': 'New Collection'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_create_request_in_new_collection(self):
        """Test creating a request in a newly created collection.

        This is the full workflow that was failing before the fix.
        """
        # Step 1: Create collection
        create_url = '/api/v1/collections/'
        create_response = self.client.post(create_url, {'name': 'Test Collection'}, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        collection_id = create_response.json()['id']
        self.assertIsNotNone(collection_id)

        # Step 2: Create request in the new collection
        request_url = f'/api/v1/collections/{collection_id}/requests/'
        request_response = self.client.post(
            request_url,
            {'name': 'Test Request', 'method': 'GET', 'url': ''},
            format='json'
        )

        self.assertEqual(request_response.status_code, status.HTTP_201_CREATED)
        request_data = request_response.json()
        self.assertEqual(request_data['name'], 'Test Request')
        self.assertEqual(request_data['collection'], collection_id)

    def test_create_folder_in_new_collection(self):
        """Test creating a folder in a newly created collection."""
        # Step 1: Create collection
        create_url = '/api/v1/collections/'
        create_response = self.client.post(create_url, {'name': 'Test Collection'}, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        collection_id = create_response.json()['id']

        # Step 2: Create folder in the new collection
        folder_url = f'/api/v1/collections/{collection_id}/folders/'
        folder_response = self.client.post(folder_url, {'name': 'Test Folder'}, format='json')

        self.assertEqual(folder_response.status_code, status.HTTP_201_CREATED)
        folder_data = folder_response.json()
        self.assertEqual(folder_data['name'], 'Test Folder')
        self.assertEqual(folder_data['collection'], collection_id)
