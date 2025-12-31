import React, { useState } from 'react'
import { clsx } from 'clsx'
import { Terminal, ChevronDown, ChevronUp, Trash2, X, ChevronRight } from 'lucide-react'
import { useConsoleStore, ConsoleEntry } from '@/stores/console.store'

// Details component for expanded entry
function ConsoleEntryDetails({ entry }: { entry: ConsoleEntry }) {
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request')

  return (
    <div className="border-t border-border">
      {/* Tabs */}
      <div className="flex border-b border-border bg-sidebar">
        <button
          onClick={() => setActiveTab('request')}
          className={clsx(
            'px-4 py-1.5 text-xs font-medium',
            activeTab === 'request' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-text-secondary'
          )}
        >
          Request
        </button>
        <button
          onClick={() => setActiveTab('response')}
          className={clsx(
            'px-4 py-1.5 text-xs font-medium',
            activeTab === 'response' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-text-secondary'
          )}
        >
          Response
        </button>
      </div>

      <div className="p-3 max-h-48 overflow-auto">
        {activeTab === 'request' && (
          <div className="space-y-3">
            {/* Request Headers */}
            {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-secondary mb-1">Headers</h4>
                <div className="bg-sidebar rounded p-2 text-xs font-mono">
                  {Object.entries(entry.requestHeaders).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-cyan-400">{key}:</span>
                      <span className="text-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Request Body */}
            {entry.requestBody && (
              <div>
                <h4 className="text-xs font-semibold text-text-secondary mb-1">Body</h4>
                <pre className="bg-sidebar rounded p-2 text-xs font-mono whitespace-pre-wrap break-all text-green-400">
                  {entry.requestBody}
                </pre>
              </div>
            )}
            {!entry.requestHeaders && !entry.requestBody && (
              <p className="text-xs text-text-secondary">No request details available</p>
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-3">
            {entry.error ? (
              <div className="text-xs text-red-400">{entry.error}</div>
            ) : (
              <>
                {/* Response Headers */}
                {entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-1">Headers</h4>
                    <div className="bg-sidebar rounded p-2 text-xs font-mono">
                      {Object.entries(entry.responseHeaders).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-cyan-400">{key}:</span>
                          <span className="text-text-primary">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Response Body */}
                {entry.responseBody && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary mb-1">Body</h4>
                    <pre className="bg-sidebar rounded p-2 text-xs font-mono whitespace-pre-wrap break-all text-text-primary max-h-32 overflow-auto">
                      {entry.responseBody.length > 2000
                        ? entry.responseBody.substring(0, 2000) + '...'
                        : entry.responseBody}
                    </pre>
                  </div>
                )}
                {!entry.responseHeaders && !entry.responseBody && (
                  <p className="text-xs text-text-secondary">No response yet</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConsolePanel() {
  const { entries, isVisible, clearEntries, toggleVisibility, setVisibility } = useConsoleStore()
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

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
    if (!status) return 'text-text-secondary'
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-method-get'
      case 'POST': return 'text-method-post'
      case 'PUT': return 'text-method-put'
      case 'PATCH': return 'text-method-patch'
      case 'DELETE': return 'text-method-delete'
      default: return 'text-text-secondary'
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
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="border-t border-border bg-sidebar flex flex-col" style={{ height: '200px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium">Console</span>
          <span className="text-xs text-text-secondary">
            {entries.length} request{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearEntries}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
            title="Clear console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleVisibility}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
            title="Minimize console"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVisibility(false)}
            className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
            title="Close console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-sm">
            No requests yet. Send a request to see it here.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-panel border-b border-border">
              <tr className="text-left text-text-secondary">
                <th className="px-3 py-1.5 font-medium w-20">Time</th>
                <th className="px-3 py-1.5 font-medium w-16">Method</th>
                <th className="px-3 py-1.5 font-medium">URL</th>
                <th className="px-3 py-1.5 font-medium w-20 text-right">Status</th>
                <th className="px-3 py-1.5 font-medium w-16 text-right">Time</th>
                <th className="px-3 py-1.5 font-medium w-16 text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    className={clsx(
                      'cursor-pointer hover:bg-white/5 border-b border-border/50',
                      expandedEntry === entry.id && 'bg-primary-500/10'
                    )}
                  >
                    <td className="px-3 py-1.5 text-text-secondary font-mono flex items-center gap-1">
                      <ChevronRight className={clsx(
                        'w-3 h-3 transition-transform',
                        expandedEntry === entry.id && 'rotate-90'
                      )} />
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className={clsx('px-3 py-1.5 font-semibold', getMethodColor(entry.method))}>
                      {entry.method}
                    </td>
                    <td className="px-3 py-1.5 font-mono truncate max-w-[300px]" title={entry.url}>
                      {entry.url}
                    </td>
                    <td className={clsx('px-3 py-1.5 text-right font-semibold', getStatusColor(entry.status))}>
                      {entry.error ? 'Error' : entry.status || 'Pending...'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">
                      {formatTime(entry.time)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">
                      {formatSize(entry.size)}
                    </td>
                  </tr>
                  {/* Expanded details row */}
                  {expandedEntry === entry.id && (
                    <tr className="bg-panel border-b border-border">
                      <td colSpan={6} className="p-0">
                        <ConsoleEntryDetails entry={entry} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
