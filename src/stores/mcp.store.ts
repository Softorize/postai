import { create } from 'zustand'
import api from '../api/client'
import { McpServer, McpTool, McpResource, McpPrompt } from '../types'

interface McpState {
  servers: McpServer[]
  activeServerId: string | null
  tools: McpTool[]
  resources: McpResource[]
  prompts: McpPrompt[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchServers: () => Promise<void>
  createServer: (server: Partial<McpServer>) => Promise<McpServer>
  updateServer: (id: string, data: Partial<McpServer>) => Promise<void>
  deleteServer: (id: string) => Promise<void>
  setActiveServer: (id: string | null) => void

  connectServer: (id: string) => Promise<boolean>
  disconnectServer: (id: string) => Promise<void>

  fetchTools: (serverId: string) => Promise<void>
  fetchResources: (serverId: string) => Promise<void>
  fetchPrompts: (serverId: string) => Promise<void>

  executeTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<unknown>
  readResource: (serverId: string, uri: string) => Promise<unknown>
  getPrompt: (serverId: string, promptName: string, args?: Record<string, string>) => Promise<unknown>

  setError: (error: string | null) => void
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  activeServerId: null,
  tools: [],
  resources: [],
  prompts: [],
  isLoading: false,
  error: null,

  fetchServers: async () => {
    try {
      const response = await api.get('/mcp/servers/')
      set({ servers: response.data.results || response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createServer: async (server) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/mcp/servers/', server)
      const newServer = response.data
      set(state => ({
        servers: [...state.servers, newServer],
        isLoading: false
      }))
      return newServer
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateServer: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch(`/mcp/servers/${id}/`, data)
      set(state => ({
        servers: state.servers.map(s => s.id === id ? response.data : s),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteServer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/mcp/servers/${id}/`)
      set(state => ({
        servers: state.servers.filter(s => s.id !== id),
        activeServerId: state.activeServerId === id ? null : state.activeServerId,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setActiveServer: (id) => {
    set({ activeServerId: id, tools: [], resources: [], prompts: [] })
    if (id) {
      get().fetchTools(id)
      get().fetchResources(id)
      get().fetchPrompts(id)
    }
  },

  connectServer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/mcp/servers/${id}/connect/`)
      if (response.data.success) {
        set(state => ({
          servers: state.servers.map(s =>
            s.id === id ? { ...s, is_connected: true } : s
          ),
          tools: response.data.tools || [],
          resources: response.data.resources || [],
          prompts: response.data.prompts || [],
          isLoading: false
        }))
        return true
      } else {
        set({ error: response.data.error, isLoading: false })
        return false
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message, isLoading: false })
      return false
    }
  },

  disconnectServer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(`/mcp/servers/${id}/disconnect/`)
      set(state => ({
        servers: state.servers.map(s =>
          s.id === id ? { ...s, is_connected: false } : s
        ),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchTools: async (serverId) => {
    try {
      const response = await api.get(`/mcp/servers/${serverId}/tools/`)
      set({ tools: response.data.tools || [] })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchResources: async (serverId) => {
    try {
      const response = await api.get(`/mcp/servers/${serverId}/resources/`)
      set({ resources: response.data.resources || [] })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchPrompts: async (serverId) => {
    try {
      const response = await api.get(`/mcp/servers/${serverId}/prompts/`)
      set({ prompts: response.data.prompts || [] })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  executeTool: async (serverId, toolName, args) => {
    // Don't set global isLoading - we use per-tool loading state in the UI
    set({ error: null })
    try {
      const response = await api.post(`/mcp/servers/${serverId}/execute_tool/`, {
        tool_name: toolName,
        arguments: args
      })
      if (response.data.success) {
        return response.data.result
      } else {
        throw new Error(response.data.error)
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message })
      throw error
    }
  },

  readResource: async (serverId, uri) => {
    // Don't set global isLoading - we use per-resource loading state in the UI
    set({ error: null })
    try {
      const response = await api.post(`/mcp/servers/${serverId}/read_resource/`, {
        uri
      })
      if (response.data.success) {
        return response.data.contents
      } else {
        throw new Error(response.data.error)
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message })
      throw error
    }
  },

  getPrompt: async (serverId, promptName, args = {}) => {
    // Don't set global isLoading - we use per-prompt loading state in the UI
    set({ error: null })
    try {
      const response = await api.post(`/mcp/servers/${serverId}/get_prompt/`, {
        prompt_name: promptName,
        arguments: args
      })
      if (response.data.success) {
        return response.data
      } else {
        throw new Error(response.data.error)
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message })
      throw error
    }
  },

  setError: (error) => {
    set({ error })
  }
}))
