import { useBackendStore } from '@/stores/backend.store'
import { useEnvironmentsStore } from '@/stores/environments.store'
import packageJson from '../../../package.json'

export function StatusBar() {
  const { isConnected } = useBackendStore()
  const { activeEnvironment } = useEnvironmentsStore()

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

      {/* Version info */}
      <div className="text-text-secondary">
        PostAI v{packageJson.version}
      </div>
    </footer>
  )
}
