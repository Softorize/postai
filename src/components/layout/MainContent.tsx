import { useRef, useEffect } from 'react'
import { Plus, X, Crosshair } from 'lucide-react'
import { clsx } from 'clsx'
import { useTabsStore, Tab } from '@/stores/tabs.store'
import { useCollectionsStore } from '@/stores/collections.store'
import { RequestBuilder } from '../request-builder/RequestBuilder'
import { WelcomeScreen } from './WelcomeScreen'
import { EnvironmentManager } from '../environments/EnvironmentManager'
import { McpManager } from '../mcp/McpManager'
import { WorkflowBuilder } from '../workflow/WorkflowBuilder'
import { LinkGroupsViewer } from '../environments/LinkGroupsViewer'
import { Request } from '@/types'

export function MainContent() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabsStore()
  const { revealRequest } = useCollectionsStore()
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabId) {
      const tabElement = tabRefs.current.get(activeTabId)
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }
    }
  }, [activeTabId])

  const handleLocateInSidebar = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation()
    if (tab.type === 'request' && tab.data) {
      const request = tab.data as Request
      if (request.id && request.collection) {
        revealRequest(request.id)
      }
    }
  }

  const handleNewTab = () => {
    openTab({
      type: 'request',
      title: 'Untitled Request',
      data: null,
    })
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.isDirty) {
      const confirmed = confirm(`"${tab.title}" has unsaved changes. Close anyway?`)
      if (!confirmed) return
    }
    closeTab(tabId)
  }

  const getMethodColor = (tab: Tab) => {
    if (tab.type !== 'request' || !tab.data) return ''
    const method = (tab.data as { method?: string }).method || 'GET'
    return `method-${method.toLowerCase()}`
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-sidebar">
        {/* Scrollable tabs container */}
        <div className="flex-1 overflow-x-auto tab-scrollbar">
          <div className="flex gap-1 px-2 py-1.5">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id
              const hasCollection = tab.type === 'request' && tab.data && (tab.data as Request).collection
              const isHistoryTab = tab.type === 'request' && tab.historicalResponse
              const isEnvironmentTab = tab.type === 'environment' || tab.type === 'environments'
              const isLinkGroupsTab = tab.type === 'link-groups'
              const isWorkflowTab = tab.type === 'workflow'
              const isMcpTab = tab.type === 'mcp'

              // Get tab-specific styling
              const getTabStyle = () => {
                if (isHistoryTab) {
                  return isActive
                    ? 'bg-amber-500/20 text-text-primary shadow-sm border border-amber-500/30'
                    : 'bg-amber-500/10 text-text-secondary hover:text-text-primary hover:bg-amber-500/15 border border-amber-500/20'
                }
                if (isEnvironmentTab) {
                  return isActive
                    ? 'bg-emerald-500/20 text-text-primary shadow-sm border border-emerald-500/30'
                    : 'bg-emerald-500/10 text-text-secondary hover:text-text-primary hover:bg-emerald-500/15 border border-emerald-500/20'
                }
                if (isWorkflowTab) {
                  return isActive
                    ? 'bg-purple-500/20 text-text-primary shadow-sm border border-purple-500/30'
                    : 'bg-purple-500/10 text-text-secondary hover:text-text-primary hover:bg-purple-500/15 border border-purple-500/20'
                }
                if (isMcpTab) {
                  return isActive
                    ? 'bg-cyan-500/20 text-text-primary shadow-sm border border-cyan-500/30'
                    : 'bg-cyan-500/10 text-text-secondary hover:text-text-primary hover:bg-cyan-500/15 border border-cyan-500/20'
                }
                if (isLinkGroupsTab) {
                  return isActive
                    ? 'bg-cyan-500/20 text-text-primary shadow-sm border border-cyan-500/30'
                    : 'bg-cyan-500/10 text-text-secondary hover:text-text-primary hover:bg-cyan-500/15 border border-cyan-500/20'
                }
                // Default request tab
                return isActive
                  ? 'bg-white/10 text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }

              return (
                <div
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el)
                    else tabRefs.current.delete(tab.id)
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'group flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg cursor-pointer transition-all duration-150 flex-shrink-0 min-w-[80px] max-w-[180px]',
                    getTabStyle()
                  )}
                  title={isHistoryTab ? `${tab.title} (from history)` : tab.title}
                >
                  {/* Method badge */}
                  {tab.type === 'request' && tab.data && (
                    <span className={clsx(
                      'text-[10px] font-bold uppercase tracking-wide px-1 py-0.5 rounded flex-shrink-0',
                      isActive ? 'bg-black/20' : 'bg-black/10',
                      getMethodColor(tab)
                    )}>
                      {(tab.data as { method?: string }).method || 'GET'}
                    </span>
                  )}
                  {/* Title - truncate but show something */}
                  <span className="truncate flex-1">{tab.title}</span>
                  {/* Dirty indicator */}
                  {tab.isDirty && <span className="text-primary-400 text-lg leading-none flex-shrink-0">•</span>}
                  {/* Action buttons - only show on hover */}
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasCollection && (
                      <button
                        onClick={(e) => handleLocateInSidebar(e, tab)}
                        className="p-0.5 hover:bg-white/10 rounded"
                        title="Locate in sidebar"
                      >
                        <Crosshair className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="p-0.5 hover:bg-white/10 rounded"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* New tab button - fixed position */}
        <button
          onClick={handleNewTab}
          className="flex-shrink-0 p-1.5 mx-1 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-lg transition-colors"
          title="New Request"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <div className="h-full">
            {activeTab.type === 'request' && (
              <RequestBuilder
                key={activeTab.id}
                request={activeTab.data as never}
                tabId={activeTab.id}
              />
            )}
            {activeTab.type === 'workflow' && (
              <WorkflowBuilder
                key={`workflow-${(activeTab.data as { id: string })?.id || activeTab.id}`}
                workflowId={(activeTab.data as { id: string })?.id}
              />
            )}
            {activeTab.type === 'mcp' && (
              <McpManager serverId={(activeTab.data as { serverId?: string })?.serverId} />
            )}
            {activeTab.type === 'environments' && (
              <EnvironmentManager />
            )}
            {activeTab.type === 'environment' && (
              <EnvironmentManager environmentId={(activeTab.data as { id: string })?.id} />
            )}
            {activeTab.type === 'link-groups' && (
              <LinkGroupsViewer environmentId={(activeTab.data as { id: string })?.id} />
            )}
            {activeTab.type === 'ai' && (
              <div className="p-4 text-text-secondary">
                AI chat coming soon...
              </div>
            )}
          </div>
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  )
}
