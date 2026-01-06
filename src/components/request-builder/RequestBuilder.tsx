import { useState, useEffect, useRef } from 'react'
import {
  PanelResizeHandle,
  Panel,
  PanelGroup,
} from 'react-resizable-panels'
import { Request, HttpMethod, Response, KeyValuePair, RequestBody, AuthConfig } from '@/types'
import { useTabsStore, RequestDraft } from '@/stores/tabs.store'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useCollectionsStore } from '@/stores/collections.store'
import { useConsoleStore } from '@/stores/console.store'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { api } from '@/api/client'
import toast from 'react-hot-toast'
import { UrlBar } from './UrlBar'
import { RequestTabs } from './RequestTabs'
import { ResponseViewer } from '../response-viewer/ResponseViewer'
import { SaveToCollectionDialog } from './SaveToCollectionDialog'
import { CodeSnippetPanel } from './CodeSnippetPanel'
import { runPreRequestScript, runTestScript } from '@/utils/scriptRunner'

interface RequestBuilderProps {
  request?: Request | null
  tabId: string
}

// Default headers like Postman (auto-generated)
const DEFAULT_HEADERS: KeyValuePair[] = [
  { key: 'User-Agent', value: 'PostAI/1.0.0', enabled: true },
  { key: 'Accept', value: '*/*', enabled: true },
  { key: 'Accept-Encoding', value: 'gzip, deflate, br', enabled: true },
  { key: 'Connection', value: 'keep-alive', enabled: true },
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: '', value: '', enabled: true },
]

// Header keys that are considered auto-generated
export const AUTO_GENERATED_HEADER_KEYS = [
  'user-agent',
  'accept',
  'accept-encoding',
  'connection',
  'content-type',
  'host',
]

// Check if headers have any actual user-defined content (not just empty rows)
const hasActualHeaders = (headers?: KeyValuePair[]): boolean => {
  if (!headers || headers.length === 0) return false
  return headers.some(h => h.key && h.key.trim() !== '')
}

// Merge user headers with default headers (add missing defaults at the beginning)
const mergeWithDefaults = (headers: KeyValuePair[]): KeyValuePair[] => {
  const existingKeys = new Set(
    headers.filter(h => h.key).map(h => h.key.toLowerCase())
  )
  const merged: KeyValuePair[] = []

  // Add default headers that don't already exist
  for (const defaultHeader of DEFAULT_HEADERS) {
    if (defaultHeader.key && !existingKeys.has(defaultHeader.key.toLowerCase())) {
      merged.push({ ...defaultHeader })
    }
  }

  // Add user's headers
  merged.push(...headers)

  return merged
}

// Apply auth configuration to headers
const applyAuthToHeaders = (
  headers: Record<string, string>,
  auth: AuthConfig | undefined,
  resolveVariables: (text: string) => string
): Record<string, string> => {
  if (!auth || auth.type === 'none') return headers

  const newHeaders = { ...headers }

  switch (auth.type) {
    case 'basic':
      if (auth.basic?.username) {
        const credentials = btoa(
          `${resolveVariables(auth.basic.username)}:${resolveVariables(auth.basic.password || '')}`
        )
        newHeaders['Authorization'] = `Basic ${credentials}`
      }
      break

    case 'bearer':
      if (auth.bearer?.token) {
        newHeaders['Authorization'] = `Bearer ${resolveVariables(auth.bearer.token)}`
      }
      break

    case 'apikey':
      if (auth.apikey?.key && auth.apikey.in === 'header') {
        newHeaders[resolveVariables(auth.apikey.key)] = resolveVariables(auth.apikey.value || '')
      }
      break

    case 'oauth2':
      if (auth.oauth2?.token) {
        const tokenType = auth.oauth2.tokenType || 'Bearer'
        newHeaders['Authorization'] = `${tokenType} ${auth.oauth2.token}`
      }
      break
  }

  return newHeaders
}

