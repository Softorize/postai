import { useState, useEffect } from 'react'
import {
  Globe,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { Environment, EnvironmentVariable } from '@/types'
import toast from 'react-hot-toast'

export function EnvironmentManager() {
  const {
    environments,
    activeEnvironment,
    fetchEnvironments,
    createEnvironment,
    deleteEnvironment,
    activateEnvironment,
    createVariable,
    updateVariable,
    deleteVariable,
    selectVariableValue,
  } = useEnvironmentsStore()

  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set())
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarDescription, setNewVarDescription] = useState('')
  const [showNewEnvForm, setShowNewEnvForm] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')

  useEffect(() => {
    fetchEnvironments()
  }, [])

  const toggleExpand = (envId: string) => {
    const newExpanded = new Set(expandedEnvs)
    if (newExpanded.has(envId)) {
      newExpanded.delete(envId)
    } else {
      newExpanded.add(envId)
    }
    setExpandedEnvs(newExpanded)
  }

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return
    try {
      await createEnvironment(newEnvName.trim())
      toast.success('Environment created')
      setNewEnvName('')
      setShowNewEnvForm(false)
    } catch (err) {
      toast.error('Failed to create environment')
    }
  }

  const handleDeleteEnvironment = async (env: Environment) => {
    if (confirm(`Delete environment "${env.name}"? This cannot be undone.`)) {
      await deleteEnvironment(env.id)
      toast.success('Environment deleted')
    }
  }

  const handleAddVariable = async (env: Environment) => {
    if (!newVarKey.trim()) return
    if (!env?.id) {
      toast.error('Environment ID is missing')
      return
    }

    try {
      await createVariable(env.id, {
        key: newVarKey.trim(),
        values: [newVarValue],
        selected_value_index: 0,
        enabled: true,
        is_secret: false,
        description: newVarDescription.trim(),
      })
      setNewVarKey('')
      setNewVarValue('')
      setNewVarDescription('')
      toast.success('Variable added')
    } catch (err) {
      console.error('Failed to add variable:', err)
      toast.error('Failed to add variable')
    }
  }

  const handleUpdateVariable = async (
    env: Environment,
    variable: EnvironmentVariable,
    updates: Partial<EnvironmentVariable>
  ) => {
    try {
      await updateVariable(env.id, variable.id, updates)
    } catch (err) {
      toast.error('Failed to update variable')
    }
  }

  const handleDeleteVariable = async (env: Environment, variable: EnvironmentVariable) => {
    try {
      await deleteVariable(env.id, variable.id)
      toast.success('Variable deleted')
    } catch (err) {
      toast.error('Failed to delete variable')
    }
  }

  const handleSelectValue = async (env: Environment, variable: EnvironmentVariable, index: number) => {
    try {
      await selectVariableValue(env.id, variable.id, index)
    } catch (err) {
      toast.error('Failed to select value')
    }
  }

  const handleAddValueToVariable = async (env: Environment, variable: EnvironmentVariable) => {
    const newValue = prompt('New value:')
    if (newValue !== null) {
      try {
        await updateVariable(env.id, variable.id, {
          values: [...variable.values, newValue],
        })
        toast.success('Value added')
      } catch (err) {
        toast.error('Failed to add value')
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-semibold">Environment Manager</h1>
        </div>
        {showNewEnvForm ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateEnvironment()
                if (e.key === 'Escape') {
                  setShowNewEnvForm(false)
                  setNewEnvName('')
                }
              }}
              placeholder="Environment name"
              autoFocus
              className="px-3 py-1.5 text-sm bg-panel border border-border rounded focus:border-primary-500"
            />
            <button
              onClick={handleCreateEnvironment}
              disabled={!newEnvName.trim()}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded text-sm transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewEnvForm(false)
                setNewEnvName('')
              }}
              className="px-3 py-1.5 bg-panel hover:bg-white/10 rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewEnvForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Environment
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {environments.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No environments yet</p>
            <p className="text-sm mt-2">Create an environment to manage variables</p>
          </div>
        ) : (
          <div className="space-y-4">
            {environments.map((env) => (
              <div
                key={env.id}
                className="border border-border rounded-lg overflow-hidden bg-sidebar"
              >
                {/* Environment header */}
                <div
                  className={clsx(
                    'flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5',
                    activeEnvironment?.id === env.id && 'bg-primary-500/10'
                  )}
                  onClick={() => toggleExpand(env.id)}
                >
                  {expandedEnvs.has(env.id) ? (
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  )}
                  <Globe
                    className={clsx(
                      'w-5 h-5',
                      activeEnvironment?.id === env.id
                        ? 'text-primary-400'
                        : 'text-green-400'
                    )}
                  />
                  <span className="flex-1 font-medium">{env.name}</span>
                  <span className="text-sm text-text-secondary">
                    {env.variables?.length || 0} variables
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      activateEnvironment(env.id)
                    }}
                    className={clsx(
                      'px-2 py-1 text-xs rounded',
                      activeEnvironment?.id === env.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-panel hover:bg-white/10'
                    )}
                  >
                    {activeEnvironment?.id === env.id ? 'Active' : 'Activate'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEnvironment(env)
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Variables list */}
                {expandedEnvs.has(env.id) && (
                  <div className="border-t border-border">
                    {/* Variables table header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-panel text-xs text-text-secondary uppercase">
                      <div className="col-span-2">Variable</div>
                      <div className="col-span-3">Value</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Variables */}
                    {(env.variables || []).map((variable) => (
                      <VariableRow
                        key={variable.id}
                        variable={variable}
                        onUpdate={(updates) =>
                          handleUpdateVariable(env, variable, updates)
                        }
                        onDelete={() => handleDeleteVariable(env, variable)}
                        onAddValue={() => handleAddValueToVariable(env, variable)}
                        onSelectValue={(index) => handleSelectValue(env, variable, index)}
                      />
                    ))}

                    {/* Add variable row */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-border">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={newVarKey}
                          onChange={(e) => setNewVarKey(e.target.value)}
                          placeholder="Variable name"
                          className="w-full px-2 py-1 text-sm bg-panel border border-border rounded focus:border-primary-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={newVarValue}
                          onChange={(e) => setNewVarValue(e.target.value)}
                          placeholder="Initial value"
                          className="w-full px-2 py-1 text-sm bg-panel border border-border rounded focus:border-primary-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={newVarDescription}
                          onChange={(e) => setNewVarDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-2 py-1 text-sm bg-panel border border-border rounded focus:border-primary-500"
                        />
                      </div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => handleAddVariable(env)}
                          disabled={!newVarKey.trim()}
                          className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VariableRow({
  variable,
  onUpdate,
  onDelete,
  onAddValue,
  onSelectValue,
}: {
  variable: EnvironmentVariable
  onUpdate: (updates: Partial<EnvironmentVariable>) => void
  onDelete: () => void
  onAddValue: () => void
  onSelectValue: (index: number) => void
}) {
  const [showSecret, setShowSecret] = useState(false)

  const currentValue = variable.values[variable.selected_value_index] || ''

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-border hover:bg-white/5 group">
      <div className="col-span-2 flex items-center">
        <input
          type="checkbox"
          checked={variable.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="mr-2"
        />
        <span className="text-sm font-mono truncate">{variable.key}</span>
      </div>
      <div className="col-span-3 flex items-center gap-2">
        {variable.values.length > 1 ? (
          <select
            value={variable.selected_value_index}
            onChange={(e) => onSelectValue(parseInt(e.target.value))}
            className="flex-1 px-2 py-1 text-sm bg-panel border border-border rounded"
          >
            {variable.values.map((val, idx) => (
              <option key={idx} value={idx}>
                {variable.is_secret ? '••••••••' : val || '(empty)'}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={variable.is_secret && !showSecret ? 'password' : 'text'}
            value={currentValue}
            onChange={(e) => onUpdate({ values: [e.target.value] })}
            className="flex-1 px-2 py-1 text-sm bg-panel border border-border rounded font-mono"
          />
        )}
        {variable.is_secret && (
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="p-1 hover:bg-white/10 rounded"
          >
            {showSecret ? (
              <EyeOff className="w-4 h-4 text-text-secondary" />
            ) : (
              <Eye className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        )}
        <button
          onClick={onAddValue}
          className="p-1 hover:bg-white/10 rounded text-text-secondary"
          title="Add another value"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="col-span-3 flex items-center">
        <input
          type="text"
          value={variable.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Add description..."
          className="w-full px-2 py-1 text-sm bg-transparent border-0 text-text-secondary focus:text-text-primary focus:bg-panel focus:border focus:border-border rounded"
        />
      </div>
      <div className="col-span-2 flex items-center">
        <button
          onClick={() => onUpdate({ is_secret: !variable.is_secret })}
          className={clsx(
            'px-2 py-0.5 text-xs rounded',
            variable.is_secret
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-panel text-text-secondary'
          )}
        >
          {variable.is_secret ? 'Secret' : 'Default'}
        </button>
      </div>
      <div className="col-span-2 flex items-center justify-end">
        <button
          onClick={onDelete}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
