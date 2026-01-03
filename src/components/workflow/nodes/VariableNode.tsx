import { Handle, Position, NodeProps } from '@xyflow/react'
import { Variable } from 'lucide-react'

export function VariableNode({ data, selected }: NodeProps) {
  const nodeName = (data as any).node_name || ''
  const name = (data as any).name || 'variable'
  const value = (data as any).value || ''

  const displayName = nodeName || 'Set Variable'

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 bg-cyan-900/50 backdrop-blur ${
        selected ? 'border-cyan-400 shadow-lg shadow-cyan-500/20' : 'border-cyan-600'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-300"
      />

      <div className="px-3 py-2 border-b border-cyan-700/50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <Variable className="h-3 w-3 text-cyan-400" />
        </div>
        <span className="text-sm font-medium text-cyan-300">{displayName}</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs">
          <span className="font-medium text-cyan-400">{name}</span>
          <span className="text-cyan-500"> = </span>
          <span className="text-cyan-300/70 truncate">{value || '...'}</span>
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-cyan-300"
      />
    </div>
  )
}
