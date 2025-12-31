import { Handle, Position, NodeProps } from '@xyflow/react'
import { Variable } from 'lucide-react'

export function VariableNode({ data, selected }: NodeProps) {
  const name = (data as any).name || 'variable'
  const value = (data as any).value || ''

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 bg-cyan-50 ${
        selected ? 'border-cyan-500 shadow-lg' : 'border-cyan-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyan-500"
      />

      <div className="px-3 py-2 border-b border-cyan-100 flex items-center gap-2">
        <Variable className="h-4 w-4 text-cyan-600" />
        <span className="text-sm font-medium text-cyan-800">Set Variable</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs">
          <span className="font-medium text-cyan-700">{name}</span>
          <span className="text-cyan-500"> = </span>
          <span className="text-cyan-600 truncate">{value || '...'}</span>
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-cyan-500"
      />
    </div>
  )
}
