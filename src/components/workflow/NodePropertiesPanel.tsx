import { useState, useEffect, useMemo } from 'react'
import { X, Trash2, ChevronDown } from 'lucide-react'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { useCollectionsStore } from '../../stores/collections.store'
import { useEnvironmentsStore } from '../../stores/environments.store'
import { WorkflowNode, Request, Folder } from '../../types'
import { VariablePopover } from '../common/VariablePopover'

// Highlight environment variables in a string with click support
function highlightEnvVars(
  text: string,
  keyIndex: { current: number },
  baseClass: string,
  onVariableClick?: (varName: string, rect: DOMRect) => void
): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  const envVarPattern = /(\{\{([^}]+)\}\})/g
  let lastIndex = 0
  let match

  while ((match = envVarPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      tokens.push(
        <span key={keyIndex.current++} className={baseClass}>
          {text.slice(lastIndex, match.index)}
        </span>
      )
    }
    // Add the env variable with orange highlighting - clickable
    const varName = match[2].trim()
    tokens.push(
      <span
        key={keyIndex.current++}
        className="text-orange-400 bg-orange-400/10 rounded px-0.5 cursor-pointer hover:bg-orange-400/20 pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation()
          if (onVariableClick) {
            const rect = (e.target as HTMLElement).getBoundingClientRect()
            onVariableClick(varName, rect)
          }
        }}
      >
        {match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    tokens.push(
      <span key={keyIndex.current++} className={baseClass}>
        {text.slice(lastIndex)}
      </span>
    )
  }

  return tokens
}

// JSON syntax highlighter with environment variable support
function highlightJson(
  json: string,
  onVariableClick?: (varName: string, rect: DOMRect) => void
): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  const keyIndex = { current: 0 }

  const addToken = (text: string, className: string) => {
    // Check if text contains env variables
    if (text.includes('{{')) {
      tokens.push(...highlightEnvVars(text, keyIndex, className, onVariableClick))
    } else {
      tokens.push(
        <span key={keyIndex.current++} className={className}>
          {text}
        </span>
      )
    }
  }

  while (i < json.length) {
    const char = json[i]

    // Whitespace
    if (/\s/.test(char)) {
      let whitespace = ''
      while (i < json.length && /\s/.test(json[i])) {
        whitespace += json[i]
        i++
      }
      tokens.push(<span key={keyIndex.current++}>{whitespace}</span>)
      continue
    }

    // String (key or value)
    if (char === '"') {
      let str = '"'
      i++
      while (i < json.length && json[i] !== '"') {
        if (json[i] === '\\' && i + 1 < json.length) {
          str += json[i] + json[i + 1]
          i += 2
        } else {
          str += json[i]
          i++
        }
      }
      str += '"'
      i++

      // Check if this is a key (followed by :)
      let j = i
      while (j < json.length && /\s/.test(json[j])) j++
      if (json[j] === ':') {
        addToken(str, 'text-cyan-400') // Key
      } else {
        addToken(str, 'text-green-400') // String value
      }
      continue
    }

    // Number
    if (/[-\d]/.test(char)) {
      let num = ''
      while (i < json.length && /[-\d.eE+]/.test(json[i])) {
        num += json[i]
        i++
      }
      addToken(num, 'text-orange-400')
      continue
    }

    // Boolean or null
    if (json.slice(i, i + 4) === 'true') {
      addToken('true', 'text-purple-400')
      i += 4
      continue
    }
    if (json.slice(i, i + 5) === 'false') {
      addToken('false', 'text-purple-400')
      i += 5
      continue
    }
    if (json.slice(i, i + 4) === 'null') {
      addToken('null', 'text-red-400')
      i += 4
      continue
    }

    // Punctuation
    if (char === ':') {
      addToken(': ', 'text-muted-foreground')
      i++
      // Skip space after colon if present
      if (json[i] === ' ') i++
      continue
    }
    if (char === ',' || char === '{' || char === '}' || char === '[' || char === ']') {
      addToken(char, 'text-muted-foreground')
      i++
      continue
    }

    // Any other character
    tokens.push(<span key={keyIndex.current++}>{char}</span>)
    i++
  }

  return tokens
}

