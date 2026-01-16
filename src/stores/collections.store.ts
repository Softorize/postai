import { create } from 'zustand'
import { Collection, Folder, Request } from '@/types'
import { api } from '@/api/client'
import { useWorkspacesStore } from './workspaces.store'

export type SidebarTab = 'collections' | 'environments' | 'history' | 'mcp' | 'workflows'

interface ExportResult {
  success: boolean
  error?: string
}

interface CollectionsState {
  collections: Collection[]
  selectedCollection: Collection | null
  selectedRequest: Request | null
  isLoading: boolean
  error: string | null

  // UI state - track expanded collections/folders by ID
  expandedIds: Set<string>
  highlightedRequestId: string | null
  sidebarActiveTab: SidebarTab

  // Actions
  fetchCollections: () => Promise<void>
  toggleExpanded: (id: string) => void
  setExpanded: (id: string, expanded: boolean) => void
  setSidebarTab: (tab: SidebarTab) => void
  revealRequest: (requestId: string) => void
  clearHighlight: () => void
  createCollection: (name: string, description?: string) => Promise<Collection>
  updateCollection: (id: string, data: Partial<Collection>) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  selectCollection: (collection: Collection | null) => void
  selectRequest: (request: Request | null) => void
  exportCollection: (id: string) => Promise<ExportResult>

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
  expandedIds: new Set<string>(),
  highlightedRequestId: null,
  sidebarActiveTab: 'collections',

  setSidebarTab: (tab: SidebarTab) => {
    set({ sidebarActiveTab: tab })
  },

  toggleExpanded: (id: string) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedIds)
      if (newExpandedIds.has(id)) {
        newExpandedIds.delete(id)
      } else {
        newExpandedIds.add(id)
      }
      return { expandedIds: newExpandedIds }
    })
  },

  setExpanded: (id: string, expanded: boolean) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedIds)
      if (expanded) {
        newExpandedIds.add(id)
      } else {
        newExpandedIds.delete(id)
      }
      return { expandedIds: newExpandedIds }
    })
  },

  revealRequest: (requestId: string) => {
    const { collections, expandedIds } = get()
    const newExpandedIds = new Set(expandedIds)

    // Helper to find request and its path
    const findRequestPath = (
      folders: Folder[] | undefined,
      path: string[]
    ): string[] | null => {
      if (!folders) return null
      for (const folder of folders) {
        // Check if request is in this folder
        if (folder.requests?.some(r => r.id === requestId)) {
          return [...path, folder.id]
        }
        // Check subfolders
        const subPath = findRequestPath(folder.subfolders, [...path, folder.id])
        if (subPath) return subPath
      }
      return null
    }

    // Find the collection and path to the request
    for (const collection of collections) {
      // Check root-level requests
      if (collection.requests?.some(r => !r.folder && r.id === requestId)) {
        newExpandedIds.add(collection.id)
        set({ expandedIds: newExpandedIds, highlightedRequestId: requestId, sidebarActiveTab: 'collections' })
        // Clear highlight after animation
        setTimeout(() => set({ highlightedRequestId: null }), 2000)
        return
      }

      // Check folders
      const path = findRequestPath(collection.folders, [collection.id])
      if (path) {
        // Expand all folders in the path
        path.forEach(id => newExpandedIds.add(id))
        set({ expandedIds: newExpandedIds, highlightedRequestId: requestId, sidebarActiveTab: 'collections' })
        // Clear highlight after animation
        setTimeout(() => set({ highlightedRequestId: null }), 2000)
        return
      }
    }
  },

  clearHighlight: () => {
    set({ highlightedRequestId: null })
  },

  fetchCollections: async () => {
    set({ isLoading: true, error: null })
    try {
      const activeWorkspace = useWorkspacesStore.getState().activeWorkspace
      const params = activeWorkspace ? { workspace: activeWorkspace.id } : {}
      const response = await api.get('/collections/', { params })
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

  exportCollection: async (id) => {
    try {
      const response = await api.get(`/collections/${id}/export/`)
      const data = response.data
      const collection = get().collections.find(c => c.id === id)
      const filename = `${collection?.name || 'collection'}.postman_collection.json`

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export collection'
      return { success: false, error: errorMessage }
    }
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
