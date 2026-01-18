import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
      const mockCreateElement = vi.fn()
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
})
