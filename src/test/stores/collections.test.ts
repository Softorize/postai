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
      const initialCollection = {
        id: 'col-1',
        name: 'Test Collection',
        requests: [{ id: 'req-1', name: 'Test Request', method: 'GET', url: 'https://api.com' }],
        folders: [],
      }
      useCollectionsStore.setState({ collections: [initialCollection] })

      const result = await useCollectionsStore.getState().duplicateRequest('col-1', 'req-1')

      expect(api.post).toHaveBeenCalledWith('/collections/col-1/requests/req-1/duplicate/')
      expect(result).toEqual(mockDuplicatedRequest)
    })

    it('should return the duplicated request', async () => {
      const mockDuplicatedRequest = { id: 'req-2', name: 'Test (Copy)', method: 'GET', url: 'https://api.com' }

      const initialCollection = {
        id: 'col-1',
        name: 'Test Collection',
        requests: [{ id: 'req-1', name: 'Test', method: 'GET', url: 'https://api.com' }],
        folders: [],
      }
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

      const initialCollection = {
        id: 'col-1',
        name: 'Test Collection',
        requests: [{ id: 'req-1', name: 'Test', method: 'GET', url: 'https://api.com' }],
        folders: [],
      }
      useCollectionsStore.setState({ collections: [initialCollection] })
      vi.mocked(api.post).mockResolvedValue({ data: mockDuplicatedRequest })
      vi.mocked(api.get).mockResolvedValue({ data: [] }) // Mock fetchCollections

      await useCollectionsStore.getState().duplicateRequest('col-1', 'req-1')

      // Verify fetchCollections was called (it calls api.get)
      expect(api.get).toHaveBeenCalled()
    })
  })
})
