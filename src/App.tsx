import { useEffect, useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { AiChatSidebar } from './components/ai/AiChatSidebar'
import { useBackendStore } from './stores/backend.store'
import { Loader2 } from 'lucide-react'

function App() {
  const { checkConnection } = useBackendStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initApp = async () => {
      try {
        // Get backend URL from Electron
        if (window.electron) {
          const url = await window.electron.django.getBaseUrl()
          useBackendStore.setState({ baseUrl: url })
        }

        // Wait for backend to be ready
        let attempts = 0
        const maxAttempts = 30

        while (attempts < maxAttempts) {
          const connected = await checkConnection()
          if (connected) {
            setIsLoading(false)
            return
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
        }

        setError('Failed to connect to backend server. Please restart the application.')
        setIsLoading(false)
      } catch (err) {
        setError('An error occurred while initializing the application.')
        setIsLoading(false)
        console.error('App initialization error:', err)
      }
    }

    initApp()
  }, [checkConnection])

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-panel text-text-primary">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Starting PostAI</h2>
        <p className="text-text-secondary">Initializing backend server...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-panel text-text-primary">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded text-white"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppLayout />
      <AiChatSidebar />
    </>
  )
}

export default App
