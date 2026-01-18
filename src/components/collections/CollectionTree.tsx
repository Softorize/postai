import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  FolderPlus,
  FilePlus,
  GitBranch,
  Pencil,
  Download,
  Copy,
  Globe,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useCollectionsStore } from '@/stores/collections.store'
import { useTabsStore } from '@/stores/tabs.store'
import { useWorkflowsStore } from '@/stores/workflows.store'
import { Collection, Folder as FolderType, Request, HttpMethod } from '@/types'
import { InputDialog } from '../common/InputDialog'
import { CollectionExportDialog } from './CollectionExportDialog'

interface CollectionTreeProps {
  searchQuery: string
}

// Helper function to check if a folder or its contents match the search
function folderMatchesSearch(folder: FolderType, query: string): boolean {
  const lowerQuery = query.toLowerCase()

  // Check folder name
  if (folder.name.toLowerCase().includes(lowerQuery)) return true

  // Check requests in folder
  if (folder.requests?.some(r => r.name.toLowerCase().includes(lowerQuery))) return true

  // Check subfolders recursively
  if (folder.subfolders?.some(sf => folderMatchesSearch(sf, query))) return true

  return false
}

// Helper function to check if a collection or its contents match the search
function collectionMatchesSearch(collection: Collection, query: string): boolean {
  const lowerQuery = query.toLowerCase()

  // Check collection name
  if (collection.name.toLowerCase().includes(lowerQuery)) return true

  // Check root-level requests
  if (collection.requests?.some(r => !r.folder && r.name.toLowerCase().includes(lowerQuery))) return true

  // Check folders
  if (collection.folders?.some(f => folderMatchesSearch(f, query))) return true

  return false
}

export function CollectionTree({ searchQuery }: CollectionTreeProps) {
  const { collections, isLoading } = useCollectionsStore()

  const filteredCollections = searchQuery
    ? collections.filter((c) => collectionMatchesSearch(c, searchQuery))
    : collections

  if (isLoading) {
    return (
      <div className="p-4 text-text-secondary text-sm text-center">
        Loading collections...
      </div>
    )
  }

  if (filteredCollections.length === 0) {
    return (
      <div className="p-4 text-text-secondary text-sm text-center">
        {searchQuery ? 'No matches found' : 'No collections yet'}
      </div>
    )
  }

  return (
    <div className="py-1">
      {filteredCollections.map((collection) => (
        <CollectionItem key={collection.id} collection={collection} searchQuery={searchQuery} />
      ))}
    </div>
  )
}

