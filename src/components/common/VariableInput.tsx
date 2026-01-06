import { useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { VariablePopover } from './VariablePopover'

interface VariableInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  type?: 'text' | 'url'
}

/**
 * An input component that highlights environment variables.
 * Variables are shown in {{variable}} syntax.
 * - Green: variable exists in active environment
 * - Orange: variable doesn't exist
 * Click on a variable to see/edit its value.
 */
export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: VariableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { activeEnvironment } = useEnvironmentsStore()

  // Popover state
  const [activeVariable, setActiveVariable] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)

  // Get list of existing variable keys
  const existingVars = new Set(
    (activeEnvironment?.variables || [])
      .filter((v) => v.enabled)
      .map((v) => v.key)
  )

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

  // Parse and highlight variables
  const renderHighlightedText = (interactive: boolean = false) => {
    if (!value) {
      return <span className="text-text-secondary">{placeholder}</span>
    }

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
          onClick={interactive ? (e) => handleVariableClick(varName, e) : undefined}
          className={clsx(
            'rounded px-0.5 mx-px transition-all',
            interactive && 'cursor-pointer pointer-events-auto hover:ring-2 hover:ring-primary-500/50',
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

  return (
    <div className={clsx('relative', className)}>
      {/* Actual input */}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full px-3 py-2 text-sm font-mono bg-transparent',
          'border border-border rounded',
          'focus:border-primary-500 focus:outline-none',
          // Make text transparent when there are variables, so highlight shows through
          value && /\{\{[^}]+\}\}/.test(value) && 'variable-overlay-input'
        )}
        style={value && /\{\{[^}]+\}\}/.test(value) ? undefined : { color: '#cccccc', WebkitTextFillColor: '#cccccc' }}
      />

      {/* Visible text layer - only render when variables present */}
      {value && /\{\{[^}]+\}\}/.test(value) && (
        <div
          className={clsx(
            'absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre overflow-hidden',
            'text-sm font-mono text-text-primary'
          )}
        >
          {renderHighlightedText(true)}
        </div>
      )}

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

/**
 * A textarea component that highlights environment variables.
 */
export function VariableTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
}: VariableInputProps & { rows?: number }) {
  const { activeEnvironment } = useEnvironmentsStore()

  // Get list of existing variable keys
  const existingVars = new Set(
    (activeEnvironment?.variables || [])
      .filter((v) => v.enabled)
      .map((v) => v.key)
  )

  // Parse and highlight variables
  const renderHighlightedText = () => {
    if (!value) {
      return <span className="text-text-secondary">{placeholder}</span>
    }

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
      parts.push(
        <span
          key={`var-${match.index}`}
          className={clsx(
            'rounded px-0.5',
            exists
              ? 'bg-green-500/20 text-green-400'
              : 'bg-orange-500/20 text-orange-400'
          )}
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

  return (
    <div className={clsx('relative', className)}>
      {/* Actual textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={clsx(
          'w-full px-3 py-2 text-sm font-mono bg-transparent',
          'border border-border rounded',
          'focus:border-primary-500 focus:outline-none',
          'resize-none',
          value && /\{\{[^}]+\}\}/.test(value) ? 'variable-overlay-input' : 'text-text-primary'
        )}
      />

      {/* Visible text layer */}
      <div
        className={clsx(
          'absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre-wrap overflow-hidden',
          'text-sm font-mono text-text-primary'
        )}
      >
        {value ? renderHighlightedText() : (
          <span className="text-text-secondary">{placeholder}</span>
        )}
      </div>
    </div>
  )
}
