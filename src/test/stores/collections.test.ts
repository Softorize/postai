import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}))

// Mock workspaces store
vi.mock('@/stores/workspaces.store', () => ({
  useWorkspacesStore: {
    getState: () => ({
      activeWorkspace: { id: 'workspace-1' }
    })
  }
}))

import { api } from '@/api/client'
import { useCollectionsStore } from '@/stores/collections.store'

describe('Collections Store', () => {
  beforeEach(() => {
    // Reset store state
    useCollectionsStore.setState({
      collections: [],
      isLoading: false,
      error: null,
      highlightedRequestId: null,
    })
    vi.clearAllMocks()
  })

  describe('duplicateRequest', () => {
    const createMockCollection = (overrides = {}) => ({
      id: 'col-1',
      name: 'Test Collection',
      description: '',
      schema_version: '1.0',
      variables: [],
      pre_request_script: '',
      test_script: '',
      folders: [],
      requests: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('should call API to duplicate request', async () => {
      const mockDuplicatedRequest = {
        id: 'req-2',
        name: 'Test Request (Copy)',
        method: 'GET',
        url: 'https://api.com',
      }
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedRequest })
      vi.mocked(api.get).mockResolvedValue({ data: [] }) // Mock fetchCollections

      // Set up initial state with a collection containing the request
      const initialCollection = createMockCollection({
        requests: [{ id: 'req-1', name: 'Test Request', method: 'GET', url: 'https://api.com' }],
      })
      useCollectionsStore.setState({ collections: [initialCollection] })

      const result = await useCollectionsStore.getState().duplicateRequest('col-1', 'req-1')

      expect(api.post).toHaveBeenCalledWith('/collections/col-1/requests/req-1/duplicate/')
      expect(result).toEqual(mockDuplicatedRequest)
    })

    it('should return the duplicated request', async () => {
      const mockDuplicatedRequest = { id: 'req-2', name: 'Test (Copy)', method: 'GET', url: 'https://api.com' }

      const initialCollection = createMockCollection({
        requests: [{ id: 'req-1', name: 'Test', method: 'GET', url: 'https://api.com' }],
      })
      useCollectionsStore.setState({ collections: [initialCollection] })
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedRequest })
      vi.mocked(api.get).mockResolvedValue({ data: [] }) // Mock fetchCollections

      const result = await useCollectionsStore.getState().duplicateRequest('col-1', 'req-1')

      expect(result).toEqual(mockDuplicatedRequest)
      expect(result.id).toBe('req-2')
      expect(result.name).toBe('Test (Copy)')
    })

    it('should call fetchCollections after duplicating', async () => {
      const mockDuplicatedRequest = { id: 'req-2', name: 'Test (Copy)', method: 'GET', url: 'https://api.com' }

      const initialCollection = createMockCollection({
        requests: [{ id: 'req-1', name: 'Test', method: 'GET', url: 'https://api.com' }],
      })
      useCollectionsStore.setState({ collections: [initialCollection] })
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedRequest })
      vi.mocked(api.get).mockResolvedValue({ data: [] }) // Mock fetchCollections

      await useCollectionsStore.getState().duplicateRequest('col-1', 'req-1')

      // Verify fetchCollections was called (it calls api.get)
      expect(api.get).toHaveBeenCalled()
    })
  })

  describe('Collection-Scoped Environments', () => {
    const createMockCollection = (overrides = {}) => ({
      id: 'col-1',
      name: 'Test Collection',
      description: '',
      schema_version: '1.0',
      variables: [],
      pre_request_script: '',
      test_script: '',
      folders: [],
      requests: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    describe('setCollectionEnvironment', () => {
      it('should call API to set collection environment', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        const updatedCollection = { ...collection, active_environment_id: 'env-1' }

        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.post).mockResolvedValue({ data: updatedCollection })

        await useCollectionsStore.getState().setCollectionEnvironment('col-1', 'env-1')

        expect(api.post).toHaveBeenCalledWith('/collections/col-1/set-environment/', {
          environment_id: 'env-1'
        })
      })

      it('should update collection in state with active_environment_id', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        const updatedCollection = { ...collection, active_environment_id: 'env-1' }

        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.post).mockResolvedValue({ data: updatedCollection })

        await useCollectionsStore.getState().setCollectionEnvironment('col-1', 'env-1')

        const state = useCollectionsStore.getState()
        expect(state.collections[0].active_environment_id).toBe('env-1')
      })

      it('should allow clearing collection environment with null', async () => {
        const collection = createMockCollection({ id: 'col-1', active_environment_id: 'env-1' })
        const updatedCollection = { ...collection, active_environment_id: null }

        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.post).mockResolvedValue({ data: updatedCollection })

        await useCollectionsStore.getState().setCollectionEnvironment('col-1', null)

        expect(api.post).toHaveBeenCalledWith('/collections/col-1/set-environment/', {
          environment_id: null
        })
      })

      it('should update selectedCollection if it matches', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        const updatedCollection = { ...collection, active_environment_id: 'env-1' }

        useCollectionsStore.setState({
          collections: [collection],
          selectedCollection: collection as unknown as import('@/types').Collection,
        })
        vi.mocked(api.post).mockResolvedValue({ data: updatedCollection })

        await useCollectionsStore.getState().setCollectionEnvironment('col-1', 'env-1')

        const state = useCollectionsStore.getState()
        expect(state.selectedCollection?.active_environment_id).toBe('env-1')
      })

      it('should throw error on API failure', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.post).mockRejectedValue(new Error('Network error'))

        await expect(
          useCollectionsStore.getState().setCollectionEnvironment('col-1', 'env-1')
        ).rejects.toThrow('Network error')
      })
    })

    describe('exportCollection with format options', () => {
      // Mock DOM APIs for download
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      const mockClick = vi.fn()

      beforeEach(() => {
        // Mock document methods for export download
        vi.spyOn(document, 'createElement').mockImplementation(() => {
          const el = {
            href: '',
            download: '',
            click: mockClick,
          }
          return el as unknown as HTMLElement
        })
        vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
        vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      })

      it('should export in Postman format by default', async () => {
        const collection = createMockCollection({ id: 'col-1', name: 'My Collection' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.get).mockResolvedValue({ data: { info: { name: 'My Collection' } } })

        await useCollectionsStore.getState().exportCollection('col-1')

        expect(api.get).toHaveBeenCalledWith('/collections/col-1/export/', {
          params: { export_format: 'postman' }
        })
      })

      it('should export in PostAI format with include_environments param', async () => {
        const collection = createMockCollection({ id: 'col-1', name: 'My Collection' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.get).mockResolvedValue({ data: { info: { name: 'My Collection' } } })

        await useCollectionsStore.getState().exportCollection('col-1', 'postai', true)

        expect(api.get).toHaveBeenCalledWith('/collections/col-1/export/', {
          params: { export_format: 'postai', include_environments: 'true' }
        })
      })

      it('should export in PostAI format without environments when includeEnvironments is false', async () => {
        const collection = createMockCollection({ id: 'col-1', name: 'My Collection' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.get).mockResolvedValue({ data: { info: { name: 'My Collection' } } })

        await useCollectionsStore.getState().exportCollection('col-1', 'postai', false)

        expect(api.get).toHaveBeenCalledWith('/collections/col-1/export/', {
          params: { export_format: 'postai', include_environments: 'false' }
        })
      })

      it('should return success on successful export', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.get).mockResolvedValue({ data: {} })

        const result = await useCollectionsStore.getState().exportCollection('col-1', 'postman')

        expect(result.success).toBe(true)
      })

      it('should return error on export failure', async () => {
        const collection = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [collection] })
        vi.mocked(api.get).mockRejectedValue(new Error('Export failed'))

        const result = await useCollectionsStore.getState().exportCollection('col-1', 'postman')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Export failed')
      })
    })
  })

  describe('CRUD operations', () => {
    const createMockCollection = (overrides = {}) => ({
      id: 'col-1',
      name: 'Test Collection',
      description: '',
      schema_version: '1.0',
      variables: [],
      pre_request_script: '',
      test_script: '',
      folders: [],
      requests: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    describe('fetchCollections', () => {
      it('should fetch collections with workspace param', async () => {
        const collections = [createMockCollection()]
        vi.mocked(api.get).mockResolvedValue({ data: collections })

        await useCollectionsStore.getState().fetchCollections()

        expect(api.get).toHaveBeenCalledWith('/collections/', {
          params: { workspace: 'workspace-1' }
        })
        expect(useCollectionsStore.getState().collections).toEqual(collections)
        expect(useCollectionsStore.getState().isLoading).toBe(false)
      })

      it('should set error on failure', async () => {
        vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

        await useCollectionsStore.getState().fetchCollections()

        expect(useCollectionsStore.getState().error).toBe('Network error')
        expect(useCollectionsStore.getState().isLoading).toBe(false)
      })
    })

    describe('createCollection', () => {
      it('should create and add to state', async () => {
        const newCol = createMockCollection({ id: 'col-new', name: 'New' })
        vi.mocked(api.post).mockResolvedValue({ data: newCol })

        const result = await useCollectionsStore.getState().createCollection('New', 'desc')

        expect(api.post).toHaveBeenCalledWith('/collections/', { name: 'New', description: 'desc' })
        expect(result).toEqual(newCol)
        expect(useCollectionsStore.getState().collections).toContainEqual(newCol)
      })
    })

    describe('updateCollection', () => {
      it('should update collection in state', async () => {
        const col = createMockCollection({ id: 'col-1', name: 'Old' })
        useCollectionsStore.setState({ collections: [col] })
        vi.mocked(api.put).mockResolvedValue({ data: { ...col, name: 'Updated' } })

        await useCollectionsStore.getState().updateCollection('col-1', { name: 'Updated' })

        expect(useCollectionsStore.getState().collections[0].name).toBe('Updated')
      })

      it('should sync selectedCollection if it matches', async () => {
        const col = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [col], selectedCollection: col as any })
        vi.mocked(api.put).mockResolvedValue({ data: { ...col, name: 'Updated' } })

        await useCollectionsStore.getState().updateCollection('col-1', { name: 'Updated' })

        expect(useCollectionsStore.getState().selectedCollection?.name).toBe('Updated')
      })
    })

    describe('deleteCollection', () => {
      it('should remove collection from state', async () => {
        const col = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [col] })
        vi.mocked(api.delete).mockResolvedValue({})

        await useCollectionsStore.getState().deleteCollection('col-1')

        expect(useCollectionsStore.getState().collections).toHaveLength(0)
      })

      it('should clear selectedCollection if deleted', async () => {
        const col = createMockCollection({ id: 'col-1' })
        useCollectionsStore.setState({ collections: [col], selectedCollection: col as any })
        vi.mocked(api.delete).mockResolvedValue({})

        await useCollectionsStore.getState().deleteCollection('col-1')

        expect(useCollectionsStore.getState().selectedCollection).toBeNull()
      })
    })

    describe('selectCollection/selectRequest', () => {
      it('should set selectedCollection', () => {
        const col = createMockCollection() as any
        useCollectionsStore.getState().selectCollection(col)
        expect(useCollectionsStore.getState().selectedCollection).toEqual(col)
      })

      it('should clear selectedCollection with null', () => {
        useCollectionsStore.getState().selectCollection(null)
        expect(useCollectionsStore.getState().selectedCollection).toBeNull()
      })

      it('should set selectedRequest', () => {
        const req = { id: 'req-1', name: 'Test' } as any
        useCollectionsStore.getState().selectRequest(req)
        expect(useCollectionsStore.getState().selectedRequest).toEqual(req)
      })
    })

    describe('Folder operations', () => {
      it('createFolder should call API and refresh', async () => {
        const folder = { id: 'folder-1', name: 'New Folder' }
        vi.mocked(api.post).mockResolvedValue({ data: folder })
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        const result = await useCollectionsStore.getState().createFolder('col-1', 'New Folder')

        expect(api.post).toHaveBeenCalledWith('/collections/col-1/folders/', {
          name: 'New Folder',
          parent: undefined,
        })
        expect(result).toEqual(folder)
      })

      it('createFolder with parent', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { id: 'f-1' } })
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useCollectionsStore.getState().createFolder('col-1', 'Sub', 'parent-1')

        expect(api.post).toHaveBeenCalledWith('/collections/col-1/folders/', {
          name: 'Sub',
          parent: 'parent-1',
        })
      })

      it('updateFolder should call API and refresh', async () => {
        vi.mocked(api.put).mockResolvedValue({})
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useCollectionsStore.getState().updateFolder('col-1', 'folder-1', { name: 'Updated' })

        expect(api.put).toHaveBeenCalledWith('/collections/col-1/folders/folder-1/', { name: 'Updated' })
      })

      it('deleteFolder should call API and refresh', async () => {
        vi.mocked(api.delete).mockResolvedValue({})
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useCollectionsStore.getState().deleteFolder('col-1', 'folder-1')

        expect(api.delete).toHaveBeenCalledWith('/collections/col-1/folders/folder-1/')
      })
    })

    describe('Request operations', () => {
      it('createRequest should call API and refresh', async () => {
        const req = { id: 'req-1', name: 'New Request' }
        vi.mocked(api.post).mockResolvedValue({ data: req })
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        const result = await useCollectionsStore.getState().createRequest('col-1', { name: 'New Request' })

        expect(api.post).toHaveBeenCalledWith('/collections/col-1/requests/', { name: 'New Request' })
        expect(result).toEqual(req)
      })

      it('updateRequest should call API and sync selectedRequest', async () => {
        const req = { id: 'req-1', name: 'Old' } as any
        useCollectionsStore.setState({ selectedRequest: req })
        vi.mocked(api.put).mockResolvedValue({ data: { ...req, name: 'Updated' } })
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useCollectionsStore.getState().updateRequest('col-1', 'req-1', { name: 'Updated' })

        expect(api.put).toHaveBeenCalledWith('/collections/col-1/requests/req-1/', { name: 'Updated' })
        expect(useCollectionsStore.getState().selectedRequest?.name).toBe('Updated')
      })

      it('deleteRequest should call API and clear selectedRequest', async () => {
        const req = { id: 'req-1' } as any
        useCollectionsStore.setState({ selectedRequest: req })
        vi.mocked(api.delete).mockResolvedValue({})
        vi.mocked(api.get).mockResolvedValue({ data: [] })

        await useCollectionsStore.getState().deleteRequest('col-1', 'req-1')

        expect(api.delete).toHaveBeenCalledWith('/collections/col-1/requests/req-1/')
        expect(useCollectionsStore.getState().selectedRequest).toBeNull()
      })
    })

    describe('UI State', () => {
      it('toggleExpanded should toggle id in expandedIds', () => {
        useCollectionsStore.getState().toggleExpanded('col-1')
        expect(useCollectionsStore.getState().expandedIds.has('col-1')).toBe(true)

        useCollectionsStore.getState().toggleExpanded('col-1')
        expect(useCollectionsStore.getState().expandedIds.has('col-1')).toBe(false)
      })

      it('setExpanded should add or remove from expandedIds', () => {
        useCollectionsStore.getState().setExpanded('col-1', true)
        expect(useCollectionsStore.getState().expandedIds.has('col-1')).toBe(true)

        useCollectionsStore.getState().setExpanded('col-1', false)
        expect(useCollectionsStore.getState().expandedIds.has('col-1')).toBe(false)
      })

      it('setSidebarTab should update tab', () => {
        useCollectionsStore.getState().setSidebarTab('history')
        expect(useCollectionsStore.getState().sidebarActiveTab).toBe('history')
      })

      it('clearHighlight should clear highlightedRequestId', () => {
        useCollectionsStore.setState({ highlightedRequestId: 'req-1' })
        useCollectionsStore.getState().clearHighlight()
        expect(useCollectionsStore.getState().highlightedRequestId).toBeNull()
      })
    })
  })
})
