import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  NodeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkflowsStore } from '../../stores/workflows.store'
import { StartNode, EndNode, RequestNode, ConditionNode, DelayNode, VariableNode } from './nodes'

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  request: RequestNode,
  condition: ConditionNode,
  delay: DelayNode,
  variable: VariableNode,
}

interface Props {
  onNodeSelect: (nodeId: string | null) => void
}

export function WorkflowCanvas({ onNodeSelect }: Props) {
  const { activeWorkflow, updateNodes, updateEdges, updateViewport } = useWorkflowsStore()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync nodes and edges when activeWorkflow changes
  useEffect(() => {
    if (activeWorkflow) {
      const flowNodes = activeWorkflow.nodes.map(n => ({
        ...n,
        data: { ...n.data, label: n.data?.label || n.type }
      }))
      setNodes(flowNodes)
      setEdges(activeWorkflow.edges || [])
    } else {
      setNodes([])
      setEdges([])
    }
  }, [activeWorkflow, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges)
      setEdges(newEdges)
      updateEdges(newEdges as any)
    },
    [edges, setEdges, updateEdges]
  )

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
      // Debounce this in production
      const updatedNodes = nodes.map(node => {
        const change = changes.find((c: any) => c.id === node.id)
        if (change?.position) {
          return { ...node, position: change.position }
        }
        return node
      })

      // Only save position changes
      const positionChanges = changes.filter((c: any) => c.type === 'position' && c.dragging === false)
      if (positionChanges.length > 0) {
        updateNodes(updatedNodes as any)
      }
    },
    [nodes, onNodesChange, updateNodes]
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
      // Save edge changes
      const removeChanges = changes.filter((c: any) => c.type === 'remove')
      if (removeChanges.length > 0) {
        const updatedEdges = edges.filter(e =>
          !removeChanges.some((c: any) => c.id === e.id)
        )
        updateEdges(updatedEdges as any)
      }
    },
    [edges, onEdgesChange, updateEdges]
  )

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect]
  )

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  if (!activeWorkflow) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a workflow or create a new one</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultViewport={activeWorkflow.viewport}
        onMoveEnd={(_, viewport) => updateViewport(viewport)}
        className="bg-panel"
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#4a5568" />
        <Controls className="bg-sidebar border border-border rounded-lg overflow-hidden" />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="bg-sidebar border border-border rounded-lg"
          maskColor="rgba(0, 0, 0, 0.7)"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start': return '#22c55e'
              case 'end': return '#ef4444'
              case 'request': return '#3b82f6'
              case 'condition': return '#a855f7'
              case 'delay': return '#eab308'
              case 'variable': return '#06b6d4'
              default: return '#6b7280'
            }
          }}
        />
      </ReactFlow>
      <style>{`
        .workflow-canvas .react-flow__controls button {
          background: var(--color-sidebar);
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .workflow-canvas .react-flow__controls button:hover {
          background: var(--color-panel);
        }
        .workflow-canvas .react-flow__controls button svg {
          fill: currentColor;
        }
        .workflow-canvas .react-flow__edge-path {
          stroke: #6b7280;
          stroke-width: 2;
        }
        .workflow-canvas .react-flow__edge.selected .react-flow__edge-path {
          stroke: #3b82f6;
        }
        .workflow-canvas .react-flow__handle {
          width: 10px;
          height: 10px;
        }
      `}</style>
    </div>
  )
}
