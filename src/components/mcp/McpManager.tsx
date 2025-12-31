import { useState, useEffect } from 'react'
import {
  Server, Plus, Wifi, WifiOff, Terminal, Globe,
  Trash2, Settings, Wrench, FileText, MessageSquare,
  Play, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import { useMcpStore } from '@/stores/mcp.store'
import { McpServerForm } from './McpServerForm'
import { McpToolBrowser } from './McpToolBrowser'
import toast from 'react-hot-toast'

type Tab = 'servers' | 'tools' | 'resources' | 'prompts'

export function McpManager() {
  const {
    servers,
    activeServerId,
    tools,
    resources,
    prompts,
    isLoading,
    error,
    fetchServers,
    deleteServer,
    setActiveServer,
    connectServer,
    disconnectServer,
    fetchTools,
    fetchResources,
    fetchPrompts,
  } = useMcpStore()

  const activeServer = servers.find(s => s.id === activeServerId)

  const [activeTab, setActiveTab] = useState<Tab>('servers')
  const [showServerForm, setShowServerForm] = useState(false)
  const [editingServerId, setEditingServerId] = useState<string | null>(null)

  useEffect(() => {
    fetchServers()
  }, [])

  useEffect(() => {
    if (activeServerId && activeServer?.is_connected) {
      fetchTools(activeServerId)
      fetchResources(activeServerId)
      fetchPrompts(activeServerId)
    }
  }, [activeServerId, activeServer?.is_connected])

  const handleConnect = async (id: string) => {
    try {
      await connectServer(id)
      toast.success('Connected to server')
    } catch (err) {
      toast.error('Failed to connect')
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectServer(id)
      toast.success('Disconnected from server')
    } catch (err) {
      toast.error('Failed to disconnect')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete server "${name}"?`)) {
      await deleteServer(id)
      toast.success('Server deleted')
    }
  }

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'stdio':
        return <Terminal className="w-4 h-4" />
      case 'sse':
      case 'http':
        return <Globe className="w-4 h-4" />
      default:
        return <Server className="w-4 h-4" />
    }
  }

  const tabs = [
    { id: 'servers' as Tab, label: 'Servers', icon: Server, count: servers.length },
    { id: 'tools' as Tab, label: 'Tools', icon: Wrench, count: tools.length },
    { id: 'resources' as Tab, label: 'Resources', icon: FileText, count: resources.length },
    { id: 'prompts' as Tab, label: 'Prompts', icon: MessageSquare, count: prompts.length },
  ]

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-semibold">MCP Servers</h1>
        </div>
        <button
          onClick={() => {
            setEditingServerId(null)
            setShowServerForm(true)
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-sidebar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {activeTab === 'servers' && (
          <ServersTab
            servers={servers}
            activeServerId={activeServerId}
            isLoading={isLoading}
            onSelect={setActiveServer}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onEdit={(id) => {
              setEditingServerId(id)
              setShowServerForm(true)
            }}
            onDelete={handleDelete}
            getTransportIcon={getTransportIcon}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsTab
            activeServer={activeServer}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'resources' && (
          <ResourcesTab
            resources={resources}
            activeServer={activeServer}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptsTab
            prompts={prompts}
            activeServer={activeServer}
          />
        )}
      </div>

      {/* Server Form Modal */}
      {showServerForm && (
        <McpServerForm
          serverId={editingServerId}
          onClose={() => {
            setShowServerForm(false)
            setEditingServerId(null)
          }}
        />
      )}
    </div>
  )
}

function ServersTab({
  servers,
  activeServerId,
  isLoading,
  onSelect,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  getTransportIcon,
}: {
  servers: any[]
  activeServerId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string, name: string) => void
  getTransportIcon: (type: string) => React.ReactNode
}) {
  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No MCP servers configured</p>
        <p className="text-sm mt-2">Add a server to connect to MCP-enabled tools</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {servers.map((server) => (
        <div
          key={server.id}
          className={clsx(
            'border border-border rounded-lg overflow-hidden bg-sidebar',
            activeServerId === server.id && 'ring-2 ring-primary-500'
          )}
        >
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5"
            onClick={() => onSelect(server.id)}
          >
            {getTransportIcon(server.transport_type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{server.name}</span>
                {server.is_connected ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <WifiOff className="w-3 h-3" />
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {server.transport_type === 'stdio' && `Command: ${server.command}`}
                {server.transport_type !== 'stdio' && `URL: ${server.url}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {server.is_connected ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDisconnect(server.id)
                  }}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConnect(server.id)
                  }}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded flex items-center gap-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Connect
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(server.id)
                }}
                className="p-1.5 hover:bg-white/10 rounded"
              >
                <Settings className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(server.id, server.name)
                }}
                className="p-1.5 hover:bg-red-500/20 rounded"
              >
                <Trash2 className="w-4 h-4 text-text-secondary hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ToolsTab({
  activeServer,
  isLoading,
}: {
  activeServer: any
  isLoading: boolean
}) {
  if (!activeServer?.is_connected) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Connect to a server to browse tools</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary-400" />
        <p className="mt-2 text-text-secondary">Loading tools...</p>
      </div>
    )
  }

  return <McpToolBrowser />
}

function ResourcesTab({
  resources,
  activeServer,
}: {
  resources: any[]
  activeServer: any
}) {
  if (!activeServer?.is_connected) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Connect to a server to browse resources</p>
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No resources available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {resources.map((resource, idx) => (
        <div
          key={idx}
          className="p-4 border border-border rounded-lg bg-sidebar hover:bg-white/5"
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-primary-400" />
            <span className="font-medium">{resource.name}</span>
          </div>
          {resource.description && (
            <p className="text-sm text-text-secondary">{resource.description}</p>
          )}
          <p className="text-xs text-text-secondary mt-2 font-mono">
            URI: {resource.uri}
          </p>
        </div>
      ))}
    </div>
  )
}

function PromptsTab({
  prompts,
  activeServer,
}: {
  prompts: any[]
  activeServer: any
}) {
  if (!activeServer?.is_connected) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Connect to a server to browse prompts</p>
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No prompts available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt, idx) => (
        <div
          key={idx}
          className="p-4 border border-border rounded-lg bg-sidebar hover:bg-white/5"
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-primary-400" />
            <span className="font-medium">{prompt.name}</span>
          </div>
          {prompt.description && (
            <p className="text-sm text-text-secondary">{prompt.description}</p>
          )}
          {prompt.arguments && prompt.arguments.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-text-secondary">Arguments: </span>
              {prompt.arguments.map((arg: any, i: number) => (
                <span key={i} className="text-xs bg-panel px-1.5 py-0.5 rounded mr-1">
                  {arg.name}
                  {arg.required && <span className="text-red-400">*</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
