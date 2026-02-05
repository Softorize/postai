import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock workspaces store
vi.mock('@/stores/workspaces.store', () => ({
  useWorkspacesStore: {
    getState: () => ({
      activeWorkspace: { id: 'workspace-1' }
    })
  }
}))

import { api } from '@/api/client'
import { useHistoryStore, HistoryEntry, HistoryDetail } from '@/stores/history.store'

const createMockEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'hist-1',
  method: 'GET',
  url: 'https://api.example.com/users',
  resolved_url: 'https://api.example.com/users',
  status_code: 200,
  status_text: 'OK',
  response_time: 150,
  response_size: 1024,
  created_at: '2024-01-01T00:00:00Z',
  error_message: null,
  ...overrides,
})

describe('History Store', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      entries: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchHistory', () => {
    it('should fetch history entries with workspace param', async () => {
      const entries = [createMockEntry(), createMockEntry({ id: 'hist-2' })]
      vi.mocked(api.get).mockResolvedValue({ data: entries })

      await useHistoryStore.getState().fetchHistory()

      expect(api.get).toHaveBeenCalledWith('/requests/history/', {
        params: { limit: 50, workspace: 'workspace-1' }
      })
      expect(useHistoryStore.getState().entries).toEqual(entries)
      expect(useHistoryStore.getState().isLoading).toBe(false)
    })

    it('should accept custom limit', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })

      await useHistoryStore.getState().fetchHistory(10)

      expect(api.get).toHaveBeenCalledWith('/requests/history/', {
        params: { limit: 10, workspace: 'workspace-1' }
      })
    })

    it('should set loading state during fetch', async () => {
      vi.mocked(api.get).mockImplementation(async () => {
        expect(useHistoryStore.getState().isLoading).toBe(true)
        return { data: [] }
      })

      await useHistoryStore.getState().fetchHistory()

      expect(useHistoryStore.getState().isLoading).toBe(false)
    })

    it('should set error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await useHistoryStore.getState().fetchHistory()

      expect(useHistoryStore.getState().error).toBe('Failed to fetch history')
      expect(useHistoryStore.getState().isLoading).toBe(false)
    })
  })

  describe('getHistoryDetail', () => {
    it('should return history detail on success', async () => {
      const detail: HistoryDetail = {
        ...createMockEntry(),
        headers: { 'Content-Type': 'application/json' },
        body: '{"key": "value"}',
        response_headers: { 'Content-Type': 'application/json' },
        response_body: '{"data": "ok"}',
      }
      vi.mocked(api.get).mockResolvedValue({ data: detail })

      const result = await useHistoryStore.getState().getHistoryDetail('hist-1')

      expect(api.get).toHaveBeenCalledWith('/requests/history/hist-1/')
      expect(result).toEqual(detail)
    })

    it('should return null on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not found'))

      const result = await useHistoryStore.getState().getHistoryDetail('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('deleteEntry', () => {
    it('should delete entry and filter from state', async () => {
      const entries = [createMockEntry({ id: 'hist-1' }), createMockEntry({ id: 'hist-2' })]
      useHistoryStore.setState({ entries })
      vi.mocked(api.delete).mockResolvedValue({})

      await useHistoryStore.getState().deleteEntry('hist-1')

      expect(api.delete).toHaveBeenCalledWith('/requests/history/hist-1/')
      expect(useHistoryStore.getState().entries).toHaveLength(1)
      expect(useHistoryStore.getState().entries[0].id).toBe('hist-2')
    })

    it('should not throw on failure', async () => {
      useHistoryStore.setState({ entries: [createMockEntry()] })
      vi.mocked(api.delete).mockRejectedValue(new Error('error'))

      await expect(
        useHistoryStore.getState().deleteEntry('hist-1')
      ).resolves.toBeUndefined()
    })
  })

  describe('clearHistory', () => {
    it('should clear all entries on success', async () => {
      useHistoryStore.setState({
        entries: [createMockEntry({ id: 'hist-1' }), createMockEntry({ id: 'hist-2' })],
      })
      vi.mocked(api.delete).mockResolvedValue({})

      await useHistoryStore.getState().clearHistory()

      expect(api.delete).toHaveBeenCalledWith('/requests/history/')
      expect(useHistoryStore.getState().entries).toHaveLength(0)
    })

    it('should not throw on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('error'))

      await expect(
        useHistoryStore.getState().clearHistory()
      ).resolves.toBeUndefined()
    })
  })
})
