import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/client', () => {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
  return { api: mock, default: mock }
})

import api from '@/api/client'
import { useAiStore } from '@/stores/ai.store'
import { AiProvider, AiConversation } from '@/types'

const createMockProvider = (overrides: Partial<AiProvider> = {}): AiProvider => ({
  id: 'prov-1',
  name: 'Test Provider',
  provider_type: 'openai',
  api_key: 'sk-test',
  default_model: 'gpt-4',
  is_active: true,
  max_requests_per_minute: 60,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockConversation = (overrides: Partial<AiConversation> = {}): AiConversation => ({
  id: 'conv-1',
  title: 'Test Chat',
  provider: 'prov-1',
  context: {},
  messages: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('AI Store', () => {
  beforeEach(() => {
    useAiStore.setState({
      providers: [],
      activeProviderId: null,
      conversations: [],
      activeConversationId: null,
      isSidebarOpen: false,
      isLoading: false,
      error: null,
      githubDeviceCode: null,
      githubPolling: false,
    })
    vi.clearAllMocks()
  })

  describe('Provider CRUD', () => {
    describe('fetchProviders', () => {
      it('should fetch providers from results', async () => {
        const providers = [createMockProvider()]
        vi.mocked(api.get).mockResolvedValue({ data: { results: providers } })

        await useAiStore.getState().fetchProviders()

        expect(api.get).toHaveBeenCalledWith('/ai/providers/')
        expect(useAiStore.getState().providers).toEqual(providers)
      })

      it('should fallback to data directly', async () => {
        const providers = [createMockProvider()]
        vi.mocked(api.get).mockResolvedValue({ data: providers })

        await useAiStore.getState().fetchProviders()

        expect(useAiStore.getState().providers).toEqual(providers)
      })
    })

    describe('createProvider', () => {
      it('should create provider and add to state', async () => {
        const newProv = createMockProvider({ id: 'prov-new' })
        vi.mocked(api.post).mockResolvedValue({ data: newProv })

        const result = await useAiStore.getState().createProvider({ name: 'New' })

        expect(api.post).toHaveBeenCalledWith('/ai/providers/', { name: 'New' })
        expect(result).toEqual(newProv)
        expect(useAiStore.getState().providers).toContainEqual(newProv)
      })
    })

    describe('updateProvider', () => {
      it('should update provider in state', async () => {
        const prov = createMockProvider({ id: 'prov-1', name: 'Old' })
        useAiStore.setState({ providers: [prov] })
        vi.mocked(api.patch).mockResolvedValue({ data: { ...prov, name: 'Updated' } })

        await useAiStore.getState().updateProvider('prov-1', { name: 'Updated' })

        expect(useAiStore.getState().providers[0].name).toBe('Updated')
      })
    })

    describe('deleteProvider', () => {
      it('should remove provider from state', async () => {
        const prov = createMockProvider({ id: 'prov-1' })
        useAiStore.setState({ providers: [prov] })
        vi.mocked(api.delete).mockResolvedValue({})

        await useAiStore.getState().deleteProvider('prov-1')

        expect(useAiStore.getState().providers).toHaveLength(0)
      })

      it('should clear activeProviderId if deleted provider was active', async () => {
        const prov = createMockProvider({ id: 'prov-1' })
        useAiStore.setState({ providers: [prov], activeProviderId: 'prov-1' })
        vi.mocked(api.delete).mockResolvedValue({})

        await useAiStore.getState().deleteProvider('prov-1')

        expect(useAiStore.getState().activeProviderId).toBeNull()
      })

      it('should keep activeProviderId if different provider deleted', async () => {
        const prov1 = createMockProvider({ id: 'prov-1' })
        const prov2 = createMockProvider({ id: 'prov-2' })
        useAiStore.setState({ providers: [prov1, prov2], activeProviderId: 'prov-1' })
        vi.mocked(api.delete).mockResolvedValue({})

        await useAiStore.getState().deleteProvider('prov-2')

        expect(useAiStore.getState().activeProviderId).toBe('prov-1')
      })
    })
  })

  describe('setActiveProvider', () => {
    it('should set the active provider id', () => {
      useAiStore.getState().setActiveProvider('prov-1')
      expect(useAiStore.getState().activeProviderId).toBe('prov-1')
    })

    it('should clear with null', () => {
      useAiStore.setState({ activeProviderId: 'prov-1' })
      useAiStore.getState().setActiveProvider(null)
      expect(useAiStore.getState().activeProviderId).toBeNull()
    })
  })

  describe('testProviderConnection', () => {
    it('should return true on success', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } })

      const result = await useAiStore.getState().testProviderConnection('prov-1')

      expect(api.post).toHaveBeenCalledWith('/ai/providers/prov-1/test_connection/')
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Failed'))

      const result = await useAiStore.getState().testProviderConnection('prov-1')

      expect(result).toBe(false)
    })
  })

  describe('pollGitHubToken', () => {
    it('should return true and refresh providers on success', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { status: 'success' } })
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } })

      const result = await useAiStore.getState().pollGitHubToken('device-123', 'prov-1')

      expect(result).toBe(true)
      expect(useAiStore.getState().githubPolling).toBe(false)
      expect(useAiStore.getState().githubDeviceCode).toBeNull()
    })

    it('should return false on pending status', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { status: 'pending' } })

      const result = await useAiStore.getState().pollGitHubToken('device-123', 'prov-1')

      expect(result).toBe(false)
    })

    it('should throw on error status', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { status: 'error', error_description: 'Access denied' }
      })

      await expect(
        useAiStore.getState().pollGitHubToken('device-123', 'prov-1')
      ).rejects.toThrow('Access denied')
    })

    it('should return false for authorization_pending errors', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'authorization_pending' } },
        message: 'error'
      })

      const result = await useAiStore.getState().pollGitHubToken('device-123', 'prov-1')
      expect(result).toBe(false)
    })

    it('should return false for slow_down errors', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'slow_down' } },
        message: 'error'
      })

      const result = await useAiStore.getState().pollGitHubToken('device-123', 'prov-1')
      expect(result).toBe(false)
    })

    it('should throw for other errors', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'))

      await expect(
        useAiStore.getState().pollGitHubToken('device-123', 'prov-1')
      ).rejects.toThrow('Network error')

      expect(useAiStore.getState().githubPolling).toBe(false)
    })
  })

  describe('stopGitHubPolling', () => {
    it('should clear polling state', () => {
      useAiStore.setState({ githubPolling: true, githubDeviceCode: { device_code: '123' } as any })
      useAiStore.getState().stopGitHubPolling()
      expect(useAiStore.getState().githubPolling).toBe(false)
      expect(useAiStore.getState().githubDeviceCode).toBeNull()
    })
  })

  describe('Conversation operations', () => {
    describe('fetchConversations', () => {
      it('should fetch conversations', async () => {
        const convs = [createMockConversation()]
        vi.mocked(api.get).mockResolvedValue({ data: { results: convs } })

        await useAiStore.getState().fetchConversations()

        expect(api.get).toHaveBeenCalledWith('/ai/conversations/')
        expect(useAiStore.getState().conversations).toEqual(convs)
      })
    })

    describe('createConversation', () => {
      it('should create conversation with active provider', async () => {
        useAiStore.setState({ activeProviderId: 'prov-1' })
        const conv = createMockConversation()
        vi.mocked(api.post).mockResolvedValue({ data: conv })

        const result = await useAiStore.getState().createConversation('New Chat')

        expect(api.post).toHaveBeenCalledWith('/ai/conversations/', {
          title: 'New Chat',
          provider: 'prov-1',
          context: {},
        })
        expect(result).toEqual(conv)
        expect(useAiStore.getState().activeConversationId).toBe(conv.id)
      })
    })

    describe('deleteConversation', () => {
      it('should remove conversation and clear active if matching', async () => {
        const conv = createMockConversation({ id: 'conv-1' })
        useAiStore.setState({ conversations: [conv], activeConversationId: 'conv-1' })
        vi.mocked(api.delete).mockResolvedValue({})

        await useAiStore.getState().deleteConversation('conv-1')

        expect(useAiStore.getState().conversations).toHaveLength(0)
        expect(useAiStore.getState().activeConversationId).toBeNull()
      })

      it('should keep activeConversationId when deleting different conversation', async () => {
        const conv1 = createMockConversation({ id: 'conv-1' })
        const conv2 = createMockConversation({ id: 'conv-2' })
        useAiStore.setState({ conversations: [conv1, conv2], activeConversationId: 'conv-1' })
        vi.mocked(api.delete).mockResolvedValue({})

        await useAiStore.getState().deleteConversation('conv-2')

        expect(useAiStore.getState().activeConversationId).toBe('conv-1')
      })
    })
  })

  describe('sendMessage', () => {
    it('should throw if no active provider', async () => {
      useAiStore.setState({ activeProviderId: null })

      await expect(
        useAiStore.getState().sendMessage('hello')
      ).rejects.toThrow('No AI provider selected')
    })

    it('should create conversation if none exists', async () => {
      const conv = createMockConversation({ id: 'conv-auto' })
      useAiStore.setState({ activeProviderId: 'prov-1', activeConversationId: null })

      // First post: createConversation, second: chat, third: get conversation details
      vi.mocked(api.post)
        .mockResolvedValueOnce({ data: conv }) // createConversation
        .mockResolvedValueOnce({ data: { response: 'Hello!' } }) // chat

      vi.mocked(api.get).mockResolvedValue({ data: { ...conv, messages: [{ content: 'Hello!' }] } })

      const response = await useAiStore.getState().sendMessage('hello')

      expect(response).toBe('Hello!')
    })

    it('should use existing conversation', async () => {
      const conv = createMockConversation({ id: 'conv-1' })
      useAiStore.setState({
        activeProviderId: 'prov-1',
        activeConversationId: 'conv-1',
        conversations: [conv],
      })

      vi.mocked(api.post).mockResolvedValue({ data: { response: 'Reply' } })
      vi.mocked(api.get).mockResolvedValue({ data: conv })

      const response = await useAiStore.getState().sendMessage('hi')

      expect(api.post).toHaveBeenCalledWith('/ai/conversations/conv-1/chat/', {
        message: 'hi',
        provider_id: 'prov-1',
        stream: false,
      })
      expect(response).toBe('Reply')
    })
  })

  describe('generateRequest', () => {
    it('should throw if no active provider', async () => {
      useAiStore.setState({ activeProviderId: null })

      await expect(
        useAiStore.getState().generateRequest('create a GET request')
      ).rejects.toThrow('No AI provider selected')
    })

    it('should generate request with provider', async () => {
      useAiStore.setState({ activeProviderId: 'prov-1' })
      const mockData = { method: 'GET', url: 'https://api.example.com' }
      vi.mocked(api.post).mockResolvedValue({ data: mockData })

      const result = await useAiStore.getState().generateRequest('get users')

      expect(api.post).toHaveBeenCalledWith('/ai/generate-request/', {
        text: 'get users',
        provider_id: 'prov-1',
        context: {},
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('generateWorkflow', () => {
    it('should throw if no active provider', async () => {
      useAiStore.setState({ activeProviderId: null })

      await expect(
        useAiStore.getState().generateWorkflow('create a workflow')
      ).rejects.toThrow('No AI provider selected')
    })

    it('should return workflow data', async () => {
      useAiStore.setState({ activeProviderId: 'prov-1' })
      const mockWorkflow = { nodes: [], edges: [] }
      vi.mocked(api.post).mockResolvedValue({ data: { workflow: mockWorkflow } })

      const result = await useAiStore.getState().generateWorkflow('test')

      expect(result).toEqual(mockWorkflow)
    })
  })

  describe('analyzeResponse', () => {
    it('should throw if no active provider', async () => {
      useAiStore.setState({ activeProviderId: null })

      await expect(
        useAiStore.getState().analyzeResponse({})
      ).rejects.toThrow('No AI provider selected')
    })

    it('should return analysis', async () => {
      useAiStore.setState({ activeProviderId: 'prov-1' })
      vi.mocked(api.post).mockResolvedValue({ data: { analysis: 'Looks good!' } })

      const result = await useAiStore.getState().analyzeResponse({ status: 200 })

      expect(result).toBe('Looks good!')
    })
  })

  describe('startGitHubLogin', () => {
    it('should return device code on success', async () => {
      const deviceCode = { device_code: 'abc', user_code: 'USER-123', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 }
      vi.mocked(api.post).mockResolvedValue({ data: deviceCode })

      const result = await useAiStore.getState().startGitHubLogin()

      expect(api.post).toHaveBeenCalledWith('/ai/github/device-code/')
      expect(result).toEqual(deviceCode)
      expect(useAiStore.getState().githubDeviceCode).toEqual(deviceCode)
    })

    it('should set error on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('GitHub unavailable'))

      await expect(useAiStore.getState().startGitHubLogin()).rejects.toThrow('GitHub unavailable')
      expect(useAiStore.getState().error).toBe('GitHub unavailable')
    })
  })

  describe('logoutGitHub', () => {
    it('should logout and refresh providers', async () => {
      vi.mocked(api.post).mockResolvedValue({})
      vi.mocked(api.get).mockResolvedValue({ data: { results: [] } })

      await useAiStore.getState().logoutGitHub('prov-1')

      expect(api.post).toHaveBeenCalledWith('/ai/github/logout/', { provider_id: 'prov-1' })
      expect(api.get).toHaveBeenCalledWith('/ai/providers/')
    })

    it('should set error on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Logout failed'))

      await expect(useAiStore.getState().logoutGitHub('prov-1')).rejects.toThrow()
      expect(useAiStore.getState().error).toBe('Logout failed')
    })
  })

  describe('setActiveConversation', () => {
    it('should set active and fetch conversation details', async () => {
      const conv = createMockConversation({ id: 'conv-1' })
      const fullConv = { ...conv, messages: [{ content: 'Hi' }] }
      useAiStore.setState({ conversations: [conv] })
      vi.mocked(api.get).mockResolvedValue({ data: fullConv })

      await useAiStore.getState().setActiveConversation('conv-1')

      expect(useAiStore.getState().activeConversationId).toBe('conv-1')
      expect(api.get).toHaveBeenCalledWith('/ai/conversations/conv-1/')
    })

    it('should not fetch when setting to null', async () => {
      await useAiStore.getState().setActiveConversation(null)

      expect(useAiStore.getState().activeConversationId).toBeNull()
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  describe('updateConversationContext', () => {
    it('should update context for active conversation', async () => {
      useAiStore.setState({ activeConversationId: 'conv-1' })
      vi.mocked(api.post).mockResolvedValue({})

      await useAiStore.getState().updateConversationContext({ key: 'value' })

      expect(api.post).toHaveBeenCalledWith('/ai/conversations/conv-1/update_context/', {
        context: { key: 'value' }
      })
    })

    it('should do nothing without active conversation', async () => {
      useAiStore.setState({ activeConversationId: null })

      await useAiStore.getState().updateConversationContext({ key: 'value' })

      expect(api.post).not.toHaveBeenCalled()
    })
  })

  describe('clearConversationMessages', () => {
    it('should clear messages and update state', async () => {
      const conv = createMockConversation({ id: 'conv-1', messages: [{ content: 'hi' }] as any })
      useAiStore.setState({ conversations: [conv] })
      vi.mocked(api.delete).mockResolvedValue({})

      await useAiStore.getState().clearConversationMessages('conv-1')

      expect(api.delete).toHaveBeenCalledWith('/ai/conversations/conv-1/clear_messages/')
      const updatedConv = useAiStore.getState().conversations.find(c => c.id === 'conv-1')
      expect(updatedConv!.messages).toEqual([])
    })
  })

  describe('UI actions', () => {
    it('toggleSidebar should toggle', () => {
      useAiStore.getState().toggleSidebar()
      expect(useAiStore.getState().isSidebarOpen).toBe(true)
      useAiStore.getState().toggleSidebar()
      expect(useAiStore.getState().isSidebarOpen).toBe(false)
    })

    it('setSidebarOpen should set value', () => {
      useAiStore.getState().setSidebarOpen(true)
      expect(useAiStore.getState().isSidebarOpen).toBe(true)
    })

    it('setError should set error', () => {
      useAiStore.getState().setError('test error')
      expect(useAiStore.getState().error).toBe('test error')
    })
  })
})
