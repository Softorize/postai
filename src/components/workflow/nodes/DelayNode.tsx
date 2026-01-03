import { Handle, Position, NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'

export function DelayNode({ data, selected }: NodeProps) {
  const nodeName = (data as any).node_name || ''
  const delayMs = (data as any).delay_ms || 1000

  const displayName = nodeName || 'Delay'

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-yellow-900/50 backdrop-blur ${
        selected ? 'border-yellow-400 shadow-lg shadow-yellow-500/20' : 'border-yellow-600'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-yellow-300"
      />

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Clock className="h-4 w-4 text-yellow-400" />
        </div>
        <div>
          <span className="text-sm font-medium text-yellow-300">{displayName}</span>
          <p className="text-xs text-yellow-400">
            {delayMs >= 1000 ? `${delayMs / 1000}s` : `${delayMs}ms`}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-yellow-300"
      />
    </div>
  )
}
