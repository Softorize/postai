import { useRef } from 'react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'

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
          title={exists ? `Variable: ${varName}` : `Unknown variable: ${varName}`}
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
      {/* Highlighted display layer */}
      <div
        className={clsx(
          'absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre overflow-hidden',
          'text-sm font-mono'
        )}
        style={{ color: 'transparent' }}
      >
        {renderHighlightedText()}
      </div>

      {/* Actual input */}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        className={clsx(
          'w-full px-3 py-2 text-sm font-mono bg-transparent',
          'border border-border rounded',
          'focus:border-primary-500 focus:outline-none',
          'caret-text-primary',
          // Make text transparent when there are variables, so highlight shows through
          value && /\{\{[^}]+\}\}/.test(value) ? 'text-transparent' : 'text-text-primary'
        )}
        style={{
          // Ensure the input text is visible when no variables
          ...(value && !/\{\{[^}]+\}\}/.test(value) ? {} : {}),
        }}
      />

      {/* Visible text layer - shows on top of transparent input */}
      <div
        className={clsx(
          'absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre overflow-hidden',
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
          'caret-text-primary resize-none',
          value && /\{\{[^}]+\}\}/.test(value) ? 'text-transparent' : 'text-text-primary'
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
