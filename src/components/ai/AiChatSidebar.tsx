import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Send, Trash2, Plus, Bot, User, Settings, Sparkles, Loader2, GitBranch } from 'lucide-react'
import { useAiStore } from '../../stores/ai.store'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { useCollectionsStore } from '../../stores/collections.store'
import { useEnvironmentsStore } from '../../stores/environments.store'
import { useTabsStore } from '../../stores/tabs.store'
import { cn } from '../../lib/utils'
import { Folder, Request } from '../../types'

// Helper to flatten requests from collection folders
function getAllRequests(folders: Folder[], requests: Request[]): Request[] {
  let allRequests = [...requests]
  for (const folder of folders) {
    allRequests = [...allRequests, ...folder.requests]
    if (folder.subfolders) {
      allRequests = [...allRequests, ...getAllRequests(folder.subfolders, [])]
    }
  }
  return allRequests
}

// Patterns to detect workflow generation intent
const WORKFLOW_PATTERNS = [
  /create\s+(a\s+)?workflow/i,
  /build\s+(a\s+)?workflow/i,
  /generate\s+(a\s+)?workflow/i,
  /make\s+(a\s+)?workflow/i,
  /design\s+(a\s+)?workflow/i,
]

function isWorkflowGenerationIntent(message: string): boolean {
  return WORKFLOW_PATTERNS.some(pattern => pattern.test(message))
}

