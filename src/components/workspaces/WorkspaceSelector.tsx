import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Briefcase, Check, Plus, Download, Upload, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import type { ExportOptions } from '@/stores/workspaces.store'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

function ExportDialog({ isOpen, onClose, onExport }: {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => void
}) {
  const [collections, setCollections] = useState(true)
  const [environments, setEnvironments] = useState(true)
  const [mcpServers, setMcpServers] = useState(true)
  const [workflows, setWorkflows] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-sidebar border border-border rounded-lg shadow-xl w-80 p-4">
        <h3 className="text-sm font-medium mb-3">Export Workspace</h3>
        <p className="text-xs text-text-secondary mb-3">Select what to include in the export:</p>
        <div className="space-y-2">
          {[
            { label: 'Collections', checked: collections, onChange: setCollections },
            { label: 'Environments', checked: environments, onChange: setEnvironments },
            { label: 'MCP Servers', checked: mcpServers, onChange: setMcpServers },
            { label: 'Workflows', checked: workflows, onChange: setWorkflows },
          ].map(({ label, checked, onChange }) => (
            <label key={label} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="rounded border-border accent-primary-400"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-text-secondary hover:bg-white/5 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onExport({ collections, environments, mcp_servers: mcpServers, workflows })
              onClose()
            }}
            disabled={!collections && !environments && !mcpServers && !workflows}
            className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded disabled:opacity-50"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const { workspaces, activeWorkspace, activateWorkspace, updateWorkspace, deleteWorkspace, exportWorkspace, importWorkspace } = useWorkspacesStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setEditingId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleSelect = async (workspaceId: string) => {
    if (editingId) return
    await activateWorkspace(workspaceId)
    setIsOpen(false)
  }

  const handleExport = async (options: ExportOptions) => {
    if (activeWorkspace) {
      await exportWorkspace(activeWorkspace.id, options)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    try {
      await importWorkspace(content)
    } catch {
      // error handled by store/api client
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleStartEdit = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    setEditingId(id)
    setEditName(name)
  }

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateWorkspace(editingId, { name: editName.trim() })
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit()
    if (e.key === 'Escape') setEditingId(null)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (workspaces.length <= 1) return
    await deleteWorkspace(id)
  }

  return (
    <>
      <div className="flex items-center gap-1">
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
          <div className="absolute top-full left-0 mt-1 w-80 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden">
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
                  title={workspace.name}
                >
                  {editingId === workspace.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-4 h-4" />
                      <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                      <input
                        ref={editInputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1 min-w-0 bg-white/10 border border-border rounded px-2 py-0.5 text-sm outline-none focus:border-primary-400"
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelect(workspace.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          {activeWorkspace?.id === workspace.id && (
                            <Check className="w-3.5 h-3.5 text-primary-400" />
                          )}
                        </div>
                        <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{workspace.name}</span>
                          {workspace.description && (
                            <span className="text-xs text-text-secondary truncate block">
                              {workspace.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                          <span>{workspace.collections_count || 0} col</span>
                          <span>{workspace.environments_count || 0} env</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleStartEdit(e, workspace.id, workspace.name)}
                          className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            onClick={(e) => handleDelete(e, workspace.id)}
                            className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
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

      <button
        onClick={() => setShowExportDialog(true)}
        disabled={!activeWorkspace}
        className="p-1.5 hover:bg-white/5 border border-border rounded text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        title="Export Workspace"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-1.5 hover:bg-white/5 border border-border rounded text-text-secondary hover:text-text-primary transition-colors"
        title="Import Workspace"
      >
        <Upload className="w-4 h-4" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />
      </div>

      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
      />
    </>
  )
}
