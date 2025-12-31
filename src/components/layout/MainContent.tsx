import { Plus, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useTabsStore, Tab } from '@/stores/tabs.store'
import { RequestBuilder } from '../request-builder/RequestBuilder'
import { WelcomeScreen } from './WelcomeScreen'
import { EnvironmentManager } from '../environments/EnvironmentManager'
import { McpManager } from '../mcp/McpManager'
import { WorkflowBuilder } from '../workflow/WorkflowBuilder'

export function MainContent() {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useTabsStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleNewTab = () => {
    openTab({
      type: 'request',
      title: 'Untitled Request',
      data: null,
    })
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
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
      <div className="flex items-center border-b border-border bg-sidebar overflow-x-auto">
        <div className="flex flex-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'group flex items-center gap-2 px-3 py-2 text-sm border-r border-border min-w-0 max-w-[200px] transition-colors',
                activeTabId === tab.id
                  ? 'bg-panel text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {tab.type === 'request' && tab.data && (
                <span className={clsx('text-xs font-semibold', getMethodColor(tab))}>
                  {(tab.data as { method?: string }).method || 'GET'}
                </span>
              )}
              <span className="truncate">{tab.title}</span>
              {tab.isDirty && <span className="text-primary-400">*</span>}
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="ml-auto p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>

        {/* New tab button */}
        <button
          onClick={handleNewTab}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
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
              <WorkflowBuilder />
            )}
            {activeTab.type === 'mcp' && (
              <McpManager />
            )}
            {activeTab.type === 'environments' && (
              <EnvironmentManager />
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