// Apply API key auth to query params
const applyApiKeyToParams = (
  url: string,
  auth: AuthConfig | undefined,
  resolveVariables: (text: string) => string
): string => {
  if (auth?.type === 'apikey' && auth.apikey?.key && auth.apikey.in === 'query') {
    const separator = url.includes('?') ? '&' : '?'
    const key = resolveVariables(auth.apikey.key)
    const value = resolveVariables(auth.apikey.value || '')
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
  return url
}

export function RequestBuilder({ request, tabId }: RequestBuilderProps) {
  const { updateTab, getTab } = useTabsStore()
  const { resolveVariables } = useEnvironmentsStore()
  const { updateRequest } = useCollectionsStore()
  const { addEntry, updateEntry } = useConsoleStore()
  const { activeWorkspace } = useWorkspacesStore()
  const currentEntryId = useRef<string | null>(null)
  const isInitializing = useRef(true)

  // Get existing draft data from tab
  const tab = getTab(tabId)
  const draft = tab?.draft

  // Initialize state from draft (if exists) or request
  const getInitialMethod = () => draft?.method || request?.method || 'GET'
  const getInitialUrl = () => draft?.url || request?.url || ''
  const getInitialHeaders = () => {
    // If there's a draft, use it (user has already modified headers)
    if (draft?.headers) return draft.headers
    // If request has actual headers, merge with defaults
    if (hasActualHeaders(request?.headers)) {
      return mergeWithDefaults(request!.headers)
    }
    // Otherwise, use defaults
    return DEFAULT_HEADERS
  }
  const getInitialParams = () => draft?.params || request?.params || [{ key: '', value: '', enabled: true }]
  const getInitialBody = () => draft?.body || request?.body || { mode: 'raw', raw: '', language: 'json' }
  const getInitialAuth = () => draft?.auth || request?.auth
  const getInitialPreRequestScript = () => draft?.preRequestScript || request?.pre_request_script || ''
  const getInitialTestScript = () => draft?.testScript || request?.test_script || ''

  // Request state
  const [method, setMethod] = useState<HttpMethod>(getInitialMethod())
  const [url, setUrl] = useState(getInitialUrl())
  const [headers, setHeaders] = useState<KeyValuePair[]>(getInitialHeaders())
  const [params, setParams] = useState<KeyValuePair[]>(getInitialParams())
  const [body, setBody] = useState<RequestBody>(getInitialBody())
  const [auth, setAuth] = useState<AuthConfig | undefined>(getInitialAuth())
  const [preRequestScript, setPreRequestScript] = useState(getInitialPreRequestScript())
  const [testScript, setTestScript] = useState(getInitialTestScript())

  // Track if we're syncing to avoid loops
  const isSyncingFromParams = useRef(false)
  const isSyncingFromUrl = useRef(false)

  // Response state
  const [response, setResponse] = useState<Response | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Save As dialog state
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false)

  // Code snippet panel state
  const [showCodeSnippet, setShowCodeSnippet] = useState(false)

  // Load state when tab changes - use draft if available
  useEffect(() => {
    isInitializing.current = true
    const currentTab = getTab(tabId)
    const currentDraft = currentTab?.draft

    setMethod(currentDraft?.method || request?.method || 'GET')
    setUrl(currentDraft?.url || request?.url || '')
    // Use draft headers, or merge request headers with defaults, or use defaults
    if (currentDraft?.headers) {
      setHeaders(currentDraft.headers)
    } else if (hasActualHeaders(request?.headers)) {
      setHeaders(mergeWithDefaults(request!.headers))
    } else {
      setHeaders(DEFAULT_HEADERS)
    }
    setParams(currentDraft?.params || request?.params || [{ key: '', value: '', enabled: true }])
    setBody(currentDraft?.body || request?.body || { mode: 'raw', raw: '', language: 'json' })
    setAuth(currentDraft?.auth || request?.auth)
    setPreRequestScript(currentDraft?.preRequestScript || request?.pre_request_script || '')
    setTestScript(currentDraft?.testScript || request?.test_script || '')

    // Load historical response if present (from history entries)
    if (currentTab?.historicalResponse) {
      setResponse(currentTab.historicalResponse)
    } else {
      setResponse(null)
    }
    setError(null)

    // Mark initialization complete after a tick
    setTimeout(() => { isInitializing.current = false }, 0)
  }, [tabId])

  // Sync params to URL - when params change, update the query string in URL
  useEffect(() => {
    if (isInitializing.current || isSyncingFromUrl.current) return

    isSyncingFromParams.current = true

    // Get base URL without query string
    const questionIndex = url.indexOf('?')
    const baseUrl = questionIndex >= 0 ? url.slice(0, questionIndex) : url

    // Build query string from params
    const enabledParams = params.filter(p => p.enabled && p.key.trim())
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&')
      setUrl(`${baseUrl}?${queryString}`)
    } else {
      setUrl(baseUrl)
    }

    setTimeout(() => { isSyncingFromParams.current = false }, 0)
  }, [params])

  // Sync URL to params - when URL changes, parse query params
  const handleUrlChange = (newUrl: string) => {
    if (isSyncingFromParams.current) {
      setUrl(newUrl)
      return
    }

    isSyncingFromUrl.current = true
    setUrl(newUrl)

    // Parse query params from URL
    try {
      const questionIndex = newUrl.indexOf('?')
      if (questionIndex >= 0) {
        const queryString = newUrl.slice(questionIndex + 1)
        const urlParams = new URLSearchParams(queryString)
        const newParams: KeyValuePair[] = []

        urlParams.forEach((value, key) => {
          newParams.push({ key, value, enabled: true })
        })

        // Always add an empty row at the end
        newParams.push({ key: '', value: '', enabled: true })
        setParams(newParams)
      } else {
        // No query string, reset to single empty row
        setParams([{ key: '', value: '', enabled: true }])
      }
    } catch {
      // Invalid URL, just update url without changing params
    }

    setTimeout(() => { isSyncingFromUrl.current = false }, 0)
  }

  // Track changes and save draft
  useEffect(() => {
    if (isInitializing.current) return

    const originalMethod = request?.method || 'GET'
    const originalUrl = request?.url || ''
    const originalHeaders = request?.headers || []
    const originalParams = request?.params || []
    const originalBody = request?.body || {}
    const originalPreRequestScript = request?.pre_request_script || ''
    const originalTestScript = request?.test_script || ''

    const hasChanges =
      method !== originalMethod ||
      url !== originalUrl ||
      JSON.stringify(headers) !== JSON.stringify(originalHeaders) ||
      JSON.stringify(params) !== JSON.stringify(originalParams) ||
      JSON.stringify(body) !== JSON.stringify(originalBody) ||
      preRequestScript !== originalPreRequestScript ||
      testScript !== originalTestScript

    // Save draft data to tab
    const draftData: RequestDraft = { method, url, headers, params, body, auth, preRequestScript, testScript }
    updateTab(tabId, { isDirty: hasChanges, draft: hasChanges ? draftData : undefined })
  }, [method, url, headers, params, body, auth, preRequestScript, testScript, request, tabId, updateTab])

  const handleSend = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    // Debug: Log script states
    console.log('[Debug] testScript:', testScript)
    console.log('[Debug] testScript.trim():', testScript?.trim())
    console.log('[Debug] preRequestScript:', preRequestScript)

    setIsLoading(true)
    setError(null)
    setResponse(null)

    // Get environment variables for script context
    const { activeEnvironment } = useEnvironmentsStore.getState()
    const envVars: Record<string, string> = {}
    if (activeEnvironment) {
      activeEnvironment.variables?.forEach(v => {
        if (v.enabled) {
          const value = v.values[v.selected_value_index] || v.values[0] || ''
          envVars[v.key] = value
        }
      })
    }

    // Initial request data for scripts
    let scriptRequest: {
      url: string
      method: string
      headers: Record<string, string>
      body?: string
    } = {
      url: resolveVariables(url),
      method,
      headers: {},
      body: undefined,
    }

    // Build initial headers
    headers.forEach((h) => {
      if (h.enabled && h.key) {
        scriptRequest.headers[resolveVariables(h.key)] = resolveVariables(h.value)
      }
    })

    // Prepare body
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      if (body.mode === 'raw') {
        scriptRequest.body = resolveVariables(body.raw || '')
      } else if (body.mode === 'urlencoded') {
        const formData = new URLSearchParams()
        body.urlencoded?.forEach((item) => {
          if (item.enabled) {
            formData.append(resolveVariables(item.key), resolveVariables(item.value))
          }
        })
        scriptRequest.body = formData.toString()
        scriptRequest.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    // Run pre-request script if present
    let scriptEnv = { ...envVars }
    if (preRequestScript.trim()) {
      try {
        const scriptResult = await runPreRequestScript(
          preRequestScript,
          scriptRequest,
          envVars
        )

        if (!scriptResult.success) {
          setError(`Pre-request script error: ${scriptResult.error}`)
          setIsLoading(false)
          return
        }

        // Log script console output
        scriptResult.logs.forEach(log => {
          console.log(`[Pre-request] ${log.type}:`, ...log.args)
        })

        // Use modified request from script
        scriptRequest = scriptResult.request
        scriptEnv = scriptResult.environment

        // Persist environment variable changes from pre-request script
        const envChanges = Object.entries(scriptResult.environment).filter(
          ([key, value]) => envVars[key] !== value
        )
        if (envChanges.length > 0 && activeEnvironment) {
          const { createVariable, updateVariable } = useEnvironmentsStore.getState()
          for (const [key, value] of envChanges) {
            const existingVar = activeEnvironment.variables?.find(v => v.key === key)
            if (existingVar) {
              // Update existing variable
              const newValues = [...existingVar.values]
              newValues[existingVar.selected_value_index] = value
              await updateVariable(activeEnvironment.id, existingVar.id, { values: newValues })
              console.log(`[Pre-request] Updated environment variable "${key}" = "${value}"`)
            } else {
              // Create new variable
              await createVariable(activeEnvironment.id, {
                key,
                values: [value],
                selected_value_index: 0,
                enabled: true,
                is_secret: false,
                description: 'Set by pre-request script',
              })
              console.log(`[Pre-request] Created environment variable "${key}" = "${value}"`)
            }
          }
        }
      } catch (err) {
        setError(`Pre-request script failed: ${err instanceof Error ? err.message : String(err)}`)
        setIsLoading(false)
        return
      }
    }

    // Build query params
    const queryParams = new URLSearchParams()
    params.forEach((p) => {
      if (p.enabled && p.key) {
        queryParams.append(resolveVariables(p.key), resolveVariables(p.value))
      }
    })

    let finalUrl = queryParams.toString()
      ? `${scriptRequest.url}${scriptRequest.url.includes('?') ? '&' : '?'}${queryParams}`
      : scriptRequest.url

    // Apply API key auth to URL if needed
    finalUrl = applyApiKeyToParams(finalUrl, auth, resolveVariables)

    // Apply auth to headers
    const finalHeaders = applyAuthToHeaders(scriptRequest.headers, auth, resolveVariables)

    // Log to console with full request details
    const entryId = addEntry({
      method: scriptRequest.method as HttpMethod,
      url: finalUrl,
      requestHeaders: finalHeaders,
      requestBody: scriptRequest.body,
    })
    currentEntryId.current = entryId

    try {
      // Build request payload
      const requestPayload: Record<string, unknown> = {
        method: scriptRequest.method,
        url: finalUrl,
        headers: finalHeaders,
        body: scriptRequest.body,
        workspace_id: activeWorkspace?.id,
      }

      // Add HMAC auth config for backend to compute signature
      if (auth?.type === 'hmac' && auth.hmac) {
        requestPayload.hmac_auth = auth.hmac
      }

      // Send request through backend
      const result = await api.post('/requests/execute/', requestPayload)

      // Update console entry with response details
      // Use actual request headers from backend (includes HMAC headers if configured)
      updateEntry(entryId, {
        status: result.data.status_code,
        statusText: result.data.status_text,
        time: result.data.time,
        size: result.data.size,
        responseHeaders: result.data.headers,
        responseBody: result.data.body,
        requestHeaders: result.data.request_headers || finalHeaders,
      })

      const responseData = {
        status_code: result.data.status_code,
        status_text: result.data.status_text,
        headers: result.data.headers,
        body: result.data.body,
        size: result.data.size,
        time: result.data.time,
      }

      setResponse(responseData)

      // Run test script if present
      if (testScript.trim()) {
        try {
          console.log('[Tests] Running test script...')
          const testResult = await runTestScript(
            testScript,
            scriptRequest,
            {
              code: result.data.status_code,
              status: result.data.status_text,
              responseTime: result.data.time,
              headers: result.data.headers,
              body: result.data.body,
            },
            scriptEnv
          )

          console.log('[Tests] Script result:', testResult.success ? 'success' : 'failed', testResult.error || '')

          if (!testResult.success) {
            toast.error(`Test script error: ${testResult.error}`)
          }

          // Log test results
          if (testResult.testResults) {
            const passed = testResult.testResults.filter(t => t.passed).length
            const total = testResult.testResults.length
            console.log(`[Tests] ${passed}/${total} passed`)
            testResult.testResults.forEach(test => {
              if (test.passed) {
                console.log(`  ✓ ${test.name}`)
              } else {
                console.error(`  ✗ ${test.name}: ${test.error}`)
              }
            })
          }

          // Log script console output
          testResult.logs.forEach(log => {
            console.log(`[Tests] ${log.type}:`, ...log.args)
          })

          // Persist environment variable changes from test script
          console.log('[Tests] Environment from script:', testResult.environment)
          console.log('[Tests] Original environment:', scriptEnv)

          const envChanges = Object.entries(testResult.environment).filter(
            ([key, value]) => scriptEnv[key] !== value
          )
          console.log('[Tests] Environment changes to persist:', envChanges)

          if (envChanges.length > 0) {
            // Get fresh environment state
            const envStore = useEnvironmentsStore.getState()
            const currentEnv = envStore.activeEnvironment

            if (currentEnv) {
              for (const [key, value] of envChanges) {
                try {
                  const existingVar = currentEnv.variables?.find(v => v.key === key)
                  if (existingVar) {
                    // Update existing variable - set the current value
                    const newValues = [...existingVar.values]
                    newValues[existingVar.selected_value_index] = value
                    await envStore.updateVariable(currentEnv.id, existingVar.id, { values: newValues })
                    toast.success(`Updated env: ${key}`)
                    console.log(`[Tests] Updated environment variable "${key}" = "${value}"`)
                  } else {
                    // Create new variable
                    await envStore.createVariable(currentEnv.id, {
                      key,
                      values: [value],
                      selected_value_index: 0,
                      enabled: true,
                      is_secret: false,
                      description: 'Set by test script',
                    })
                    toast.success(`Created env: ${key}`)
                    console.log(`[Tests] Created environment variable "${key}" = "${value}"`)
                  }
                } catch (varErr) {
                  console.error(`[Tests] Failed to save variable "${key}":`, varErr)
                  toast.error(`Failed to save ${key}: ${varErr}`)
                }
              }
            } else {
              console.warn('[Tests] No active environment to save variables to')
              toast.error('No active environment selected')
            }
          }
        } catch (err) {
          console.error('Test script failed:', err)
          toast.error(`Test script failed: ${err}`)
        }
      }
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

  // Check if this request can be saved (belongs to a collection)
  const canSave = !!(request?.id && request?.collection)
  const isDirty = tab?.isDirty || false

  const handleSave = async () => {
    if (!request?.id || !request?.collection) return

    try {
      await updateRequest(request.collection, request.id, {
        method,
        url,
        headers,
        params,
        body,
        auth,
        pre_request_script: preRequestScript,
        test_script: testScript,
      })

      // Update tab data with saved values and clear dirty state
      updateTab(tabId, {
        isDirty: false,
        draft: undefined,
        data: {
          ...request,
          method,
          url,
          headers,
          params,
          body,
          auth,
          pre_request_script: preRequestScript,
          test_script: testScript,
        } as Request,
      })
      toast.success('Request saved')
    } catch (err) {
      toast.error('Failed to save request')
    }
  }

  const handleSaveAs = () => {
    setShowSaveAsDialog(true)
  }

  const handleSavedToCollection = (collectionId: string, requestId: string) => {
    // Update the tab to reference the new request in the collection
    updateTab(tabId, {
      isDirty: false,
      draft: undefined,
      data: {
        id: requestId,
        collection: collectionId,
        name: `${method} ${url.split('?')[0].split('/').pop() || '/'}`,
        method,
        url,
        headers,
        params,
        body,
        auth,
        pre_request_script: preRequestScript,
        test_script: testScript,
      } as Request,
    })
  }

  // Build request config for code snippet
  const codeSnippetConfig = {
    method,
    url,
    headers,
    params,
    body,
    auth,
  }

  return (
    <div className="h-full flex">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* URL Bar */}
        <div className="p-4 border-b border-border">
          <UrlBar
            method={method}
            url={url}
            isLoading={isLoading}
            isDirty={isDirty}
            canSave={canSave}
            showCodeSnippet={showCodeSnippet}
            onMethodChange={setMethod}
            onUrlChange={handleUrlChange}
            onSend={handleSend}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onToggleCodeSnippet={() => setShowCodeSnippet(!showCodeSnippet)}
          />
        </div>

        {/* Request/Response split */}
        <PanelGroup direction="vertical" className="flex-1">
          {/* Request panel */}
          <Panel defaultSize={50} minSize={20}>
            <RequestTabs
              tabId={tabId}
              headers={headers}
              params={params}
              body={body}
              auth={auth}
              preRequestScript={preRequestScript}
              testScript={testScript}
              url={url}
              onHeadersChange={setHeaders}
              onParamsChange={setParams}
              onBodyChange={setBody}
              onAuthChange={setAuth}
              onPreRequestScriptChange={setPreRequestScript}
              onTestScriptChange={setTestScript}
            />
          </Panel>

          <PanelResizeHandle className="h-1 bg-border hover:bg-primary-500 transition-colors" />

          {/* Response panel */}
          <Panel defaultSize={50} minSize={20}>
            <ResponseViewer response={response} error={error} isLoading={isLoading} />
          </Panel>
        </PanelGroup>
      </div>

      {/* Code Snippet Panel */}
      <CodeSnippetPanel
        config={codeSnippetConfig}
        isOpen={showCodeSnippet}
        onClose={() => setShowCodeSnippet(false)}
      />

      {/* Save As Dialog */}
      <SaveToCollectionDialog
        isOpen={showSaveAsDialog}
        onClose={() => setShowSaveAsDialog(false)}
        requestData={{
          name: request?.name || `${method} ${url.split('?')[0].split('/').pop() || '/'}`,
          method,
          url,
          headers,
          params,
          body,
          auth,
        }}
        onSaved={handleSavedToCollection}
      />
    </div>
  )
}
