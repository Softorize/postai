import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import { KeyValuePair } from '@/types'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { VariablePopover } from '../common/VariablePopover'

interface KeyValueEditorProps {
  items: KeyValuePair[]
  onChange: (items: KeyValuePair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const { activeEnvironment } = useEnvironmentsStore()
  const [activeVariable, setActiveVariable] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Get list of existing variable keys
  const existingVars = new Set(
    (activeEnvironment?.variables || [])
      .filter((v) => v.enabled)
      .map((v) => v.key)
  )

  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange(newItems)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Add new row on Tab from last value field
    if (e.key === 'Tab' && !e.shiftKey && index === items.length - 1) {
      const lastItem = items[index]
      if (lastItem.key || lastItem.value) {
        e.preventDefault()
        handleAdd()
        // Focus the new key input after render
        setTimeout(() => {
          const inputs = document.querySelectorAll('[data-kv-key]')
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement
          lastInput?.focus()
        }, 0)
      }
    }
  }

  const handleVariableClick = (varName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    setActiveVariable(varName)
    setPopoverAnchor(rect)
  }

  const handleClosePopover = () => {
    setActiveVariable(null)
    setPopoverAnchor(null)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      const target = e.target as HTMLElement
      target.closest('[data-row]')?.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.closest('[data-row]')?.classList.remove('opacity-50')
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }

    const newItems = [...items]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    onChange(newItems)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Render value with highlighted variables
  const renderHighlightedValue = (value: string) => {
    if (!value) return null

    const parts: React.ReactNode[] = []
    const regex = /\{\{([^}]+)\}\}/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.slice(lastIndex, match.index)}
          </span>
        )
      }

      // Add the variable with highlighting
      const varName = match[1].trim()
      const exists = existingVars.has(varName)
      const variable = activeEnvironment?.variables?.find(v => v.key === varName)
      const currentValue = variable?.values?.[variable?.selected_value_index || 0] || ''

      parts.push(
        <span
          key={`var-${match.index}`}
          onClick={(e) => handleVariableClick(varName, e)}
          className={clsx(
            'rounded px-0.5 mx-px cursor-pointer transition-all pointer-events-auto',
            'hover:ring-2 hover:ring-primary-500/50',
            exists
              ? 'bg-green-500/30 text-green-400 hover:bg-green-500/40'
              : 'bg-orange-500/30 text-orange-400 hover:bg-orange-500/40'
          )}
          title={exists
            ? `${varName} = ${variable?.is_secret ? '••••••••' : currentValue || '(empty)'}\nClick to edit`
            : `Unknown variable: ${varName}\nClick to view`
          }
        >
          {match[0]}
        </span>
      )

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(<span key={`text-${lastIndex}`}>{value.slice(lastIndex)}</span>)
    }

    return parts
  }

  const hasVariables = (value: string) => /\{\{[^}]+\}\}/.test(value)

  // Empty state
  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleAdd}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 px-4 border-2 border-dashed border-border rounded-lg hover:border-primary-500/50 hover:bg-white/5 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-text-secondary group-hover:text-primary-400" />
          </div>
          <span className="text-sm text-text-secondary group-hover:text-text-primary">
            Add {keyPlaceholder.toLowerCase()}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-[11px] text-text-secondary uppercase tracking-wider font-medium">
        <div className="w-6" />
        <div className="w-8" />
        <div className="flex-1">{keyPlaceholder}</div>
        <div className="flex-1">{valuePlaceholder}</div>
        <div className="w-8" />
      </div>

      {/* Rows */}
      {items.map((item, index) => (
        <div
          key={index}
          data-row
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={clsx(
            'flex items-center gap-2 group transition-all duration-150',
            draggedIndex === index && 'opacity-50',
            dragOverIndex === index && draggedIndex !== null && 'border-t-2 border-primary-500'
          )}
        >
          {/* Drag handle */}
          <div className="w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-text-secondary" />
          </div>

          {/* Checkbox */}
          <div className="w-8 flex items-center justify-center">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
              className="w-4 h-4 rounded border-border bg-panel text-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* Key input */}
          <input
            type="text"
            value={item.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            data-kv-key
            className="flex-1 px-3 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 font-mono transition-colors"
          />

          {/* Value input with variable highlighting */}
          <div className="flex-1 relative">
            {/* Highlighted display layer */}
            <div
              className={clsx(
                'absolute inset-0 px-3 py-2 pointer-events-none overflow-hidden',
                'text-sm font-mono whitespace-nowrap'
              )}
            >
              {item.value ? renderHighlightedValue(item.value) : (
                <span className="text-text-secondary">{valuePlaceholder}</span>
              )}
            </div>

            {/* Actual input */}
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder=""
              className={clsx(
                'w-full px-3 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 font-mono transition-colors',
                'caret-text-primary',
                hasVariables(item.value) ? 'text-transparent' : 'text-text-primary'
              )}
            />
          </div>

          {/* Delete button */}
          <button
            onClick={() => handleRemove(index)}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4 text-text-secondary hover:text-red-400" />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all border border-transparent hover:border-primary-500/20"
      >
        <Plus className="w-4 h-4" />
        Add row
      </button>

      {/* Variable Popover */}
      {activeVariable && (
        <VariablePopover
          variableName={activeVariable}
          anchorRect={popoverAnchor}
          onClose={handleClosePopover}
        />
      )}
    </div>
  )
}
