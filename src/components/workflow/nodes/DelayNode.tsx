import { Handle, Position, NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'

export function DelayNode({ data, selected }: NodeProps) {
  const delayMs = (data as any).delay_ms || 1000

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 bg-yellow-50 ${
        selected ? 'border-yellow-500 shadow-lg' : 'border-yellow-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-yellow-500"
      />

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">Delay</span>
      </div>

      <p className="text-xs text-yellow-600 mt-1">
        {delayMs >= 1000 ? `${delayMs / 1000}s` : `${delayMs}ms`}
      </p>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-yellow-500"
      />
    </div>
  )
}
