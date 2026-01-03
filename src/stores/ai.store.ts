import { create } from 'zustand'
import api from '../api/client'
import { AiProvider, AiConversation, GitHubDeviceCodeResponse } from '../types'

interface AiState {
  // Providers
  providers: AiProvider[]
  activeProviderId: string | null

  // Conversations
  conversations: AiConversation[]
  activeConversationId: string | null

  // Chat UI state
  isSidebarOpen: boolean
  isLoading: boolean
  error: string | null

  // GitHub OAuth state
  githubDeviceCode: GitHubDeviceCodeResponse | null
  githubPolling: boolean

  // Actions
  fetchProviders: () => Promise<void>
  createProvider: (provider: Partial<AiProvider>) => Promise<AiProvider>
  updateProvider: (id: string, data: Partial<AiProvider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  setActiveProvider: (id: string | null) => void
  testProviderConnection: (id: string) => Promise<boolean>

  // GitHub OAuth actions
  startGitHubLogin: () => Promise<GitHubDeviceCodeResponse>
  pollGitHubToken: (deviceCode: string, providerId: string) => Promise<boolean>
  stopGitHubPolling: () => void
  logoutGitHub: (providerId: string) => Promise<void>

  fetchConversations: () => Promise<void>
  createConversation: (title: string, context?: Record<string, unknown>) => Promise<AiConversation>
  deleteConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string | null) => Promise<void>

  sendMessage: (message: string) => Promise<string>
  updateConversationContext: (context: Record<string, unknown>) => Promise<void>
  clearConversationMessages: (id: string) => Promise<void>

  generateRequest: (text: string, context?: Record<string, unknown>) => Promise<Record<string, unknown>>
  analyzeResponse: (responseData: Record<string, unknown>, requestContext?: Record<string, unknown>) => Promise<string>

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setError: (error: string | null) => void
}

export const useAiStore = create<AiState>((set, get) => ({
  providers: [],
  activeProviderId: null,
  conversations: [],
  activeConversationId: null,
  isSidebarOpen: false,
  isLoading: false,
  error: null,
  githubDeviceCode: null,
  githubPolling: false,

  // Provider actions
  fetchProviders: async () => {
    try {
      const response = await api.get('/ai/providers/')
      set({ providers: response.data.results || response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createProvider: async (provider) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/ai/providers/', provider)
      const newProvider = response.data
      set(state => ({
        providers: [...state.providers, newProvider],
        isLoading: false
      }))
      return newProvider
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateProvider: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch(`/ai/providers/${id}/`, data)
      set(state => ({
        providers: state.providers.map(p => p.id === id ? response.data : p),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteProvider: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/ai/providers/${id}/`)
      set(state => ({
        providers: state.providers.filter(p => p.id !== id),
        activeProviderId: state.activeProviderId === id ? null : state.activeProviderId,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setActiveProvider: (id) => {
    set({ activeProviderId: id })
  },

  testProviderConnection: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/ai/providers/${id}/test_connection/`)
      set({ isLoading: false })
      return response.data.success
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return false
    }
  },

  // GitHub OAuth actions
  startGitHubLogin: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/ai/github/device-code/')
      const deviceCode = response.data as GitHubDeviceCodeResponse
      set({ githubDeviceCode: deviceCode, isLoading: false })
      return deviceCode
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  pollGitHubToken: async (deviceCode, providerId) => {
    set({ githubPolling: true, error: null })
    try {
      const response = await api.post('/ai/github/poll-token/', {
        device_code: deviceCode,
        provider_id: providerId
      })

      if (response.data.status === 'success') {
        // Refresh providers to get updated OAuth status
        await get().fetchProviders()
        set({ githubPolling: false, githubDeviceCode: null })
        return true
      } else if (response.data.status === 'pending') {
        // Still waiting for user authorization
        return false
      } else {
        throw new Error(response.data.error_description || 'Authorization failed')
      }
    } catch (error: any) {
      // Don't set error for pending status
      if (error.response?.data?.error === 'authorization_pending' ||
          error.response?.data?.error === 'slow_down') {
        return false
      }
      set({ error: error.message, githubPolling: false })
      throw error
    }
  },

  stopGitHubPolling: () => {
    set({ githubPolling: false, githubDeviceCode: null })
  },

  logoutGitHub: async (providerId) => {
    set({ isLoading: true, error: null })
    try {
      await api.post('/ai/github/logout/', { provider_id: providerId })
      // Refresh providers to get updated OAuth status
      await get().fetchProviders()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Conversation actions
  fetchConversations: async () => {
    try {
      const response = await api.get('/ai/conversations/')
      set({ conversations: response.data.results || response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createConversation: async (title, context = {}) => {
    set({ isLoading: true, error: null })
    try {
      const { activeProviderId } = get()
      const response = await api.post('/ai/conversations/', {
        title,
        provider: activeProviderId,
        context
      })
      const newConversation = response.data
      set(state => ({
        conversations: [newConversation, ...state.conversations],
        activeConversationId: newConversation.id,
        isLoading: false
      }))
      return newConversation
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteConversation: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/ai/conversations/${id}/`)
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setActiveConversation: async (id) => {
    set({ activeConversationId: id })

    // Fetch full conversation details including messages
    if (id) {
      try {
        const response = await api.get(`/ai/conversations/${id}/`)
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? response.data : c
          )
        }))
      } catch (error) {
        console.error('Failed to fetch conversation details:', error)
      }
    }
  },

  sendMessage: async (message) => {
    const { activeProviderId, activeConversationId } = get()

    if (!activeProviderId) {
      throw new Error('No AI provider selected')
    }

    set({ isLoading: true, error: null })

    try {
      // Create conversation if none exists
      let conversationId = activeConversationId
      if (!conversationId) {
        const conv = await get().createConversation('New Chat')
        conversationId = conv.id
      }

      const response = await api.post(`/ai/conversations/${conversationId}/chat/`, {
        message,
        provider_id: activeProviderId,
        stream: false
      })

      // Refresh conversation to get updated messages
      const convResponse = await api.get(`/ai/conversations/${conversationId}/`)
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? convResponse.data : c
        ),
        isLoading: false
      }))

      return response.data.response
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateConversationContext: async (context) => {
    const { activeConversationId } = get()
    if (!activeConversationId) return

    try {
      await api.post(`/ai/conversations/${activeConversationId}/update_context/`, {
        context
      })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  clearConversationMessages: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/ai/conversations/${id}/clear_messages/`)
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, messages: [] } : c
        ),
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  generateRequest: async (text, context = {}) => {
    const { activeProviderId } = get()

    if (!activeProviderId) {
      throw new Error('No AI provider selected')
    }

    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/ai/generate-request/', {
        text,
        provider_id: activeProviderId,
        context
      })
      set({ isLoading: false })
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  analyzeResponse: async (responseData, requestContext = {}) => {
    const { activeProviderId } = get()

    if (!activeProviderId) {
      throw new Error('No AI provider selected')
    }

    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/ai/analyze-response/', {
        response_data: responseData,
        provider_id: activeProviderId,
        request_context: requestContext
      })
      set({ isLoading: false })
      return response.data.analysis
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  toggleSidebar: () => {
    set(state => ({ isSidebarOpen: !state.isSidebarOpen }))
  },

  setSidebarOpen: (open) => {
    set({ isSidebarOpen: open })
  },

  setError: (error) => {
    set({ error })
  }
}))
