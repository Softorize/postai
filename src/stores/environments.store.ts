import { create } from 'zustand'
import { Environment, EnvironmentVariable } from '@/types'
import { api } from '@/api/client'
import { useWorkspacesStore } from './workspaces.store'

interface ImportResult {
  success: boolean
  environment?: Environment
  variables_imported?: number
  error?: string
}

interface ExportResult {
  success: boolean
  error?: string
}

interface EnvironmentsState {
  environments: Environment[]
  activeEnvironment: Environment | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchEnvironments: () => Promise<void>
  fetchGlobalEnvironments: () => Promise<Environment[]>
  createEnvironment: (name: string, description?: string, collectionId?: string) => Promise<Environment>
  updateEnvironment: (id: string, data: Partial<Environment>) => Promise<void>
  deleteEnvironment: (id: string) => Promise<void>
  duplicateEnvironment: (id: string) => Promise<Environment>
  activateEnvironment: (id: string) => Promise<void>
  getActiveEnvironment: () => Promise<Environment | null>
  importEnvironment: (content: string) => Promise<ImportResult>
  exportEnvironment: (id: string, format?: 'postman' | 'postai') => Promise<ExportResult>

  // Variable actions (with multi-value support)
  createVariable: (envId: string, data: Partial<EnvironmentVariable>) => Promise<EnvironmentVariable>
  updateVariable: (envId: string, varId: string, data: Partial<EnvironmentVariable>) => Promise<void>
  deleteVariable: (envId: string, varId: string) => Promise<void>
  selectVariableValue: (envId: string, varId: string, index: number) => Promise<void>
  addVariableValue: (envId: string, varId: string, value: string) => Promise<void>
  removeVariableValue: (envId: string, varId: string, index: number) => Promise<void>

  // Computed
  getGlobalEnvironments: () => Environment[]
  getCollectionEnvironments: (collectionId: string) => Environment[]

  // Utilities - collectionEnv is now optional for priority resolution
  resolveVariables: (text: string, collectionEnv?: Environment | null) => string
  getVariableValue: (key: string, collectionEnv?: Environment | null) => string | null
}

