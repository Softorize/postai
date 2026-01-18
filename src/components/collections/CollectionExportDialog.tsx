import { useState } from 'react'
import { AlertTriangle, Download, X } from 'lucide-react'
import { Collection } from '@/types'
import { useCollectionsStore, ExportFormat } from '@/stores/collections.store'

interface CollectionExportDialogProps {
  isOpen: boolean
  collection: Collection
  onClose: () => void
}

export function CollectionExportDialog({ isOpen, collection, onClose }: CollectionExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('postman')
  const [includeEnvironments, setIncludeEnvironments] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { exportCollection } = useCollectionsStore()

  const hasEnvironments = collection.environments && collection.environments.length > 0

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportCollection(collection.id, format, includeEnvironments)
      if (!result.success) {
        alert(`Failed to export: ${result.error}`)
      } else {
        onClose()
      }
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sidebar border border-border rounded-lg shadow-xl w-[400px] max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Export Collection</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-sm text-text-secondary">
            Exporting: <span className="text-text-primary font-medium">{collection.name}</span>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Format</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="format"
                  value="postman"
                  checked={format === 'postman'}
                  onChange={() => setFormat('postman')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Postman Format</div>
                  <div className="text-xs text-text-secondary">
                    Standard Postman collection format. Compatible with Postman app.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="format"
                  value="postai"
                  checked={format === 'postai'}
                  onChange={() => setFormat('postai')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">PostAI Format</div>
                  <div className="text-xs text-text-secondary">
                    Full fidelity export with multi-value variables and collection environments.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Include Environments checkbox - only for PostAI format with environments */}
          {format === 'postai' && hasEnvironments && (
            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white/5">
              <input
                type="checkbox"
                checked={includeEnvironments}
                onChange={(e) => setIncludeEnvironments(e.target.checked)}
              />
              <div>
                <div className="text-sm font-medium">Include collection environments</div>
                <div className="text-xs text-text-secondary">
                  Export {collection.environments?.length} environment{collection.environments?.length !== 1 ? 's' : ''} with the collection.
                </div>
              </div>
            </label>
          )}

          {/* Warning for Postman format when collection has environments */}
          {format === 'postman' && hasEnvironments && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-200">
                This collection has {collection.environments?.length} environment{collection.environments?.length !== 1 ? 's' : ''} that will not be included in the Postman export.
                Use PostAI format to include collection environments.
              </div>
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
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
