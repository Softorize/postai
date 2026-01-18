import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Globe, Check, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useTabsStore } from '@/stores/tabs.store'

export function EnvironmentSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { environments, activeEnvironment, activateEnvironment } = useEnvironmentsStore()
  const { openTab } = useTabsStore()

  // Only show global environments (those without a collection)
  const globalEnvironments = environments.filter(e => !e.collection)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (envId: string) => {
    await activateEnvironment(envId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-panel hover:bg-white/5 border border-border rounded text-sm transition-colors"
      >
        <Globe className="w-4 h-4 text-primary-400" />
        <span className="max-w-[150px] truncate">
          {activeEnvironment?.name || 'No Environment'}
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-text-secondary transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Environments
            </p>
          </div>

          <div className="max-h-64 overflow-auto">
            {/* No environment option */}
            <button
              onClick={() => handleSelect('')}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {!activeEnvironment && <Check className="w-3.5 h-3.5 text-primary-400" />}
              </div>
              <span className="text-sm text-text-secondary">No Environment</span>
            </button>

            {/* Environment list - only global environments */}
            {globalEnvironments.map((env) => (
              <div
                key={env.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group"
              >
                <button
                  onClick={() => handleSelect(env.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {activeEnvironment?.id === env.id && (
                      <Check className="w-3.5 h-3.5 text-primary-400" />
                    )}
                  </div>
                  <Globe className="w-4 h-4 text-green-400" />
                  <span className="flex-1 text-sm truncate">{env.name}</span>
                  <span className="text-xs text-text-secondary">
                    {env.variables?.length || 0} vars
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openTab({
                      type: 'environments',
                      title: 'Manage Environments',
                      data: null,
                    })
                    setIsOpen(false)
                  }}
                  className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit environment"
                >
                  <Settings className="w-3.5 h-3.5 text-text-secondary" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-border">
            <button
              onClick={() => {
                openTab({
                  type: 'environments',
                  title: 'Manage Environments',
                  data: null,
                })
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded text-sm text-text-secondary"
            >
              <Settings className="w-4 h-4" />
              Manage Environments
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
