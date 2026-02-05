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
import { useProxyStore } from '@/stores/proxy.store'
import { ProxyConfiguration } from '@/types'

const createMockProxy = (overrides: Partial<ProxyConfiguration> = {}): ProxyConfiguration => ({
  id: 'proxy-1',
  name: 'Test Proxy',
  proxy_type: 'http',
  host: '127.0.0.1',
  port: 8080,
  is_default: false,
  enabled: true,
  bypass_list: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('Proxy Store', () => {
  beforeEach(() => {
    useProxyStore.setState({
      proxies: [],
      defaultProxy: null,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchProxies', () => {
    it('should fetch proxies from results property', async () => {
      const proxies = [createMockProxy()]
      vi.mocked(api.get).mockResolvedValue({ data: { results: proxies } })

      await useProxyStore.getState().fetchProxies()

      expect(api.get).toHaveBeenCalledWith('/proxy/proxies/')
      expect(useProxyStore.getState().proxies).toEqual(proxies)
    })

    it('should fallback to data directly if no results', async () => {
      const proxies = [createMockProxy()]
      vi.mocked(api.get).mockResolvedValue({ data: proxies })

      await useProxyStore.getState().fetchProxies()

      expect(useProxyStore.getState().proxies).toEqual(proxies)
    })

    it('should set error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await useProxyStore.getState().fetchProxies()

      expect(useProxyStore.getState().error).toBe('Network error')
    })
  })

  describe('fetchDefaultProxy', () => {
    it('should fetch the default proxy', async () => {
      const proxy = createMockProxy({ is_default: true })
      vi.mocked(api.get).mockResolvedValue({ data: proxy })

      await useProxyStore.getState().fetchDefaultProxy()

      expect(api.get).toHaveBeenCalledWith('/proxy/proxies/default/')
      expect(useProxyStore.getState().defaultProxy).toEqual(proxy)
    })
  })

  describe('createProxy', () => {
    it('should create a proxy and add to state', async () => {
      const newProxy = createMockProxy({ id: 'proxy-new' })
      vi.mocked(api.post).mockResolvedValue({ data: newProxy })

      const result = await useProxyStore.getState().createProxy({ name: 'New Proxy' })

      expect(api.post).toHaveBeenCalledWith('/proxy/proxies/', { name: 'New Proxy' })
      expect(result).toEqual(newProxy)
      expect(useProxyStore.getState().proxies).toContainEqual(newProxy)
      expect(useProxyStore.getState().isLoading).toBe(false)
    })

    it('should set error and rethrow on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Create failed'))

      await expect(
        useProxyStore.getState().createProxy({ name: 'Bad' })
      ).rejects.toThrow('Create failed')

      expect(useProxyStore.getState().error).toBe('Create failed')
      expect(useProxyStore.getState().isLoading).toBe(false)
    })
  })

  describe('updateProxy', () => {
    it('should update a proxy in state', async () => {
      const existing = createMockProxy({ id: 'proxy-1', name: 'Old' })
      const updated = { ...existing, name: 'Updated' }
      useProxyStore.setState({ proxies: [existing] })
      vi.mocked(api.patch).mockResolvedValue({ data: updated })

      await useProxyStore.getState().updateProxy('proxy-1', { name: 'Updated' })

      expect(useProxyStore.getState().proxies[0].name).toBe('Updated')
    })

    it('should sync defaultProxy if the updated proxy is default', async () => {
      const existing = createMockProxy({ id: 'proxy-1', name: 'Default' })
      const updated = { ...existing, name: 'Updated Default' }
      useProxyStore.setState({ proxies: [existing], defaultProxy: existing })
      vi.mocked(api.patch).mockResolvedValue({ data: updated })

      await useProxyStore.getState().updateProxy('proxy-1', { name: 'Updated Default' })

      expect(useProxyStore.getState().defaultProxy!.name).toBe('Updated Default')
    })

    it('should not sync defaultProxy for non-default proxy update', async () => {
      const proxy1 = createMockProxy({ id: 'proxy-1' })
      const proxy2 = createMockProxy({ id: 'proxy-2', name: 'Default' })
      useProxyStore.setState({ proxies: [proxy1, proxy2], defaultProxy: proxy2 })
      vi.mocked(api.patch).mockResolvedValue({ data: { ...proxy1, name: 'Changed' } })

      await useProxyStore.getState().updateProxy('proxy-1', { name: 'Changed' })

      expect(useProxyStore.getState().defaultProxy!.id).toBe('proxy-2')
    })
  })

  describe('deleteProxy', () => {
    it('should remove proxy from state', async () => {
      const proxy = createMockProxy({ id: 'proxy-1' })
      useProxyStore.setState({ proxies: [proxy] })
      vi.mocked(api.delete).mockResolvedValue({})

      await useProxyStore.getState().deleteProxy('proxy-1')

      expect(useProxyStore.getState().proxies).toHaveLength(0)
    })

    it('should clear defaultProxy if deleted proxy was default', async () => {
      const proxy = createMockProxy({ id: 'proxy-1' })
      useProxyStore.setState({ proxies: [proxy], defaultProxy: proxy })
      vi.mocked(api.delete).mockResolvedValue({})

      await useProxyStore.getState().deleteProxy('proxy-1')

      expect(useProxyStore.getState().defaultProxy).toBeNull()
    })

    it('should keep defaultProxy if different proxy is deleted', async () => {
      const proxy1 = createMockProxy({ id: 'proxy-1' })
      const proxy2 = createMockProxy({ id: 'proxy-2' })
      useProxyStore.setState({ proxies: [proxy1, proxy2], defaultProxy: proxy2 })
      vi.mocked(api.delete).mockResolvedValue({})

      await useProxyStore.getState().deleteProxy('proxy-1')

      expect(useProxyStore.getState().defaultProxy!.id).toBe('proxy-2')
    })
  })

  describe('testProxy', () => {
    it('should return true on successful test', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } })

      const result = await useProxyStore.getState().testProxy('proxy-1')

      expect(api.post).toHaveBeenCalledWith('/proxy/proxies/proxy-1/test/', {
        test_url: 'https://httpbin.org/ip'
      })
      expect(result).toBe(true)
    })

    it('should accept custom test URL', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } })

      await useProxyStore.getState().testProxy('proxy-1', 'https://custom.url')

      expect(api.post).toHaveBeenCalledWith('/proxy/proxies/proxy-1/test/', {
        test_url: 'https://custom.url'
      })
    })

    it('should extract error from response data on failure', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'Connection timeout' } },
        message: 'Request failed',
      })

      const result = await useProxyStore.getState().testProxy('proxy-1')

      expect(result).toBe(false)
      expect(useProxyStore.getState().error).toBe('Connection timeout')
    })

    it('should fallback to error.message when no response data', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'))

      const result = await useProxyStore.getState().testProxy('proxy-1')

      expect(result).toBe(false)
      expect(useProxyStore.getState().error).toBe('Network error')
    })
  })

  describe('testProxyConnection', () => {
    it('should return true on success', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } })

      const result = await useProxyStore.getState().testProxyConnection({
        proxy_type: 'http',
        host: '127.0.0.1',
        port: 8080,
      })

      expect(api.post).toHaveBeenCalledWith('/proxy/test-connection/', {
        proxy_type: 'http',
        host: '127.0.0.1',
        port: 8080,
      })
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Failed'))

      const result = await useProxyStore.getState().testProxyConnection({
        proxy_type: 'http',
        host: '127.0.0.1',
        port: 8080,
      })

      expect(result).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error', () => {
      useProxyStore.getState().setError('Some error')
      expect(useProxyStore.getState().error).toBe('Some error')
    })

    it('should clear error with null', () => {
      useProxyStore.setState({ error: 'existing' })
      useProxyStore.getState().setError(null)
      expect(useProxyStore.getState().error).toBeNull()
    })
  })
})