function CollectionItem({ collection, searchQuery }: { collection: Collection; searchQuery: string }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEnvMenu, setShowEnvMenu] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const envMenuRef = useRef<HTMLDivElement>(null)
  const { deleteCollection, createFolder, createRequest, expandedIds, toggleExpanded, setExpanded, setCollectionEnvironment } = useCollectionsStore()
  const { openTab } = useTabsStore()

  const isExpanded = expandedIds.has(collection.id)
  const hasEnvironments = collection.environments && collection.environments.length > 0
  const activeEnv = collection.environments?.find(e => e.id === collection.active_environment_id)

  // Auto-expand when searching and this collection has matches
  const shouldAutoExpand = searchQuery && collectionMatchesSearch(collection, searchQuery)

  useEffect(() => {
    if (shouldAutoExpand && !isExpanded) {
      setExpanded(collection.id, true)
    }
  }, [shouldAutoExpand, isExpanded, collection.id, setExpanded])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
      if (envMenuRef.current && !envMenuRef.current.contains(e.target as Node)) {
        setShowEnvMenu(false)
      }
    }
    if (showMenu || showEnvMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu, showEnvMenu])

  const handleDelete = async () => {
    if (confirm(`Delete collection "${collection.name}" and all its contents?`)) {
      await deleteCollection(collection.id)
    }
    setShowMenu(false)
  }

  const handleExport = () => {
    setShowMenu(false)
    setShowExportDialog(true)
  }

  const handleAddFolder = () => {
    setShowMenu(false)
    setShowFolderDialog(true)
  }

  const handleConfirmAddFolder = async (name: string) => {
    try {
      await createFolder(collection.id, name)
      setExpanded(collection.id, true)
      setShowFolderDialog(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
      setShowFolderDialog(false)
    }
  }

  const handleAddRequest = () => {
    setShowMenu(false)
    setShowRequestDialog(true)
  }

  const handleConfirmAddRequest = async (name: string) => {
    try {
      const newRequest = await createRequest(collection.id, { name, method: 'GET', url: '' })
      setExpanded(collection.id, true)
      setShowRequestDialog(false)
      // Open the new request in a tab
      openTab({
        type: 'request',
        title: newRequest.name,
        data: newRequest,
      })
    } catch (error) {
      console.error('Failed to create request:', error)
      setShowRequestDialog(false)
    }
  }

  const handleSelectEnvironment = async (envId: string | null) => {
    try {
      await setCollectionEnvironment(collection.id, envId)
    } catch (error) {
      console.error('Failed to set collection environment:', error)
    }
    setShowEnvMenu(false)
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 cursor-pointer group"
        onClick={() => toggleExpanded(collection.id)}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}
        <span className="flex-1 text-sm truncate">{collection.name}</span>

        {/* Environment indicator/button - only show if collection has environments */}
        {hasEnvironments && (
          <div className="relative" ref={envMenuRef}>
            <button
              className={clsx(
                "p-1 rounded flex items-center gap-1",
                activeEnv
                  ? "text-primary-400 opacity-100"
                  : "text-text-secondary opacity-0 group-hover:opacity-100",
                "hover:bg-white/10"
              )}
              onClick={(e) => {
                e.stopPropagation()
                setShowEnvMenu(!showEnvMenu)
              }}
              title={activeEnv ? `Environment: ${activeEnv.name}` : 'Select environment'}
            >
              <Globe className="w-3.5 h-3.5" />
            </button>

            {/* Environment dropdown */}
            {showEnvMenu && (
              <div className="absolute right-0 top-7 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]">
                <div className="px-3 py-1.5 text-xs text-text-secondary border-b border-border">
                  Collection Environment
                </div>
                <button
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left",
                    !activeEnv && "text-primary-400"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectEnvironment(null)
                  }}
                >
                  <X className="w-4 h-4" />
                  No environment
                </button>
                {collection.environments?.map((env) => (
                  <button
                    key={env.id}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left",
                      env.id === collection.active_environment_id && "text-primary-400"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectEnvironment(env.id)
                    }}
                  >
                    <Globe className="w-4 h-4" />
                    {env.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[140px]"
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              handleAddFolder()
            }}
          >
            <FolderPlus className="w-4 h-4" />
            Add Folder
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              handleAddRequest()
            }}
          >
            <FilePlus className="w-4 h-4" />
            Add Request
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              handleExport()
            }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="border-t border-border" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="ml-4">
          {/* Folders - filter by search if active */}
          {collection.folders
            ?.filter(f => !searchQuery || folderMatchesSearch(f, searchQuery))
            .map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                collectionId={collection.id}
                searchQuery={searchQuery}
              />
            ))}

          {/* Root-level requests - filter by search if active */}
          {collection.requests
            ?.filter((r) => !r.folder)
            .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                collectionId={collection.id}
                searchQuery={searchQuery}
              />
            ))}
        </div>
      )}

      {/* Add Folder Dialog */}
      <InputDialog
        isOpen={showFolderDialog}
        title="New Folder"
        placeholder="Folder name..."
        confirmText="Create"
        onConfirm={handleConfirmAddFolder}
        onCancel={() => setShowFolderDialog(false)}
      />

      {/* Add Request Dialog */}
      <InputDialog
        isOpen={showRequestDialog}
        title="New Request"
        placeholder="Request name..."
        confirmText="Create"
        onConfirm={handleConfirmAddRequest}
        onCancel={() => setShowRequestDialog(false)}
      />

      {/* Export Dialog */}
      <CollectionExportDialog
        isOpen={showExportDialog}
        collection={collection}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  )
}

