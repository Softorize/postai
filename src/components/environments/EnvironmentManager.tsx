import { useState, useEffect } from 'react'
import {
  Globe,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Link,
  Unlink,
  GripVertical,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useTabsStore } from '@/stores/tabs.store'
import { Environment, EnvironmentVariable } from '@/types'
import { LinkedValueDropdown } from './LinkedValueDropdown'
import toast from 'react-hot-toast'

interface EnvironmentManagerProps {
  environmentId?: string  // If provided, show only this environment
}

export function EnvironmentManager({ environmentId }: EnvironmentManagerProps) {
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
    addVariableValue,
    reorderVariables,
  } = useEnvironmentsStore()
  const { openTab } = useTabsStore()

  // When showing a single environment, auto-expand it
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(
    environmentId ? new Set([environmentId]) : new Set()
  )
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarDescription, setNewVarDescription] = useState('')
  const [newVarLinkTo, setNewVarLinkTo] = useState<string | null>(null)
  const [newVarLinkedValues, setNewVarLinkedValues] = useState<string[]>([])
  const [showNewEnvForm, setShowNewEnvForm] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [addingValueTo, setAddingValueTo] = useState<{ envId: string; varId: string } | null>(null)
  const [newValueInput, setNewValueInput] = useState('')
  const [addingLinkedValues, setAddingLinkedValues] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent, env: Environment) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const variables = env.variables || []
    const oldIndex = variables.findIndex(v => v.id === active.id)
    const newIndex = variables.findIndex(v => v.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...variables]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    try {
      await reorderVariables(env.id, reordered.map(v => v.id))
    } catch {
      toast.error('Failed to reorder variables')
    }
  }

  useEffect(() => {
    fetchEnvironments()
  }, [])

  // Auto-expand the environment when environmentId changes
  useEffect(() => {
    if (environmentId) {
      setExpandedEnvs(new Set([environmentId]))
    }
  }, [environmentId])

  // Filter environments if showing a specific one
  const displayedEnvironments = environmentId
    ? environments.filter(e => e.id === environmentId)
    : environments

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
      if (newVarLinkTo) {
        // Creating a linked variable: use multiple values and set link_group
        const targetVar = (env.variables || []).find(v => v.id === newVarLinkTo)
        if (!targetVar) {
          toast.error('Target variable not found')
          return
        }
        const linkGroup = targetVar.link_group || targetVar.key
        // Ensure target has the link_group set
        if (!targetVar.link_group) {
          await updateVariable(env.id, targetVar.id, { link_group: linkGroup })
        }
        await createVariable(env.id, {
          key: newVarKey.trim(),
          values: newVarLinkedValues.length > 0 ? newVarLinkedValues : targetVar.values.map(() => ''),
          selected_value_index: targetVar.selected_value_index,
          enabled: true,
          is_secret: false,
          description: newVarDescription.trim(),
          link_group: linkGroup,
        })
      } else {
        await createVariable(env.id, {
          key: newVarKey.trim(),
          values: [newVarValue],
          selected_value_index: 0,
          enabled: true,
          is_secret: false,
          description: newVarDescription.trim(),
        })
      }
      setNewVarKey('')
      setNewVarValue('')
      setNewVarDescription('')
      setNewVarLinkTo(null)
      setNewVarLinkedValues([])
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
      // Refresh to get updated linked variables
      await fetchEnvironments()
    } catch (err) {
      toast.error('Failed to select value')
    }
  }

  const handleLinkVariables = async (env: Environment, sourceVar: EnvironmentVariable, targetVar: EnvironmentVariable) => {
    try {
      // If target has a link group, use it; otherwise create new one from source's key
      const newGroup = targetVar.link_group || sourceVar.key

      // Update source variable
      await updateVariable(env.id, sourceVar.id, { link_group: newGroup })

      // Update target variable if it doesn't have a link group
      if (!targetVar.link_group) {
        await updateVariable(env.id, targetVar.id, { link_group: newGroup })
      }

      toast.success(`Linked ${sourceVar.key} with ${targetVar.key}`)
    } catch (err) {
      toast.error('Failed to link variables')
    }
  }

  const handleStartAddValue = (env: Environment, variable: EnvironmentVariable) => {
    setAddingValueTo({ envId: env.id, varId: variable.id })
    setNewValueInput('')
    // If variable is linked, initialize inputs for all linked vars
    if (variable.link_group) {
      const linkedVars = (env.variables || []).filter(v => v.link_group === variable.link_group)
      const inputs: Record<string, string> = {}
      linkedVars.forEach(v => { inputs[v.id] = '' })
      setAddingLinkedValues(inputs)
    } else {
      setAddingLinkedValues({})
    }
  }

  const handleConfirmAddValue = async () => {
    if (!addingValueTo) return
    const env = environments.find(e => e.id === addingValueTo.envId)
    const variable = env?.variables?.find(v => v.id === addingValueTo.varId)

    try {
      if (variable?.link_group && Object.keys(addingLinkedValues).length > 0) {
        // Add value to all linked variables
        for (const [varId, value] of Object.entries(addingLinkedValues)) {
          await addVariableValue(addingValueTo.envId, varId, value.trim() || '')
        }
        toast.success('Values added to all linked variables')
      } else {
        if (!newValueInput.trim()) return
        await addVariableValue(addingValueTo.envId, addingValueTo.varId, newValueInput.trim())
        toast.success('Value added')
      }
      setAddingValueTo(null)
      setNewValueInput('')
      setAddingLinkedValues({})
    } catch (err) {
      toast.error('Failed to add value')
    }
  }

  const handleCancelAddValue = () => {
    setAddingValueTo(null)
    setNewValueInput('')
    setAddingLinkedValues({})
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-semibold">
            {environmentId && displayedEnvironments[0]
              ? displayedEnvironments[0].name
              : 'Environment Manager'}
          </h1>
          {/* Show variable count and action buttons when viewing single environment */}
          {environmentId && displayedEnvironments[0] && (
            <>
              <span className="text-sm text-text-secondary ml-2">
                {displayedEnvironments[0].variables?.length || 0} variables
              </span>
              <button
                onClick={() => activateEnvironment(displayedEnvironments[0].id)}
                className={clsx(
                  'px-2 py-1 text-xs rounded ml-2',
                  activeEnvironment?.id === displayedEnvironments[0].id
                    ? 'bg-primary-600 text-white'
                    : 'bg-panel hover:bg-white/10'
                )}
              >
                {activeEnvironment?.id === displayedEnvironments[0].id ? 'Active' : 'Activate'}
              </button>
              <button
                onClick={() => handleDeleteEnvironment(displayedEnvironments[0])}
                className="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400 ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {(displayedEnvironments[0].variables || []).some(v => v.link_group) && (
                <button
                  onClick={() => openTab({
                    type: 'link-groups',
                    title: `Link Groups - ${displayedEnvironments[0].name}`,
                    data: displayedEnvironments[0],
                  })}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded ml-1"
                >
                  <Link className="w-3 h-3" />
                  View Link Groups
                </button>
              )}
            </>
          )}
        </div>
        {!environmentId && showNewEnvForm ? (
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
        ) : !environmentId ? (
          <button
            onClick={() => setShowNewEnvForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Environment
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {displayedEnvironments.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{environmentId ? 'Environment not found' : 'No environments yet'}</p>
            <p className="text-sm mt-2">{environmentId ? '' : 'Create an environment to manage variables'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedEnvironments.map((env) => (
              <div
                key={env.id}
                className="border border-border rounded-lg overflow-hidden bg-sidebar"
              >
                {/* Environment header - only show when NOT viewing a single environment */}
                {!environmentId && (
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
                )}

                {/* Variables list - always show when viewing single environment, otherwise show when expanded */}
                {(environmentId || expandedEnvs.has(env.id)) && (
                  <div className={clsx(!environmentId && 'border-t border-border')}>
                    {/* Variables table header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-panel text-xs text-text-secondary uppercase">
                      <div className="col-span-2 pl-6">Variable</div>
                      <div className="col-span-3">Value</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Variables */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, env)}
                    >
                      <SortableContext
                        items={(env.variables || []).map(v => v.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {(env.variables || []).map((variable) => (
                          <SortableVariableRow
                            key={variable.id}
                            variable={variable}
                            allVariables={env.variables || []}
                            onUpdate={(updates) =>
                              handleUpdateVariable(env, variable, updates)
                            }
                            onDelete={() => handleDeleteVariable(env, variable)}
                            onAddValue={() => handleStartAddValue(env, variable)}
                            onSelectValue={(index) => handleSelectValue(env, variable, index)}
                            onLinkTo={(targetVar) => handleLinkVariables(env, variable, targetVar)}
                            isAddingValue={addingValueTo?.varId === variable.id}
                            newValueInput={newValueInput}
                            onNewValueChange={setNewValueInput}
                            onConfirmAddValue={handleConfirmAddValue}
                            onCancelAddValue={handleCancelAddValue}
                            addingLinkedValues={addingLinkedValues}
                            onLinkedValueChange={(varId, value) => setAddingLinkedValues(prev => ({ ...prev, [varId]: value }))}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    {/* Add variable row */}
                    <div className="border-t border-border">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2">
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
                          {newVarLinkTo ? (
                            <span className="text-xs text-cyan-400">
                              Linked — {(() => {
                                const t = (env.variables || []).find(v => v.id === newVarLinkTo)
                                return t ? `${t.values.length} values` : ''
                              })()}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={newVarValue}
                              onChange={(e) => setNewVarValue(e.target.value)}
                              placeholder="Initial value"
                              className="w-full px-2 py-1 text-sm bg-panel border border-border rounded focus:border-primary-500"
                            />
                          )}
                        </div>
                        <div className="col-span-3 flex items-center gap-1">
                          <input
                            type="text"
                            value={newVarDescription}
                            onChange={(e) => setNewVarDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="flex-1 px-2 py-1 text-sm bg-panel border border-border rounded focus:border-primary-500"
                          />
                          {/* Link-to dropdown for new variable */}
                          {(() => {
                            const linkableVars = (env.variables || []).filter(v => v.values.length > 1)
                            if (linkableVars.length === 0) return null
                            return (
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    if (newVarLinkTo) {
                                      setNewVarLinkTo(null)
                                      setNewVarLinkedValues([])
                                    }
                                  }}
                                  className={clsx(
                                    'p-1 rounded transition-colors',
                                    newVarLinkTo
                                      ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                                      : 'hover:bg-white/10 text-text-secondary hover:text-primary-400'
                                  )}
                                  title={newVarLinkTo ? 'Click to unlink' : 'Link to existing variable'}
                                >
                                  {newVarLinkTo ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                                </button>
                                {!newVarLinkTo && (
                                  <select
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                    value=""
                                    onChange={(e) => {
                                      const targetId = e.target.value
                                      if (!targetId) return
                                      const target = (env.variables || []).find(v => v.id === targetId)
                                      if (target) {
                                        setNewVarLinkTo(targetId)
                                        setNewVarLinkedValues(target.values.map(() => ''))
                                      }
                                    }}
                                  >
                                    <option value="">Link to...</option>
                                    {linkableVars.map(v => (
                                      <option key={v.id} value={v.id}>{v.key} ({v.values.length} values)</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )
                          })()}
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
                      {/* Multi-value inputs when linking */}
                      {newVarLinkTo && (() => {
                        const target = (env.variables || []).find(v => v.id === newVarLinkTo)
                        if (!target) return null
                        return (
                          <div className="px-4 py-2 bg-cyan-500/5 border-t border-cyan-500/20 space-y-1">
                            <div className="text-xs text-text-secondary mb-1">Values (matching {target.key}):</div>
                            {target.values.map((tv, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary w-24 truncate" title={tv}>
                                  Value {i + 1} ({tv})
                                </span>
                                <input
                                  type="text"
                                  value={newVarLinkedValues[i] || ''}
                                  onChange={(e) => {
                                    const updated = [...newVarLinkedValues]
                                    updated[i] = e.target.value
                                    setNewVarLinkedValues(updated)
                                  }}
                                  placeholder={`Value for "${tv}"`}
                                  className="flex-1 px-2 py-1 text-sm bg-panel border border-border rounded font-mono focus:border-primary-500"
                                />
                              </div>
                            ))}
                          </div>
                        )
                      })()}
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

function SortableVariableRow(props: React.ComponentProps<typeof VariableRow>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.variable.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <VariableRow
      {...props}
      sortableRef={setNodeRef}
      sortableStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  )
}

function VariableRow({
  variable,
  allVariables,
  onUpdate,
  onDelete,
  onAddValue,
  onSelectValue,
  onLinkTo,
  isAddingValue,
  newValueInput,
  onNewValueChange,
  onConfirmAddValue,
  onCancelAddValue,
  addingLinkedValues,
  onLinkedValueChange,
  sortableRef,
  sortableStyle,
  dragHandleProps,
}: {
  variable: EnvironmentVariable
  allVariables: EnvironmentVariable[]
  onUpdate: (updates: Partial<EnvironmentVariable>) => void
  onDelete: () => void
  onAddValue: () => void
  onSelectValue: (index: number) => void
  onLinkTo: (targetVar: EnvironmentVariable) => void
  isAddingValue?: boolean
  newValueInput?: string
  onNewValueChange?: (value: string) => void
  onConfirmAddValue?: () => void
  onCancelAddValue?: () => void
  addingLinkedValues?: Record<string, string>
  onLinkedValueChange?: (varId: string, value: string) => void
  sortableRef?: (node: HTMLElement | null) => void
  sortableStyle?: React.CSSProperties
  dragHandleProps?: Record<string, unknown>
}) {
  const [showSecret, setShowSecret] = useState(false)
  const [showLinkMenu, setShowLinkMenu] = useState(false)

  const currentValue = variable.values[variable.selected_value_index] || ''

  // Get other variables that can be linked (have multiple values)
  const linkableVariables = allVariables.filter(
    v => v.id !== variable.id && v.values.length > 1
  )

  // Check if this variable is linked to others (same link_group)
  const linkedVariables = variable.link_group
    ? allVariables.filter(v => v.link_group === variable.link_group && v.id !== variable.id)
    : []

  // Compute group letter (A, B, C...) from unique link_groups
  const groupLetter = (() => {
    if (!variable.link_group) return null
    const uniqueGroups = [...new Set(allVariables.filter(v => v.link_group).map(v => v.link_group))].sort()
    const index = uniqueGroups.indexOf(variable.link_group)
    return index >= 0 ? String.fromCharCode(65 + index) : null
  })()

  const handleLinkToVar = (targetVar: EnvironmentVariable) => {
    onLinkTo(targetVar)
    setShowLinkMenu(false)
  }

  const handleUnlink = () => {
    onUpdate({ link_group: null })
    setShowLinkMenu(false)
  }

  return (
    <div ref={sortableRef} style={sortableStyle}>
      <div className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-border hover:bg-white/5 group">
        <div className="col-span-2 flex items-center">
          <button
            className="cursor-grab active:cursor-grabbing p-0.5 mr-1 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 flex-shrink-0"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
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
            <LinkedValueDropdown
              variable={variable}
              linkedVariables={linkedVariables}
              onSelectValue={onSelectValue}
              onAddValue={onAddValue}
            />
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
              className="p-1 hover:bg-white/10 rounded flex-shrink-0"
            >
              {showSecret ? (
                <EyeOff className="w-4 h-4 text-text-secondary" />
              ) : (
                <Eye className="w-4 h-4 text-text-secondary" />
              )}
            </button>
          )}
          {/* Only show external + button for single-value variables */}
          {variable.values.length <= 1 && (
            <button
              onClick={onAddValue}
              className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-primary-400 flex-shrink-0"
              title="Add another value"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
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
        <div className="col-span-2 flex items-center gap-2">
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
          {/* Link button - only show for multi-value variables */}
          {variable.values.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowLinkMenu(!showLinkMenu)}
                className={clsx(
                  'p-1 rounded transition-colors flex items-center gap-1',
                  variable.link_group
                    ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                    : 'hover:bg-white/10 text-text-secondary hover:text-primary-400'
                )}
                title={variable.link_group ? `Linked to: ${linkedVariables.map(v => v.key).join(', ')}` : 'Link to another variable'}
              >
                {variable.link_group ? (
                  <>
                    <Link className="w-4 h-4" />
                    {groupLetter && (
                      <span className="text-[10px] font-bold leading-none">{groupLetter}</span>
                    )}
                  </>
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
              </button>
              {/* Link menu dropdown - positioned above */}
              {showLinkMenu && (
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-sidebar border border-border rounded-lg shadow-lg z-50">
                  <div className="p-2 text-xs text-text-secondary border-b border-border">
                    {variable.link_group ? 'Linked with' : 'Link to variable'}
                  </div>
                  {variable.link_group ? (
                    <>
                      {linkedVariables.map(v => (
                        <div key={v.id} className="px-3 py-2 text-sm text-cyan-400">
                          {v.key}
                        </div>
                      ))}
                      <button
                        onClick={handleUnlink}
                        className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 border-t border-border"
                      >
                        Unlink
                      </button>
                    </>
                  ) : (
                    <>
                      {linkableVariables.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-text-secondary">
                          No linkable variables
                        </div>
                      ) : (
                        linkableVariables.map(v => (
                          <button
                            key={v.id}
                            onClick={() => handleLinkToVar(v)}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                          >
                            {v.key} ({v.values.length} values)
                          </button>
                        ))
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setShowLinkMenu(false)}
                    className="w-full px-3 py-2 text-sm text-left text-text-secondary hover:bg-white/5 border-t border-border"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
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
      {/* Inline add value row */}
      {isAddingValue && (
        <div className="px-4 py-2 bg-primary-500/10 border-t border-primary-500/30">
          {variable.link_group && addingLinkedValues && Object.keys(addingLinkedValues).length > 0 ? (
            // Linked: show inputs for all linked variables
            <div className="space-y-2">
              <div className="text-xs text-text-secondary">Add values to all linked variables:</div>
              {allVariables
                .filter(v => v.link_group === variable.link_group)
                .map(v => (
                  <div key={v.id} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-32 truncate font-mono">{v.key}:</span>
                    <input
                      type="text"
                      value={addingLinkedValues[v.id] || ''}
                      onChange={(e) => onLinkedValueChange?.(v.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirmAddValue?.()
                        if (e.key === 'Escape') onCancelAddValue?.()
                      }}
                      placeholder={`New value for ${v.key}...`}
                      autoFocus={v.id === variable.id}
                      className="flex-1 px-2 py-1 text-sm bg-panel border border-primary-500 rounded font-mono"
                    />
                  </div>
                ))}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={onConfirmAddValue}
                  className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 rounded"
                >
                  Add All
                </button>
                <button
                  onClick={onCancelAddValue}
                  className="px-2 py-1 text-xs bg-panel hover:bg-white/10 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Single variable: original single input
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2 flex items-center">
                <span className="text-xs text-text-secondary">New value for {variable.key}:</span>
              </div>
              <div className="col-span-6 flex items-center gap-2">
                <input
                  type="text"
                  value={newValueInput || ''}
                  onChange={(e) => onNewValueChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirmAddValue?.()
                    if (e.key === 'Escape') onCancelAddValue?.()
                  }}
                  placeholder="Enter new value..."
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm bg-panel border border-primary-500 rounded font-mono"
                />
                <button
                  onClick={onConfirmAddValue}
                  disabled={!newValueInput?.trim()}
                  className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded"
                >
                  Add
                </button>
                <button
                  onClick={onCancelAddValue}
                  className="px-2 py-1 text-xs bg-panel hover:bg-white/10 rounded"
                >
                  Cancel
                </button>
              </div>
              <div className="col-span-4"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
