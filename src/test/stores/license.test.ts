import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '@/api/client'
import { useLicenseStore } from '@/stores/license.store'
import type { LicenseStatus } from '@/types'

const createMockStatus = (overrides: Partial<LicenseStatus> = {}): LicenseStatus => ({
  trial_started_at: '2024-01-01T00:00:00Z',
  days_remaining: 14,
  is_trial: true,
  is_activated: false,
  is_expired: false,
  ...overrides,
})

describe('License Store', () => {
  beforeEach(() => {
    useLicenseStore.setState({
      status: null,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchStatus', () => {
    it('should fetch and set license status', async () => {
      const status = createMockStatus()
      vi.mocked(apiGet).mockResolvedValue(status)

      await useLicenseStore.getState().fetchStatus()

      expect(apiGet).toHaveBeenCalledWith('/license/status/')
      expect(useLicenseStore.getState().status).toEqual(status)
      expect(useLicenseStore.getState().isLoading).toBe(false)
    })

    it('should set loading during fetch', async () => {
      vi.mocked(apiGet).mockImplementation(async () => {
        expect(useLicenseStore.getState().isLoading).toBe(true)
        return createMockStatus()
      })

      await useLicenseStore.getState().fetchStatus()
    })

    it('should set error on failure', async () => {
      vi.mocked(apiGet).mockRejectedValue(new Error('Network'))

      await useLicenseStore.getState().fetchStatus()

      expect(useLicenseStore.getState().error).toBe('Failed to fetch license status')
      expect(useLicenseStore.getState().isLoading).toBe(false)
    })
  })

  describe('activate', () => {
    it('should activate license and refresh status', async () => {
      const status = createMockStatus({ is_activated: true, is_trial: false })
      vi.mocked(apiPost).mockResolvedValue({})
      vi.mocked(apiGet).mockResolvedValue(status)

      const result = await useLicenseStore.getState().activate('LICENSE-KEY-123')

      expect(apiPost).toHaveBeenCalledWith('/license/activate/', { license_key: 'LICENSE-KEY-123' })
      expect(apiGet).toHaveBeenCalledWith('/license/status/')
      expect(result).toBe(true)
      expect(useLicenseStore.getState().status).toEqual(status)
    })

    it('should extract error detail from response', async () => {
      const error = {
        response: { data: { detail: 'License key expired' } }
      }
      vi.mocked(apiPost).mockRejectedValue(error)

      const result = await useLicenseStore.getState().activate('EXPIRED-KEY')

      expect(result).toBe(false)
      expect(useLicenseStore.getState().error).toBe('License key expired')
    })

    it('should use default message when no response detail', async () => {
      vi.mocked(apiPost).mockRejectedValue(new Error('Connection failed'))

      const result = await useLicenseStore.getState().activate('KEY')

      expect(result).toBe(false)
      expect(useLicenseStore.getState().error).toBe('Failed to activate license')
    })

    it('should use fallback when response has no detail', async () => {
      const error = {
        response: { data: {} }
      }
      vi.mocked(apiPost).mockRejectedValue(error)

      const result = await useLicenseStore.getState().activate('KEY')

      expect(result).toBe(false)
      expect(useLicenseStore.getState().error).toBe('Invalid license key')
    })

    it('should clear error before activation attempt', async () => {
      useLicenseStore.setState({ error: 'Previous error' })
      vi.mocked(apiPost).mockResolvedValue({})
      vi.mocked(apiGet).mockResolvedValue(createMockStatus())

      await useLicenseStore.getState().activate('KEY')

      expect(useLicenseStore.getState().error).toBeNull()
    })
  })
})
