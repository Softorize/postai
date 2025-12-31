import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useWorkflowsStore } from '../../stores/workflows.store'
import { WorkflowNode } from '../../types'

interface Props {
  node: WorkflowNode
  onClose: () => void
}

export function NodePropertiesPanel({ node, onClose }: Props) {
  const { updateNodeData, deleteNode } = useWorkflowsStore()
  const [data, setData] = useState<Record<string, any>>({})

  useEffect(() => {
    setData(node.data || {})
  }, [node.id])

  const handleChange = (key: string, value: any) => {
    const newData = { ...data, [key]: value }
    setData(newData)
    updateNodeData(node.id, newData)
  }

  const handleDelete = () => {
    if (node.type === 'start' || node.type === 'end') {
      alert('Cannot delete start or end nodes')
      return
    }
    if (confirm('Delete this node?')) {
      deleteNode(node.id)
      onClose()
    }
  }

  const renderProperties = () => {
    switch (node.type) {
      case 'start':
      case 'end':
        return (
          <p className="text-sm text-muted-foreground">
            {node.type === 'start' ? 'Workflow entry point' : 'Workflow exit point'}
          </p>
        )

      case 'request':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select
                value={data.method || 'GET'}
                onChange={(e) => handleChange('method', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="{{baseUrl}}/endpoint"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Headers (JSON)</label>
              <textarea
                value={JSON.stringify(data.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    handleChange('headers', JSON.parse(e.target.value))
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                placeholder='{"Content-Type": "application/json"}'
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <textarea
                value={data.body || ''}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder="Request body..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Output Variable</label>
              <input
                type="text"
                value={data.output_variable || ''}
                onChange={(e) => handleChange('output_variable', e.target.value)}
                placeholder="response"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Store response in this variable
              </p>
            </div>
          </div>
        )

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Left Value</label>
              <input
                type="text"
                value={data.left || ''}
                onChange={(e) => handleChange('left', e.target.value)}
                placeholder="{{response.status_code}}"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select
                value={data.condition_type || 'equals'}
                onChange={(e) => handleChange('condition_type', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Right Value</label>
              <input
                type="text"
                value={data.right || ''}
                onChange={(e) => handleChange('right', e.target.value)}
                placeholder="200"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>
          </div>
        )

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delay (milliseconds)</label>
              <input
                type="number"
                value={data.delay_ms || 1000}
                onChange={(e) => handleChange('delay_ms', parseInt(e.target.value))}
                min={0}
                max={60000}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(data.delay_ms || 1000) >= 1000
                  ? `${(data.delay_ms || 1000) / 1000} seconds`
                  : `${data.delay_ms || 1000} milliseconds`}
              </p>
            </div>
          </div>
        )

      case 'variable':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Variable Name</label>
              <input
                type="text"
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="myVariable"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input
                type="text"
                value={data.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="Value or {{variable}}"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{{variable}}"} syntax to reference other variables
              </p>
            </div>
          </div>
        )

      default:
        return <p className="text-sm text-muted-foreground">Unknown node type</p>
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium capitalize">{node.type} Node</h3>
        <div className="flex items-center gap-1">
          {node.type !== 'start' && node.type !== 'end' && (
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-destructive/20 rounded text-destructive"
              title="Delete node"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {renderProperties()}

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Node ID: <code className="bg-muted px-1 rounded">{node.id}</code>
        </p>
      </div>
    </div>
  )
}
