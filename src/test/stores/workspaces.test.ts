import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockSwitchWorkspace = vi.fn()
vi.mock('@/stores/tabs.store', () => ({
  useTabsStore: {
    getState: () => ({
      currentWorkspaceId: null,
      switchWorkspace: mockSwitchWorkspace,
    })
  }
}))

import { api } from '@/api/client'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { Workspace } from '@/types'

const createMockWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  description: 'A workspace',
  is_active: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('Workspaces Store', () => {
  beforeEach(() => {
    useWorkspacesStore.setState({
      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchWorkspaces', () => {
    it('should fetch workspaces and find active', async () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', is_active: false }),
        createMockWorkspace({ id: 'ws-2', is_active: true }),
      ]
      vi.mocked(api.get).mockResolvedValue({ data: workspaces })

      await useWorkspacesStore.getState().fetchWorkspaces()

      expect(api.get).toHaveBeenCalledWith('/workspaces/')
      expect(useWorkspacesStore.getState().workspaces).toEqual(workspaces)
      expect(useWorkspacesStore.getState().activeWorkspace!.id).toBe('ws-2')
      expect(useWorkspacesStore.getState().isLoading).toBe(false)
    })

    it('should set activeWorkspace to null when no active workspace', async () => {
      const workspaces = [createMockWorkspace({ is_active: false })]
      vi.mocked(api.get).mockResolvedValue({ data: workspaces })

      await useWorkspacesStore.getState().fetchWorkspaces()

      expect(useWorkspacesStore.getState().activeWorkspace).toBeNull()
    })

    it('should set error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await useWorkspacesStore.getState().fetchWorkspaces()

      expect(useWorkspacesStore.getState().error).toBe('Network error')
      expect(useWorkspacesStore.getState().isLoading).toBe(false)
    })

    it('should set loading state', async () => {
      vi.mocked(api.get).mockImplementation(async () => {
        expect(useWorkspacesStore.getState().isLoading).toBe(true)
        return { data: [] }
      })

      await useWorkspacesStore.getState().fetchWorkspaces()
    })
  })

  describe('createWorkspace', () => {
    it('should create a workspace and add to state', async () => {
      const newWs = createMockWorkspace({ id: 'ws-new', name: 'New WS' })
      vi.mocked(api.post).mockResolvedValue({ data: newWs })

      const result = await useWorkspacesStore.getState().createWorkspace('New WS', 'desc')

      expect(api.post).toHaveBeenCalledWith('/workspaces/', { name: 'New WS', description: 'desc' })
      expect(result).toEqual(newWs)
      expect(useWorkspacesStore.getState().workspaces).toContainEqual(newWs)
    })
  })

  describe('updateWorkspace', () => {
    it('should update workspace in state', async () => {
      const existing = createMockWorkspace({ id: 'ws-1', name: 'Old' })
      const updated = { ...existing, name: 'Updated' }
      useWorkspacesStore.setState({ workspaces: [existing] })
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await useWorkspacesStore.getState().updateWorkspace('ws-1', { name: 'Updated' })

      expect(useWorkspacesStore.getState().workspaces[0].name).toBe('Updated')
    })

    it('should update activeWorkspace if it matches', async () => {
      const existing = createMockWorkspace({ id: 'ws-1', name: 'Old' })
      const updated = { ...existing, name: 'Updated' }
      useWorkspacesStore.setState({ workspaces: [existing], activeWorkspace: existing })
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await useWorkspacesStore.getState().updateWorkspace('ws-1', { name: 'Updated' })

      expect(useWorkspacesStore.getState().activeWorkspace!.name).toBe('Updated')
    })

    it('should not update activeWorkspace if different id', async () => {
      const ws1 = createMockWorkspace({ id: 'ws-1', name: 'WS1' })
      const ws2 = createMockWorkspace({ id: 'ws-2', name: 'WS2' })
      useWorkspacesStore.setState({ workspaces: [ws1, ws2], activeWorkspace: ws1 })
      vi.mocked(api.put).mockResolvedValue({ data: { ...ws2, name: 'Updated WS2' } })

      await useWorkspacesStore.getState().updateWorkspace('ws-2', { name: 'Updated WS2' })

      expect(useWorkspacesStore.getState().activeWorkspace!.name).toBe('WS1')
    })
  })

  describe('deleteWorkspace', () => {
    it('should remove workspace from state', async () => {
      const ws = createMockWorkspace({ id: 'ws-1' })
      useWorkspacesStore.setState({ workspaces: [ws] })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkspacesStore.getState().deleteWorkspace('ws-1')

      expect(useWorkspacesStore.getState().workspaces).toHaveLength(0)
    })

    it('should clear activeWorkspace if deleted', async () => {
      const ws = createMockWorkspace({ id: 'ws-1' })
      useWorkspacesStore.setState({ workspaces: [ws], activeWorkspace: ws })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkspacesStore.getState().deleteWorkspace('ws-1')

      expect(useWorkspacesStore.getState().activeWorkspace).toBeNull()
    })

    it('should keep activeWorkspace if different workspace deleted', async () => {
      const ws1 = createMockWorkspace({ id: 'ws-1' })
      const ws2 = createMockWorkspace({ id: 'ws-2' })
      useWorkspacesStore.setState({ workspaces: [ws1, ws2], activeWorkspace: ws1 })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkspacesStore.getState().deleteWorkspace('ws-2')

      expect(useWorkspacesStore.getState().activeWorkspace!.id).toBe('ws-1')
    })
  })

  describe('activateWorkspace', () => {
    it('should call activate API and refresh workspaces', async () => {
      const workspaces = [createMockWorkspace({ id: 'ws-1', is_active: true })]
      vi.mocked(api.post).mockResolvedValue({})
      vi.mocked(api.get).mockResolvedValue({ data: workspaces })

      await useWorkspacesStore.getState().activateWorkspace('ws-1')

      expect(api.post).toHaveBeenCalledWith('/workspaces/ws-1/activate/')
      expect(api.get).toHaveBeenCalledWith('/workspaces/')
    })

    it('should switch tabs to the new workspace', async () => {
      vi.mocked(api.post).mockResolvedValue({})
      vi.mocked(api.get).mockResolvedValue({ data: [] })

      await useWorkspacesStore.getState().activateWorkspace('ws-1')

      expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-1')
    })
  })

  describe('getActiveWorkspace', () => {
    it('should return active workspace from API', async () => {
      const ws = createMockWorkspace({ id: 'ws-1', is_active: true })
      vi.mocked(api.get).mockResolvedValue({ data: ws })

      const result = await useWorkspacesStore.getState().getActiveWorkspace()

      expect(api.get).toHaveBeenCalledWith('/workspaces/active/')
      expect(result).toEqual(ws)
      expect(useWorkspacesStore.getState().activeWorkspace).toEqual(ws)
    })

    it('should return null on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('error'))

      const result = await useWorkspacesStore.getState().getActiveWorkspace()

      expect(result).toBeNull()
    })
  })

  describe('exportWorkspace', () => {
    beforeEach(() => {
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
      } as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn() as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn() as any)
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })

    it('should export with no options (no query string)', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { workspace: { name: 'Test' } } })

      await useWorkspacesStore.getState().exportWorkspace('ws-1')

      expect(api.get).toHaveBeenCalledWith('/workspaces/ws-1/export/')
    })

    it('should build URLSearchParams when options exclude items', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { workspace: { name: 'Test' } } })

      await useWorkspacesStore.getState().exportWorkspace('ws-1', {
        collections: false,
        environments: false,
      })

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('collections=false')
      )
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('environments=false')
      )
    })

    it('should not include options that are true or undefined', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { workspace: { name: 'Test' } } })

      await useWorkspacesStore.getState().exportWorkspace('ws-1', {
        collections: true,
        workflows: false,
      })

      const calledUrl = vi.mocked(api.get).mock.calls[0][0]
      expect(calledUrl).not.toContain('collections=')
      expect(calledUrl).toContain('workflows=false')
    })
  })

  describe('importWorkspace', () => {
    it('should import workspace and activate it', async () => {
      const workspace = createMockWorkspace({ id: 'ws-imported' })
      vi.mocked(api.post).mockResolvedValueOnce({ data: { workspace } }) // import
      vi.mocked(api.get).mockResolvedValue({ data: [workspace] }) // fetchWorkspaces
      vi.mocked(api.post).mockResolvedValueOnce({}) // activate

      const result = await useWorkspacesStore.getState().importWorkspace('{"content": "data"}')

      expect(api.post).toHaveBeenCalledWith('/workspaces/import/', { content: '{"content": "data"}' })
      expect(result).toEqual(workspace)
    })
  })
})
