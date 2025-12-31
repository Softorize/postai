import { useState } from 'react'
import { Wrench, FileText, MessageSquare, Play, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { useMcpStore } from '../../stores/mcp.store'
import { cn } from '../../lib/utils'

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
    resources,
    prompts,
    executeTool,
    readResource,
    getPrompt,
    isLoading
  } = useMcpStore()

  const [activeTab, setActiveTab] = useState<'tools' | 'resources' | 'prompts'>('tools')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [toolArgs, setToolArgs] = useState<Record<string, Record<string, string>>>({})
  const [results, setResults] = useState<Record<string, unknown>>({})

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
    try {
      const args = toolArgs[toolName] || {}
      const result = await executeTool(activeServerId, toolName, args)
      setResults({ ...results, [`tool:${toolName}`]: result })
    } catch (err: any) {
      setResults({ ...results, [`tool:${toolName}`]: { error: err.message } })
    }
  }

  const handleReadResource = async (uri: string) => {
    if (!activeServerId) return
    try {
      const result = await readResource(activeServerId, uri)
      setResults({ ...results, [`resource:${uri}`]: result })
    } catch (err: any) {
      setResults({ ...results, [`resource:${uri}`]: { error: err.message } })
    }
  }

  const handleGetPrompt = async (promptName: string) => {
    if (!activeServerId) return
    try {
      const args = toolArgs[`prompt:${promptName}`] || {}
      const result = await getPrompt(activeServerId, promptName, args)
      setResults({ ...results, [`prompt:${promptName}`]: result })
    } catch (err: any) {
      setResults({ ...results, [`prompt:${promptName}`]: { error: err.message } })
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
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('tools')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2',
            activeTab === 'tools'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Wrench className="h-3.5 w-3.5" />
          Tools ({tools.length})
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2',
            activeTab === 'resources'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Resources ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2',
            activeTab === 'prompts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Prompts ({prompts.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'tools' && (
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
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" />
                        Execute
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
        )}

        {activeTab === 'resources' && (
          <div className="space-y-2">
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No resources available
              </p>
            ) : (
              resources.map(resource => (
                <div key={resource.uri} className="border border-border rounded-md">
                  <button
                    onClick={() => toggleExpand(`resource:${resource.uri}`)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                  >
                    {expandedItems.has(`resource:${resource.uri}`) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-sm truncate">{resource.name}</span>
                  </button>

                  {expandedItems.has(`resource:${resource.uri}`) && (
                    <div className="px-3 pb-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mt-2">
                        {resource.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        URI: {resource.uri}
                      </p>
                      {resource.mimeType && (
                        <p className="text-xs text-muted-foreground">
                          Type: {resource.mimeType}
                        </p>
                      )}

                      <button
                        onClick={() => handleReadResource(resource.uri)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 mt-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        <FileText className="h-3 w-3" />
                        Read
                      </button>

                      {/* Result */}
                      {results[`resource:${resource.uri}`] !== undefined && (
                        <div className="mt-3 p-2 bg-muted rounded text-xs">
                          <p className="font-medium mb-1">Contents:</p>
                          <pre className="whitespace-pre-wrap overflow-x-auto max-h-60">
                            {formatResult(results[`resource:${resource.uri}`])}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-2">
            {prompts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No prompts available
              </p>
            ) : (
              prompts.map(prompt => (
                <div key={prompt.name} className="border border-border rounded-md">
                  <button
                    onClick={() => toggleExpand(`prompt:${prompt.name}`)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                  >
                    {expandedItems.has(`prompt:${prompt.name}`) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <MessageSquare className="h-4 w-4 text-purple-400" />
                    <span className="font-medium text-sm">{prompt.name}</span>
                  </button>

                  {expandedItems.has(`prompt:${prompt.name}`) && (
                    <div className="px-3 pb-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        {prompt.description || 'No description'}
                      </p>

                      {/* Arguments */}
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Arguments:</p>
                          {prompt.arguments.map((arg: any) => (
                            <div key={arg.name}>
                              <label className="text-xs text-muted-foreground">
                                {arg.name}
                                {arg.required && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </label>
                              <input
                                type="text"
                                value={toolArgs[`prompt:${prompt.name}`]?.[arg.name] || ''}
                                onChange={(e) => setToolArgs({
                                  ...toolArgs,
                                  [`prompt:${prompt.name}`]: {
                                    ...toolArgs[`prompt:${prompt.name}`],
                                    [arg.name]: e.target.value
                                  }
                                })}
                                placeholder={arg.description || arg.name}
                                className="w-full px-2 py-1 text-xs border border-input rounded bg-background"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleGetPrompt(prompt.name)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Get Prompt
                      </button>

                      {/* Result */}
                      {results[`prompt:${prompt.name}`] !== undefined && (
                        <div className="mt-3 p-2 bg-muted rounded text-xs">
                          <p className="font-medium mb-1">Messages:</p>
                          <pre className="whitespace-pre-wrap overflow-x-auto max-h-60">
                            {formatResult(results[`prompt:${prompt.name}`])}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
