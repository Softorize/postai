import { useState } from 'react'
import { X, Loader2, Briefcase } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import toast from 'react-hot-toast'

interface CreateWorkspaceDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateWorkspaceDialog({ isOpen, onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { createWorkspace, activateWorkspace } = useWorkspacesStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    setIsCreating(true)

    try {
      const workspace = await createWorkspace(name.trim(), description.trim())
      await activateWorkspace(workspace.id)
      toast.success(`Workspace "${workspace.name}" created`)
      handleClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onClose()
      setName('')
      setDescription('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Create Workspace</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                className="w-full px-3 py-2 bg-panel border border-border rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-text-secondary">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this workspace..."
                rows={3}
                className="w-full px-3 py-2 bg-panel border border-border rounded-lg focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm hover:bg-white/5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors',
                name.trim() && !isCreating
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-primary-600/50 cursor-not-allowed'
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
