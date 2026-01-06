import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { EnvironmentVariable } from '@/types'

interface LinkedValueDropdownProps {
  variable: EnvironmentVariable
  linkedVariables: EnvironmentVariable[]
  onSelectValue: (index: number) => void
  onAddValue?: () => void
}

export function LinkedValueDropdown({
  variable,
  linkedVariables,
  onSelectValue,
  onAddValue,
}: LinkedValueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && !variable.is_secret && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, variable.is_secret])

  // Check available space and position dropdown
  const handleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = 320 // max-h-80 = 320px

      // Open upward if not enough space below but enough above
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)
    }
    setIsOpen(!isOpen)
  }

  const currentValue = variable.values[variable.selected_value_index] || ''

  // Get display value with linked info
  const getDisplayValue = (index: number) => {
    const value = variable.values[index] || '(empty)'
    if (variable.is_secret) {
      return '••••••••'
    }
    return value
  }

  // Get linked values for a given index
  const getLinkedInfo = (index: number) => {
    if (linkedVariables.length === 0) return null

    return linkedVariables.map(linkedVar => {
      const linkedValue = linkedVar.values[index]
      if (linkedValue === undefined) return null
      return {
        key: linkedVar.key,
        value: linkedVar.is_secret ? '••••••••' : (linkedValue || '(empty)'),
        isSecret: linkedVar.is_secret,
      }
    }).filter(Boolean)
  }

  // Filter values based on search query (only for non-secret)
  const filteredIndices = variable.values.map((_, idx) => idx).filter(idx => {
    if (!searchQuery || variable.is_secret) return true

    const value = variable.values[idx]?.toLowerCase() || ''
    const linkedInfo = getLinkedInfo(idx)
    const linkedValues = linkedInfo?.map(l => l?.value?.toLowerCase()).join(' ') || ''

    const query = searchQuery.toLowerCase()
    return value.includes(query) || linkedValues.includes(query)
  })

  const handleSelect = (index: number) => {
    onSelectValue(index)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleAddValue = () => {
    setIsOpen(false)
    setSearchQuery('')
    onAddValue?.()
  }

  // Get current linked info for display
  const currentLinkedInfo = getLinkedInfo(variable.selected_value_index)

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className={clsx(
          'w-full px-2 py-1 text-sm bg-panel border border-border rounded text-left',
          'flex items-center justify-between gap-2',
          'hover:border-primary-500/50 transition-colors',
          isOpen && 'border-primary-500'
        )}
      >
        <div className="flex-1 truncate">
          <span className="font-mono">
            {variable.is_secret ? '••••••••' : (currentValue || '(empty)')}
          </span>
          {currentLinkedInfo && currentLinkedInfo.length > 0 && (
            <span className="text-text-secondary ml-2 text-xs">
              {currentLinkedInfo.map(l => `${l?.key}: ${l?.value}`).join(', ')}
            </span>
          )}
        </div>
        <ChevronDown className={clsx(
          'w-4 h-4 text-text-secondary transition-transform flex-shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={clsx(
            'absolute left-0 bg-sidebar border border-border rounded-lg shadow-xl z-50 max-h-80 flex flex-col',
            'min-w-full w-max max-w-[400px]',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Search input - only for non-secret variables */}
          {!variable.is_secret && (
            <div className={clsx(
              'p-2 border-border',
              openUpward ? 'border-t order-last' : 'border-b'
            )}>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search values..."
                  className="w-full pl-8 pr-8 py-1.5 text-sm bg-panel border border-border rounded focus:border-primary-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="flex-1 overflow-auto">
            {filteredIndices.length === 0 ? (
              <div className="px-3 py-4 text-sm text-text-secondary text-center">
                No matching values
              </div>
            ) : (
              filteredIndices.map(idx => {
                const linkedInfo = getLinkedInfo(idx)
                const isSelected = idx === variable.selected_value_index

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm transition-colors',
                      'flex flex-col gap-0.5',
                      isSelected
                        ? 'bg-primary-500/20 text-primary-300'
                        : 'hover:bg-white/5 text-text-primary'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="text-primary-400">✓</span>
                      )}
                      <span className={clsx(
                        'font-mono',
                        !isSelected && 'ml-5'
                      )}>
                        {getDisplayValue(idx)}
                      </span>
                    </div>
                    {linkedInfo && linkedInfo.length > 0 && (
                      <div className="ml-5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {linkedInfo.map((info, i) => (
                          <span
                            key={i}
                            className={clsx(
                              'text-xs',
                              isSelected ? 'text-primary-400/70' : 'text-text-secondary'
                            )}
                          >
                            <span className="text-cyan-500">{info?.key}:</span>{' '}
                            <span className="font-mono">{info?.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer with count and add button */}
          <div className={clsx(
            'px-3 py-1.5 text-xs text-text-secondary border-border bg-panel/50 flex items-center justify-between',
            openUpward ? 'border-b order-first' : 'border-t'
          )}>
            <div>
              {filteredIndices.length} of {variable.values.length} values
              {linkedVariables.length > 0 && (
                <span className="ml-2 text-cyan-500">
                  Linked with: {linkedVariables.map(v => v.key).join(', ')}
                </span>
              )}
            </div>
            {onAddValue && (
              <button
                onClick={handleAddValue}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add new
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
