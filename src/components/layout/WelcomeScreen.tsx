import { useState } from 'react'
import { Plus, Upload, Sparkles, GitBranch, Server } from 'lucide-react'
import { useTabsStore } from '@/stores/tabs.store'
import { ImportDialog } from '../collections/ImportDialog'

export function WelcomeScreen() {
  const { openTab } = useTabsStore()
  const [showImportDialog, setShowImportDialog] = useState(false)

  const handleNewRequest = () => {
    openTab({
      type: 'request',
      title: 'Untitled Request',
      data: null,
    })
  }

  const handleNewWorkflow = () => {
    openTab({
      type: 'workflow',
      title: 'New Workflow',
      data: null,
    })
  }

  const actions = [
    {
      icon: Plus,
      title: 'New Request',
      description: 'Create a new API request',
      onClick: handleNewRequest,
    },
    {
      icon: Upload,
      title: 'Import Collection',
      description: 'Import from Postman',
      onClick: () => setShowImportDialog(true),
    },
    {
      icon: GitBranch,
      title: 'New Workflow',
      description: 'Create an automation workflow',
      onClick: handleNewWorkflow,
    },
    {
      icon: Server,
      title: 'Connect MCP',
      description: 'Connect to an MCP server',
      onClick: () => openTab({ type: 'mcp', title: 'MCP Servers', data: null }),
    },
  ]

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Logo and title */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">P</span>
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Welcome to PostAI
        </h1>
        <p className="text-text-secondary max-w-md">
          The AI-powered API testing tool with MCP support, visual workflows,
          and smart environment management.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="flex items-start gap-3 p-4 bg-sidebar hover:bg-white/5 border border-border rounded-lg text-left transition-colors group"
          >
            <div className="p-2 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
              <action.icon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">{action.title}</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* AI hint */}
      <div className="mt-8 flex items-center gap-2 text-sm text-text-secondary">
        <Sparkles className="w-4 h-4 text-primary-400" />
        <span>
          Tip: Use the AI assistant to generate requests from natural language
        </span>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  )
}
