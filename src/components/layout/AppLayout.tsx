import { useEffect, useRef } from 'react'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
  type ImperativePanelHandle,
} from 'react-resizable-panels'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { StatusBar } from './StatusBar'
import { ConsolePanel } from '../console/ConsolePanel'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { useCollectionsStore } from '@/stores/collections.store'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useWorkflowsStore } from '@/stores/workflows.store'
import { useConsoleStore } from '@/stores/console.store'

export function AppLayout() {
  const isConsoleVisible = useConsoleStore(s => s.isVisible)
  const consolePanelRef = useRef<ImperativePanelHandle>(null)
  const prevVisibleRef = useRef(isConsoleVisible)

  useEffect(() => {
    if (isConsoleVisible !== prevVisibleRef.current) {
      prevVisibleRef.current = isConsoleVisible
      if (isConsoleVisible) {
        consolePanelRef.current?.resize(30)
      } else {
        consolePanelRef.current?.collapse()
      }
    }
  }, [isConsoleVisible])

  const { fetchWorkspaces, activeWorkspace } = useWorkspacesStore()
  const { fetchCollections } = useCollectionsStore()
  const { fetchEnvironments } = useEnvironmentsStore()
  const { fetchWorkflows } = useWorkflowsStore()

  useEffect(() => {
    // Load workspaces first
    fetchWorkspaces()
  }, [fetchWorkspaces])

  useEffect(() => {
    // Load collections, environments, and workflows when workspace changes
    fetchCollections()
    fetchEnvironments()
    fetchWorkflows()
  }, [activeWorkspace?.id, fetchCollections, fetchEnvironments, fetchWorkflows])

  return (
    <div className="h-screen flex flex-col bg-panel text-text-primary">
      {/* Header with drag region */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <Sidebar />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary-500 transition-colors" />

          {/* Main content + Console */}
          <Panel defaultSize={80}>
            <PanelGroup direction="vertical">
              {/* Main content */}
              <Panel defaultSize={isConsoleVisible ? 70 : 100} minSize={30}>
                <MainContent />
              </Panel>

              <PanelResizeHandle className={`h-1 bg-border hover:bg-primary-500 transition-colors cursor-row-resize ${!isConsoleVisible ? 'hidden' : ''}`} />

              {/* Console panel */}
              <Panel
                ref={consolePanelRef}
                defaultSize={isConsoleVisible ? 30 : 0}
                minSize={0}
                maxSize={70}
                collapsible
                collapsedSize={0}
              >
                <ConsolePanel />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  )
}
