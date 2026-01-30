import { Terminal, ChevronUp, ChevronDown } from 'lucide-react'
import { useBackendStore } from '@/stores/backend.store'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useConsoleStore } from '@/stores/console.store'
import packageJson from '../../../package.json'

export function StatusBar() {
  const { isConnected } = useBackendStore()
  const { activeEnvironment } = useEnvironmentsStore()
  const { entries, isVisible, toggleVisibility } = useConsoleStore()

  return (
    <footer className="h-6 bg-sidebar border-t border-border flex items-center px-3 text-xs text-text-secondary">
      {/* Backend status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        <span>Backend: {isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="w-px h-3 bg-border mx-3" />

      {/* Active environment */}
      <div>
        Environment:{' '}
        <span className="text-text-primary">
          {activeEnvironment?.name || 'None'}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Console toggle */}
      <button
        onClick={toggleVisibility}
        className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-white/10 rounded transition-colors mr-3"
      >
        <Terminal className="w-3 h-3 text-primary-400" />
        <span>Console</span>
        {entries.length > 0 && (
          <span className="px-1 bg-primary-500/20 text-primary-400 rounded text-[10px]">
            {entries.length}
          </span>
        )}
        {isVisible ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>

      {/* Version info */}
      <div className="text-text-secondary">
        PostAI v{packageJson.version}
      </div>
    </footer>
  )
}
