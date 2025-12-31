import { useState } from 'react'
import {
  Globe,
  MoreHorizontal,
  Plus,
  Check,
  Edit2,
  Trash2,
  Copy,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { Environment } from '@/types'

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
  } = useEnvironmentsStore()

  const [_editingId, setEditingId] = useState<string | null>(null)

  const filteredEnvironments = searchQuery
    ? environments.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : environments

  const handleCreate = async () => {
    const name = prompt('Environment name:')
    if (name) {
      await createEnvironment(name)
    }
  }

  const handleActivate = async (envId: string) => {
    await activateEnvironment(envId)
  }

  const handleDelete = async (env: Environment) => {
    if (confirm(`Delete environment "${env.name}"?`)) {
      await deleteEnvironment(env.id)
    }
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
      {/* Create button */}
      <button
        onClick={handleCreate}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-primary-400"
      >
        <Plus className="w-4 h-4" />
        New Environment
      </button>

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
            onEdit={() => setEditingId(env.id)}
            onDelete={() => handleDelete(env)}
          />
        ))
      )}
    </div>
  )
}

function EnvironmentItem({
  environment,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: {
  environment: Environment
  isActive: boolean
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer group relative',
        isActive && 'bg-primary-500/10'
      )}
      onClick={onActivate}
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
