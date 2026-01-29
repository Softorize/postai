import { useState, useEffect } from 'react'
import { Link, Trash2, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import toast from 'react-hot-toast'

interface LinkGroupsViewerProps {
  environmentId: string
}

export function LinkGroupsViewer({ environmentId }: LinkGroupsViewerProps) {
  const { environments, fetchEnvironments, updateVariable, removeVariableValue, addVariableValue } = useEnvironmentsStore()

  useEffect(() => {
    fetchEnvironments()
  }, [])

  const environment = environments.find(e => e.id === environmentId)

  if (!environment) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <p>Environment not found</p>
      </div>
    )
  }

  const variables = environment.variables || []

  // Group variables by link_group (skip variables with no link_group)
  const groupsMap = new Map<string, typeof variables>()
  for (const v of variables) {
    if (!v.link_group) continue
    const existing = groupsMap.get(v.link_group) || []
    existing.push(v)
    groupsMap.set(v.link_group, existing)
  }

  const groups = [...groupsMap.entries()].sort(([a], [b]) => a.localeCompare(b))

  if (groups.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <Link className="w-12 h-12 mb-4 opacity-50" />
        <p>No link groups in this environment</p>
        <p className="text-sm mt-2">Link variables together to see them here</p>
      </div>
    )
  }

  const handleValueChange = async (varId: string, valueIndex: number, newValue: string, currentValues: string[]) => {
    const updated = [...currentValues]
    updated[valueIndex] = newValue
    try {
      await updateVariable(environmentId, varId, { values: updated })
    } catch {
      toast.error('Failed to update value')
    }
  }

  const handleDeleteValueRow = async (groupVars: typeof variables, rowIndex: number) => {
    // Must have at least 1 value remaining
    if ((groupVars[0]?.values.length || 0) <= 1) {
      toast.error('Cannot delete the last value')
      return
    }
    try {
      for (const v of groupVars) {
        await removeVariableValue(environmentId, v.id, rowIndex)
      }
      toast.success('Value row deleted')
    } catch {
      toast.error('Failed to delete value row')
    }
  }

  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [addRowValues, setAddRowValues] = useState<Record<string, string>>({})
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleRenameGroup = async (oldName: string, groupVars: typeof variables) => {
    const newName = renameValue.trim()
    if (!newName || newName === oldName) {
      setRenamingGroup(null)
      return
    }
    try {
      for (const v of groupVars) {
        await updateVariable(environmentId, v.id, { link_group: newName })
      }
      setRenamingGroup(null)
      toast.success('Group renamed')
    } catch {
      toast.error('Failed to rename group')
    }
  }

  const handleAddValueRow = async (_groupName: string, groupVars: typeof variables) => {
    try {
      for (const v of groupVars) {
        await addVariableValue(environmentId, v.id, addRowValues[v.id]?.trim() || '')
      }
      setAddingToGroup(null)
      setAddRowValues({})
      toast.success('Value row added')
    } catch {
      toast.error('Failed to add value row')
    }
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      <div className="flex items-center gap-2 p-4 border-b border-border bg-sidebar">
        <Link className="w-5 h-5 text-cyan-400" />
        <h1 className="text-lg font-semibold">Link Groups — {environment.name}</h1>
        <span className="text-sm text-text-secondary ml-2">
          {groups.length} group{groups.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {groups.map(([groupName, groupVars], groupIndex) => {
          const letter = String.fromCharCode(65 + groupIndex)
          const selectedIndex = groupVars[0]?.selected_value_index ?? 0
          const rowCount = groupVars[0]?.values.length || 0

          return (
            <div key={groupName} className="border border-border rounded-lg overflow-hidden bg-sidebar">
              {/* Group header */}
              <div className="flex items-center gap-2 p-3 border-b border-border bg-panel">
                <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                  {letter}
                </span>
                {renamingGroup === groupName ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameGroup(groupName, groupVars)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameGroup(groupName, groupVars)
                      if (e.key === 'Escape') setRenamingGroup(null)
                    }}
                    className="px-2 py-0.5 text-sm font-medium bg-panel border border-cyan-500 rounded outline-none"
                  />
                ) : (
                  <span
                    className="font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => { setRenamingGroup(groupName); setRenameValue(groupName) }}
                    title="Click to rename group"
                  >
                    {groupName}
                  </span>
                )}
                <span className="text-sm text-text-secondary ml-auto">
                  {groupVars.length} variables · {groupVars[0]?.values.length || 0} values
                </span>
              </div>

              {/* Table layout: header row + value rows */}
              <div className="overflow-x-auto">
                {/* Header row */}
                <div className="flex">
                  {groupVars.map(variable => (
                    <div key={variable.id} className="flex-1 min-w-[200px] px-3 py-2 bg-panel/50 border-b border-border border-r border-r-border last:border-r-0">
                      <span className="text-sm font-mono font-medium">{variable.key}</span>
                    </div>
                  ))}
                  <div className="flex-shrink-0 w-10 bg-panel/50 border-b border-border" />
                </div>
                {/* Value rows */}
                {Array.from({ length: rowCount }).map((_, rowIndex) => {
                  const canDelete = rowIndex < (groupVars[0]?.values.length || 0)
                  return (
                    <div key={rowIndex} className="group/row flex border-b border-border/50 last:border-b-0">
                      {groupVars.map(variable => (
                        <div key={variable.id} className="flex-1 min-w-[200px] border-r border-border last:border-r-0">
                          {rowIndex < variable.values.length ? (
                            <EditableCell
                              value={variable.values[rowIndex]}
                              isSelected={rowIndex === selectedIndex}
                              onChange={(newVal) => handleValueChange(variable.id, rowIndex, newVal, variable.values)}
                            />
                          ) : (
                            <div className="px-3 py-1.5 text-sm">&nbsp;</div>
                          )}
                        </div>
                      ))}
                      <div className="flex-shrink-0 w-10 flex items-center justify-center">
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteValueRow(groupVars, rowIndex)}
                            className="p-0.5 opacity-0 group-hover/row:opacity-100 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400 transition-opacity"
                            title="Delete this value row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add row */}
              {addingToGroup === groupName ? (
                <div className="border-t border-border bg-cyan-500/5 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {groupVars.map(v => (
                      <div key={v.id} className="flex items-center gap-1.5">
                        <span className="text-xs text-text-secondary font-mono">{v.key}:</span>
                        <input
                          type="text"
                          value={addRowValues[v.id] || ''}
                          onChange={e => setAddRowValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddValueRow(groupName, groupVars)
                            if (e.key === 'Escape') { setAddingToGroup(null); setAddRowValues({}) }
                          }}
                          placeholder="value"
                          autoFocus={v === groupVars[0]}
                          className="px-2 py-1 text-sm font-mono bg-panel border border-border rounded focus:border-cyan-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddValueRow(groupName, groupVars)}
                      className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 rounded"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingToGroup(null); setAddRowValues({}) }}
                      className="px-2 py-1 text-xs bg-panel hover:bg-white/10 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border">
                  <button
                    onClick={() => {
                      setAddingToGroup(groupName)
                      const inputs: Record<string, string> = {}
                      groupVars.forEach(v => { inputs[v.id] = '' })
                      setAddRowValues(inputs)
                    }}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs text-text-secondary hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add value row
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditableCell({ value, isSelected, onChange }: {
  value: string
  isSelected: boolean
  onChange: (newVal: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // Sync draft when value changes externally
  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  if (editing) {
    return (
      <div className={clsx(
        isSelected ? 'bg-cyan-500/15' : ''
      )}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
          className="w-full px-3 py-1.5 text-sm font-mono bg-transparent border-0 outline-none focus:ring-1 focus:ring-cyan-500/50 rounded"
        />
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={clsx(
        'px-3 py-1.5 text-sm font-mono cursor-text hover:bg-white/5',
        isSelected ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-secondary'
      )}
    >
      {value || <span className="opacity-40 italic">empty</span>}
    </div>
  )
}
