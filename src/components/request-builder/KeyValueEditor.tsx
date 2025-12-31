import { Plus, Trash2, GripVertical } from 'lucide-react'
import { KeyValuePair } from '@/types'

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

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-text-secondary uppercase tracking-wide">
        <div className="w-6" />
        <div className="w-8" />
        <div className="flex-1">{keyPlaceholder}</div>
        <div className="flex-1">{valuePlaceholder}</div>
        <div className="w-8" />
      </div>

      {/* Rows */}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          {/* Drag handle */}
          <div className="w-6 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100">
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
            className="flex-1 px-3 py-1.5 bg-sidebar border border-border rounded text-sm focus:border-primary-500 font-mono"
          />

          {/* Value input */}
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={valuePlaceholder}
            className="flex-1 px-3 py-1.5 bg-sidebar border border-border rounded text-sm focus:border-primary-500 font-mono"
          />

          {/* Delete button */}
          <button
            onClick={() => handleRemove(index)}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-text-secondary hover:text-red-400" />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>
    </div>
  )
}
