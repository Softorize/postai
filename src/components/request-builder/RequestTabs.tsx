import { useState } from 'react'
import { clsx } from 'clsx'
import { KeyValuePair, RequestBody, AuthConfig } from '@/types'
import { KeyValueEditor } from './KeyValueEditor'
import { BodyEditor } from './BodyEditor'
import { AuthEditor } from './AuthEditor'

type TabId = 'params' | 'headers' | 'body' | 'auth' | 'pre-request' | 'tests'

interface Tab {
  id: TabId
  label: string
  badge?: number
}

interface RequestTabsProps {
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth?: AuthConfig
  onHeadersChange: (headers: KeyValuePair[]) => void
  onParamsChange: (params: KeyValuePair[]) => void
  onBodyChange: (body: RequestBody) => void
  onAuthChange: (auth: AuthConfig | undefined) => void
}

export function RequestTabs({
  headers,
  params,
  body,
  auth,
  onHeadersChange,
  onParamsChange,
  onBodyChange,
  onAuthChange,
}: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('params')

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
    { id: 'pre-request', label: 'Pre-request' },
    { id: 'tests', label: 'Tests' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-sidebar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'params' && (
          <KeyValueEditor
            items={params}
            onChange={onParamsChange}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Parameter value"
          />
        )}

        {activeTab === 'headers' && (
          <KeyValueEditor
            items={headers}
            onChange={onHeadersChange}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
          />
        )}

        {activeTab === 'body' && <BodyEditor body={body} onChange={onBodyChange} />}

        {activeTab === 'auth' && <AuthEditor auth={auth} onChange={onAuthChange} />}

        {activeTab === 'pre-request' && (
          <div className="text-text-secondary text-sm">
            Pre-request scripts coming soon...
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="text-text-secondary text-sm">
            Test scripts coming soon...
          </div>
        )}
      </div>
    </div>
  )
}