function FolderItem({
  folder,
  collectionId,
  searchQuery,
}: {
  folder: FolderType
  collectionId: string
  searchQuery: string
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { deleteFolder, createRequest, expandedIds, toggleExpanded, setExpanded } = useCollectionsStore()
  const { openTab } = useTabsStore()

  const isExpanded = expandedIds.has(folder.id)

  // Auto-expand when searching and this folder has matches
  const shouldAutoExpand = searchQuery && folderMatchesSearch(folder, searchQuery)

  useEffect(() => {
    if (shouldAutoExpand && !isExpanded) {
      setExpanded(folder.id, true)
    }
  }, [shouldAutoExpand, isExpanded, folder.id, setExpanded])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleDelete = async () => {
    if (confirm(`Delete folder "${folder.name}" and all its contents?`)) {
      await deleteFolder(collectionId, folder.id)
    }
    setShowMenu(false)
  }

  const handleAddRequest = () => {
    setShowMenu(false)
    setShowRequestDialog(true)
  }

  const handleConfirmAddRequest = async (name: string) => {
    try {
      const newRequest = await createRequest(collectionId, { name, method: 'GET', url: '', folder: folder.id })
      setExpanded(folder.id, true)
      setShowRequestDialog(false)
      // Open the new request in a tab
      openTab({
        type: 'request',
        title: newRequest.name,
        data: newRequest,
      })
    } catch (error) {
      console.error('Failed to create request:', error)
      setShowRequestDialog(false)
    }
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 cursor-pointer group"
        onClick={() => toggleExpanded(folder.id)}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-blue-400" />
        ) : (
          <Folder className="w-4 h-4 text-blue-400" />
        )}
        <span className="flex-1 text-sm truncate">{folder.name}</span>
        <button
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[140px]"
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              handleAddRequest()
            }}
          >
            <FilePlus className="w-4 h-4" />
            Add Request
          </button>
          <div className="border-t border-border" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="ml-4">
          {/* Subfolders - filter by search if active */}
          {folder.subfolders
            ?.filter(sf => !searchQuery || folderMatchesSearch(sf, searchQuery))
            .map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                collectionId={collectionId}
                searchQuery={searchQuery}
              />
            ))}

          {/* Requests in folder - filter by search if active */}
          {folder.requests
            ?.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                collectionId={collectionId}
                searchQuery={searchQuery}
              />
            ))}
        </div>
      )}

      {/* Add Request Dialog */}
      <InputDialog
        isOpen={showRequestDialog}
        title="New Request"
        placeholder="Request name..."
        confirmText="Create"
        onConfirm={handleConfirmAddRequest}
        onCancel={() => setShowRequestDialog(false)}
      />
    </div>
  )
}

