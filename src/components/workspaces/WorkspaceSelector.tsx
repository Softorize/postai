import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Briefcase, Check, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

export function WorkspaceSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { workspaces, activeWorkspace, activateWorkspace } = useWorkspacesStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (workspaceId: string) => {
    await activateWorkspace(workspaceId)
    setIsOpen(false)
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-panel hover:bg-white/5 border border-border rounded text-sm transition-colors"
        >
          <Briefcase className="w-4 h-4 text-blue-400" />
          <span className="max-w-[150px] truncate">
            {activeWorkspace?.name || 'No Workspace'}
          </span>
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-text-secondary transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wide">
                Workspaces
              </p>
            </div>

            <div className="max-h-64 overflow-auto">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group"
                >
                  <button
                    onClick={() => handleSelect(workspace.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {activeWorkspace?.id === workspace.id && (
                        <Check className="w-3.5 h-3.5 text-primary-400" />
                      )}
                    </div>
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{workspace.name}</span>
                      {workspace.description && (
                        <span className="text-xs text-text-secondary truncate block">
                          {workspace.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{workspace.collections_count || 0} col</span>
                      <span>{workspace.environments_count || 0} env</span>
                    </div>
                  </button>
                </div>
              ))}

              {workspaces.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-text-secondary">
                  No workspaces yet
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border">
              <button
                onClick={() => {
                  setShowCreateDialog(true)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded text-sm text-primary-400"
              >
                <Plus className="w-4 h-4" />
                Create Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  )
}
