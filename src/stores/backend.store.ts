import { create } from 'zustand'
import axios from 'axios'

interface BackendState {
  baseUrl: string
  isConnected: boolean
  checkConnection: () => Promise<boolean>
}

export const useBackendStore = create<BackendState>((set, get) => ({
  baseUrl: 'http://127.0.0.1:8765',
  isConnected: false,

  checkConnection: async () => {
    try {
      const response = await axios.get(`${get().baseUrl}/api/v1/health/`, {
        timeout: 2000,
      })
      const connected = response.status === 200
      set({ isConnected: connected })
      return connected
    } catch {
      set({ isConnected: false })
      return false
    }
  },
}))
