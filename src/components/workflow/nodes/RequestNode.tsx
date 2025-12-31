import { Handle, Position, NodeProps } from '@xyflow/react'
import { Send } from 'lucide-react'

export function RequestNode({ data, selected }: NodeProps) {
  const method = (data as any).method || 'GET'
  const url = (data as any).url || 'Untitled Request'

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-orange-100 text-orange-700',
    PATCH: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  }

  return (
    <div
      className={`min-w-[200px] rounded-lg border-2 bg-white ${
        selected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />

      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <Send className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">HTTP Request</span>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${methodColors[method] || 'bg-gray-100'}`}>
            {method}
          </span>
          <span className="text-xs text-gray-600 truncate max-w-[150px]" title={url}>
            {url}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  )
}
