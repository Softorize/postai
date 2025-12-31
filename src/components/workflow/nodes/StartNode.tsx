import { Handle, Position, NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'

export function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 bg-green-50 ${
        selected ? 'border-green-500 shadow-lg' : 'border-green-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">Start</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  )
}
