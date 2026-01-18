import { useState, useMemo } from 'react'
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
  Folder,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useTabsStore } from '@/stores/tabs.store'
import { Environment } from '@/types'
import { ImportEnvironmentDialog } from './ImportEnvironmentDialog'
import { ExportFormatDialog, ExportFormat } from './ExportFormatDialog'
import { CreateEnvironmentDialog } from './CreateEnvironmentDialog'

interface EnvironmentListProps {
  searchQuery: string
}

export function EnvironmentList({ searchQuery }: EnvironmentListProps) {
  const {
    environments,
    activeEnvironment,
    isLoading,
    activateEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    exportEnvironment,
  } = useEnvironmentsStore()

  const { openTab } = useTabsStore()

  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [exportingEnvironment, setExportingEnvironment] = useState<Environment | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Organize environments into sections
  const { globalEnvironments, collectionEnvironments } = useMemo(() => {
    const filtered = searchQuery
      ? environments.filter((e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.collection_name && e.collection_name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : environments

    const global = filtered.filter(e => !e.collection)
    const byCollection = filtered.filter(e => e.collection).reduce((acc, env) => {
      const key = env.collection!
      if (!acc[key]) {
        acc[key] = {
          collectionId: env.collection!,
          collectionName: env.collection_name || 'Unknown Collection',
          environments: []
        }
      }
      acc[key].environments.push(env)
      return acc
    }, {} as Record<string, { collectionId: string; collectionName: string; environments: Environment[] }>)

    return {
      globalEnvironments: global,
      collectionEnvironments: Object.values(byCollection)
    }
  }, [environments, searchQuery])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleCreate = () => {
    setShowNewDialog(true)
  }

  const handleActivate = async (envId: string) => {
    await activateEnvironment(envId)
  }

  const handleOpenEnvironment = (env: Environment) => {
    // Only activate global environments
    if (!env.collection) {
      activateEnvironment(env.id)
    }
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

  const hasAnyEnvironments = globalEnvironments.length > 0 || collectionEnvironments.length > 0

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

      {!hasAnyEnvironments ? (
        <div className="p-4 text-text-secondary text-sm text-center">
          {searchQuery ? 'No environments found' : 'No environments yet'}
        </div>
      ) : (
        <>
          {/* Global Environments Section */}
          {globalEnvironments.length > 0 && (
            <div className="mb-2">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-white/5"
                onClick={() => toggleSection('global')}
              >
                {collapsedSections.has('global') ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium">Global Environments</span>
                <span className="ml-auto text-text-secondary/70">{globalEnvironments.length}</span>
              </button>
              {!collapsedSections.has('global') && (
                <div className="ml-2">
                  {globalEnvironments.map((env) => (
                    <EnvironmentItem
                      key={env.id}
                      environment={env}
                      isActive={activeEnvironment?.id === env.id}
                      showActiveIndicator={true}
                      onActivate={() => handleActivate(env.id)}
                      onClick={() => handleOpenEnvironment(env)}
                      onEdit={() => handleOpenEnvironment(env)}
                      onDelete={() => handleDelete(env)}
                      onDuplicate={() => duplicateEnvironment(env.id)}
                      onExport={() => handleExport(env)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collection Environments Sections */}
          {collectionEnvironments.map((section) => (
            <div key={section.collectionId} className="mb-2">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-white/5"
                onClick={() => toggleSection(section.collectionId)}
              >
                {collapsedSections.has(section.collectionId) ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <Folder className="w-3.5 h-3.5 text-yellow-500" />
                <span className="font-medium truncate">{section.collectionName}</span>
                <span className="ml-auto text-text-secondary/70">{section.environments.length}</span>
              </button>
              {!collapsedSections.has(section.collectionId) && (
                <div className="ml-2">
                  {section.environments.map((env) => (
                    <EnvironmentItem
                      key={env.id}
                      environment={env}
                      isActive={false} // Collection envs don't show global active state
                      showActiveIndicator={false}
                      onActivate={() => {}} // No global activation for collection envs
                      onClick={() => handleOpenEnvironment(env)}
                      onEdit={() => handleOpenEnvironment(env)}
                      onDelete={() => handleDelete(env)}
                      onDuplicate={() => duplicateEnvironment(env.id)}
                      onExport={() => handleExport(env)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Import Dialog */}
      <ImportEnvironmentDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* New Environment Dialog */}
      <CreateEnvironmentDialog
        isOpen={showNewDialog}
        onClose={() => setShowNewDialog(false)}
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
  showActiveIndicator,
  onActivate: _onActivate,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
}: {
  environment: Environment
  isActive: boolean
  showActiveIndicator: boolean
  onActivate: () => void
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
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
      {showActiveIndicator && isActive && <Check className="w-4 h-4 text-primary-400" />}
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
              onDuplicate()
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
