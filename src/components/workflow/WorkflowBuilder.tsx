import { useState, useEffect } from 'react'
import {
  Plus, Play, Trash2, Copy, ChevronLeft,
  Send, GitBranch, Clock, Variable, AlertCircle, Sparkles
} from 'lucide-react'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { useEnvironmentsStore } from '../../stores/environments.store'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodePropertiesPanel } from './NodePropertiesPanel'
import { GenerateWorkflowDialog } from './GenerateWorkflowDialog'
import { cn } from '../../lib/utils'

const NODE_PALETTE = [
  { type: 'request', label: 'HTTP Request', icon: Send, color: 'blue' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'purple' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'yellow' },
  { type: 'variable', label: 'Set Variable', icon: Variable, color: 'cyan' },
]

interface WorkflowBuilderProps {
  workflowId?: string
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
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

  const { activeEnvironment, fetchEnvironments } = useEnvironmentsStore()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    fetchWorkflows()
    fetchEnvironments()
  }, [])

  // Set active workflow when workflowId prop is provided
  useEffect(() => {
    if (workflowId && workflowId !== activeWorkflowId) {
      setActiveWorkflow(workflowId)
    }
  }, [workflowId])

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
      const result = await executeWorkflow(activeWorkflowId, {}, activeEnvironment?.id)
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
              onClick={async () => {
                try {
                  const newWorkflow = await duplicateWorkflow(activeWorkflowId!)
                  setToast({ message: `Copied! Now editing "${newWorkflow.name}"`, type: 'success' })
                } catch {
                  setToast({ message: 'Failed to duplicate workflow', type: 'error' })
                }
              }}
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
              onClick={() => setShowGenerateDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary rounded hover:bg-primary/10"
              title="Generate workflow with AI"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
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
              <div className="w-96 border-l border-border overflow-y-auto bg-muted/30">
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
                    executionResult.success ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'
                  )}>
                    <span className="font-medium">{executionResult.success ? '✓ Completed' : '✗ Failed'}</span>
                    {executionResult.error && (
                      <p className="text-xs mt-1 text-red-400">{executionResult.error}</p>
                    )}
                  </div>

                  {/* Final Result - from End node */}
                  {(() => {
                    const endLog = executionResult.execution_log?.find((log: any) => log.node_type === 'end')
                    const finalResult = endLog?.output?.result
                    const resultLabel = endLog?.output?.result_label || 'Result'

                    if (finalResult !== undefined) {
                      // Try to parse and format JSON
                      let formattedResult = finalResult
                      let isJson = false
                      if (typeof finalResult === 'string') {
                        try {
                          formattedResult = JSON.parse(finalResult)
                          isJson = true
                        } catch {
                          // Not JSON, keep as string
                        }
                      } else if (typeof finalResult === 'object') {
                        isJson = true
                      }

                      return (
                        <div className="mb-4 border border-primary/50 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-primary/20 border-b border-primary/30 flex items-center justify-between">
                            <span className="text-sm font-medium text-primary">{resultLabel}</span>
                            {isJson && (
                              <button
                                onClick={() => {
                                  const text = typeof formattedResult === 'string'
                                    ? formattedResult
                                    : JSON.stringify(formattedResult, null, 2)
                                  navigator.clipboard.writeText(text)
                                }}
                                className="text-xs text-primary hover:text-primary"
                              >
                                Copy
                              </button>
                            )}
                          </div>
                          <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto bg-black/20">
                            {isJson
                              ? JSON.stringify(formattedResult, null, 2)
                              : String(finalResult)}
                          </pre>
                        </div>
                      )
                    }
                    return null
                  })()}

                  <details className="mb-4" open={!executionResult.execution_log?.find((log: any) => log.node_type === 'end')?.output?.result}>
                    <summary className="text-sm font-medium cursor-pointer hover:text-foreground">
                      Execution Log
                    </summary>
                    <div className="space-y-2 mt-2">
                      {executionResult.execution_log?.map((log: any, i: number) => (
                        <details
                          key={i}
                          className={cn(
                            'rounded text-xs border',
                            log.success ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'
                          )}
                        >
                          <summary className="p-2 cursor-pointer hover:bg-white/5">
                            <div className="inline-flex items-center justify-between w-[calc(100%-20px)]">
                              <span className={cn(
                                'font-medium',
                                log.success ? 'text-green-400' : 'text-red-400'
                              )}>
                                {log.node_type}
                              </span>
                              <span className="text-muted-foreground">
                                {log.execution_time_ms}ms
                              </span>
                            </div>
                          </summary>
                          <div className="px-2 pb-2 border-t border-white/10 mt-1 pt-2">
                            {log.error && (
                              <p className="text-red-400 mb-2">{log.error}</p>
                            )}
                            {log.output && (
                              <div>
                                <span className="text-muted-foreground">Output:</span>
                                <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
                                  {typeof log.output === 'string'
                                    ? log.output
                                    : JSON.stringify(log.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>

                  {/* Output Variables */}
                  {executionResult.output_variables && Object.keys(executionResult.output_variables).length > 0 && (
                    <details className="border-t border-border pt-4">
                      <summary className="text-sm font-medium cursor-pointer hover:text-foreground mb-2">
                        Output Variables ({Object.keys(executionResult.output_variables).length})
                      </summary>
                      <div className="space-y-2 mt-2">
                        {Object.entries(executionResult.output_variables).map(([key, value]: [string, any]) => (
                          <details key={key} className="bg-cyan-900/20 border border-cyan-800 rounded text-xs">
                            <summary className="p-2 cursor-pointer hover:bg-white/5">
                              <span className="font-medium text-cyan-400">{key}</span>
                            </summary>
                            <div className="px-2 pb-2 border-t border-white/10 mt-1 pt-2">
                              <pre className="p-2 bg-black/30 rounded text-xs overflow-x-auto max-h-60 overflow-y-auto">
                                {typeof value === 'string'
                                  ? value
                                  : JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  )}
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
                className="text-xs text-destructive hover:text-destructive"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200',
            toast.type === 'success'
              ? 'bg-green-900/90 border border-green-700 text-green-100'
              : 'bg-red-900/90 border border-red-700 text-red-100'
          )}
        >
          {toast.type === 'success' ? (
            <Copy className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            ×
          </button>
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

      {/* Generate workflow with AI dialog */}
      <GenerateWorkflowDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onSuccess={(workflowId) => {
          setToast({ message: 'Workflow generated successfully!', type: 'success' })
          setActiveWorkflow(workflowId)
        }}
      />
    </div>
  )
}
