import { useState } from 'react'
import { clsx } from 'clsx'
import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Response } from '@/types'

type TabId = 'body' | 'headers' | 'cookies'

interface ResponseViewerProps {
  response: Response | null
  error: string | null
  isLoading: boolean
}

export function ResponseViewer({ response, error, isLoading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('body')
  const [copied, setCopied] = useState(false)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
    { id: 'cookies', label: 'Cookies' },
  ]

  const handleCopy = async () => {
    if (response?.body) {
      await navigator.clipboard.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400 bg-green-400/10'
    if (status >= 300 && status < 400) return 'text-yellow-400 bg-yellow-400/10'
    return 'text-red-400 bg-red-400/10'
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p>Sending request...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-semibold text-red-400 mb-2">Request Failed</h3>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
        <p className="text-sm">Send a request to see the response</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Response meta bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-sidebar">
        {/* Status */}
        <div
          className={clsx(
            'px-2 py-1 rounded text-sm font-semibold',
            getStatusColor(response.status_code)
          )}
        >
          {response.status_code} {response.status_text}
        </div>

        {/* Time */}
        <div className="text-sm text-text-secondary">
          <span className="text-text-primary">{formatTime(response.time)}</span>
        </div>

        {/* Size */}
        <div className="text-sm text-text-secondary">
          <span className="text-text-primary">{formatSize(response.size)}</span>
        </div>

        <div className="flex-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

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
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && <ResponseBody body={response.body} />}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'cookies' && <ResponseCookies cookies={response.cookies} />}
      </div>
    </div>
  )
}

// JSON syntax highlighter
function highlightJson(json: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  let keyIndex = 0

  const addToken = (text: string, className: string) => {
    tokens.push(
      <span key={keyIndex++} className={className}>
        {text}
      </span>
    )
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
      tokens.push(<span key={keyIndex++}>{whitespace}</span>)
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
      addToken(': ', 'text-text-secondary')
      i++
      // Skip space after colon if present
      if (json[i] === ' ') i++
      continue
    }
    if (char === ',' || char === '{' || char === '}' || char === '[' || char === ']') {
      addToken(char, 'text-text-secondary')
      i++
      continue
    }

    // Any other character
    tokens.push(<span key={keyIndex++}>{char}</span>)
    i++
  }

  return tokens
}

function ResponseBody({ body }: { body: string }) {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty')

  // Try to parse and format JSON
  let formattedBody = body
  let isJson = false

  try {
    const parsed = JSON.parse(body)
    formattedBody = JSON.stringify(parsed, null, 2)
    isJson = true
  } catch {
    // Not JSON, keep as is
  }

  return (
    <div className="h-full flex flex-col">
      {/* View mode toggle */}
      {isJson && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <button
            onClick={() => setViewMode('pretty')}
            className={clsx(
              'px-2 py-1 text-xs rounded',
              viewMode === 'pretty'
                ? 'bg-primary-500 text-white'
                : 'text-text-secondary hover:bg-white/5'
            )}
          >
            Pretty
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={clsx(
              'px-2 py-1 text-xs rounded',
              viewMode === 'raw'
                ? 'bg-primary-500 text-white'
                : 'text-text-secondary hover:bg-white/5'
            )}
          >
            Raw
          </button>
        </div>
      )}

      {/* Body content */}
      <pre className="flex-1 overflow-auto p-4 text-sm font-mono whitespace-pre-wrap break-all">
        {viewMode === 'pretty' && isJson ? highlightJson(formattedBody) : body}
      </pre>
    </div>
  )
}

function ResponseHeaders({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-secondary border-b border-border">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(headers).map(([key, value]) => (
            <tr key={key} className="border-b border-border/50">
              <td className="py-2 pr-4 font-mono text-primary-400">{key}</td>
              <td className="py-2 font-mono break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResponseCookies({
  cookies,
}: {
  cookies?: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires?: string
    httpOnly: boolean
    secure: boolean
  }>
}) {
  if (!cookies || cookies.length === 0) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        No cookies in response
      </div>
    )
  }

  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-secondary border-b border-border">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Value</th>
            <th className="pb-2 font-medium">Domain</th>
            <th className="pb-2 font-medium">Path</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie, index) => (
            <tr key={index} className="border-b border-border/50">
              <td className="py-2 pr-4 font-mono text-primary-400">{cookie.name}</td>
              <td className="py-2 pr-4 font-mono">{cookie.value}</td>
              <td className="py-2 pr-4">{cookie.domain}</td>
              <td className="py-2">{cookie.path}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
