import { useState, useCallback } from 'react'
import { Upload, FileJson, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/api/client'
import { useCollectionsStore } from '@/stores/collections.store'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import toast from 'react-hot-toast'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  const { fetchCollections } = useCollectionsStore()
  const { activeWorkspace } = useWorkspacesStore()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.json')) {
      setFile(droppedFile)
      setResult(null)
    } else {
      toast.error('Please drop a JSON file')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setResult(null)

    try {
      const content = await file.text()

      const response = await api.post('/collections/import/', {
        content,
        workspace_id: activeWorkspace?.id,
      })

      if (response.data.success) {
        setResult({
          success: true,
          message: `Successfully imported "${response.data.collection.name}"`,
          details: `${response.data.requests_imported} requests, ${response.data.folders_imported} folders`,
        })

        // Refresh collections list
        await fetchCollections()

        toast.success('Collection imported successfully')

        // Auto-close after success
        setTimeout(() => {
          onClose()
          setFile(null)
          setResult(null)
        }, 2000)
      } else {
        setResult({
          success: false,
          message: 'Import failed',
          details: response.data.errors?.join(', ') || 'Unknown error',
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import collection'
      setResult({
        success: false,
        message: 'Import failed',
        details: errorMessage,
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      onClose()
      setFile(null)
      setResult(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Import Collection</h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={clsx(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-border hover:border-primary-500/50'
            )}
          >
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileJson className="w-12 h-12 text-primary-400" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-text-secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-text-secondary" />
                <div>
                  <p className="font-medium">Drop Postman collection here</p>
                  <p className="text-sm text-text-secondary">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div
              className={clsx(
                'mt-4 p-4 rounded-lg',
                result.success
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div>
                  <p
                    className={clsx(
                      'font-medium',
                      result.success ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {result.message}
                  </p>
                  {result.details && (
                    <p className="text-sm text-text-secondary mt-1">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supported formats */}
          <p className="mt-4 text-xs text-text-secondary text-center">
            Supports Postman Collection v2.0 and v2.1 format
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm hover:bg-white/5 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isImporting}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors',
              file && !isImporting
                ? 'bg-primary-600 hover:bg-primary-700'
                : 'bg-primary-600/50 cursor-not-allowed'
            )}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
