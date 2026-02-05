import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
  get: vi.fn(),
  post: vi.fn(),
}))

import axios from 'axios'
import { useBackendStore } from '@/stores/backend.store'

describe('Backend Store', () => {
  beforeEach(() => {
    useBackendStore.setState({
      baseUrl: 'http://127.0.0.1:8765',
      isConnected: false,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useBackendStore.getState()
      expect(state.baseUrl).toBe('http://127.0.0.1:8765')
      expect(state.isConnected).toBe(false)
    })
  })

  describe('checkConnection', () => {
    it('should set isConnected to true on successful health check', async () => {
      vi.mocked(axios.get).mockResolvedValue({ status: 200 })

      const result = await useBackendStore.getState().checkConnection()

      expect(result).toBe(true)
      expect(useBackendStore.getState().isConnected).toBe(true)
      expect(axios.get).toHaveBeenCalledWith(
        'http://127.0.0.1:8765/api/v1/health/',
        { timeout: 2000 }
      )
    })

    it('should set isConnected to false on non-200 response', async () => {
      vi.mocked(axios.get).mockResolvedValue({ status: 503 })

      const result = await useBackendStore.getState().checkConnection()

      expect(result).toBe(false)
      expect(useBackendStore.getState().isConnected).toBe(false)
    })

    it('should set isConnected to false on network error', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await useBackendStore.getState().checkConnection()

      expect(result).toBe(false)
      expect(useBackendStore.getState().isConnected).toBe(false)
    })

    it('should use the current baseUrl', async () => {
      useBackendStore.setState({ baseUrl: 'http://localhost:9999' })
      vi.mocked(axios.get).mockResolvedValue({ status: 200 })

      await useBackendStore.getState().checkConnection()

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:9999/api/v1/health/',
        { timeout: 2000 }
      )
    })
  })
})
