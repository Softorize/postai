import { useState, useEffect, useRef } from 'react'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'
import { Request, HttpMethod, Response, KeyValuePair, RequestBody, AuthConfig } from '@/types'
import { useTabsStore } from '@/stores/tabs.store'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useConsoleStore } from '@/stores/console.store'
import { api } from '@/api/client'
import { UrlBar } from './UrlBar'
import { RequestTabs } from './RequestTabs'
import { ResponseViewer } from '../response-viewer/ResponseViewer'

interface RequestBuilderProps {
  request?: Request | null
  tabId: string
}

// Default headers like Postman
const DEFAULT_HEADERS: KeyValuePair[] = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
  { key: '', value: '', enabled: true },
]

// Check if headers have any actual content
const hasActualHeaders = (headers?: KeyValuePair[]): boolean => {
  if (!headers || headers.length === 0) return false
  return headers.some(h => h.key.trim() !== '')
}

export function RequestBuilder({ request, tabId }: RequestBuilderProps) {
  const { updateTab } = useTabsStore()
  const { resolveVariables } = useEnvironmentsStore()
  const { addEntry, updateEntry } = useConsoleStore()
  const currentEntryId = useRef<string | null>(null)

  // Request state
  const [method, setMethod] = useState<HttpMethod>(request?.method || 'GET')
  const [url, setUrl] = useState(request?.url || '')
  const [headers, setHeaders] = useState<KeyValuePair[]>(
    hasActualHeaders(request?.headers) ? request!.headers : DEFAULT_HEADERS
  )
  const [params, setParams] = useState<KeyValuePair[]>(
    request?.params || [{ key: '', value: '', enabled: true }]
  )
  const [body, setBody] = useState<RequestBody>(
    request?.body || { mode: 'raw', raw: '', language: 'json' }
  )
  const [auth, setAuth] = useState<AuthConfig | undefined>(request?.auth)

  // Response state
  const [response, setResponse] = useState<Response | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when tab changes
  useEffect(() => {
    setMethod(request?.method || 'GET')
    setUrl(request?.url || '')
    setHeaders(hasActualHeaders(request?.headers) ? request!.headers : DEFAULT_HEADERS)
    setParams(request?.params || [{ key: '', value: '', enabled: true }])
    setBody(request?.body || { mode: 'raw', raw: '', language: 'json' })
    setAuth(request?.auth)
    setResponse(null)
    setError(null)
  }, [tabId, request])

  // Track changes
  useEffect(() => {
    const hasChanges =
      method !== (request?.method || 'GET') ||
      url !== (request?.url || '') ||
      JSON.stringify(headers) !== JSON.stringify(request?.headers || []) ||
      JSON.stringify(params) !== JSON.stringify(request?.params || []) ||
      JSON.stringify(body) !== JSON.stringify(request?.body || {})

    updateTab(tabId, { isDirty: hasChanges })
  }, [method, url, headers, params, body, request, tabId, updateTab])

  const handleSend = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    // Resolve variables in URL
    const resolvedUrl = resolveVariables(url)

    // Build headers object
    const resolvedHeaders: Record<string, string> = {}
    headers.forEach((h) => {
      if (h.enabled && h.key) {
        resolvedHeaders[resolveVariables(h.key)] = resolveVariables(h.value)
      }
    })

    // Build query params
    const queryParams = new URLSearchParams()
    params.forEach((p) => {
      if (p.enabled && p.key) {
        queryParams.append(resolveVariables(p.key), resolveVariables(p.value))
      }
    })

    const finalUrl = queryParams.toString()
      ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}${queryParams}`
      : resolvedUrl

    // Prepare body for logging
    let requestBody: string | undefined
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      if (body.mode === 'raw') {
        requestBody = resolveVariables(body.raw || '')
      } else if (body.mode === 'urlencoded') {
        const formData = new URLSearchParams()
        body.urlencoded?.forEach((item) => {
          if (item.enabled) {
            formData.append(resolveVariables(item.key), resolveVariables(item.value))
          }
        })
        requestBody = formData.toString()
        resolvedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    // Log to console with full request details
    const entryId = addEntry({
      method,
      url: finalUrl,
      requestHeaders: resolvedHeaders,
      requestBody,
    })
    currentEntryId.current = entryId

    try {
      // Send request through backend
      const result = await api.post('/requests/execute/', {
        method,
        url: finalUrl,
        headers: resolvedHeaders,
        body: requestBody,
      })

      // Update console entry with response details
      updateEntry(entryId, {
        status: result.data.status_code,
        statusText: result.data.status_text,
        time: result.data.time,
        size: result.data.size,
        responseHeaders: result.data.headers,
        responseBody: result.data.body,
      })

      setResponse({
        status_code: result.data.status_code,
        status_text: result.data.status_text,
        headers: result.data.headers,
        body: result.data.body,
        size: result.data.size,
        time: result.data.time,
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send request'

      // Update console entry with error
      updateEntry(entryId, {
        error: errorMessage,
      })

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL Bar */}
      <div className="p-4 border-b border-border">
        <UrlBar
          method={method}
          url={url}
          isLoading={isLoading}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onSend={handleSend}
        />
      </div>

      {/* Request/Response split */}
      <PanelGroup direction="vertical" className="flex-1">
        {/* Request panel */}
        <Panel defaultSize={50} minSize={20}>
          <RequestTabs
            headers={headers}
            params={params}
            body={body}
            auth={auth}
            onHeadersChange={setHeaders}
            onParamsChange={setParams}
            onBodyChange={setBody}
            onAuthChange={setAuth}
          />
        </Panel>

        <PanelResizeHandle className="h-1 bg-border hover:bg-primary-500 transition-colors" />

        {/* Response panel */}
        <Panel defaultSize={50} minSize={20}>
          <ResponseViewer response={response} error={error} isLoading={isLoading} />
        </Panel>
      </PanelGroup>
    </div>
  )
}
