import { create } from 'zustand'
import { api } from '@/api/client'

export interface HistoryEntry {
  id: string
  method: string
  url: string
  resolved_url: string
  status_code: number | null
  status_text: string
  response_time: number
  response_size: number
  created_at: string
  error_message: string | null
}

export interface HistoryDetail extends HistoryEntry {
  headers: Record<string, string>
  body: string | null
  response_headers: Record<string, string>
  response_body: string
}

interface HistoryState {
  entries: HistoryEntry[]
  isLoading: boolean
  error: string | null

  fetchHistory: (limit?: number) => Promise<void>
  getHistoryDetail: (id: string) => Promise<HistoryDetail | null>
  deleteEntry: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchHistory: async (limit = 50) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/requests/history/?limit=${limit}`)
      set({ entries: response.data, isLoading: false })
    } catch (err) {
      set({ error: 'Failed to fetch history', isLoading: false })
    }
  },

  getHistoryDetail: async (id: string) => {
    try {
      const response = await api.get(`/requests/history/${id}/`)
      return response.data
    } catch (err) {
      return null
    }
  },

  deleteEntry: async (id: string) => {
    try {
      await api.delete(`/requests/history/${id}/`)
      set({ entries: get().entries.filter(e => e.id !== id) })
    } catch (err) {
      // ignore
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/requests/history/')
      set({ entries: [] })
    } catch (err) {
      // ignore
    }
  },
}))
