import { Handle, Position, NodeProps } from '@xyflow/react'
import { Square } from 'lucide-react'

export function EndNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 bg-red-50 ${
        selected ? 'border-red-500 shadow-lg' : 'border-red-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-500"
      />
      <div className="flex items-center gap-2">
        <Square className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-800">End</span>
      </div>
    </div>
  )
}