// Simple helper to highlight variables in non-JSON text (for URL display)
function HighlightedText({ text, className }: { text: string; className?: string }) {
  const { resolveVariables } = useEnvironmentsStore()

  if (!text) return null

  // Split by variable pattern and render with highlighting
  const parts = text.split(/(\{\{[^}]+\}\})/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.match(/^\{\{[^}]+\}\}$/)) {
          const varName = part.slice(2, -2)
          const resolved = resolveVariables(part)
          const isResolved = resolved !== part

          return (
            <span
              key={i}
              className={`px-1 rounded ${
                isResolved
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-red-500/30 text-red-300'
              }`}
              title={isResolved ? `${varName} = ${resolved}` : `${varName} (not found)`}
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

interface Props {
  node: WorkflowNode
  onClose: () => void
}

// Helper to flatten requests from collection folders
function getAllRequests(folders: Folder[], requests: Request[]): Request[] {
  let allRequests = [...requests]
  for (const folder of folders) {
    allRequests = [...allRequests, ...folder.requests]
    if (folder.subfolders) {
      allRequests = [...allRequests, ...getAllRequests(folder.subfolders, [])]
    }
  }
  return allRequests
}

export function NodePropertiesPanel({ node, onClose }: Props) {
  const { updateNodeData, deleteNode } = useWorkflowsStore()
  const { collections, fetchCollections } = useCollectionsStore()
  const [data, setData] = useState<Record<string, any>>({})
  const [popoverVariable, setPopoverVariable] = useState<string | null>(null)
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null)

  const handleVariableClick = (varName: string, rect: DOMRect) => {
    setPopoverVariable(varName)
    setPopoverRect(rect)
  }

  const handleClosePopover = () => {
    setPopoverVariable(null)
    setPopoverRect(null)
  }

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  useEffect(() => {
    setData(node.data || {})
  }, [node.id])

  // Get all requests for the selected collection
  const selectedCollectionRequests = useMemo(() => {
    if (!data.collection_id) return []
    const collection = collections.find(c => c.id === data.collection_id)
    if (!collection) return []
    return getAllRequests(collection.folders || [], collection.requests || [])
  }, [data.collection_id, collections])

  // Get the selected request details
  const selectedRequest = useMemo(() => {
    if (!data.request_id) return null
    return selectedCollectionRequests.find(r => r.id === data.request_id) || null
  }, [data.request_id, selectedCollectionRequests])

  const handleChange = (key: string, value: any) => {
    const newData = { ...data, [key]: value }
    setData(newData)
    updateNodeData(node.id, newData)
  }

  const handleDelete = () => {
    if (node.type === 'start' || node.type === 'end') {
      alert('Cannot delete start or end nodes')
      return
    }
    if (confirm('Delete this node?')) {
      deleteNode(node.id)
      onClose()
    }
  }

  const renderProperties = () => {
    switch (node.type) {
      case 'start':
        return (
          <p className="text-sm text-muted-foreground">
            Workflow entry point. Connect this to your first action.
          </p>
        )

      case 'end':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define what result this workflow should return.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Result Variable</label>
              <input
                type="text"
                value={data.result_variable || ''}
                onChange={(e) => handleChange('result_variable', e.target.value)}
                placeholder="categories"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The variable to output as the workflow result
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Result Label</label>
              <input
                type="text"
                value={data.result_label || ''}
                onChange={(e) => handleChange('result_label', e.target.value)}
                placeholder="Categories List"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name for the result (optional)
              </p>
            </div>

            {/* Available variables hint */}
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs font-medium mb-2 text-cyan-400">Available Variables</p>
              <p className="text-xs text-muted-foreground">
                Use variables set by previous nodes:
              </p>
              <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-2 rounded mt-1">
{`categories    → from Set Variable
output.body   → from HTTP response
token         → from Set Variable`}
              </pre>
            </div>
          </div>
        )

      case 'request':
        // Check if this is an AI-generated inline request (has URL but no collection_id)
        const isInlineRequest = !!data.url && !data.collection_id

        return (
          <div className="space-y-4">
            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Node Name</label>
              <input
                type="text"
                value={data.node_name || ''}
                onChange={(e) => handleChange('node_name', e.target.value)}
                placeholder="e.g., Authorization, Get Categories"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            {/* Show inline request details if AI-generated */}
            {isInlineRequest && (
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-xs text-blue-400 mb-2 font-medium">AI-Generated Request</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    data.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                    data.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                    data.method === 'PUT' ? 'bg-orange-500/20 text-orange-400' :
                    data.method === 'PATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                    data.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {data.method || 'GET'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  <HighlightedText text={data.url} />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can link to a collection request below to override this configuration.
                </p>
              </div>
            )}

            {/* Inline Method/URL editing for AI-generated requests */}
            {isInlineRequest && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Method</label>
                  <select
                    value={data.method || 'GET'}
                    onChange={(e) => handleChange('method', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="text"
                    value={data.url || ''}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="{{baseUrl}}/api/endpoint"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
                  />
                </div>
              </>
            )}

            {/* Collection Selection */}
            <div className={isInlineRequest ? 'border-t border-border pt-4' : ''}>
              {isInlineRequest && (
                <p className="text-xs text-muted-foreground mb-2">
                  Or link to a collection request:
                </p>
              )}
              <label className="block text-sm font-medium mb-1">Collection</label>
              <div className="relative">
                <select
                  value={data.collection_id || ''}
                  onChange={(e) => {
                    const newCollectionId = e.target.value
                    // Update both at once to avoid stale state issues
                    const newData = {
                      ...data,
                      collection_id: newCollectionId,
                      request_id: '',
                      request_name: '',
                      // Only clear method/url if selecting a collection
                      method: newCollectionId ? '' : data.method,
                      url: newCollectionId ? '' : data.url
                    }
                    setData(newData)
                    updateNodeData(node.id, newData)
                  }}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm appearance-none"
                >
                  <option value="">Select a collection...</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Request Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Request</label>
              <div className="relative">
                <select
                  value={data.request_id || ''}
                  onChange={(e) => {
                    const reqId = e.target.value
                    const req = selectedCollectionRequests.find(r => r.id === reqId)
                    // Extract body from request
                    let requestBody = ''
                    if (req?.body?.raw) {
                      requestBody = req.body.raw
                    } else if (req?.body?.formdata) {
                      // Convert formdata to JSON-like representation
                      const formObj: Record<string, string> = {}
                      req.body.formdata.forEach((item: any) => {
                        if (item.enabled !== false) {
                          formObj[item.key] = item.value
                        }
                      })
                      requestBody = JSON.stringify(formObj, null, 2)
                    }
                    // Extract headers from request
                    const requestHeaders = (req?.headers || [])
                      .filter((h: any) => h.enabled !== false)
                      .map((h: any) => ({ key: h.key, value: h.value }))

                    // Update all at once to avoid stale state issues
                    const newData = {
                      ...data,
                      request_id: reqId,
                      request_name: req?.name || '',
                      method: req?.method || '',
                      url: req?.url || '',
                      custom_body: requestBody,
                      custom_headers: requestHeaders.length > 0 ? requestHeaders : data.custom_headers || []
                    }
                    setData(newData)
                    updateNodeData(node.id, newData)
                  }}
                  disabled={!data.collection_id}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm appearance-none disabled:opacity-50"
                >
                  <option value="">Select a request...</option>
                  {selectedCollectionRequests.map(request => (
                    <option key={request.id} value={request.id}>
                      {request.method} - {request.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {!data.collection_id && !isInlineRequest && (
                <p className="text-xs text-muted-foreground mt-1">
                  Select a collection first
                </p>
              )}
            </div>

            {/* Show selected request details */}
            {selectedRequest && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedRequest.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                    selectedRequest.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                    selectedRequest.method === 'PUT' ? 'bg-orange-500/20 text-orange-400' :
                    selectedRequest.method === 'PATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                    selectedRequest.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedRequest.method}
                  </span>
                  <span className="text-sm font-medium">{selectedRequest.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <HighlightedText text={selectedRequest.url} />
                </div>
              </div>
            )}

            {/* Custom Body for POST/PUT/PATCH */}
            {['POST', 'PUT', 'PATCH'].includes(data.method || '') && (
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-1">Request Body</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use {"{{variable}}"} for dynamic values. Click on variables to edit them.
                </p>
                <div className="relative">
                  <textarea
                    value={data.custom_body || ''}
                    onChange={(e) => handleChange('custom_body', e.target.value)}
                    placeholder='{"email": "{{email}}", "password": "{{password}}"}'
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono json-editor-textarea"
                    rows={6}
                  />
                  {/* Syntax highlighted overlay - variables are clickable */}
                  {data.custom_body && (
                    <pre className="absolute inset-0 px-3 py-2 bg-transparent border border-transparent rounded-md text-sm font-mono overflow-hidden pointer-events-none whitespace-pre-wrap break-all">
                      {highlightJson(data.custom_body, handleVariableClick)}
                    </pre>
                  )}
                  {/* Format button */}
                  {data.custom_body && (
                    <button
                      onClick={() => {
                        try {
                          const formatted = JSON.stringify(JSON.parse(data.custom_body || ''), null, 2)
                          handleChange('custom_body', formatted)
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded z-20"
                    >
                      Format
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Custom Headers Override */}
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-1">Custom Headers</label>
              <p className="text-xs text-muted-foreground mb-2">
                Override or add headers. Use {"{{variable}}"} for dynamic values.
              </p>
              <div className="space-y-2">
                {(data.custom_headers || []).map((header: { key: string; value: string }, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => {
                        const headers = [...(data.custom_headers || [])]
                        headers[idx] = { ...headers[idx], key: e.target.value }
                        handleChange('custom_headers', headers)
                      }}
                      placeholder="Authorization"
                      className="flex-1 px-2 py-1.5 border border-input rounded-md bg-background text-sm"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => {
                        const headers = [...(data.custom_headers || [])]
                        headers[idx] = { ...headers[idx], value: e.target.value }
                        handleChange('custom_headers', headers)
                      }}
                      placeholder="Bearer {{token}}"
                      className="flex-1 px-2 py-1.5 border border-input rounded-md bg-background text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        const headers = (data.custom_headers || []).filter((_: any, i: number) => i !== idx)
                        handleChange('custom_headers', headers)
                      }}
                      className="px-2 text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const headers = [...(data.custom_headers || []), { key: '', value: '' }]
                    handleChange('custom_headers', headers)
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  + Add Header
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-1">Output Variable</label>
              <input
                type="text"
                value={data.output_variable || ''}
                onChange={(e) => handleChange('output_variable', e.target.value)}
                placeholder="resp"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Store response in this variable for later use
              </p>
              {data.output_variable && (
                <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Access response data:</p>
                  <pre className="text-xs font-mono text-cyan-400">
{`{{${data.output_variable}.status_code}}
{{${data.output_variable}.body.access}}
{{${data.output_variable}.body.data}}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )

      case 'condition':
        return (
          <div className="space-y-4">
            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Node Name</label>
              <input
                type="text"
                value={data.node_name || ''}
                onChange={(e) => handleChange('node_name', e.target.value)}
                placeholder="e.g., Check Status"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Left Value</label>
              <input
                type="text"
                value={data.left || ''}
                onChange={(e) => handleChange('left', e.target.value)}
                placeholder="{{response.status_code}}"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select
                value={data.condition_type || 'equals'}
                onChange={(e) => handleChange('condition_type', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Right Value</label>
              <input
                type="text"
                value={data.right || ''}
                onChange={(e) => handleChange('right', e.target.value)}
                placeholder="200"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>
          </div>
        )

      case 'delay':
        return (
          <div className="space-y-4">
            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Node Name</label>
              <input
                type="text"
                value={data.node_name || ''}
                onChange={(e) => handleChange('node_name', e.target.value)}
                placeholder="e.g., Wait for API"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Delay (milliseconds)</label>
              <input
                type="number"
                value={data.delay_ms || 1000}
                onChange={(e) => handleChange('delay_ms', parseInt(e.target.value))}
                min={0}
                max={60000}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(data.delay_ms || 1000) >= 1000
                  ? `${(data.delay_ms || 1000) / 1000} seconds`
                  : `${data.delay_ms || 1000} milliseconds`}
              </p>
            </div>
          </div>
        )

      case 'variable':
        return (
          <div className="space-y-4">
            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Node Name</label>
              <input
                type="text"
                value={data.node_name || ''}
                onChange={(e) => handleChange('node_name', e.target.value)}
                placeholder="e.g., Extract Token"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Variable Name</label>
              <input
                type="text"
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="token"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input
                type="text"
                value={data.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="{{resp.body.access}}"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{{variable}}"} syntax to reference other variables
              </p>
            </div>

            {/* Helpful hints */}
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs font-medium mb-2 text-cyan-400">Response Structure</p>
              <p className="text-xs text-muted-foreground mb-1">
                HTTP responses are stored as:
              </p>
              <pre className="text-xs font-mono text-muted-foreground bg-black/20 p-2 rounded">
{`{{resp.status_code}}  → 200
{{resp.body.access}}  → token
{{resp.body.data}}    → nested data
{{resp.headers}}      → headers obj`}
              </pre>
            </div>
          </div>
        )

      default:
        return <p className="text-sm text-muted-foreground">Unknown node type</p>
    }
  }

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium capitalize">{node.type} Node</h3>
          <div className="flex items-center gap-1">
            {node.type !== 'start' && node.type !== 'end' && (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
                title="Delete node"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {renderProperties()}

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Node ID: <code className="bg-muted px-1 rounded">{node.id}</code>
          </p>
        </div>
      </div>

      {/* Variable popover */}
      {popoverVariable && (
        <VariablePopover
          variableName={popoverVariable}
          anchorRect={popoverRect}
          onClose={handleClosePopover}
        />
      )}
    </>
  )
}
