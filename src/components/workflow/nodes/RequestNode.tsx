import { Handle, Position, NodeProps } from '@xyflow/react'
import { Send, AlertCircle, ArrowRight } from 'lucide-react'

export function RequestNode({ data, selected }: NodeProps) {
  const nodeName = (data as any).node_name || ''
  const method = (data as any).method || 'GET'
  const url = (data as any).url || ''
  const requestName = (data as any).request_name || ''
  const requestId = (data as any).request_id || ''
  const outputVariable = (data as any).output_variable || ''

  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-orange-500/20 text-orange-400',
    PATCH: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
  }

  const hasRequest = !!requestId
  const displayName = nodeName || 'HTTP Request'

  return (
    <div
      className={`min-w-[200px] rounded-lg border-2 bg-blue-900/50 backdrop-blur ${
        selected ? 'border-blue-400 shadow-lg shadow-blue-500/20' : 'border-blue-600'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />

      <div className="px-3 py-2 border-b border-blue-700/50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Send className="h-3 w-3 text-blue-400" />
        </div>
        <span className="text-sm font-medium text-blue-300">{displayName}</span>
      </div>

      <div className="px-3 py-2">
        {hasRequest ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${methodColors[method] || 'bg-gray-700'}`}>
                {method}
              </span>
              <span className="text-xs text-blue-100 font-medium truncate max-w-[150px]" title={requestName}>
                {requestName}
              </span>
            </div>
            <p className="text-xs text-blue-300/60 truncate" title={url}>
              {url}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">No request selected</span>
          </div>
        )}
      </div>

      {/* Output Variable */}
      {outputVariable && (
        <div className="px-3 py-1.5 border-t border-blue-700/50 flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3 text-blue-400" />
          <span className="text-xs text-blue-300/80 font-mono">{outputVariable}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
      />
    </div>
  )
}
