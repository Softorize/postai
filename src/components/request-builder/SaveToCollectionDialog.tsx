import { useState, useEffect } from 'react'
import { X, FolderOpen, ChevronRight, Loader2, Save } from 'lucide-react'
import { clsx } from 'clsx'
import { useCollectionsStore } from '@/stores/collections.store'
import { Collection, Folder, HttpMethod, KeyValuePair, RequestBody, AuthConfig } from '@/types'
import toast from 'react-hot-toast'

interface SaveToCollectionDialogProps {
  isOpen: boolean
  onClose: () => void
  requestData: {
    name: string
    method: HttpMethod
    url: string
    headers?: KeyValuePair[]
    params?: KeyValuePair[]
    body?: RequestBody
    auth?: AuthConfig
  }
  onSaved?: (collectionId: string, requestId: string) => void
}

export function SaveToCollectionDialog({
  isOpen,
  onClose,
  requestData,
  onSaved,
}: SaveToCollectionDialogProps) {
  const { collections, fetchCollections, createRequest } = useCollectionsStore()
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [requestName, setRequestName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchCollections()
      // Set default name from URL
      const urlPath = requestData.url ? new URL(requestData.url).pathname : ''
      setRequestName(requestData.name || `${requestData.method} ${urlPath || '/'}`)
    }
  }, [isOpen, fetchCollections, requestData])

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collectionId)) {
        next.delete(collectionId)
      } else {
        next.add(collectionId)
      }
      return next
    })
  }

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection)
    setSelectedFolder(null)
  }

  const handleSelectFolder = (collection: Collection, folder: Folder) => {
    setSelectedCollection(collection)
    setSelectedFolder(folder)
  }

  const handleSave = async () => {
    if (!selectedCollection || !requestName.trim()) return

    setIsSaving(true)
    try {
      const newRequest = await createRequest(selectedCollection.id, {
        name: requestName.trim(),
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers,
        params: requestData.params,
        body: requestData.body,
        auth: requestData.auth,
        folder: selectedFolder?.id,
      })

      toast.success(`Request saved to "${selectedCollection.name}"`)
      onSaved?.(selectedCollection.id, newRequest.id)
      handleClose()
    } catch (error) {
      toast.error('Failed to save request')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      onClose()
      setSelectedCollection(null)
      setSelectedFolder(null)
      setRequestName('')
    }
  }

  const renderFolders = (folders: Folder[], collection: Collection, depth = 0) => {
    return folders.map((folder) => (
      <div key={folder.id}>
        <button
          onClick={() => handleSelectFolder(collection, folder)}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors',
            selectedFolder?.id === folder.id && 'bg-primary-500/20'
          )}
          style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
        >
          <FolderOpen className="w-4 h-4 text-yellow-500" />
          <span className="truncate">{folder.name}</span>
        </button>
        {folder.subfolders && folder.subfolders.length > 0 && (
          renderFolders(folder.subfolders, collection, depth + 1)
        )}
      </div>
    ))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Save to Collection</h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Request name input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Request Name</label>
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="Enter request name"
              className="w-full px-3 py-2 bg-sidebar border border-border rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Collection selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Collection</label>
            <div className="max-h-64 overflow-auto border border-border rounded-lg bg-sidebar">
              {collections.length === 0 ? (
                <div className="p-4 text-center text-text-secondary text-sm">
                  No collections yet. Create one first.
                </div>
              ) : (
                collections.map((collection) => (
                  <div key={collection.id}>
                    {/* Collection item */}
                    <button
                      onClick={() => {
                        handleSelectCollection(collection)
                        if (collection.folders && collection.folders.length > 0) {
                          toggleCollection(collection.id)
                        }
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors',
                        selectedCollection?.id === collection.id &&
                          !selectedFolder &&
                          'bg-primary-500/20'
                      )}
                    >
                      {collection.folders && collection.folders.length > 0 ? (
                        <ChevronRight
                          className={clsx(
                            'w-4 h-4 transition-transform',
                            expandedCollections.has(collection.id) && 'rotate-90'
                          )}
                        />
                      ) : (
                        <div className="w-4" />
                      )}
                      <FolderOpen className="w-4 h-4 text-primary-400" />
                      <span className="truncate">{collection.name}</span>
                    </button>

                    {/* Folders */}
                    {expandedCollections.has(collection.id) &&
                      collection.folders &&
                      collection.folders.length > 0 && (
                        renderFolders(collection.folders, collection)
                      )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected location */}
          {selectedCollection && (
            <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <p className="text-sm">
                <span className="text-text-secondary">Saving to: </span>
                <span className="font-medium">
                  {selectedCollection.name}
                  {selectedFolder && ` / ${selectedFolder.name}`}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm hover:bg-white/5 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedCollection || !requestName.trim() || isSaving}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors',
              selectedCollection && requestName.trim() && !isSaving
                ? 'bg-primary-600 hover:bg-primary-700'
                : 'bg-primary-600/50 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
