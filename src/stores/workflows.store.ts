import { create } from 'zustand'
import api from '../api/client'
import { Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, Request } from '../types'
import { useWorkspacesStore } from './workspaces.store'

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
  addNodeToWorkflow: (workflowId: string, request: Request) => Promise<void>

  // Execution
  executeWorkflow: (id: string, inputVariables?: Record<string, unknown>, environmentId?: string) => Promise<WorkflowExecution>
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
      const activeWorkspace = useWorkspacesStore.getState().activeWorkspace
      const params = activeWorkspace ? { workspace: activeWorkspace.id } : {}
      const response = await api.get('/workflows/workflows/', { params })
      set({
        workflows: response.data.results || response.data,
        activeWorkflowId: null,
        activeWorkflow: null
      })
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

  deleteNode: async (nodeId) => {
    const { activeWorkflow, activeWorkflowId } = get()
    if (activeWorkflow && activeWorkflowId) {
      const nodes = activeWorkflow.nodes.filter(n => n.id !== nodeId)
      const edges = activeWorkflow.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      )

      // Update local state immediately
      set({
        activeWorkflow: { ...activeWorkflow, nodes, edges }
      })

      // Save to server (single call with both nodes and edges)
      try {
        await api.patch(`/workflows/workflows/${activeWorkflowId}/`, { nodes, edges })
      } catch (error: any) {
        // Revert on error
        set({ activeWorkflow, error: error.message })
      }
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

  addNodeToWorkflow: async (workflowId, request) => {
    try {
      // Fetch the workflow to get current nodes
      const response = await api.get(`/workflows/workflows/${workflowId}/`)
      const workflow = response.data

      // Find the end node to position the new node above it
      const endNode = workflow.nodes.find((n: WorkflowNode) => n.type === 'end')
      const existingNodes = workflow.nodes.filter((n: WorkflowNode) => n.type !== 'start' && n.type !== 'end')

      // Calculate position - place between existing nodes and end node
      const newY = endNode
        ? endNode.position.y - 150
        : 200 + (existingNodes.length * 100)

      // Create HTTP Request node with the correct data structure for RequestNode component
      const newNode: WorkflowNode = {
        id: `request-${Date.now()}`,
        type: 'request',
        position: { x: endNode?.position.x || 250, y: newY },
        data: {
          node_name: request.name,
          method: request.method,
          url: request.url,
          request_name: request.name,
          request_id: request.id,
          collection_id: request.collection,
          output_variable: '',
          // Store full request config for execution
          headers: request.headers || [],
          params: request.params || [],
          body: request.body || { type: 'none', content: '' },
          auth: request.auth,
        }
      }

      // Move end node down if it exists
      const updatedNodes = workflow.nodes.map((n: WorkflowNode) => {
        if (n.type === 'end') {
          return { ...n, position: { ...n.position, y: n.position.y + 150 } }
        }
        return n
      })

      // Add the new node
      updatedNodes.push(newNode)

      // Save to server
      await api.patch(`/workflows/workflows/${workflowId}/`, { nodes: updatedNodes })

      // Update local state if this is the active workflow
      const { activeWorkflowId } = get()
      if (activeWorkflowId === workflowId) {
        set(state => ({
          activeWorkflow: state.activeWorkflow
            ? { ...state.activeWorkflow, nodes: updatedNodes }
            : null
        }))
      }
    } catch (error: any) {
      set({ error: error.message })
      throw error
    }
  },

  executeWorkflow: async (id, inputVariables = {}, environmentId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post(`/workflows/workflows/${id}/execute/`, {
        input_variables: inputVariables,
        environment_id: environmentId
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
