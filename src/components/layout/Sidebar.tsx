import { useState } from 'react'
import {
  FolderOpen,
  Globe,
  History,
  Server,
  GitBranch,
  Plus,
  Upload,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CollectionTree } from '../collections/CollectionTree'
import { EnvironmentList } from '../environments/EnvironmentList'
import { HistoryList } from '../history/HistoryList'
import { McpList } from '../mcp/McpList'
import { WorkflowList } from '../workflow/WorkflowList'
import { ImportDialog } from '../collections/ImportDialog'
import { InputDialog } from '../common/InputDialog'
import { useCollectionsStore, SidebarTab } from '@/stores/collections.store'

const tabs: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'collections', icon: FolderOpen, label: 'Collections' },
  { id: 'environments', icon: Globe, label: 'Environments' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'workflows', icon: GitBranch, label: 'Workflows' },
  { id: 'mcp', icon: Server, label: 'MCP' },
]

export function Sidebar() {
  const { createCollection, sidebarActiveTab, setSidebarTab } = useCollectionsStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false)

  const handleNewCollection = () => {
    setShowNewCollectionDialog(true)
  }

  const handleCreateCollection = async (name: string) => {
    await createCollection(name)
    setShowNewCollectionDialog(false)
  }

  const handleImport = () => {
    setShowImportDialog(true)
  }

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Tab buttons */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center py-2 transition-colors',
              sidebarActiveTab === tab.id
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-text-secondary hover:text-text-primary'
            )}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-sm bg-panel border border-border rounded focus:border-primary-500"
          />
        </div>
      </div>

      {/* Actions bar for collections */}
      {sidebarActiveTab === 'collections' && (
        <div className="flex gap-1 p-2 border-b border-border">
          <button
            onClick={handleNewCollection}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-panel hover:bg-white/5 border border-border rounded transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {sidebarActiveTab === 'collections' && <CollectionTree searchQuery={searchQuery} />}
        {sidebarActiveTab === 'environments' && <EnvironmentList searchQuery={searchQuery} />}
        {sidebarActiveTab === 'history' && <HistoryList searchQuery={searchQuery} />}
        {sidebarActiveTab === 'workflows' && <WorkflowList searchQuery={searchQuery} />}
        {sidebarActiveTab === 'mcp' && <McpList searchQuery={searchQuery} />}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* New Collection Dialog */}
      <InputDialog
        isOpen={showNewCollectionDialog}
        title="New Collection"
        placeholder="Collection name..."
        confirmText="Create"
        onConfirm={handleCreateCollection}
        onCancel={() => setShowNewCollectionDialog(false)}
      />
    </div>
  )
}