function RequestItem({
  request,
  collectionId,
  searchQuery: _searchQuery,
}: {
  request: Request
  collectionId: string
  searchQuery: string
}) {
  const { openTab, activeTabId, tabs, updateTab } = useTabsStore()
  const { deleteRequest, updateRequest, duplicateRequest, highlightedRequestId } = useCollectionsStore()
  const { workflows, fetchWorkflows, addNodeToWorkflow } = useWorkflowsStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  // Fetch workflows when workflow picker is shown
  useEffect(() => {
    if (showWorkflowPicker && workflows.length === 0) {
      fetchWorkflows()
    }
  }, [showWorkflowPicker])

  // Check if this request is in the active tab
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isActive = activeTab?.type === 'request' && (activeTab.data as Request)?.id === request.id
  const isHighlighted = highlightedRequestId === request.id

  // Scroll into view when highlighted
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleClick = () => {
    openTab({
      type: 'request',
      title: request.name,
      data: request,
    })
  }

  const handleDelete = async () => {
    if (confirm(`Delete request "${request.name}"?`)) {
      await deleteRequest(collectionId, request.id)
    }
    setShowMenu(false)
  }

  const handleRename = async (newName: string) => {
    await updateRequest(collectionId, request.id, { name: newName })
    // Update any open tabs with this request
    const openTab = tabs.find(t => t.type === 'request' && (t.data as Request)?.id === request.id)
    if (openTab) {
      updateTab(openTab.id, { title: newName, data: { ...openTab.data, name: newName } as Request })
    }
    setShowRenameDialog(false)
  }

  const methodColors: Record<HttpMethod, string> = {
    GET: 'text-method-get',
    POST: 'text-method-post',
    PUT: 'text-method-put',
    PATCH: 'text-method-patch',
    DELETE: 'text-method-delete',
    HEAD: 'text-purple-400',
    OPTIONS: 'text-gray-400',
  }

  return (
    <div className="relative" ref={itemRef}>
      <div
        className={clsx(
          "flex items-center gap-2 px-2 py-1.5 cursor-pointer group transition-colors",
          isActive && "bg-primary-600/20 border-l-2 border-primary-500",
          !isActive && "hover:bg-white/5",
          isHighlighted && "animate-pulse bg-primary-500/30"
        )}
        onClick={handleClick}
      >
        <span
          className={clsx(
            'text-[10px] font-bold w-10 text-center',
            methodColors[request.method]
          )}
        >
          {request.method}
        </span>
        <span className="flex-1 text-sm truncate">{request.name}</span>
        <button
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 bg-sidebar border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]"
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              setShowRenameDialog(true)
            }}
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={async (e) => {
              e.stopPropagation()
              setShowMenu(false)
              await duplicateRequest(collectionId, request.id)
            }}
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
              setShowWorkflowPicker(true)
            }}
          >
            <GitBranch className="w-4 h-4 text-purple-400" />
            Add to Workflow
          </button>
          <div className="border-t border-border" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-left text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Workflow Picker Dialog */}
      {showWorkflowPicker && (
        <WorkflowPickerDialog
          request={request}
          workflows={workflows}
          onSelect={async (workflowId) => {
            await addNodeToWorkflow(workflowId, request)
            setShowWorkflowPicker(false)
          }}
          onClose={() => setShowWorkflowPicker(false)}
        />
      )}

      {/* Rename Dialog */}
      <InputDialog
        isOpen={showRenameDialog}
        title="Rename Request"
        placeholder="Request name..."
        defaultValue={request.name}
        confirmText="Rename"
        onConfirm={handleRename}
        onCancel={() => setShowRenameDialog(false)}
      />
    </div>
  )
}

// Workflow Picker Dialog Component
function WorkflowPickerDialog({
  request,
  workflows,
  onSelect,
  onClose,
}: {
  request: Request
  workflows: { id: string; name: string; description?: string }[]
  onSelect: (workflowId: string) => Promise<void>
  onClose: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = async (workflowId: string) => {
    setIsLoading(true)
    setSelectedId(workflowId)
    try {
      await onSelect(workflowId)
    } catch (error) {
      console.error('Failed to add to workflow:', error)
    } finally {
      setIsLoading(false)
      setSelectedId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sidebar border border-border rounded-lg shadow-xl w-[400px] max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Add to Workflow</h3>
          <p className="text-xs text-text-secondary mt-1">
            Add "{request.name}" as HTTP Request node
          </p>
        </div>

        {/* Workflow List */}
        <div className="flex-1 overflow-auto p-2">
          {workflows.length === 0 ? (
            <div className="p-4 text-center text-text-secondary text-sm">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No workflows available.
              <br />
              Create a workflow first.
            </div>
          ) : (
            <div className="space-y-1">
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => handleSelect(workflow.id)}
                  disabled={isLoading}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                    "hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedId === workflow.id && "bg-purple-500/20"
                  )}
                >
                  <GitBranch className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{workflow.name}</div>
                    {workflow.description && (
                      <div className="text-xs text-text-secondary truncate">{workflow.description}</div>
                    )}
                  </div>
                  {selectedId === workflow.id && isLoading && (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
