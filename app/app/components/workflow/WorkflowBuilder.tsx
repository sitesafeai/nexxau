'use client';

import React from 'react';
import ReactFlow, { 
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  ConnectionLineType,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  title: string;
  description: string;
  config: any;
  position: { x: number; y: number };
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
}

interface WorkflowBuilderProps {
  initialNodes?: WorkflowNode[];
  initialConnections?: WorkflowConnection[];
  onWorkflowChange?: (nodes: WorkflowNode[], connections: WorkflowConnection[]) => void;
  readOnly?: boolean;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialNodes = [],
  initialConnections = [],
  onWorkflowChange,
  readOnly = false
}) => {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);

  // Convert our custom format to ReactFlow format
  React.useEffect(() => {
    const reactFlowNodes: Node[] = initialNodes.map(node => ({
      id: node.id,
      type: 'default',
      position: node.position,
      data: { 
        label: (
          <div className="bg-gray-700 rounded-lg p-3 border border-gray-600 min-w-[200px]">
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {node.type === 'trigger' ? '🔴' : node.type === 'condition' ? '🟡' : '🟢'}
              </span>
              <div>
                <div className="text-white font-medium text-sm">{node.title}</div>
                <div className="text-gray-400 text-xs">{node.description}</div>
              </div>
            </div>
          </div>
        ),
        nodeType: node.type,
        config: node.config
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left
    }));

    const reactFlowEdges: Edge[] = initialConnections.map(conn => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      style: { 
        stroke: '#60a5fa', 
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#60a5fa'
      },
      label: '→',
      labelStyle: { fill: '#60a5fa', fontWeight: 600 }
    }));

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [initialNodes, initialConnections]);

  const onNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      notifyChange();
    },
    []
  );

  const onEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      notifyChange();
    },
    []
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Check if connection already exists
        const existingEdge = edges.find(
          edge => edge.source === connection.source && edge.target === connection.target
        );
        
        if (existingEdge) {
          return; // Don't create duplicate connections
        }

        const newEdge: Edge = {
          id: `edge-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          type: 'smoothstep',
          style: { 
            stroke: '#60a5fa', 
            strokeWidth: 2,
            strokeDasharray: '5,5'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#60a5fa'
          },
          label: '→',
          labelStyle: { fill: '#60a5fa', fontWeight: 600 }
        };
        
        setEdges((eds) => addEdge(newEdge, eds));
        notifyChange();
      }
    },
    [edges]
  );

  const notifyChange = React.useCallback(() => {
    if (onWorkflowChange) {
      // Convert back to our custom format
      const customNodes: WorkflowNode[] = nodes.map(node => ({
        id: node.id,
        type: node.data?.nodeType || 'trigger',
        title: node.data?.config?.title || 'Node',
        description: node.data?.config?.description || 'Workflow node',
        config: node.data?.config || {},
        position: node.position
      }));

      const customConnections: WorkflowConnection[] = edges.map(edge => ({
        id: edge.id,
        from: edge.source!,
        to: edge.target!
      }));

      onWorkflowChange(customNodes, customConnections);
    }
  }, [nodes, edges, onWorkflowChange]);

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    notifyChange();
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    notifyChange();
  };

  if (readOnly) {
    return (
      <div className="w-full h-[600px] bg-gray-900 rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          className="bg-gray-900"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          connectionLineType={ConnectionLineType.SmoothStep}
        >
          <Background color="#374151" gap={16} />
          <MiniMap 
            className="bg-gray-800 border border-gray-700 rounded-lg"
            nodeColor="#1f2937"
            maskColor="rgba(0, 0, 0, 0.5)"
          />
        </ReactFlow>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        className="bg-gray-900"
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        onKeyDown={(event) => {
          if (event.key === 'Delete') {
            // Delete selected elements
            const selectedNodes = nodes.filter(node => node.selected);
            const selectedEdges = edges.filter(edge => edge.selected);
            
            selectedNodes.forEach(node => deleteNode(node.id));
            selectedEdges.forEach(edge => deleteEdge(edge.id));
          }
        }}
      >
        <Background color="#374151" gap={16} />
        <Controls className="bg-gray-800 border border-gray-700 rounded-lg" />
        <MiniMap 
          className="bg-gray-800 border border-gray-700 rounded-lg"
          nodeColor="#1f2937"
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
      
      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-400">
        <p>💡 <strong>Workflow Tips:</strong></p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>• Drag nodes to position them in the order you want</li>
          <li>• Connect nodes by dragging from source to target</li>
          <li>• Use Delete key to remove selected nodes/connections</li>
          <li>• Workflow executes from left to right, top to bottom</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkflowBuilder; 