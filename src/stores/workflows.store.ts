import { create } from 'zustand'
import api from '../api/client'
import { Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution } from '../types'

interface WorkflowsState {
  workflows: Workflow[]
  activeWorkflowId: string | null
  activeWorkflow: Workflow | null
  executions: WorkflowExecution[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchWorkflows: () => Promise<void>
  fetchWorkflow: (id: string) => Promise<void>
  createWorkflow: (workflow: Partial<Workflow>) => Promise<Workflow>
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  duplicateWorkflow: (id: string) => Promise<Workflow>
  setActiveWorkflow: (id: string | null) => void

  // Canvas operations
  updateNodes: (nodes: WorkflowNode[]) => void
  updateEdges: (edges: WorkflowEdge[]) => void
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void
  addNode: (node: WorkflowNode) => void
  deleteNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void

  // Execution
  executeWorkflow: (id: string, inputVariables?: Record<string, unknown>) => Promise<WorkflowExecution>
  fetchExecutions: (workflowId: string) => Promise<void>

  setError: (error: string | null) => void
}

export const useWorkflowsStore = create<WorkflowsState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  activeWorkflow: null,
  executions: [],
  isLoading: false,
  error: null,

  fetchWorkflows: async () => {
    try {
      const response = await api.get('/workflows/workflows/')
      set({ workflows: response.data.results || response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchWorkflow: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/workflows/workflows/${id}/`)
      set({
        activeWorkflow: response.data,
        activeWorkflowId: id,
        isLoading: false
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createWorkflow: async (workflow) => {
    set({ isLoading: true, error: null })
    try {
      // Set default nodes (start and end)
      const defaultNodes: WorkflowNode[] = [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 250, y: 50 },
          data: { label: 'Start' }
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 250, y: 400 },
          data: { label: 'End' }
        }
      ]

      const response = await api.post('/workflows/workflows/', {
        ...workflow,
        nodes: workflow.nodes || defaultNodes,
        edges: workflow.edges || [],
        viewport: workflow.viewport || { x: 0, y: 0, zoom: 1 },
        variables: workflow.variables || {}
      })

      const newWorkflow = response.data
      set(state => ({
        workflows: [...state.workflows, newWorkflow],
        activeWorkflow: newWorkflow,
        activeWorkflowId: newWorkflow.id,
        isLoading: false
      }))
      return newWorkflow
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateWorkflow: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.patch(`/workflows/workflows/${id}/`, data)
      set(state => ({
        workflows: state.workflows.map(w => w.id === id ? response.data : w),
        activeWorkflow: state.activeWorkflowId === id ? response.data : state.activeWorkflow,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteWorkflow: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/workflows/workflows/${id}/`)
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id),
        activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId,
        activeWorkflow: state.activeWorkflowId === id ? null : state.activeWorkflow,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  duplicateWorkflow: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/workflows/workflows/${id}/duplicate/`)
      const newWorkflow = response.data
      set(state => ({
        workflows: [...state.workflows, newWorkflow],
        isLoading: false
      }))
      return newWorkflow
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setActiveWorkflow: (id) => {
    if (id) {
      get().fetchWorkflow(id)
    } else {
      set({ activeWorkflowId: null, activeWorkflow: null })
    }
  },

  // Canvas operations - update locally and save
  updateNodes: (nodes) => {
    const { activeWorkflow, activeWorkflowId, updateWorkflow } = get()
    if (activeWorkflow && activeWorkflowId) {
      set({
        activeWorkflow: { ...activeWorkflow, nodes }
      })
      // Debounced save could be added here
      updateWorkflow(activeWorkflowId, { nodes })
    }
  },

  updateEdges: (edges) => {
    const { activeWorkflow, activeWorkflowId, updateWorkflow } = get()
    if (activeWorkflow && activeWorkflowId) {
      set({
        activeWorkflow: { ...activeWorkflow, edges }
      })
      updateWorkflow(activeWorkflowId, { edges })
    }
  },

  updateViewport: (viewport) => {
    const { activeWorkflow, activeWorkflowId } = get()
    if (activeWorkflow && activeWorkflowId) {
      set({
        activeWorkflow: { ...activeWorkflow, viewport }
      })
      // Don't save viewport changes immediately to reduce API calls
    }
  },

  addNode: (node) => {
    const { activeWorkflow } = get()
    if (activeWorkflow) {
      const nodes = [...activeWorkflow.nodes, node]
      get().updateNodes(nodes)
    }
  },

  deleteNode: (nodeId) => {
    const { activeWorkflow } = get()
    if (activeWorkflow) {
      const nodes = activeWorkflow.nodes.filter(n => n.id !== nodeId)
      const edges = activeWorkflow.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      )
      get().updateNodes(nodes)
      get().updateEdges(edges)
    }
  },

  updateNodeData: (nodeId, data) => {
    const { activeWorkflow } = get()
    if (activeWorkflow) {
      const nodes = activeWorkflow.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      )
      get().updateNodes(nodes)
    }
  },

  executeWorkflow: async (id, inputVariables = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/workflows/workflows/${id}/execute/`, {
        input_variables: inputVariables
      })
      set({ isLoading: false })

      // Refresh executions
      get().fetchExecutions(id)

      return response.data
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message, isLoading: false })
      throw error
    }
  },

  fetchExecutions: async (workflowId) => {
    try {
      const response = await api.get(`/workflows/workflows/${workflowId}/executions/`)
      set({ executions: response.data })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  setError: (error) => {
    set({ error })
  }
}))
