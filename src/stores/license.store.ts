import { create } from 'zustand'
import { apiGet, apiPost } from '@/api/client'
import type { LicenseStatus } from '@/types'

interface LicenseState {
  status: LicenseStatus | null
  isLoading: boolean
  error: string | null
  fetchStatus: () => Promise<void>
  activate: (key: string) => Promise<boolean>
}

export const useLicenseStore = create<LicenseState>((set) => ({
  status: null,
  isLoading: false,
  error: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiGet<LicenseStatus>('/license/status/')
      set({ status: data, isLoading: false })
    } catch {
      set({ error: 'Failed to fetch license status', isLoading: false })
    }
  },

  activate: async (key: string) => {
    set({ error: null })
    try {
      await apiPost('/license/activate/', { license_key: key })
      const data = await apiGet<LicenseStatus>('/license/status/')
      set({ status: data })
      return true
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Invalid license key')
          : 'Failed to activate license'
      set({ error: message })
      return false
    }
  },
}))
