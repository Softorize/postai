import { create } from 'zustand'
import { Workspace } from '@/types'
import { api } from '@/api/client'
import { useTabsStore } from './tabs.store'

interface WorkspacesState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  activateWorkspace: (id: string) => Promise<void>
  getActiveWorkspace: () => Promise<Workspace | null>
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/workspaces/')
      const workspaces = response.data
      const active = workspaces.find((w: Workspace) => w.is_active) || null
      set({ workspaces, activeWorkspace: active, isLoading: false })

      // Initialize tabs store with current workspace (only on first load)
      const tabsStore = useTabsStore.getState()
      if (tabsStore.currentWorkspaceId === null && active) {
        tabsStore.switchWorkspace(active.id)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch workspaces'
      set({ error: errorMessage, isLoading: false })
    }
  },

  createWorkspace: async (name, description) => {
    const response = await api.post('/workspaces/', { name, description })
    const newWorkspace = response.data
    set((state) => ({ workspaces: [...state.workspaces, newWorkspace] }))
    return newWorkspace
  },

  updateWorkspace: async (id, data) => {
    const response = await api.put(`/workspaces/${id}/`, data)
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? response.data : w
      ),
      activeWorkspace: state.activeWorkspace?.id === id ? response.data : state.activeWorkspace,
    }))
  },

  deleteWorkspace: async (id) => {
    await api.delete(`/workspaces/${id}/`)
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      activeWorkspace: state.activeWorkspace?.id === id ? null : state.activeWorkspace,
    }))
  },

  activateWorkspace: async (id) => {
    await api.post(`/workspaces/${id}/activate/`)
    await get().fetchWorkspaces()
    // Switch tabs to the new workspace
    useTabsStore.getState().switchWorkspace(id)
  },

  getActiveWorkspace: async () => {
    try {
      const response = await api.get('/workspaces/active/')
      set({ activeWorkspace: response.data })
      return response.data
    } catch {
      return null
    }
  },
}))
