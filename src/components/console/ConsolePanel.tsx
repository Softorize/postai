import React, { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  ChevronRight,
  Search,
  Copy,
  Check,
  Clock,
  Wifi,
  AlertCircle
} from 'lucide-react'
import { useConsoleStore, ConsoleEntry } from '@/stores/console.store'

// Generate cURL command from entry
function generateCurl(entry: ConsoleEntry): string {
  let curl = `curl -X ${entry.method} '${entry.url}'`

  if (entry.requestHeaders) {
    Object.entries(entry.requestHeaders).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`
    })
  }

  if (entry.requestBody) {
    curl += ` \\\n  -d '${entry.requestBody.replace(/'/g, "\\'")}'`
  }

  return curl
}

// Details component for expanded entry
function ConsoleEntryDetails({ entry }: { entry: ConsoleEntry }) {
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'network'>('headers')
  const [copiedCurl, setCopiedCurl] = useState(false)

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl(entry))
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2000)
  }

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'network', label: 'Network' },
  ] as const

  return (
    <div className="bg-[#1a1a1a] border-t border-border">
      {/* Tabs and Actions */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-2 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-primary-400 border-b-2 border-primary-400 bg-white/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopyCurl}
          className="flex items-center gap-1.5 px-3 py-1.5 mr-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded transition-colors"
        >
          {copiedCurl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedCurl ? 'Copied!' : 'Copy as cURL'}
        </button>
      </div>

      <div className="p-4 max-h-64 overflow-auto">
        {activeTab === 'headers' && (
          <div className="space-y-4">
            {/* Request Headers */}
            <div>
              <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <span className="text-green-400">Request Headers</span>
                <span className="text-text-secondary">
                  ({Object.keys(entry.requestHeaders || {}).length})
                </span>
              </h4>
              {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 ? (
                <div className="bg-black/30 rounded-lg p-3 text-xs font-mono space-y-1">
                  {Object.entries(entry.requestHeaders).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-cyan-400 min-w-[180px]">{key}:</span>
                      <span className="text-text-primary break-all">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No request headers</p>
              )}
            </div>

            {/* Response Headers */}
            <div>
              <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
                <span className="text-blue-400">Response Headers</span>
                <span className="text-text-secondary">
                  ({Object.keys(entry.responseHeaders || {}).length})
                </span>
              </h4>
              {entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0 ? (
                <div className="bg-black/30 rounded-lg p-3 text-xs font-mono space-y-1">
                  {Object.entries(entry.responseHeaders).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-cyan-400 min-w-[180px]">{key}:</span>
                      <span className="text-text-primary break-all">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No response headers yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-4">
            {/* Request Body */}
            <div>
              <h4 className="text-xs font-semibold text-green-400 mb-2">Request Body</h4>
              {entry.requestBody ? (
                <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all text-text-primary overflow-auto max-h-32">
                  {entry.requestBody}
                </pre>
              ) : (
                <p className="text-xs text-text-secondary italic">No request body</p>
              )}
            </div>

            {/* Response Body */}
            <div>
              <h4 className="text-xs font-semibold text-blue-400 mb-2">Response Body</h4>
              {entry.error ? (
                <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3">{entry.error}</div>
              ) : entry.responseBody ? (
                <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all text-text-primary overflow-auto max-h-48">
                  {entry.responseBody.length > 5000
                    ? entry.responseBody.substring(0, 5000) + '\n\n... (truncated)'
                    : entry.responseBody}
                </pre>
              ) : (
                <p className="text-xs text-text-secondary italic">No response body yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-black/30 rounded-lg p-3">
                <span className="text-text-secondary">Status</span>
                <p className={clsx(
                  'font-semibold mt-1',
                  entry.status && entry.status >= 200 && entry.status < 300 ? 'text-green-400' :
                  entry.status && entry.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                )}>
                  {entry.status || 'Pending'} {entry.statusText || ''}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <span className="text-text-secondary">Response Time</span>
                <p className="font-semibold mt-1 text-text-primary">
                  {entry.time ? `${entry.time}ms` : '-'}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <span className="text-text-secondary">Response Size</span>
                <p className="font-semibold mt-1 text-text-primary">
                  {entry.size ? (
                    entry.size < 1024 ? `${entry.size} B` :
                    entry.size < 1024 * 1024 ? `${(entry.size / 1024).toFixed(2)} KB` :
                    `${(entry.size / (1024 * 1024)).toFixed(2)} MB`
                  ) : '-'}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <span className="text-text-secondary">Protocol</span>
                <p className="font-semibold mt-1 text-text-primary">
                  {entry.protocol || (entry.url?.startsWith('https') ? 'HTTPS' : 'HTTP')}
                </p>
              </div>
            </div>
            {entry.remoteAddress && (
              <div className="bg-black/30 rounded-lg p-3 text-xs">
                <span className="text-text-secondary">Remote Address</span>
                <p className="font-mono mt-1 text-text-primary">{entry.remoteAddress}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConsolePanel() {
  const {
    entries,
    isVisible,
    searchQuery,
    clearEntries,
    toggleVisibility,
    setVisibility,
    setSearchQuery
  } = useConsoleStore()
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries
    const query = searchQuery.toLowerCase()
    return entries.filter(entry =>
      entry.url.toLowerCase().includes(query) ||
      entry.method.toLowerCase().includes(query) ||
      entry.name?.toLowerCase().includes(query) ||
      entry.status?.toString().includes(query)
    )
  }, [entries, searchQuery])

  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-sidebar border border-border rounded-lg shadow-lg text-sm hover:bg-white/5 transition-colors z-50"
      >
        <Terminal className="w-4 h-4 text-primary-400" />
        Console
        {entries.length > 0 && (
          <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
            {entries.length}
          </span>
        )}
        <ChevronUp className="w-4 h-4" />
      </button>
    )
  }

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-gray-500'
    if (status >= 200 && status < 300) return 'bg-green-500'
    if (status >= 300 && status < 400) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusTextColor = (status?: number) => {
    if (!status) return 'text-text-secondary'
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMethodBgColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/20 text-green-400'
      case 'POST': return 'bg-yellow-500/20 text-yellow-400'
      case 'PUT': return 'bg-blue-500/20 text-blue-400'
      case 'PATCH': return 'bg-purple-500/20 text-purple-400'
      case 'DELETE': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatTime = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatTimestamp = (date: Date) => {
    const time = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${time}.${ms}`
  }

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[#252526]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium">Console</span>
          </div>
          <span className="text-xs text-text-secondary px-2 py-0.5 bg-white/5 rounded">
            {filteredEntries.length} request{filteredEntries.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs mx-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter requests..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/30 border border-border rounded focus:outline-none focus:border-primary-500 placeholder:text-text-secondary"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearEntries}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors"
            title="Clear console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleVisibility}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors"
            title="Minimize console"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVisibility(false)}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors"
            title="Close console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-auto">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Terminal className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No matching requests' : 'No requests yet. Send a request to see it here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                <div
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                    expandedEntry === entry.id ? 'bg-primary-500/10' : 'hover:bg-white/5'
                  )}
                >
                  {/* Expand indicator */}
                  <ChevronRight className={clsx(
                    'w-3.5 h-3.5 text-text-secondary transition-transform flex-shrink-0',
                    expandedEntry === entry.id && 'rotate-90'
                  )} />

                  {/* Status indicator */}
                  <div className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    entry.error ? 'bg-red-500' : getStatusColor(entry.status)
                  )} />

                  {/* Timestamp */}
                  <span className="text-xs text-text-secondary font-mono w-24 flex-shrink-0">
                    {formatTimestamp(entry.timestamp)}
                  </span>

                  {/* Method badge */}
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 w-16 text-center',
                    getMethodBgColor(entry.method)
                  )}>
                    {entry.method}
                  </span>

                  {/* URL/Name */}
                  <div className="flex-1 min-w-0">
                    {entry.name && (
                      <span className="text-xs text-text-primary font-medium mr-2">
                        {entry.name}
                      </span>
                    )}
                    <span className="text-xs text-text-secondary font-mono break-all">
                      {entry.url}
                    </span>
                  </div>

                  {/* Status */}
                  <span className={clsx(
                    'text-xs font-semibold flex-shrink-0 w-16 text-right',
                    entry.error ? 'text-red-400' : getStatusTextColor(entry.status)
                  )}>
                    {entry.error ? (
                      <span className="flex items-center justify-end gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Error
                      </span>
                    ) : entry.status || (
                      <span className="text-text-secondary">...</span>
                    )}
                  </span>

                  {/* Time */}
                  <span className="text-xs text-text-secondary flex-shrink-0 w-16 text-right flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(entry.time)}
                  </span>

                  {/* Size */}
                  <span className="text-xs text-text-secondary flex-shrink-0 w-16 text-right flex items-center justify-end gap-1">
                    <Wifi className="w-3 h-3" />
                    {formatSize(entry.size)}
                  </span>
                </div>

                {/* Expanded details */}
                {expandedEntry === entry.id && (
                  <ConsoleEntryDetails entry={entry} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
