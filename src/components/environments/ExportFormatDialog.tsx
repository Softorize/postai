import { useState } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

export type ExportFormat = 'postman' | 'postai'

interface ExportFormatDialogProps {
  isOpen: boolean
  environmentName: string
  onConfirm: (format: ExportFormat) => void
  onCancel: () => void
}

export function ExportFormatDialog({
  isOpen,
  environmentName,
  onConfirm,
  onCancel,
}: ExportFormatDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('postman')

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(selectedFormat)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-sidebar border border-border rounded-lg shadow-xl w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Export Environment</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-text-secondary mb-4">
            Export "{environmentName}" as:
          </p>

          <div className="space-y-2">
            {/* Postman Option */}
            <label
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                selectedFormat === 'postman'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border hover:bg-white/5'
              )}
            >
              <input
                type="radio"
                name="exportFormat"
                value="postman"
                checked={selectedFormat === 'postman'}
                onChange={() => setSelectedFormat('postman')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Postman Format</div>
                <div className="text-xs text-text-secondary mt-1">
                  Compatible with Postman. Variables with multiple values will export only the currently selected value.
                </div>
              </div>
            </label>

            {/* PostAI Option */}
            <label
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                selectedFormat === 'postai'
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-border hover:bg-white/5'
              )}
            >
              <input
                type="radio"
                name="exportFormat"
                value="postai"
                checked={selectedFormat === 'postai'}
                onChange={() => setSelectedFormat('postai')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">PostAI Format</div>
                <div className="text-xs text-text-secondary mt-1">
                  Preserves all values for multi-value variables. Use this to backup or transfer environments between PostAI instances.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 rounded transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
