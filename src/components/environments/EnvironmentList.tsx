import { useState } from 'react'
import {
  Globe,
  MoreHorizontal,
  Plus,
  Check,
  Edit2,
  Trash2,
  Copy,
  Upload,
  Download,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useTabsStore } from '@/stores/tabs.store'
import { Environment } from '@/types'
import { ImportEnvironmentDialog } from './ImportEnvironmentDialog'
import { InputDialog } from '../common/InputDialog'
import { ExportFormatDialog, ExportFormat } from './ExportFormatDialog'

interface EnvironmentListProps {
  searchQuery: string
}

export function EnvironmentList({ searchQuery }: EnvironmentListProps) {
  const {
    environments,
    activeEnvironment,
    isLoading,
    createEnvironment,
    activateEnvironment,
    deleteEnvironment,
    exportEnvironment,
  } = useEnvironmentsStore()

  const { openTab } = useTabsStore()

  const [_editingId, _setEditingId] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [exportingEnvironment, setExportingEnvironment] = useState<Environment | null>(null)

  const filteredEnvironments = searchQuery
    ? environments.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : environments

  const handleCreate = () => {
    setShowNewDialog(true)
  }

  const handleConfirmCreate = async (name: string) => {
    await createEnvironment(name)
    setShowNewDialog(false)
  }

  const handleActivate = async (envId: string) => {
    await activateEnvironment(envId)
  }

  const handleOpenEnvironment = (env: Environment) => {
    // Activate and open in tab for editing
    activateEnvironment(env.id)
    openTab({
      type: 'environment',
      title: env.name,
      data: env,
    })
  }

  const handleDelete = async (env: Environment) => {
    if (confirm(`Delete environment "${env.name}"?`)) {
      await deleteEnvironment(env.id)
    }
  }

  const handleExport = (env: Environment) => {
    setExportingEnvironment(env)
  }

  const handleConfirmExport = async (format: ExportFormat) => {
    if (!exportingEnvironment) return
    const result = await exportEnvironment(exportingEnvironment.id, format)
    if (!result.success) {
      alert(`Failed to export: ${result.error}`)
    }
    setExportingEnvironment(null)
  }

  if (isLoading) {
    return (
      <div className="p-4 text-text-secondary text-sm text-center">
        Loading environments...
      </div>
    )
  }

  return (
    <div className="py-1">
      {/* Action buttons */}
      <div className="flex gap-1 px-2 pb-2">
        <button
          onClick={handleCreate}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <button
          onClick={() => setShowImportDialog(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-panel hover:bg-white/5 border border-border rounded transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </button>
      </div>

      {filteredEnvironments.length === 0 ? (
        <div className="p-4 text-text-secondary text-sm text-center">
          {searchQuery ? 'No environments found' : 'No environments yet'}
        </div>
      ) : (
        filteredEnvironments.map((env) => (
          <EnvironmentItem
            key={env.id}
            environment={env}
            isActive={activeEnvironment?.id === env.id}
            onActivate={() => handleActivate(env.id)}
            onClick={() => handleOpenEnvironment(env)}
            onEdit={() => handleOpenEnvironment(env)}
            onDelete={() => handleDelete(env)}
            onExport={() => handleExport(env)}
          />
        ))
      )}

      {/* Import Dialog */}
      <ImportEnvironmentDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* New Environment Dialog */}
      <InputDialog
        isOpen={showNewDialog}
        title="New Environment"
        placeholder="Environment name..."
        confirmText="Create"
        onConfirm={handleConfirmCreate}
        onCancel={() => setShowNewDialog(false)}
      />

      {/* Export Format Dialog */}
      <ExportFormatDialog
        isOpen={!!exportingEnvironment}
        environmentName={exportingEnvironment?.name || ''}
        onConfirm={handleConfirmExport}
        onCancel={() => setExportingEnvironment(null)}
      />
    </div>
  )
}

function EnvironmentItem({
  environment,
  isActive,
  onActivate: _onActivate,
  onClick,
  onEdit,
  onDelete,
  onExport,
}: {
  environment: Environment
  isActive: boolean
  onActivate: () => void
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer group relative',
        isActive && 'bg-primary-500/10'
      )}
      onClick={onClick}
    >
      <Globe
        className={clsx(
          'w-4 h-4',
          isActive ? 'text-primary-400' : 'text-text-secondary'
        )}
      />
      <span className="flex-1 text-sm truncate">{environment.name}</span>
      {isActive && <Check className="w-4 h-4 text-primary-400" />}
      <span className="text-xs text-text-secondary">
        {environment.variables?.length || 0} vars
      </span>
      <button
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {showMenu && (
        <div className="absolute right-2 top-full mt-1 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
              setShowMenu(false)
            }}
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Duplicate
              setShowMenu(false)
            }}
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm"
            onClick={(e) => {
              e.stopPropagation()
              onExport()
              setShowMenu(false)
            }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
              setShowMenu(false)
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
