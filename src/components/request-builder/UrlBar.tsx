import { useRef, useState, useEffect } from 'react'
import { Send, Loader2, Save, FolderPlus, Code2 } from 'lucide-react'
import { clsx } from 'clsx'
import { HttpMethod } from '@/types'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { VariablePopover } from '../common/VariablePopover'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-method-get/20 text-method-get border-method-get/30',
  POST: 'bg-method-post/20 text-method-post border-method-post/30',
  PUT: 'bg-method-put/20 text-method-put border-method-put/30',
  PATCH: 'bg-method-patch/20 text-method-patch border-method-patch/30',
  DELETE: 'bg-method-delete/20 text-method-delete border-method-delete/30',
  HEAD: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  OPTIONS: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

interface UrlBarProps {
  method: HttpMethod
  url: string
  isLoading: boolean
  isDirty?: boolean
  canSave?: boolean
  showCodeSnippet?: boolean
  onMethodChange: (method: HttpMethod) => void
  onUrlChange: (url: string) => void
  onSend: () => void
  onSave?: () => void
  onSaveAs?: () => void
  onToggleCodeSnippet?: () => void
}

export function UrlBar({
  method,
  url,
  isLoading,
  isDirty = false,
  canSave = false,
  showCodeSnippet = false,
  onMethodChange,
  onUrlChange,
  onSend,
  onSave,
  onSaveAs,
  onToggleCodeSnippet,
}: UrlBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { activeEnvironment } = useEnvironmentsStore()

  // Popover state
  const [activeVariable, setActiveVariable] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)

  // Sync overlay scroll with input scroll
  useEffect(() => {
    const input = inputRef.current
    const overlay = overlayRef.current
    if (!input || !overlay) return

    const handleScroll = () => {
      overlay.scrollLeft = input.scrollLeft
    }

    input.addEventListener('scroll', handleScroll)
    return () => input.removeEventListener('scroll', handleScroll)
  }, [])

  // Get list of existing variable keys
  const existingVars = new Set(
    (activeEnvironment?.variables || [])
      .filter((v) => v.enabled)
      .map((v) => v.key)
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
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

  // Render URL with highlighted variables
  const renderHighlightedUrl = () => {
    if (!url) return null

    const parts: React.ReactNode[] = []
    const regex = /\{\{([^}]+)\}\}/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(url)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {url.slice(lastIndex, match.index)}
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
    if (lastIndex < url.length) {
      parts.push(<span key={`text-${lastIndex}`}>{url.slice(lastIndex)}</span>)
    }

    return parts
  }

  const hasVariables = /\{\{[^}]+\}\}/.test(url)

  return (
    <div className="flex items-center gap-2">
      {/* Method selector */}
      <div className="relative">
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          className={clsx(
            'appearance-none px-3 py-2 pr-8 rounded-lg border font-semibold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500',
            methodColors[method]
          )}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* URL input with variable highlighting */}
      <div className="flex-1 relative">
        {/* Highlighted display layer - scrolls with input */}
        <div
          ref={overlayRef}
          className={clsx(
            'absolute inset-0 px-4 py-2 pointer-events-none overflow-x-auto overflow-y-hidden',
            'text-sm font-mono whitespace-nowrap scrollbar-none'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {url ? renderHighlightedUrl() : (
            <span className="text-text-secondary">
              Enter request URL (e.g., https://api.example.com/users)
            </span>
          )}
        </div>

        {/* Actual input - transparent text when variables present */}
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className={clsx(
            'w-full px-4 py-2 bg-sidebar border border-border rounded-lg text-sm',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono',
            'caret-text-primary',
            hasVariables ? 'text-transparent' : 'text-text-primary'
          )}
        />
      </div>

      {/* Save button - for collection requests */}
      {canSave && (
        <button
          onClick={onSave}
          disabled={!isDirty}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border',
            isDirty
              ? 'bg-green-600 hover:bg-green-700 border-green-500'
              : 'bg-panel border-border text-text-secondary cursor-not-allowed'
          )}
          title={isDirty ? 'Save changes' : 'No changes to save'}
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      )}

      {/* Save As button - for non-collection requests (history, new) */}
      {!canSave && onSaveAs && (
        <button
          onClick={onSaveAs}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border bg-panel border-border hover:bg-white/5"
          title="Save to collection"
        >
          <FolderPlus className="w-4 h-4" />
          Save As
        </button>
      )}

      {/* Code Snippet button */}
      {onToggleCodeSnippet && (
        <button
          onClick={onToggleCodeSnippet}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors border',
            showCodeSnippet
              ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
              : 'bg-panel border-border hover:bg-white/5 text-text-secondary hover:text-text-primary'
          )}
          title="Code snippet"
        >
          <Code2 className="w-4 h-4" />
        </button>
      )}

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={isLoading}
        className={clsx(
          'flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-colors',
          isLoading
            ? 'bg-primary-600/50 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send
          </>
        )}
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
