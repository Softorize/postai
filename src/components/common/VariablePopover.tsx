import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Check, X, ChevronDown } from 'lucide-react'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useCollectionsStore } from '@/stores/collections.store'

interface VariablePopoverProps {
  variableName: string
  anchorRect: DOMRect | null
  onClose: () => void
  collectionId?: string  // Optional collection ID for priority lookup
}

export function VariablePopover({ variableName, anchorRect, onClose, collectionId }: VariablePopoverProps) {
  const { activeEnvironment, environments, updateVariable, selectVariableValue } = useEnvironmentsStore()
  const { collections } = useCollectionsStore()
  const popoverRef = useRef<HTMLDivElement>(null)
  const [editValue, setEditValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showValues, setShowValues] = useState(false)

  // Get collection's active environment if collectionId is provided
  const collectionEnvironment = (() => {
    if (!collectionId) return null
    const collection = collections.find(c => c.id === collectionId)
    if (!collection?.active_environment_id) return null
    return environments.find(e => e.id === collection.active_environment_id) || null
  })()

  // Determine which environment to use (collection env takes priority)
  const effectiveEnvironment = collectionEnvironment || activeEnvironment

  // Find the variable - first in collection env, then in global
  const variable = (() => {
    // First check collection environment
    if (collectionEnvironment) {
      const collVar = collectionEnvironment.variables?.find(
        (v) => v.key === variableName && v.enabled
      )
      if (collVar) return { var: collVar, env: collectionEnvironment }
    }
    // Fall back to global environment
    if (activeEnvironment) {
      const globalVar = activeEnvironment.variables?.find(
        (v) => v.key === variableName && v.enabled
      )
      if (globalVar) return { var: globalVar, env: activeEnvironment }
    }
    return null
  })()

  const variableData = variable?.var
  const sourceEnvironment = variable?.env

  const currentValue = variableData
    ? variableData.values[variableData.selected_value_index] || ''
    : ''

  useEffect(() => {
    setEditValue(currentValue)
  }, [currentValue])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!anchorRect) return null

  // Calculate position
  const top = anchorRect.bottom + 8
  const left = Math.max(8, anchorRect.left)

  const handleSaveValue = async () => {
    if (!variableData || !sourceEnvironment) return

    try {
      // Update the current value
      const newValues = [...variableData.values]
      newValues[variableData.selected_value_index] = editValue
      await updateVariable(sourceEnvironment.id, variableData.id, { values: newValues })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update variable:', err)
    }
  }

  const handleSelectValue = async (index: number) => {
    if (!variableData || !sourceEnvironment) return

    try {
      await selectVariableValue(sourceEnvironment.id, variableData.id, index)
      setShowValues(false)
    } catch (err) {
      console.error('Failed to select value:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveValue()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(currentValue)
    }
  }

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[100] bg-sidebar border border-border rounded-lg shadow-xl min-w-[280px] max-w-[400px]"
      style={{ top, left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel rounded-t-lg">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Environment Variable
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded"
        >
          <X className="w-3 h-3 text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {variableData ? (
          <>
            {/* Variable name */}
            <div className="mb-3">
              <label className="text-xs text-text-secondary block mb-1">Name</label>
              <div className="font-mono text-sm text-green-400 bg-green-500/10 px-2 py-1 rounded">
                {variableName}
              </div>
            </div>

            {/* Current value */}
            <div className="mb-3">
              <label className="text-xs text-text-secondary block mb-1">
                Current Value
                {variableData.values.length > 1 && (
                  <span className="ml-2 text-primary-400">
                    ({variableData.selected_value_index + 1} of {variableData.values.length})
                  </span>
                )}
              </label>

              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type={variableData.is_secret ? 'password' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm font-mono bg-panel border border-border rounded focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveValue}
                    className="p-1.5 bg-green-600 hover:bg-green-700 rounded"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditValue(currentValue)
                    }}
                    className="p-1.5 bg-panel hover:bg-white/10 rounded"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-1 text-sm font-mono bg-panel border border-border rounded cursor-pointer hover:border-primary-500 transition-colors"
                  title="Click to edit"
                >
                  {variableData.is_secret ? '••••••••' : currentValue || <span className="text-text-secondary italic">empty</span>}
                </div>
              )}
            </div>

            {/* Multi-value selector */}
            {variableData.values.length > 1 && (
              <div className="mb-3">
                <label className="text-xs text-text-secondary block mb-1">All Values</label>
                <div className="relative">
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="w-full flex items-center justify-between px-2 py-1 text-sm bg-panel border border-border rounded hover:border-primary-500"
                  >
                    <span className="font-mono truncate">
                      {variableData.is_secret ? '••••••••' : currentValue || '(empty)'}
                    </span>
                    <ChevronDown className={clsx('w-4 h-4 transition-transform', showValues && 'rotate-180')} />
                  </button>

                  {showValues && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar border border-border rounded shadow-lg z-10 max-h-40 overflow-auto">
                      {variableData.values.map((val, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectValue(idx)}
                          className={clsx(
                            'w-full text-left px-2 py-1.5 text-sm font-mono hover:bg-white/5',
                            idx === variableData.selected_value_index && 'bg-primary-500/20 text-primary-400'
                          )}
                        >
                          {variableData.is_secret ? '••••••••' : val || '(empty)'}
                          {idx === variableData.selected_value_index && (
                            <Check className="w-3 h-3 inline ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {variableData.description && (
              <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border">
                {variableData.description}
              </div>
            )}

            {/* Environment info */}
            <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border flex items-center gap-1">
              <span>Environment:</span>
              <span className="text-primary-400">{sourceEnvironment?.name}</span>
            </div>
          </>
        ) : (
          /* Variable not found */
          <div className="text-center py-4">
            <div className="font-mono text-sm text-orange-400 bg-orange-500/10 px-2 py-1 rounded mb-3">
              {variableName}
            </div>
            <p className="text-sm text-text-secondary mb-2">
              Variable not found in active environment
            </p>
            {effectiveEnvironment ? (
              <p className="text-xs text-text-secondary">
                Add this variable to "{effectiveEnvironment.name}" to use it
              </p>
            ) : (
              <p className="text-xs text-text-secondary">
                No environment is active. Select or create one first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
