import { Handle, Position, NodeProps } from '@xyflow/react'
import { Square, ArrowRight } from 'lucide-react'

interface EndNodeData {
  result_variable?: string
  result_label?: string
}

export function EndNode({ selected, data }: NodeProps) {
  const nodeData = data as EndNodeData
  const resultVariable = nodeData?.result_variable
  const resultLabel = nodeData?.result_label

  return (
    <div
      className={`rounded-lg border-2 bg-red-900/50 backdrop-blur ${
        selected ? 'border-red-400 shadow-lg shadow-red-500/20' : 'border-red-600'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
      />
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <Square className="h-4 w-4 text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-300">End</span>
      </div>

      {/* Show result info */}
      {resultVariable && (
        <div className="px-3 py-2 border-t border-red-700/50 bg-black/20">
          {resultLabel && (
            <div className="text-xs text-red-300 mb-1">{resultLabel}</div>
          )}
          <div className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 text-red-400" />
            <span className="text-xs font-mono text-red-300">{resultVariable}</span>
          </div>
        </div>
      )}
    </div>
  )
}
