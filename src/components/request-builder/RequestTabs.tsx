import { clsx } from 'clsx'
import { KeyValuePair, RequestBody, AuthConfig } from '@/types'
import { KeyValueEditor } from './KeyValueEditor'
import { HeadersEditor } from './HeadersEditor'
import { BodyEditor } from './BodyEditor'
import { AuthEditor } from './AuthEditor'
import { ScriptEditor } from './ScriptEditor'
import { useTabsStore, RequestSubTab } from '@/stores/tabs.store'

type TabId = RequestSubTab

interface Tab {
  id: TabId
  label: string
  badge?: number
}

interface RequestTabsProps {
  tabId: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth?: AuthConfig
  preRequestScript: string
  testScript: string
  url?: string
  onHeadersChange: (headers: KeyValuePair[]) => void
  onParamsChange: (params: KeyValuePair[]) => void
  onBodyChange: (body: RequestBody) => void
  onAuthChange: (auth: AuthConfig | undefined) => void
  onPreRequestScriptChange: (script: string) => void
  onTestScriptChange: (script: string) => void
}

export function RequestTabs({
  tabId,
  headers,
  params,
  body,
  auth,
  preRequestScript,
  testScript,
  url,
  onHeadersChange,
  onParamsChange,
  onBodyChange,
  onAuthChange,
  onPreRequestScriptChange,
  onTestScriptChange,
}: RequestTabsProps) {
  const { getTab, updateTab } = useTabsStore()
  const tab = getTab(tabId)
  const activeTab = tab?.activeSubTab || 'params'

  const setActiveTab = (newTab: TabId) => {
    updateTab(tabId, { activeSubTab: newTab })
  }

  const enabledParams = params.filter((p) => p.enabled && p.key).length
  const enabledHeaders = headers.filter((h) => h.enabled && h.key).length

  // Check if body has content
  const hasBodyContent = (): boolean => {
    if (body.mode === 'raw' && body.raw?.trim()) return true
    if (body.mode === 'urlencoded' && body.urlencoded?.some(item => item.enabled && item.key)) return true
    if (body.mode === 'formdata' && body.formdata?.some(item => item.enabled && item.key)) return true
    if (body.mode === 'graphql' && (body.graphql?.query?.trim() || body.graphql?.variables?.trim())) return true
    return false
  }

  const tabs: Tab[] = [
    { id: 'params', label: 'Params', badge: enabledParams || undefined },
    { id: 'headers', label: 'Headers', badge: enabledHeaders || undefined },
    { id: 'body', label: 'Body', badge: hasBodyContent() ? 1 : undefined },
    { id: 'auth', label: 'Auth', badge: auth?.type !== 'none' ? 1 : undefined },
    { id: 'pre-request', label: 'Pre-request', badge: preRequestScript?.trim() ? 1 : undefined },
    { id: 'tests', label: 'Tests', badge: testScript?.trim() ? 1 : undefined },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-1 px-3 py-2 border-b border-border bg-sidebar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5',
              activeTab === tab.id
                ? 'bg-white/10 text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={clsx(
                'min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold rounded-full',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-text-secondary'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={clsx(
        'flex-1 overflow-auto',
        activeTab !== 'pre-request' && activeTab !== 'tests' && 'p-4'
      )}>
        {activeTab === 'params' && (
          <KeyValueEditor
            items={params}
            onChange={onParamsChange}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Parameter value"
          />
        )}

        {activeTab === 'headers' && (
          <HeadersEditor
            items={headers}
            onChange={onHeadersChange}
            url={url}
          />
        )}

        {activeTab === 'body' && <BodyEditor body={body} onChange={onBodyChange} />}

        {activeTab === 'auth' && <AuthEditor auth={auth} onChange={onAuthChange} />}

        {activeTab === 'pre-request' && (
          <ScriptEditor
            value={preRequestScript}
            onChange={onPreRequestScriptChange}
            type="pre-request"
          />
        )}

        {activeTab === 'tests' && (
          <ScriptEditor
            value={testScript}
            onChange={onTestScriptChange}
            type="tests"
          />
        )}
      </div>
    </div>
  )
}
