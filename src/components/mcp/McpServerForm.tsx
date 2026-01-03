import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useMcpStore } from '../../stores/mcp.store'
import { McpTransportType } from '../../types'

interface Props {
  serverId?: string | null
  onClose: () => void
}

export function McpServerForm({ serverId, onClose }: Props) {
  const { servers, createServer, updateServer, isLoading, error, setError } = useMcpStore()

  const existingServer = serverId ? servers.find(s => s.id === serverId) : null

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    transport_type: 'stdio' as McpTransportType,
    command: '',
    args: [''],
    url: '',
    headers: [{ key: '', value: '' }],
    env_vars: [{ key: '', value: '' }]
  })

  useEffect(() => {
    if (existingServer) {
      setFormData({
        name: existingServer.name,
        description: existingServer.description,
        transport_type: existingServer.transport_type,
        command: existingServer.command || '',
        args: existingServer.args.length > 0 ? existingServer.args : [''],
        url: existingServer.url || '',
        headers: Object.entries(existingServer.headers).length > 0
          ? Object.entries(existingServer.headers).map(([key, value]) => ({ key, value: value as string }))
          : [{ key: '', value: '' }],
        env_vars: Object.entries(existingServer.env_vars).length > 0
          ? Object.entries(existingServer.env_vars).map(([key, value]) => ({ key, value: value as string }))
          : [{ key: '', value: '' }]
      })
    }
  }, [existingServer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      name: formData.name,
      description: formData.description,
      transport_type: formData.transport_type,
      command: formData.transport_type === 'stdio' ? formData.command : '',
      args: formData.transport_type === 'stdio'
        ? formData.args.filter(a => a.trim())
        : [],
      url: ['sse', 'http'].includes(formData.transport_type) ? formData.url : '',
      headers: formData.headers
        .filter(h => h.key.trim())
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
      env_vars: formData.env_vars
        .filter(e => e.key.trim())
        .reduce((acc, e) => ({ ...acc, [e.key]: e.value }), {})
    }

    try {
      if (serverId) {
        await updateServer(serverId, data)
      } else {
        await createServer(data)
      }
      onClose()
    } catch (err) {
      // Error handled in store
    }
  }

  const addArg = () => {
    setFormData({ ...formData, args: [...formData.args, ''] })
  }

  const removeArg = (index: number) => {
    setFormData({
      ...formData,
      args: formData.args.filter((_, i) => i !== index)
    })
  }

  const addHeader = () => {
    setFormData({
      ...formData,
      headers: [...formData.headers, { key: '', value: '' }]
    })
  }

  const removeHeader = (index: number) => {
    setFormData({
      ...formData,
      headers: formData.headers.filter((_, i) => i !== index)
    })
  }

  const addEnvVar = () => {
    setFormData({
      ...formData,
      env_vars: [...formData.env_vars, { key: '', value: '' }]
    })
  }

  const removeEnvVar = (index: number) => {
    setFormData({
      ...formData,
      env_vars: formData.env_vars.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {serverId ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                placeholder="My MCP Server"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                placeholder="Optional description"
              />
            </div>

            {/* Transport Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Transport Type</label>
              <select
                value={formData.transport_type}
                onChange={(e) => setFormData({
                  ...formData,
                  transport_type: e.target.value as McpTransportType
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
              >
                <option value="stdio">stdio (Command)</option>
                <option value="sse">SSE (Server-Sent Events)</option>
                <option value="http">HTTP</option>
              </select>
            </div>

            {/* stdio options */}
            {formData.transport_type === 'stdio' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Command</label>
                  <input
                    type="text"
                    value={formData.command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                    placeholder="npx @modelcontextprotocol/server-filesystem"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Arguments</label>
                    <button
                      type="button"
                      onClick={addArg}
                      className="p-1 hover:bg-muted rounded text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {formData.args.map((arg, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={arg}
                        onChange={(e) => {
                          const newArgs = [...formData.args]
                          newArgs[index] = e.target.value
                          setFormData({ ...formData, args: newArgs })
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                        placeholder="Argument"
                      />
                      {formData.args.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArg(index)}
                          className="p-2 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* SSE/HTTP options */}
            {['sse', 'http'].includes(formData.transport_type) && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                    placeholder="http://localhost:3000/mcp"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Headers</label>
                    <button
                      type="button"
                      onClick={addHeader}
                      className="p-1 hover:bg-muted rounded text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {formData.headers.map((header, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => {
                          const newHeaders = [...formData.headers]
                          newHeaders[index].key = e.target.value
                          setFormData({ ...formData, headers: newHeaders })
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                        placeholder="Header name"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => {
                          const newHeaders = [...formData.headers]
                          newHeaders[index].value = e.target.value
                          setFormData({ ...formData, headers: newHeaders })
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-sidebar text-sm"
                        placeholder="Header value"
                      />
                      {formData.headers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHeader(index)}
                          className="p-2 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Environment Variables (for stdio) */}
            {formData.transport_type === 'stdio' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Environment Variables</label>
                  <button
                    type="button"
                    onClick={addEnvVar}
                    className="p-1 hover:bg-muted rounded text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {formData.env_vars.map((envVar, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={envVar.key}
                      onChange={(e) => {
                        const newEnvVars = [...formData.env_vars]
                        newEnvVars[index].key = e.target.value
                        setFormData({ ...formData, env_vars: newEnvVars })
                      }}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                      placeholder="Variable name"
                    />
                    <input
                      type="text"
                      value={envVar.value}
                      onChange={(e) => {
                        const newEnvVars = [...formData.env_vars]
                        newEnvVars[index].value = e.target.value
                        setFormData({ ...formData, env_vars: newEnvVars })
                      }}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                      placeholder="Value"
                    />
                    {formData.env_vars.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEnvVar(index)}
                        className="p-2 hover:bg-destructive/20 rounded text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
            >
              {serverId ? 'Update' : 'Add'} Server
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
