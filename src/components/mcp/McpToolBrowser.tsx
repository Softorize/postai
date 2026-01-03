import { useState } from 'react'
import { Wrench, Play, ChevronDown, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { useMcpStore } from '../../stores/mcp.store'

// Helper to safely render results as string
const formatResult = (result: unknown): string => {
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

export function McpToolBrowser() {
  const {
    activeServerId,
    servers,
    tools,
    executeTool
  } = useMcpStore()

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [toolArgs, setToolArgs] = useState<Record<string, Record<string, string>>>({})
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [executingTools, setExecutingTools] = useState<Set<string>>(new Set())

  const activeServer = servers.find(s => s.id === activeServerId)

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleExecuteTool = async (toolName: string) => {
    if (!activeServerId) return

    // Set this tool as executing
    setExecutingTools(prev => new Set(prev).add(toolName))

    try {
      const args = toolArgs[toolName] || {}
      const result = await executeTool(activeServerId, toolName, args)
      setResults(prev => ({ ...prev, [`tool:${toolName}`]: result }))
    } catch (err: any) {
      setResults(prev => ({ ...prev, [`tool:${toolName}`]: { error: err.message } }))
    } finally {
      // Remove from executing set
      setExecutingTools(prev => {
        const next = new Set(prev)
        next.delete(toolName)
        return next
      })
    }
  }

  if (!activeServerId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select an MCP server to browse capabilities</p>
      </div>
    )
  }

  if (!activeServer?.is_connected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Server not connected</p>
        <p className="text-xs">Connect to the server to browse its capabilities</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tools Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tools available
              </p>
            ) : (
              tools.map(tool => (
                <div key={tool.name} className="border border-border rounded-md">
                  <button
                    onClick={() => toggleExpand(`tool:${tool.name}`)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                  >
                    {expandedItems.has(`tool:${tool.name}`) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Wrench className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-sm">{tool.name}</span>
                  </button>

                  {expandedItems.has(`tool:${tool.name}`) && (
                    <div className="px-3 pb-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        {tool.description || 'No description'}
                      </p>

                      {/* Input schema */}
                      {tool.inputSchema && Object.keys((tool.inputSchema as { properties?: Record<string, unknown> }).properties || {}).length > 0 && (
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Arguments:</p>
                          {Object.entries((tool.inputSchema as { properties?: Record<string, { description?: string }> }).properties || {}).map(([key, schema]) => (
                            <div key={key}>
                              <label className="text-xs text-muted-foreground">
                                {key}
                                {((tool.inputSchema as { required?: string[] }).required || []).includes(key) && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={toolArgs[tool.name]?.[key] || ''}
                                onChange={(e) => setToolArgs({
                                  ...toolArgs,
                                  [tool.name]: {
                                    ...toolArgs[tool.name],
                                    [key]: e.target.value
                                  }
                                })}
                                placeholder={schema.description || key}
                                className="w-full px-2 py-1 text-xs border border-input rounded bg-background"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleExecuteTool(tool.name)}
                        disabled={executingTools.has(tool.name)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        {executingTools.has(tool.name) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {executingTools.has(tool.name) ? 'Executing...' : 'Execute'}
                      </button>

                      {/* Result */}
                      {results[`tool:${tool.name}`] !== undefined && (
                        <div className="mt-3 p-2 bg-muted rounded text-xs">
                          <p className="font-medium mb-1">Result:</p>
                          <pre className="whitespace-pre-wrap overflow-x-auto">
                            {formatResult(results[`tool:${tool.name}`])}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  )
}
