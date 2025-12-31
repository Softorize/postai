import { useState, useEffect } from 'react'
import {
  Plus, Play, Trash2, Copy, ChevronLeft,
  Send, GitBranch, Clock, Variable, AlertCircle
} from 'lucide-react'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodePropertiesPanel } from './NodePropertiesPanel'
import { cn } from '../../lib/utils'

const NODE_PALETTE = [
  { type: 'request', label: 'HTTP Request', icon: Send, color: 'blue' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'purple' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'yellow' },
  { type: 'variable', label: 'Set Variable', icon: Variable, color: 'cyan' },
]

export function WorkflowBuilder() {
  const {
    workflows,
    activeWorkflow,
    activeWorkflowId,
    isLoading,
    error,
    fetchWorkflows,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    setActiveWorkflow,
    addNode,
    executeWorkflow,
    fetchExecutions,
    setError
  } = useWorkflowsStore()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [executionResult, setExecutionResult] = useState<any>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  useEffect(() => {
    if (activeWorkflowId) {
      fetchExecutions(activeWorkflowId)
    }
  }, [activeWorkflowId])

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return

    await createWorkflow({ name: newWorkflowName })
    setNewWorkflowName('')
    setShowNewDialog(false)
  }

  const handleAddNode = (type: string) => {
    if (!activeWorkflow) return

    const id = `${type}-${Date.now()}`
    const nodeType = type as 'start' | 'end' | 'request' | 'condition' | 'loop' | 'delay' | 'variable' | 'script'
    const newNode = {
      id,
      type: nodeType,
      position: { x: 250, y: 200 },
      data: { label: type }
    }

    addNode(newNode)
  }

  const handleExecute = async () => {
    if (!activeWorkflowId) return

    try {
      const result = await executeWorkflow(activeWorkflowId)
      setExecutionResult(result)
    } catch (err) {
      // Error handled in store
    }
  }

  const selectedNode = activeWorkflow?.nodes.find(n => n.id === selectedNodeId)

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2">
        {activeWorkflow ? (
          <>
            <button
              onClick={() => setActiveWorkflow(null)}
              className="p-1.5 hover:bg-muted rounded"
              title="Back to list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="font-medium">{activeWorkflow.name}</h2>

            <div className="flex-1" />

            {/* Node palette */}
            <div className="flex items-center gap-1 px-2 border-l border-r border-border">
              {NODE_PALETTE.map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node.type)}
                  className={`p-1.5 hover:bg-${node.color}-100 rounded`}
                  title={`Add ${node.label}`}
                >
                  <node.icon className={`h-4 w-4 text-${node.color}-600`} />
                </button>
              ))}
            </div>

            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run
            </button>

            <button
              onClick={() => duplicateWorkflow(activeWorkflowId!)}
              className="p-1.5 hover:bg-muted rounded"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete workflow "${activeWorkflow.name}"?`)) {
                  deleteWorkflow(activeWorkflowId!)
                }
              }}
              className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <h2 className="font-medium">Workflows</h2>
            <div className="flex-1" />
            <button
              onClick={() => setShowNewDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Workflow
            </button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeWorkflow ? (
          <>
            {/* Canvas */}
            <div className="flex-1">
              <WorkflowCanvas onNodeSelect={setSelectedNodeId} />
            </div>

            {/* Properties panel */}
            {selectedNode && (
              <div className="w-80 border-l border-border overflow-y-auto">
                <NodePropertiesPanel
                  node={selectedNode}
                  onClose={() => setSelectedNodeId(null)}
                />
              </div>
            )}

            {/* Execution result panel */}
            {executionResult && (
              <div className="w-80 border-l border-border overflow-y-auto bg-muted/30">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Execution Result</h3>
                    <button
                      onClick={() => setExecutionResult(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>

                  <div className={cn(
                    'px-3 py-2 rounded mb-4',
                    executionResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  )}>
                    {executionResult.success ? 'Completed' : 'Failed'}
                    {executionResult.error && (
                      <p className="text-xs mt-1">{executionResult.error}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Execution Log</h4>
                    {executionResult.execution_log?.map((log: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          'p-2 rounded text-xs',
                          log.success ? 'bg-green-50' : 'bg-red-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.node_type}</span>
                          <span className="text-muted-foreground">
                            {log.execution_time_ms}ms
                          </span>
                        </div>
                        {log.error && (
                          <p className="text-red-600 mt-1">{log.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 p-4">
            {workflows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <GitBranch className="h-12 w-12 mb-4 opacity-50" />
                <p>No workflows yet</p>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="mt-2 text-primary hover:underline"
                >
                  Create your first workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {workflows.map(workflow => (
                  <button
                    key={workflow.id}
                    onClick={() => setActiveWorkflow(workflow.id)}
                    className="p-4 border border-border rounded-lg hover:border-primary text-left"
                  >
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{(workflow as any).node_count || 0} nodes</span>
                      <span>{(workflow as any).execution_count || 0} runs</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute bottom-4 right-4 max-w-sm p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-destructive/70 hover:text-destructive"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New workflow dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Workflow</h2>

            <input
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Workflow name"
              className="w-full px-3 py-2 border border-input rounded-md bg-background mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
