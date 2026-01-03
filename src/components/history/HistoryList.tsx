import { useEffect } from 'react'
import { Clock, Trash2, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { useHistoryStore, HistoryEntry } from '@/stores/history.store'
import { useTabsStore } from '@/stores/tabs.store'

interface HistoryListProps {
  searchQuery?: string
}

export function HistoryList({ searchQuery = '' }: HistoryListProps) {
  const { entries, isLoading, fetchHistory, getHistoryDetail, deleteEntry, clearHistory } = useHistoryStore()
  const { openTab } = useTabsStore()

  useEffect(() => {
    fetchHistory()
  }, [])

  const filteredEntries = entries.filter(entry =>
    entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.method.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenEntry = async (entry: HistoryEntry) => {
    // Fetch full details including body and headers
    const detail = await getHistoryDetail(entry.id)
    if (!detail) return

    // Parse headers into KeyValuePair format
    const headers = Object.entries(detail.headers || {}).map(([key, value]) => ({
      key,
      value,
      enabled: true,
    }))

    // Parse URL params
    const urlObj = new URL(detail.url)
    const params = Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
      key,
      value,
      enabled: true,
    }))
    if (params.length === 0) {
      params.push({ key: '', value: '', enabled: true })
    }

    // Prepare body
    const body = detail.body ? {
      mode: 'raw' as const,
      raw: detail.body,
      language: 'json' as const,
    } : {
      mode: 'raw' as const,
      raw: '',
      language: 'json' as const,
    }

    // Open as a new request tab with the full history data
    openTab({
      type: 'request',
      title: `${entry.method} ${urlObj.pathname}`,
      data: {
        id: `history-${entry.id}`,
        method: detail.method,
        url: detail.url,
        headers,
        params,
        body,
      } as never,
    })
  }

  const getStatusColor = (status: number | null) => {
    if (!status) return 'text-text-secondary'
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400 && status < 500) return 'text-orange-400'
    return 'text-red-400'
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-green-400',
      POST: 'text-yellow-400',
      PUT: 'text-blue-400',
      PATCH: 'text-purple-400',
      DELETE: 'text-red-400',
    }
    return colors[method] || 'text-text-secondary'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading && entries.length === 0) {
    return (
      <div className="p-4 text-center text-text-secondary text-sm">
        Loading history...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <button
          onClick={() => fetchHistory()}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-white/5 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        {entries.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all history?')) {
                clearHistory()
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* History list */}
      <div className="flex-1 overflow-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {searchQuery ? 'No matching requests' : 'No request history yet'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="group px-3 py-2 hover:bg-white/5 cursor-pointer"
                onClick={() => handleOpenEntry(entry)}
              >
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs font-semibold w-12', getMethodColor(entry.method))}>
                    {entry.method}
                  </span>
                  <span className={clsx('text-xs', getStatusColor(entry.status_code))}>
                    {entry.status_code || 'ERR'}
                  </span>
                  <span className="text-xs text-text-secondary ml-auto">
                    {entry.response_time}ms
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteEntry(entry.id)
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-text-secondary truncate mt-1">
                  {entry.url}
                </div>
                <div className="text-xs text-text-secondary/50 mt-0.5">
                  {formatTime(entry.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
