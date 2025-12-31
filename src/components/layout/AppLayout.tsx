import { useEffect } from 'react'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { StatusBar } from './StatusBar'
import { ConsolePanel } from '../console/ConsolePanel'
import { useCollectionsStore } from '@/stores/collections.store'
import { useEnvironmentsStore } from '@/stores/environments.store'

export function AppLayout() {
  const { fetchCollections } = useCollectionsStore()
  const { fetchEnvironments } = useEnvironmentsStore()

  useEffect(() => {
    // Load initial data
    fetchCollections()
    fetchEnvironments()
  }, [fetchCollections, fetchEnvironments])

  return (
    <div className="h-screen flex flex-col bg-panel text-text-primary">
      {/* Header with drag region */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Sidebar */}
            <Panel defaultSize={20} minSize={15} maxSize={40}>
              <Sidebar />
            </Panel>

            <PanelResizeHandle className="w-1 bg-border hover:bg-primary-500 transition-colors" />

            {/* Main content */}
            <Panel defaultSize={80}>
              <MainContent />
            </Panel>
          </PanelGroup>
        </div>

        {/* Console panel */}
        <ConsolePanel />
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
