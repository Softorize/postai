import { create } from 'zustand'
import { Collection, Folder, Request } from '@/types'
import { api } from '@/api/client'

interface CollectionsState {
  collections: Collection[]
  selectedCollection: Collection | null
  selectedRequest: Request | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchCollections: () => Promise<void>
  createCollection: (name: string, description?: string) => Promise<Collection>
  updateCollection: (id: string, data: Partial<Collection>) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  selectCollection: (collection: Collection | null) => void
  selectRequest: (request: Request | null) => void

  // Folder actions
  createFolder: (collectionId: string, name: string, parentId?: string) => Promise<Folder>
  updateFolder: (collectionId: string, folderId: string, data: Partial<Folder>) => Promise<void>
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>

  // Request actions
  createRequest: (collectionId: string, data: Partial<Request>) => Promise<Request>
  updateRequest: (collectionId: string, requestId: string, data: Partial<Request>) => Promise<void>
  deleteRequest: (collectionId: string, requestId: string) => Promise<void>
  duplicateRequest: (collectionId: string, requestId: string) => Promise<Request>
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  selectedCollection: null,
  selectedRequest: null,
  isLoading: false,
  error: null,

  fetchCollections: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/collections/')
      set({ collections: response.data, isLoading: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections'
      set({ error: errorMessage, isLoading: false })
    }
  },

  createCollection: async (name, description) => {
    const response = await api.post('/collections/', { name, description })
    const newCollection = response.data
    set((state) => ({ collections: [...state.collections, newCollection] }))
    return newCollection
  },

  updateCollection: async (id, data) => {
    const response = await api.put(`/collections/${id}/`, data)
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? response.data : c
      ),
      selectedCollection: state.selectedCollection?.id === id ? response.data : state.selectedCollection,
    }))
  },

  deleteCollection: async (id) => {
    await api.delete(`/collections/${id}/`)
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      selectedCollection: state.selectedCollection?.id === id ? null : state.selectedCollection,
    }))
  },

  selectCollection: (collection) => {
    set({ selectedCollection: collection })
  },

  selectRequest: (request) => {
    set({ selectedRequest: request })
  },

  createFolder: async (collectionId, name, parentId) => {
    const response = await api.post(`/collections/${collectionId}/folders/`, {
      name,
      parent: parentId,
    })
    await get().fetchCollections()
    return response.data
  },

  updateFolder: async (collectionId, folderId, data) => {
    await api.put(`/collections/${collectionId}/folders/${folderId}/`, data)
    await get().fetchCollections()
  },

  deleteFolder: async (collectionId, folderId) => {
    await api.delete(`/collections/${collectionId}/folders/${folderId}/`)
    await get().fetchCollections()
  },

  createRequest: async (collectionId, data) => {
    const response = await api.post(`/collections/${collectionId}/requests/`, data)
    await get().fetchCollections()
    return response.data
  },

  updateRequest: async (collectionId, requestId, data) => {
    const response = await api.put(`/collections/${collectionId}/requests/${requestId}/`, data)
    await get().fetchCollections()
    set((state) => ({
      selectedRequest: state.selectedRequest?.id === requestId ? response.data : state.selectedRequest,
    }))
  },

  deleteRequest: async (collectionId, requestId) => {
    await api.delete(`/collections/${collectionId}/requests/${requestId}/`)
    await get().fetchCollections()
    set((state) => ({
      selectedRequest: state.selectedRequest?.id === requestId ? null : state.selectedRequest,
    }))
  },

  duplicateRequest: async (collectionId, requestId) => {
    const response = await api.post(`/collections/${collectionId}/requests/${requestId}/duplicate/`)
    await get().fetchCollections()
    return response.data
  },
}))
