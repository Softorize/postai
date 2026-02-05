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
import { useWorkflowsStore } from '@/stores/workflows.store'
import { Workflow, WorkflowNode, WorkflowEdge } from '@/types'

const createMockWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: 'wf-1',
  name: 'Test Workflow',
  description: '',
  nodes: [
    { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
    { id: 'end-1', type: 'end', position: { x: 250, y: 400 }, data: { label: 'End' } },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  variables: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('Workflows Store', () => {
  beforeEach(() => {
    useWorkflowsStore.setState({
      workflows: [],
      activeWorkflowId: null,
      activeWorkflow: null,
      executions: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('fetchWorkflows', () => {
    it('should fetch workflows with workspace param', async () => {
      const workflows = [createMockWorkflow()]
      vi.mocked(api.get).mockResolvedValue({ data: { results: workflows } })

      await useWorkflowsStore.getState().fetchWorkflows()

      expect(api.get).toHaveBeenCalledWith('/workflows/workflows/', {
        params: { workspace: 'workspace-1' }
      })
      expect(useWorkflowsStore.getState().workflows).toEqual(workflows)
      // Should reset active workflow
      expect(useWorkflowsStore.getState().activeWorkflowId).toBeNull()
      expect(useWorkflowsStore.getState().activeWorkflow).toBeNull()
    })

    it('should set error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await useWorkflowsStore.getState().fetchWorkflows()

      expect(useWorkflowsStore.getState().error).toBe('Network error')
    })
  })

  describe('fetchWorkflow', () => {
    it('should fetch single workflow and set as active', async () => {
      const wf = createMockWorkflow({ id: 'wf-1' })
      vi.mocked(api.get).mockResolvedValue({ data: wf })

      await useWorkflowsStore.getState().fetchWorkflow('wf-1')

      expect(api.get).toHaveBeenCalledWith('/workflows/workflows/wf-1/')
      expect(useWorkflowsStore.getState().activeWorkflow).toEqual(wf)
      expect(useWorkflowsStore.getState().activeWorkflowId).toBe('wf-1')
    })
  })

  describe('createWorkflow', () => {
    it('should create with default nodes if none provided', async () => {
      const wf = createMockWorkflow({ id: 'wf-new' })
      vi.mocked(api.post).mockResolvedValue({ data: wf })

      const result = await useWorkflowsStore.getState().createWorkflow({ name: 'New' })

      const callArgs = vi.mocked(api.post).mock.calls[0][1] as any
      expect(callArgs.nodes).toHaveLength(2)
      expect(callArgs.nodes[0].type).toBe('start')
      expect(callArgs.nodes[1].type).toBe('end')
      expect(callArgs.edges).toEqual([])
      expect(callArgs.viewport).toEqual({ x: 0, y: 0, zoom: 1 })

      expect(result).toEqual(wf)
      expect(useWorkflowsStore.getState().workflows).toContainEqual(wf)
      expect(useWorkflowsStore.getState().activeWorkflow).toEqual(wf)
    })

    it('should use provided nodes if given', async () => {
      const customNodes: WorkflowNode[] = [
        { id: 'custom-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
      ]
      const wf = createMockWorkflow({ id: 'wf-new', nodes: customNodes })
      vi.mocked(api.post).mockResolvedValue({ data: wf })

      await useWorkflowsStore.getState().createWorkflow({ name: 'Custom', nodes: customNodes })

      const callArgs = vi.mocked(api.post).mock.calls[0][1] as any
      expect(callArgs.nodes).toEqual(customNodes)
    })
  })

  describe('updateWorkflow', () => {
    it('should update workflow in state', async () => {
      const wf = createMockWorkflow({ id: 'wf-1', name: 'Old' })
      useWorkflowsStore.setState({ workflows: [wf] })
      vi.mocked(api.patch).mockResolvedValue({ data: { ...wf, name: 'Updated' } })

      await useWorkflowsStore.getState().updateWorkflow('wf-1', { name: 'Updated' })

      expect(useWorkflowsStore.getState().workflows[0].name).toBe('Updated')
    })

    it('should sync activeWorkflow if it matches', async () => {
      const wf = createMockWorkflow({ id: 'wf-1', name: 'Old' })
      const updated = { ...wf, name: 'Updated' }
      useWorkflowsStore.setState({ workflows: [wf], activeWorkflow: wf, activeWorkflowId: 'wf-1' })
      vi.mocked(api.patch).mockResolvedValue({ data: updated })

      await useWorkflowsStore.getState().updateWorkflow('wf-1', { name: 'Updated' })

      expect(useWorkflowsStore.getState().activeWorkflow!.name).toBe('Updated')
    })
  })

  describe('deleteWorkflow', () => {
    it('should remove workflow from state', async () => {
      const wf = createMockWorkflow({ id: 'wf-1' })
      useWorkflowsStore.setState({ workflows: [wf] })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkflowsStore.getState().deleteWorkflow('wf-1')

      expect(useWorkflowsStore.getState().workflows).toHaveLength(0)
    })

    it('should clear active when deleting active workflow', async () => {
      const wf = createMockWorkflow({ id: 'wf-1' })
      useWorkflowsStore.setState({
        workflows: [wf],
        activeWorkflowId: 'wf-1',
        activeWorkflow: wf,
      })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkflowsStore.getState().deleteWorkflow('wf-1')

      expect(useWorkflowsStore.getState().activeWorkflowId).toBeNull()
      expect(useWorkflowsStore.getState().activeWorkflow).toBeNull()
    })

    it('should keep active when deleting different workflow', async () => {
      const wf1 = createMockWorkflow({ id: 'wf-1' })
      const wf2 = createMockWorkflow({ id: 'wf-2' })
      useWorkflowsStore.setState({
        workflows: [wf1, wf2],
        activeWorkflowId: 'wf-1',
        activeWorkflow: wf1,
      })
      vi.mocked(api.delete).mockResolvedValue({})

      await useWorkflowsStore.getState().deleteWorkflow('wf-2')

      expect(useWorkflowsStore.getState().activeWorkflowId).toBe('wf-1')
    })
  })

  describe('duplicateWorkflow', () => {
    it('should duplicate and set as active', async () => {
      const duplicated = createMockWorkflow({ id: 'wf-dup', name: 'Test Workflow (Copy)' })
      vi.mocked(api.post).mockResolvedValue({ data: duplicated })

      const result = await useWorkflowsStore.getState().duplicateWorkflow('wf-1')

      expect(api.post).toHaveBeenCalledWith('/workflows/workflows/wf-1/duplicate/')
      expect(result).toEqual(duplicated)
      expect(useWorkflowsStore.getState().activeWorkflowId).toBe('wf-dup')
    })
  })

  describe('setActiveWorkflow', () => {
    it('should fetch workflow when id is provided', () => {
      vi.mocked(api.get).mockResolvedValue({ data: createMockWorkflow() })

      useWorkflowsStore.getState().setActiveWorkflow('wf-1')

      expect(api.get).toHaveBeenCalledWith('/workflows/workflows/wf-1/')
    })

    it('should clear active when null', () => {
      useWorkflowsStore.setState({
        activeWorkflowId: 'wf-1',
        activeWorkflow: createMockWorkflow(),
      })

      useWorkflowsStore.getState().setActiveWorkflow(null)

      expect(useWorkflowsStore.getState().activeWorkflowId).toBeNull()
      expect(useWorkflowsStore.getState().activeWorkflow).toBeNull()
    })
  })

  describe('Canvas operations', () => {
    const setupActiveWorkflow = () => {
      const wf = createMockWorkflow({
        id: 'wf-1',
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
          { id: 'req-1', type: 'request', position: { x: 250, y: 200 }, data: { label: 'Request' } },
          { id: 'end-1', type: 'end', position: { x: 250, y: 400 }, data: { label: 'End' } },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'req-1' },
          { id: 'e2', source: 'req-1', target: 'end-1' },
        ],
      })
      useWorkflowsStore.setState({ activeWorkflow: wf, activeWorkflowId: 'wf-1', workflows: [wf] })
      vi.mocked(api.patch).mockResolvedValue({ data: wf })
      return wf
    }

    describe('updateNodes', () => {
      it('should update local state and call API', () => {
        setupActiveWorkflow()
        const newNodes: WorkflowNode[] = [
          { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        ]

        useWorkflowsStore.getState().updateNodes(newNodes)

        expect(useWorkflowsStore.getState().activeWorkflow!.nodes).toEqual(newNodes)
        expect(api.patch).toHaveBeenCalled()
      })

      it('should do nothing without active workflow', () => {
        useWorkflowsStore.getState().updateNodes([])
        expect(api.patch).not.toHaveBeenCalled()
      })
    })

    describe('updateEdges', () => {
      it('should update edges and call API', () => {
        setupActiveWorkflow()
        const newEdges: WorkflowEdge[] = [
          { id: 'e-new', source: 'start-1', target: 'end-1' },
        ]

        useWorkflowsStore.getState().updateEdges(newEdges)

        expect(useWorkflowsStore.getState().activeWorkflow!.edges).toEqual(newEdges)
        expect(api.patch).toHaveBeenCalled()
      })
    })

    describe('deleteNode', () => {
      it('should remove node and cascade edges', async () => {
        setupActiveWorkflow()

        await useWorkflowsStore.getState().deleteNode('req-1')

        const { nodes, edges } = useWorkflowsStore.getState().activeWorkflow!
        expect(nodes.find(n => n.id === 'req-1')).toBeUndefined()
        // Edges connected to req-1 should be removed
        expect(edges.find(e => e.source === 'req-1' || e.target === 'req-1')).toBeUndefined()
      })

      it('should revert on API error', async () => {
        const wf = setupActiveWorkflow()
        vi.mocked(api.patch).mockRejectedValue(new Error('Save failed'))

        await useWorkflowsStore.getState().deleteNode('req-1')

        // Should revert to original workflow
        expect(useWorkflowsStore.getState().activeWorkflow).toEqual(wf)
        expect(useWorkflowsStore.getState().error).toBe('Save failed')
      })
    })

    describe('updateNodeData', () => {
      it('should merge data into the specified node', () => {
        setupActiveWorkflow()

        useWorkflowsStore.getState().updateNodeData('req-1', { method: 'POST', url: '/api' })

        const node = useWorkflowsStore.getState().activeWorkflow!.nodes.find(n => n.id === 'req-1')
        expect(node!.data.method).toBe('POST')
        expect(node!.data.url).toBe('/api')
        expect(node!.data.label).toBe('Request')
      })
    })

    describe('updateViewport', () => {
      it('should update viewport locally without API call', () => {
        setupActiveWorkflow()
        vi.clearAllMocks()

        useWorkflowsStore.getState().updateViewport({ x: 100, y: 200, zoom: 2 })

        expect(useWorkflowsStore.getState().activeWorkflow!.viewport).toEqual({ x: 100, y: 200, zoom: 2 })
        expect(api.patch).not.toHaveBeenCalled()
      })
    })

    describe('addNode', () => {
      it('should add node to active workflow', () => {
        setupActiveWorkflow()
        const newNode: WorkflowNode = {
          id: 'req-2',
          type: 'request',
          position: { x: 250, y: 300 },
          data: { label: 'New Request' },
        }

        useWorkflowsStore.getState().addNode(newNode)

        expect(useWorkflowsStore.getState().activeWorkflow!.nodes).toContainEqual(newNode)
      })
    })
  })

  describe('addNodeToWorkflow', () => {
    it('should fetch workflow, add node, and move end node', async () => {
      const wf = createMockWorkflow({
        id: 'wf-1',
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
          { id: 'end-1', type: 'end', position: { x: 250, y: 400 }, data: { label: 'End' } },
        ],
      })
      vi.mocked(api.get).mockResolvedValue({ data: wf })
      vi.mocked(api.patch).mockResolvedValue({ data: wf })

      const request = {
        id: 'req-1',
        name: 'Get Users',
        method: 'GET' as const,
        url: 'https://api.example.com/users',
        collection: 'col-1',
        headers: [],
        params: [],
      } as any

      useWorkflowsStore.setState({ activeWorkflowId: 'wf-1', activeWorkflow: wf })

      await useWorkflowsStore.getState().addNodeToWorkflow('wf-1', request)

      // Should have called patch with updated nodes
      expect(api.patch).toHaveBeenCalledWith(
        '/workflows/workflows/wf-1/',
        expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ type: 'request' }),
          ]),
        })
      )
    })
  })

  describe('executeWorkflow', () => {
    it('should execute and return result', async () => {
      const execution = { id: 'exec-1', status: 'completed' }
      vi.mocked(api.post).mockResolvedValue({ data: execution })
      vi.mocked(api.get).mockResolvedValue({ data: [] })

      const result = await useWorkflowsStore.getState().executeWorkflow('wf-1', { var1: 'val' }, 'env-1')

      expect(api.post).toHaveBeenCalledWith('/workflows/workflows/wf-1/execute/', {
        input_variables: { var1: 'val' },
        environment_id: 'env-1',
      })
      expect(result).toEqual(execution)
    })

    it('should extract error from response data', async () => {
      vi.mocked(api.post).mockRejectedValue({
        response: { data: { error: 'Execution failed' } },
        message: 'Request failed',
      })

      await expect(
        useWorkflowsStore.getState().executeWorkflow('wf-1')
      ).rejects.toBeDefined()

      expect(useWorkflowsStore.getState().error).toBe('Execution failed')
    })
  })

  describe('fetchExecutions', () => {
    it('should fetch and set executions', async () => {
      const executions = [{ id: 'exec-1', status: 'completed' }]
      vi.mocked(api.get).mockResolvedValue({ data: executions })

      await useWorkflowsStore.getState().fetchExecutions('wf-1')

      expect(api.get).toHaveBeenCalledWith('/workflows/workflows/wf-1/executions/')
      expect(useWorkflowsStore.getState().executions).toEqual(executions)
    })
  })

  describe('setError', () => {
    it('should set and clear error', () => {
      useWorkflowsStore.getState().setError('test')
      expect(useWorkflowsStore.getState().error).toBe('test')

      useWorkflowsStore.getState().setError(null)
      expect(useWorkflowsStore.getState().error).toBeNull()
    })
  })
})
