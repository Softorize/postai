import { useEffect, useState } from 'react'
import { GitBranch, Plus, Trash2, Copy } from 'lucide-react'
import { useWorkflowsStore } from '@/stores/workflows.store'
import { useTabsStore } from '@/stores/tabs.store'
import { InputDialog } from '../common/InputDialog'

interface WorkflowListProps {
  searchQuery?: string
}

export function WorkflowList({ searchQuery = '' }: WorkflowListProps) {
  const {
    workflows,
    isLoading,
    fetchWorkflows,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow
  } = useWorkflowsStore()
  const { openTab } = useTabsStore()
  const [showNewDialog, setShowNewDialog] = useState(false)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleOpenWorkflow = (workflow: typeof workflows[0]) => {
    openTab({
      type: 'workflow',
      title: workflow.name,
      data: workflow as never,
    })
  }

  const handleNewWorkflow = () => {
    setShowNewDialog(true)
  }

  const handleCreateWorkflow = async (name: string) => {
    await createWorkflow({ name })
    setShowNewDialog(false)
  }

  const handleDeleteWorkflow = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Delete workflow "${name}"?`)) {
      await deleteWorkflow(id)
    }
  }

  const handleDuplicateWorkflow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await duplicateWorkflow(id)
  }

  if (isLoading && workflows.length === 0) {
    return (
      <div className="p-4 text-center text-text-secondary text-sm">
        Loading workflows...
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Actions */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <button
          onClick={handleNewWorkflow}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-auto">
        {filteredWorkflows.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {searchQuery ? 'No matching workflows' : 'No workflows yet'}
            {!searchQuery && (
              <button
                onClick={handleNewWorkflow}
                className="block mt-2 mx-auto text-primary-400 hover:underline"
              >
                Create your first workflow
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="group px-3 py-2 hover:bg-white/5 cursor-pointer"
                onClick={() => handleOpenWorkflow(workflow)}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">
                    {workflow.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDuplicateWorkflow(e, workflow.id)}
                      className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkflow(e, workflow.id, workflow.name)}
                      className="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {workflow.description && (
                  <div className="text-xs text-text-secondary truncate mt-1 ml-6">
                    {workflow.description}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-text-secondary">
                  <span>{(workflow as any).node_count || 0} nodes</span>
                  <span>{(workflow as any).execution_count || 0} runs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* New Workflow Dialog */}
    <InputDialog
      isOpen={showNewDialog}
      title="New Workflow"
      placeholder="Workflow name..."
      confirmText="Create"
      onConfirm={handleCreateWorkflow}
      onCancel={() => setShowNewDialog(false)}
    />
    </>
  )
}
