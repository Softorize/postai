import { Handle, Position, NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeName = (data as any).node_name || ''
  const condition = (data as any).condition_type || 'equals'
  const left = (data as any).left || ''
  const right = (data as any).right || ''

  const displayName = nodeName || 'Condition'

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 bg-purple-900/50 backdrop-blur ${
        selected ? 'border-purple-400 shadow-lg shadow-purple-500/20' : 'border-purple-600'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      <div className="px-3 py-2 border-b border-purple-700/50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <GitBranch className="h-3 w-3 text-purple-400" />
        </div>
        <span className="text-sm font-medium text-purple-300">{displayName}</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-purple-300/70 truncate">
          {left || '...'} {condition} {right || '...'}
        </p>
      </div>

      <div className="flex justify-between px-3 pb-2 text-xs">
        <span className="text-green-400">True</span>
        <span className="text-red-400">False</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-300"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
      />
    </div>
  )
}
