import { useEffect } from 'react'
import { Server, Wifi, WifiOff, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useMcpStore } from '@/stores/mcp.store'
import { useTabsStore } from '@/stores/tabs.store'

interface McpListProps {
  searchQuery?: string
}

export function McpList({ searchQuery = '' }: McpListProps) {
  const { servers, fetchServers } = useMcpStore()
  const { openTab } = useTabsStore()

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  // Filter servers by search query
  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleServerClick = (server: typeof servers[0]) => {
    // Open MCP tab with specific server selected
    // Use server.id as the data id so each server gets its own tab
    openTab({
      type: 'mcp',
      title: server.name,
      data: { id: server.id, serverId: server.id },
    })
  }

  const handleAddServer = () => {
    openTab({
      type: 'mcp',
      title: 'MCP Servers',
      data: null,
    })
  }

  if (servers.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
          <Server className="w-6 h-6 text-text-secondary" />
        </div>
        <p className="text-sm text-text-secondary mb-3">No MCP servers configured</p>
        <button
          onClick={handleAddServer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Server
        </button>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-1">
      {filteredServers.map(server => (
        <button
          key={server.id}
          onClick={() => handleServerClick(server)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
        >
          {/* Status indicator */}
          <div className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            server.is_connected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/5 text-text-secondary'
          )}>
            {server.is_connected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
          </div>

          {/* Server info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">
                {server.name}
              </span>
              {server.is_connected && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary truncate">
              {server.transport_type === 'stdio' && server.command
                ? server.command.split('/').pop()
                : server.url || server.transport_type
              }
            </p>
          </div>
        </button>
      ))}

      {/* Add server button at bottom */}
      <button
        onClick={handleAddServer}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all border border-transparent hover:border-primary-500/20"
      >
        <Plus className="w-4 h-4" />
        Add MCP Server
      </button>
    </div>
  )
}
