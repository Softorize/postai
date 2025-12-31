import { useState } from 'react'
import {
  FolderOpen,
  Globe,
  History,
  Server,
  Plus,
  Upload,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CollectionTree } from '../collections/CollectionTree'
import { EnvironmentList } from '../environments/EnvironmentList'
import { ImportDialog } from '../collections/ImportDialog'
import { useCollectionsStore } from '@/stores/collections.store'

type SidebarTab = 'collections' | 'environments' | 'history' | 'mcp'

const tabs: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'collections', icon: FolderOpen, label: 'Collections' },
  { id: 'environments', icon: Globe, label: 'Environments' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'mcp', icon: Server, label: 'MCP' },
]

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('collections')
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { createCollection } = useCollectionsStore()

  const handleNewCollection = async () => {
    const name = prompt('Collection name:')
    if (name) {
      await createCollection(name)
    }
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
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center py-2 transition-colors',
              activeTab === tab.id
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
      {activeTab === 'collections' && (
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
        {activeTab === 'collections' && <CollectionTree searchQuery={searchQuery} />}
        {activeTab === 'environments' && <EnvironmentList searchQuery={searchQuery} />}
        {activeTab === 'history' && (
          <div className="p-4 text-text-secondary text-sm text-center">
            Request history will appear here
          </div>
        )}
        {activeTab === 'mcp' && (
          <div className="p-4 text-text-secondary text-sm text-center">
            MCP servers will appear here
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  )
}
