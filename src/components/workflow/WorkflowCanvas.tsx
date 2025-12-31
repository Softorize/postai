import { useCallback, useMemo } from 'react'
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

  const initialNodes = useMemo(() => {
    return activeWorkflow?.nodes.map(n => ({
      ...n,
      data: { ...n.data, label: n.data?.label || n.type }
    })) || []
  }, [activeWorkflow?.id])

  const initialEdges = useMemo(() => {
    return activeWorkflow?.edges || []
  }, [activeWorkflow?.id])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

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
    <div className="h-full w-full">
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
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
