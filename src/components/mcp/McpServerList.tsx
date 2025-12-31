import { useState, useEffect } from 'react'
import {
  Plus, Server, Trash2, Wifi, WifiOff, RefreshCw,
  Terminal, Globe, ChevronDown, ChevronRight, Settings
} from 'lucide-react'
import { useMcpStore } from '../../stores/mcp.store'
import { cn } from '../../lib/utils'
import { McpServerForm } from './McpServerForm'

export function McpServerList() {
  const {
    servers,
    activeServerId,
    fetchServers,
    deleteServer,
    setActiveServer,
    connectServer,
    disconnectServer,
    isLoading
  } = useMcpStore()

  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState<string | null>(null)
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchServers()
  }, [])

  const handleConnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await connectServer(id)
  }

  const handleDisconnect = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await disconnectServer(id)
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedServers)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedServers(newExpanded)
  }

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'stdio':
        return <Terminal className="h-3 w-3" />
      case 'sse':
      case 'http':
        return <Globe className="h-3 w-3" />
      default:
        return <Server className="h-3 w-3" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">MCP Servers</h3>
        <button
          onClick={() => setShowForm(true)}
          className="p-1 hover:bg-muted rounded"
          title="Add server"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No MCP servers configured</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-primary hover:underline"
            >
              Add your first server
            </button>
          </div>
        ) : (
          <div className="py-1">
            {servers.map(server => (
              <div key={server.id}>
                <div
                  onClick={() => {
                    setActiveServer(server.id)
                    toggleExpand(server.id)
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer',
                    activeServerId === server.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(server.id)
                    }}
                    className="p-0.5"
                  >
                    {expandedServers.has(server.id) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {getTransportIcon(server.transport_type)}

                  <span className="flex-1 text-sm truncate">{server.name}</span>

                  <div className="flex items-center gap-1">
                    {server.is_connected ? (
                      <>
                        <Wifi className="h-3 w-3 text-green-400" />
                        <button
                          onClick={(e) => handleDisconnect(server.id, e)}
                          className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                          title="Disconnect"
                        >
                          <WifiOff className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleConnect(server.id, e)}
                        disabled={isLoading}
                        className="p-1 hover:bg-green-500/20 rounded text-muted-foreground hover:text-green-400"
                        title="Connect"
                      >
                        <RefreshCw className={cn(
                          'h-3 w-3',
                          isLoading && 'animate-spin'
                        )} />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingServer(server.id)
                        setShowForm(true)
                      }}
                      className="p-1 hover:bg-muted rounded"
                      title="Settings"
                    >
                      <Settings className="h-3 w-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete server "${server.name}"?`)) {
                          deleteServer(server.id)
                        }
                      }}
                      className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded info */}
                {expandedServers.has(server.id) && (
                  <div className="pl-8 pr-3 py-1 text-xs text-muted-foreground border-l-2 border-border ml-4">
                    <p>Type: {server.transport_type}</p>
                    {server.command && <p>Command: {server.command}</p>}
                    {server.url && <p>URL: {server.url}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server form dialog */}
      {showForm && (
        <McpServerForm
          serverId={editingServer}
          onClose={() => {
            setShowForm(false)
            setEditingServer(null)
          }}
        />
      )}
    </div>
  )
}
