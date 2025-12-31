import { Handle, Position, NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'

export function ConditionNode({ data, selected }: NodeProps) {
  const condition = (data as any).condition_type || 'equals'
  const left = (data as any).left || ''
  const right = (data as any).right || ''

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 bg-purple-50 ${
        selected ? 'border-purple-500 shadow-lg' : 'border-purple-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500"
      />

      <div className="px-3 py-2 border-b border-purple-100 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium text-purple-800">Condition</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-purple-600 truncate">
          {left || '...'} {condition} {right || '...'}
        </p>
      </div>

      <div className="flex justify-between px-3 pb-2 text-xs">
        <span className="text-green-600">True</span>
        <span className="text-red-600">False</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="w-3 h-3 bg-red-500"
      />
    </div>
  )
}
