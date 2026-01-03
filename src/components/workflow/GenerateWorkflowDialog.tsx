import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useAiStore } from '../../stores/ai.store'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { useCollectionsStore } from '../../stores/collections.store'
import { useEnvironmentsStore } from '../../stores/environments.store'
import { Folder, Request } from '../../types'

// Helper to flatten requests from collection folders
function getAllRequests(folders: Folder[], requests: Request[]): Request[] {
  let allRequests = [...requests]
  for (const folder of folders) {
    allRequests = [...allRequests, ...folder.requests]
    if (folder.subfolders) {
      allRequests = [...allRequests, ...getAllRequests(folder.subfolders, [])]
    }
  }
  return allRequests
}

interface GenerateWorkflowDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (workflowId: string) => void
}

export function GenerateWorkflowDialog({
  isOpen,
  onClose,
  onSuccess
}: GenerateWorkflowDialogProps) {
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { generateWorkflow, activeProviderId, providers } = useAiStore()
  const { createWorkflow } = useWorkflowsStore()
  const { collections } = useCollectionsStore()
  const { activeEnvironment } = useEnvironmentsStore()

  // Build context from collections and environments
  const context = useMemo(() => {
    // Get all requests from all collections
    const allRequests: Array<{ name: string; method: string; url: string; collectionName: string }> = []

    for (const collection of collections) {
      // Get requests from collection root
      for (const request of collection.requests || []) {
        allRequests.push({
          name: request.name,
          method: request.method,
          url: request.url,
          collectionName: collection.name
        })
      }
      // Get requests from folders
      const folderRequests = getAllRequests(collection.folders || [], [])
      for (const request of folderRequests) {
        allRequests.push({
          name: request.name,
          method: request.method,
          url: request.url,
          collectionName: collection.name
        })
      }
    }

    // Get environment variables from active environment
    const envVariables: Record<string, string> = {}
    if (activeEnvironment?.variables) {
      for (const variable of activeEnvironment.variables) {
        if (variable.enabled !== false) {
          // Get the currently selected value from multi-value array
          const values = variable.values || []
          const selectedIndex = variable.selected_value_index || 0
          const currentValue = values[selectedIndex] || ''
          envVariables[variable.key] = currentValue
        }
      }
    }

    return {
      availableRequests: allRequests,
      environmentVariables: envVariables,
      activeEnvironmentName: activeEnvironment?.name || null
    }
  }, [collections, activeEnvironment])

  useEffect(() => {
    if (isOpen) {
      setDescription('')
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  const handleGenerate = async () => {
    if (!description.trim() || isGenerating) return

    if (!activeProviderId) {
      setError('Please configure an AI provider first')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generate workflow structure from AI with collection/environment context
      const workflowData = await generateWorkflow(description.trim(), context)

      // Create the workflow
      const newWorkflow = await createWorkflow({
        name: workflowData.name as string,
        description: workflowData.description as string,
        nodes: workflowData.nodes as any[],
        edges: workflowData.edges as any[],
        variables: workflowData.variables as Record<string, unknown> || {}
      })

      onClose()
      onSuccess?.(newWorkflow.id)
    } catch (err: any) {
      setError(err.message || 'Failed to generate workflow')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const hasProvider = providers.length > 0 && activeProviderId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-sidebar border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Generate Workflow with AI</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!hasProvider ? (
            <div className="text-center py-6">
              <p className="text-text-secondary mb-2">
                No AI provider configured
              </p>
              <p className="text-sm text-text-secondary">
                Please configure an AI provider in Settings to use this feature.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-3">
                Describe the workflow you want to create. Be specific about the API endpoints, conditions, and data transformations needed.
              </p>

              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: Create a workflow that fetches user data from /api/users/{id}, checks if the user is active, and if so, fetches their orders from /api/users/{id}/orders..."
                className="w-full h-40 px-4 py-3 bg-panel border border-border rounded-lg text-sm resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                disabled={isGenerating}
              />

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <p className="mt-2 text-xs text-text-secondary">
                Press <kbd className="px-1.5 py-0.5 bg-panel border border-border rounded text-xs">Cmd/Ctrl + Enter</kbd> to generate
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating || !hasProvider}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