export const useEnvironmentsStore = create<EnvironmentsState>((set, get) => ({
  environments: [],
  activeEnvironment: null,
  isLoading: false,
  error: null,

  fetchEnvironments: async () => {
    set({ isLoading: true, error: null })
    try {
      const activeWorkspace = useWorkspacesStore.getState().activeWorkspace
      const params = activeWorkspace ? { workspace: activeWorkspace.id } : {}
      const response = await api.get('/environments/', { params })
      const environments = response.data
      // Only consider global environments for the active environment (collection=null)
      const active = environments.find((e: Environment) => e.is_active && !e.collection) || null
      set({ environments, activeEnvironment: active, isLoading: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch environments'
      set({ error: errorMessage, isLoading: false })
    }
  },

  fetchGlobalEnvironments: async () => {
    try {
      const activeWorkspace = useWorkspacesStore.getState().activeWorkspace
      const params: Record<string, string> = { global_only: 'true' }
      if (activeWorkspace) {
        params.workspace = activeWorkspace.id
      }
      const response = await api.get('/environments/', { params })
      return response.data
    } catch (error: unknown) {
      console.error('Failed to fetch global environments:', error)
      return []
    }
  },

  createEnvironment: async (name, description, collectionId) => {
    const payload: { name: string; description?: string; collection?: string } = { name, description }
    if (collectionId) {
      payload.collection = collectionId
    }
    const response = await api.post('/environments/', payload)
    const newEnv = response.data
    set((state) => ({ environments: [...state.environments, newEnv] }))
    return newEnv
  },

  updateEnvironment: async (id, data) => {
    const response = await api.put(`/environments/${id}/`, data)
    set((state) => ({
      environments: state.environments.map((e) =>
        e.id === id ? response.data : e
      ),
      activeEnvironment: state.activeEnvironment?.id === id ? response.data : state.activeEnvironment,
    }))
  },

  deleteEnvironment: async (id) => {
    await api.delete(`/environments/${id}/`)
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnvironment: state.activeEnvironment?.id === id ? null : state.activeEnvironment,
    }))
  },

  duplicateEnvironment: async (id) => {
    const response = await api.post(`/environments/${id}/duplicate/`)
    const newEnvironment = response.data
    set((state) => ({
      environments: [...state.environments, newEnvironment],
    }))
    return newEnvironment
  },

  activateEnvironment: async (id) => {
    await api.post(`/environments/${id}/activate/`)
    await get().fetchEnvironments()
  },

  getActiveEnvironment: async () => {
    try {
      const response = await api.get('/environments/active/')
      set({ activeEnvironment: response.data })
      return response.data
    } catch {
      return null
    }
  },

  importEnvironment: async (content) => {
    try {
      const response = await api.post('/environments/import/', { content })
      if (response.data.success) {
        await get().fetchEnvironments()
        return {
          success: true,
          environment: response.data.environment,
          variables_imported: response.data.variables_imported,
        }
      }
      return { success: false, error: response.data.error || 'Import failed' }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import environment'
      return { success: false, error: errorMessage }
    }
  },

  exportEnvironment: async (id, format = 'postman') => {
    try {
      const response = await api.get(`/environments/${id}/export/`, {
        params: { export_format: format }
      })
      const data = response.data
      const environment = get().environments.find(e => e.id === id)
      const extension = format === 'postai' ? '.postai_environment.json' : '.postman_environment.json'
      const filename = `${environment?.name || 'environment'}${extension}`

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
      let errorMessage = 'Failed to export environment'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number }, message?: string }
        errorMessage = `Request failed with status code ${axiosError.response?.status}`
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      return { success: false, error: errorMessage }
    }
  },

  createVariable: async (envId, data) => {
    const response = await api.post(`/environments/${envId}/variables/`, data)
    await get().fetchEnvironments()
    return response.data
  },

  updateVariable: async (envId, varId, data) => {
    await api.patch(`/environments/${envId}/variables/${varId}/`, data)
    await get().fetchEnvironments()
  },

  deleteVariable: async (envId, varId) => {
    await api.delete(`/environments/${envId}/variables/${varId}/`)
    await get().fetchEnvironments()
  },

  selectVariableValue: async (envId, varId, index) => {
    await api.post(`/environments/${envId}/variables/${varId}/select-value/`, { index })
    await get().fetchEnvironments()
  },

  addVariableValue: async (envId, varId, value) => {
    await api.post(`/environments/${envId}/variables/${varId}/add-value/`, { value })
    await get().fetchEnvironments()
  },

  removeVariableValue: async (envId, varId, index) => {
    await api.post(`/environments/${envId}/variables/${varId}/remove-value/`, { index })
    await get().fetchEnvironments()
  },

  getGlobalEnvironments: () => {
    const { environments } = get()
    return environments.filter(e => !e.collection)
  },

  getCollectionEnvironments: (collectionId) => {
    const { environments } = get()
    return environments.filter(e => e.collection === collectionId)
  },

  resolveVariables: (text, collectionEnv) => {
    const { activeEnvironment } = get()
    if (!text) return text

    const pattern = /\{\{([^}]+)\}\}/g
    return text.replace(pattern, (match, varName) => {
      const trimmedName = varName.trim()

      // Priority 1: Check collection environment first (if provided and has variables)
      if (collectionEnv) {
        const collectionVariable = collectionEnv.variables?.find(
          (v) => v.key === trimmedName && v.enabled
        )
        if (collectionVariable) {
          const values = collectionVariable.values || []
          const selectedIndex = collectionVariable.selected_value_index || 0
          const value = values[selectedIndex]
          if (value !== undefined) return value
        }
      }

      // Priority 2: Fall back to global active environment
      if (activeEnvironment) {
        const variable = activeEnvironment.variables?.find(
          (v) => v.key === trimmedName && v.enabled
        )
        if (variable) {
          const values = variable.values || []
          const selectedIndex = variable.selected_value_index || 0
          return values[selectedIndex] ?? match
        }
      }

      return match
    })
  },

  getVariableValue: (key, collectionEnv) => {
    const { activeEnvironment } = get()

    // Priority 1: Check collection environment first
    if (collectionEnv) {
      const collectionVariable = collectionEnv.variables?.find(
        (v) => v.key === key && v.enabled
      )
      if (collectionVariable) {
        const values = collectionVariable.values || []
        const selectedIndex = collectionVariable.selected_value_index || 0
        const value = values[selectedIndex]
        if (value !== undefined) return value
      }
    }

    // Priority 2: Fall back to global active environment
    if (activeEnvironment) {
      const variable = activeEnvironment.variables?.find(
        (v) => v.key === key && v.enabled
      )
      if (variable) {
        const values = variable.values || []
        const selectedIndex = variable.selected_value_index || 0
        return values[selectedIndex] ?? null
      }
    }

    return null
  },
}))
