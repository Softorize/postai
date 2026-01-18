import { useState, useEffect } from 'react'
import { Globe, Folder, X } from 'lucide-react'
import { useEnvironmentsStore } from '@/stores/environments.store'
import { useCollectionsStore } from '@/stores/collections.store'

interface CreateEnvironmentDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateEnvironmentDialog({ isOpen, onClose }: CreateEnvironmentDialogProps) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'global' | 'collection'>('global')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const { createEnvironment, fetchEnvironments } = useEnvironmentsStore()
  const { collections, fetchCollections } = useCollectionsStore()

  // Fetch collections when dialog opens
  useEffect(() => {
    if (isOpen && collections.length === 0) {
      fetchCollections()
    }
  }, [isOpen, collections.length, fetchCollections])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setScope('global')
      setSelectedCollectionId('')
    }
  }, [isOpen])

  const handleCreate = async () => {
    if (!name.trim()) return
    if (scope === 'collection' && !selectedCollectionId) return

    setIsCreating(true)
    try {
      await createEnvironment(
        name.trim(),
        '',
        scope === 'collection' ? selectedCollectionId : undefined
      )
      await fetchEnvironments()
      // Also refetch collections to update their environments array
      if (scope === 'collection') {
        await fetchCollections()
      }
      onClose()
    } catch (error) {
      console.error('Failed to create environment:', error)
      alert('Failed to create environment')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sidebar border border-border rounded-lg shadow-xl w-[420px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">New Environment</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Name input */}
          <div className="space-y-2">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Environment name..."
              className="w-full px-3 py-2 bg-panel border border-border rounded text-sm focus:outline-none focus:border-primary-500"
              autoFocus
            />
          </div>

          {/* Scope selection */}
          <div className="space-y-2">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Scope</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="scope"
                  value="global"
                  checked={scope === 'global'}
                  onChange={() => setScope('global')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="w-4 h-4 text-primary-400" />
                    Global Environment
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Available across all collections. Can be set as the active environment.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="scope"
                  value="collection"
                  checked={scope === 'collection'}
                  onChange={() => setScope('collection')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Folder className="w-4 h-4 text-yellow-500" />
                    Collection-Specific
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Scoped to a specific collection. Overrides global variables when selected.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Collection selection (only shown when scope is collection) */}
          {scope === 'collection' && (
            <div className="space-y-2">
              <label className="text-xs text-text-secondary uppercase tracking-wide">Collection</label>
              {collections.length === 0 ? (
                <div className="p-3 bg-panel border border-border rounded-lg text-sm text-text-secondary">
                  No collections available. Create a collection first.
                </div>
              ) : (
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-panel border border-border rounded text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Select a collection...</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || (scope === 'collection' && !selectedCollectionId)}
            className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