export function AiChatSidebar() {
  const {
    providers,
    activeProviderId,
    conversations,
    activeConversationId,
    isSidebarOpen,
    isLoading,
    error,
    fetchProviders,
    fetchConversations,
    setActiveProvider,
    createConversation,
    deleteConversation,
    setActiveConversation,
    sendMessage,
    clearConversationMessages,
    toggleSidebar,
    setError,
    generateWorkflow
  } = useAiStore()

  const { createWorkflow, fetchWorkflows } = useWorkflowsStore()
  const { collections } = useCollectionsStore()
  const { activeEnvironment } = useEnvironmentsStore()
  const { openTab } = useTabsStore()

  // Build context from collections and environments for workflow generation
  const workflowContext = useMemo(() => {
    const allRequests: Array<{ name: string; method: string; url: string; collectionName: string }> = []

    for (const collection of collections) {
      for (const request of collection.requests || []) {
        allRequests.push({
          name: request.name,
          method: request.method,
          url: request.url,
          collectionName: collection.name
        })
      }
      const folderRequests = getAllRequests(collection.folders || [], [])
      for (const request of folderRequests) {
        allRequests.push({
          name: request.name,
          method: request.method,
          url: request.url,
          collectionName: collection.name
        })
      }
    }

    const envVariables: Record<string, string> = {}
    if (activeEnvironment?.variables) {
      for (const variable of activeEnvironment.variables) {
        if (variable.enabled !== false) {
          // Get the currently selected value from multi-value array
          const values = variable.values || []
          const selectedIndex = variable.selected_value_index || 0
          const currentValue = values[selectedIndex] || ''
          envVariables[variable.key] = currentValue
        }
      }
    }

    return {
      availableRequests: allRequests,
      environmentVariables: envVariables,
      activeEnvironmentName: activeEnvironment?.name || null
    }
  }, [collections, activeEnvironment])

  const [input, setInput] = useState('')
  const [showProviderSelector, setShowProviderSelector] = useState(false)
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false)
  const [workflowStatus, setWorkflowStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchProviders()
    fetchConversations()
  }, [])

  // Auto-select first active provider if none selected
  useEffect(() => {
    if (!activeProviderId && providers.length > 0) {
      const firstActiveProvider = providers.find(p => p.is_active)
      if (firstActiveProvider) {
        setActiveProvider(firstActiveProvider.id)
      }
    }
  }, [providers, activeProviderId, setActiveProvider])

  useEffect(() => {
    scrollToBottom()
  }, [activeConversationId, conversations])

  useEffect(() => {
    if (isSidebarOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSidebarOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const activeProvider = providers.find(p => p.id === activeProviderId)

  const handleSend = async () => {
    if (!input.trim() || isLoading || isGeneratingWorkflow) return

    const message = input.trim()
    setInput('')

    // Check if user wants to generate a workflow
    if (isWorkflowGenerationIntent(message)) {
      await handleWorkflowGeneration(message)
      return
    }

    try {
      await sendMessage(message)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleWorkflowGeneration = async (description: string) => {
    setIsGeneratingWorkflow(true)
    setWorkflowStatus(null)

    try {
      // Generate workflow structure from AI with collection/environment context
      const workflowData = await generateWorkflow(description, workflowContext)

      // Create the workflow in the backend
      const newWorkflow = await createWorkflow({
        name: workflowData.name as string,
        description: workflowData.description as string,
        nodes: workflowData.nodes as any[],
        edges: workflowData.edges as any[],
        variables: workflowData.variables as Record<string, unknown> || {}
      })

      // Refresh workflows list
      await fetchWorkflows()

      // Open the workflow in a new tab
      openTab({
        type: 'workflow',
        title: newWorkflow.name,
        data: newWorkflow
      })

      setWorkflowStatus({
        type: 'success',
        message: `Created workflow "${newWorkflow.name}" with ${newWorkflow.nodes?.length || 0} nodes`
      })
    } catch (err: any) {
      setWorkflowStatus({
        type: 'error',
        message: err.message || 'Failed to generate workflow'
      })
    } finally {
      setIsGeneratingWorkflow(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    createConversation('New Chat')
  }

  if (!isSidebarOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-panel border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="p-2 hover:bg-muted rounded-md"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-muted rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Provider selector */}
      <div className="p-3 border-b border-border bg-panel">
        <button
          onClick={() => setShowProviderSelector(!showProviderSelector)}
          className="w-full flex items-center justify-between p-2 bg-sidebar rounded-md hover:bg-sidebar/80"
        >
          <span className="text-sm">
            {activeProvider ? activeProvider.name : 'Select AI Provider'}
          </span>
          <Settings className="h-4 w-4" />
        </button>

        {showProviderSelector && (
          <div className="mt-2 space-y-1">
            {providers.length === 0 ? (
              <p className="text-sm text-text-secondary p-2">
                No providers configured. Add one in Settings.
              </p>
            ) : (
              providers.filter(p => p.is_active).map(provider => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setActiveProvider(provider.id)
                    setShowProviderSelector(false)
                  }}
                  className={cn(
                    'w-full text-left p-2 text-sm rounded-md',
                    activeProviderId === provider.id
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-sidebar'
                  )}
                >
                  {provider.name}
                  <span className="text-xs ml-2 opacity-70">
                    ({provider.provider_type})
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Conversations list (collapsible) */}
      {conversations.length > 0 && (
        <div className="p-2 border-b border-border max-h-32 overflow-y-auto bg-panel">
          <div className="space-y-1">
            {conversations.slice(0, 5).map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={cn(
                  'w-full text-left p-2 text-sm rounded-md flex items-center justify-between group',
                  activeConversationId === conv.id
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'hover:bg-sidebar'
                )}
              >
                <span className="truncate flex-1">
                  {conv.title || 'Untitled Chat'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-panel">
        {!activeProviderId ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Select an AI provider to start chatting</p>
          </div>
        ) : !activeConversation || !activeConversation.messages || activeConversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Start a conversation with AI</p>
            <p className="text-xs mt-2">
              Ask about APIs, debug requests, or generate code
            </p>
          </div>
        ) : (
          <>
            {activeConversation?.messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-sidebar'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg p-3 max-w-[85%] text-sm',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-sidebar'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-sidebar rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {isGeneratingWorkflow && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating workflow...
              </div>
            </div>
          </div>
        )}

        {workflowStatus && (
          <div className="flex gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              workflowStatus.type === 'success' ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              <GitBranch className={cn(
                "h-4 w-4",
                workflowStatus.type === 'success' ? "text-green-400" : "text-red-400"
              )} />
            </div>
            <div className={cn(
              "rounded-lg p-3 text-sm",
              workflowStatus.type === 'success'
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            )}>
              <p>{workflowStatus.message}</p>
              {workflowStatus.type === 'success' && (
                <p className="text-xs mt-1 text-green-400/70">
                  Workflow opened in new tab
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-sidebar">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeProviderId
                ? 'Ask about APIs, debug requests...'
                : 'Select a provider first'
            }
            disabled={!activeProviderId || isLoading || isGeneratingWorkflow}
            className="flex-1 resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activeProviderId || isLoading || isGeneratingWorkflow}
            className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {activeConversation && activeConversation.messages && activeConversation.messages.length > 0 && (
          <button
            onClick={() => clearConversationMessages(activeConversation.id)}
            className="mt-2 text-xs text-text-secondary hover:text-red-400 flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear messages
          </button>
        )}
      </div>
    </div>
  )
}
