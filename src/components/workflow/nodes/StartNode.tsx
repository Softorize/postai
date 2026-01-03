import { Handle, Position, NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'

export function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-green-900/50 backdrop-blur ${
        selected ? 'border-green-400 shadow-lg shadow-green-500/20' : 'border-green-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Play className="h-4 w-4 text-green-400" />
        </div>
        <span className="text-sm font-medium text-green-300">Start</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-300"
      />
    </div>
  )
}
