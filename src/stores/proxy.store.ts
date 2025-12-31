import { create } from 'zustand'
import api from '../api/client'
import { ProxyConfiguration } from '../types'

interface ProxyState {
  proxies: ProxyConfiguration[]
  defaultProxy: ProxyConfiguration | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchProxies: () => Promise<void>
  fetchDefaultProxy: () => Promise<void>
  createProxy: (proxy: Partial<ProxyConfiguration>) => Promise<ProxyConfiguration>
  updateProxy: (id: string, data: Partial<ProxyConfiguration>) => Promise<void>
  deleteProxy: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
  testProxy: (id: string, testUrl?: string) => Promise<boolean>
  testProxyConnection: (data: {
    proxy_type: string
    host: string
    port: number
    username?: string
    password?: string
    test_url?: string
  }) => Promise<boolean>
  setError: (error: string | null) => void
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  defaultProxy: null,
  isLoading: false,
  error: null,

  fetchProxies: async () => {
    try {
      const response = await api.get('/proxy/proxies/')
      set({ proxies: response.data.results || response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchDefaultProxy: async () => {
    try {
      const response = await api.get('/proxy/proxies/default/')
      set({ defaultProxy: response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createProxy: async (proxy) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/proxy/proxies/', proxy)
      const newProxy = response.data
      set(state => ({
        proxies: [...state.proxies, newProxy],
        isLoading: false
      }))
      return newProxy
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateProxy: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch(`/proxy/proxies/${id}/`, data)
      set(state => ({
        proxies: state.proxies.map(p => p.id === id ? response.data : p),
        defaultProxy: state.defaultProxy?.id === id ? response.data : state.defaultProxy,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteProxy: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/proxy/proxies/${id}/`)
      set(state => ({
        proxies: state.proxies.filter(p => p.id !== id),
        defaultProxy: state.defaultProxy?.id === id ? null : state.defaultProxy,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setDefault: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(`/proxy/proxies/${id}/set_default/`)
      // Refresh proxies and default
      await get().fetchProxies()
      await get().fetchDefaultProxy()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  testProxy: async (id, testUrl = 'https://httpbin.org/ip') => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/proxy/proxies/${id}/test/`, { test_url: testUrl })
      set({ isLoading: false })
      return response.data.success
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message, isLoading: false })
      return false
    }
  },

  testProxyConnection: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/proxy/test-connection/', data)
      set({ isLoading: false })
      return response.data.success
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message, isLoading: false })
      return false
    }
  },

  setError: (error) => {
    set({ error })
  }
}))
