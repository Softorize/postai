import { useState } from 'react'
import { Settings, Wifi, WifiOff, Bot } from 'lucide-react'
import { useBackendStore } from '@/stores/backend.store'
import { useAiStore } from '@/stores/ai.store'
import { EnvironmentSelector } from '../environments/EnvironmentSelector'
import { AiProviderSettings } from '../ai/AiProviderSettings'

export function Header() {
  const { isConnected } = useBackendStore()
  const { isSidebarOpen, toggleSidebar, providers } = useAiStore()
  const [showAiSettings, setShowAiSettings] = useState(false)

  const hasActiveProvider = providers.some(p => p.is_active)

  return (
    <>
      <header className="h-12 bg-sidebar border-b border-border flex items-center px-4 drag-region">
        {/* macOS traffic lights spacing */}
        <div className="w-20" />

        {/* Logo */}
        <div className="flex items-center gap-2 no-drag">
          <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="font-semibold text-sm">PostAI</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Environment selector */}
        <div className="no-drag mr-4">
          <EnvironmentSelector />
        </div>

        {/* Connection status */}
        <div className="no-drag flex items-center gap-2 mr-4">
          {isConnected ? (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <Wifi className="w-3.5 h-3.5" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Disconnected</span>
            </div>
          )}
        </div>

        {/* AI button */}
        <button
          onClick={toggleSidebar}
          className={`no-drag p-1.5 hover:bg-white/10 rounded transition-colors mr-2 ${
            isSidebarOpen ? 'bg-primary/20 text-primary' : ''
          }`}
          title="AI Assistant"
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* AI Settings button */}
        <button
          onClick={() => setShowAiSettings(true)}
          className="no-drag p-1.5 hover:bg-white/10 rounded transition-colors mr-2 relative"
          title="AI Provider Settings"
        >
          <Settings className="w-4 h-4 text-text-secondary" />
          {!hasActiveProvider && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" />
          )}
        </button>
      </header>

      <AiProviderSettings
        isOpen={showAiSettings}
        onClose={() => setShowAiSettings(false)}
      />
    </>
  )
}
