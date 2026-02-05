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

vi.mock('@/stores/workspaces.store', () => ({
  useWorkspacesStore: {
    getState: () => ({
      activeWorkspace: { id: 'workspace-1' }
    })
  }
}))

import api from '@/api/client'
import { useMcpStore } from '@/stores/mcp.store'
import { McpServer } from '@/types'

const createMockServer = (overrides: Partial<McpServer> = {}): McpServer => ({
  id: 'srv-1',
  name: 'Test Server',
  description: 'A test MCP server',
  transport_type: 'stdio',
  command: 'npx',
  args: ['-y', 'mcp-server'],
  headers: {},
  env_vars: {},
  is_connected: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('MCP Store', () => {
  beforeEach(() => {
    useMcpStore.setState({
      servers: [],
      activeServerId: null,
      tools: [],
      resources: [],
      prompts: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchServers', () => {
    it('should fetch servers with workspace param', async () => {
      const servers = [createMockServer()]
      vi.mocked(api.get).mockResolvedValue({ data: { results: servers } })

      await useMcpStore.getState().fetchServers()

      expect(api.get).toHaveBeenCalledWith('/mcp/servers/', {
        params: { workspace: 'workspace-1' }
      })
      expect(useMcpStore.getState().servers).toEqual(servers)
    })

    it('should set error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await useMcpStore.getState().fetchServers()

      expect(useMcpStore.getState().error).toBe('Network error')
    })
  })

  describe('createServer', () => {
    it('should create server with workspace id', async () => {
      const server = createMockServer({ id: 'srv-new' })
      vi.mocked(api.post).mockResolvedValue({ data: server })

      const result = await useMcpStore.getState().createServer({ name: 'New Server' })

      expect(api.post).toHaveBeenCalledWith('/mcp/servers/', {
        name: 'New Server',
        workspace: 'workspace-1',
      })
      expect(result).toEqual(server)
      expect(useMcpStore.getState().servers).toContainEqual(server)
    })

    it('should rethrow on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Create failed'))

      await expect(
        useMcpStore.getState().createServer({ name: 'Bad' })
      ).rejects.toThrow('Create failed')
    })
  })

  describe('updateServer', () => {
    it('should update server in state', async () => {
      const server = createMockServer({ id: 'srv-1', name: 'Old' })
      useMcpStore.setState({ servers: [server] })
      vi.mocked(api.patch).mockResolvedValue({ data: { ...server, name: 'Updated' } })

      await useMcpStore.getState().updateServer('srv-1', { name: 'Updated' })

      expect(useMcpStore.getState().servers[0].name).toBe('Updated')
    })
  })

  describe('deleteServer', () => {
    it('should remove server from state', async () => {
      const server = createMockServer({ id: 'srv-1' })
      useMcpStore.setState({ servers: [server] })
      vi.mocked(api.delete).mockResolvedValue({})

      await useMcpStore.getState().deleteServer('srv-1')

      expect(useMcpStore.getState().servers).toHaveLength(0)
    })

    it('should clear activeServerId if deleted server was active', async () => {
      const server = createMockServer({ id: 'srv-1' })
      useMcpStore.setState({ servers: [server], activeServerId: 'srv-1' })
      vi.mocked(api.delete).mockResolvedValue({})

      await useMcpStore.getState().deleteServer('srv-1')

      expect(useMcpStore.getState().activeServerId).toBeNull()
    })
  })

  describe('setActiveServer', () => {
    it('should set active server and trigger fetches', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { tools: [], resources: [], prompts: [] } })

      useMcpStore.getState().setActiveServer('srv-1')

      expect(useMcpStore.getState().activeServerId).toBe('srv-1')
      // Triggers fetchTools, fetchResources, fetchPrompts
      expect(api.get).toHaveBeenCalledWith('/mcp/servers/srv-1/tools/')
      expect(api.get).toHaveBeenCalledWith('/mcp/servers/srv-1/resources/')
      expect(api.get).toHaveBeenCalledWith('/mcp/servers/srv-1/prompts/')
    })

    it('should clear tools/resources/prompts when setting active', () => {
      useMcpStore.setState({
        tools: [{ name: 'old', description: '', inputSchema: {} }],
        resources: [{ uri: 'old', name: 'old', description: '' }],
        prompts: [{ name: 'old', description: '' }],
      })

      // set to null (no fetches triggered)
      useMcpStore.getState().setActiveServer(null)

      expect(useMcpStore.getState().tools).toHaveLength(0)
      expect(useMcpStore.getState().resources).toHaveLength(0)
      expect(useMcpStore.getState().prompts).toHaveLength(0)
    })
  })

  describe('connectServer', () => {
    it('should return true and update server state on success', async () => {
      const server = createMockServer({ id: 'srv-1' })
      useMcpStore.setState({ servers: [server] })

      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: {} }],
          resources: [{ uri: 'res://1', name: 'Res1', description: '' }],
          prompts: [{ name: 'prompt1', description: '' }],
        }
      })

      const result = await useMcpStore.getState().connectServer('srv-1')

      expect(result).toBe(true)
      expect(useMcpStore.getState().servers[0].is_connected).toBe(true)
      expect(useMcpStore.getState().tools).toHaveLength(1)
      expect(useMcpStore.getState().resources).toHaveLength(1)
      expect(useMcpStore.getState().prompts).toHaveLength(1)
    })

    it('should return false on unsuccessful response', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: false, error: 'Connection refused' }
      })

      const result = await useMcpStore.getState().connectServer('srv-1')

      expect(result).toBe(false)
      expect(useMcpStore.getState().error).toBe('Connection refused')
    })

    it('should return false on error and extract response error', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'Server timeout' } },
        message: 'Request failed',
      })

      const result = await useMcpStore.getState().connectServer('srv-1')

      expect(result).toBe(false)
      expect(useMcpStore.getState().error).toBe('Server timeout')
    })
  })

  describe('disconnectServer', () => {
    it('should update server is_connected to false', async () => {
      const server = createMockServer({ id: 'srv-1', is_connected: true })
      useMcpStore.setState({ servers: [server] })
      vi.mocked(api.post).mockResolvedValue({})

      await useMcpStore.getState().disconnectServer('srv-1')

      expect(useMcpStore.getState().servers[0].is_connected).toBe(false)
    })
  })

  describe('executeTool', () => {
    it('should return result on success', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, result: { output: 'done' } }
      })

      const result = await useMcpStore.getState().executeTool('srv-1', 'my-tool', { arg: 'value' })

      expect(api.post).toHaveBeenCalledWith('/mcp/servers/srv-1/execute_tool/', {
        tool_name: 'my-tool',
        arguments: { arg: 'value' },
      })
      expect(result).toEqual({ output: 'done' })
    })

    it('should throw on unsuccessful response', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: false, error: 'Tool not found' }
      })

      await expect(
        useMcpStore.getState().executeTool('srv-1', 'bad-tool', {})
      ).rejects.toThrow('Tool not found')
    })

    it('should set error and throw on API error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'))

      await expect(
        useMcpStore.getState().executeTool('srv-1', 'tool', {})
      ).rejects.toThrow()

      expect(useMcpStore.getState().error).toBe('Network error')
    })
  })

  describe('readResource', () => {
    it('should return contents on success', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, contents: 'resource data' }
      })

      const result = await useMcpStore.getState().readResource('srv-1', 'res://test')

      expect(api.post).toHaveBeenCalledWith('/mcp/servers/srv-1/read_resource/', {
        uri: 'res://test',
      })
      expect(result).toBe('resource data')
    })

    it('should throw on unsuccessful response', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: false, error: 'Not found' }
      })

      await expect(
        useMcpStore.getState().readResource('srv-1', 'res://bad')
      ).rejects.toThrow('Not found')
    })
  })

  describe('getPrompt', () => {
    it('should return prompt data on success', async () => {
      const promptData = { success: true, messages: [{ role: 'user', content: 'Hello' }] }
      vi.mocked(api.post).mockResolvedValue({ data: promptData })

      const result = await useMcpStore.getState().getPrompt('srv-1', 'my-prompt', { key: 'val' })

      expect(api.post).toHaveBeenCalledWith('/mcp/servers/srv-1/get_prompt/', {
        prompt_name: 'my-prompt',
        arguments: { key: 'val' },
      })
      expect(result).toEqual(promptData)
    })

    it('should throw on unsuccessful response', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: false, error: 'Prompt error' }
      })

      await expect(
        useMcpStore.getState().getPrompt('srv-1', 'bad-prompt')
      ).rejects.toThrow('Prompt error')
    })
  })

  describe('setError', () => {
    it('should set and clear error', () => {
      useMcpStore.getState().setError('test error')
      expect(useMcpStore.getState().error).toBe('test error')

      useMcpStore.getState().setError(null)
      expect(useMcpStore.getState().error).toBeNull()
    })
  })
})
