'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ForkliftIcon, UserIcon, AlertIcon, SpeedIcon } from './WorkflowIcons';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const elements = [
  {
    type: 'forklift',
    label: 'Forklift',
    icon: ForkliftIcon,
    data: { type: 'forklift', label: 'Forklift' },
  },
  {
    type: 'person',
    label: 'Person',
    icon: UserIcon,
    data: { type: 'person', label: 'Person' },
  },
  {
    type: 'alert',
    label: 'Alert',
    icon: AlertIcon,
    data: { type: 'alert', label: 'Alert' },
  },
  {
    type: 'speed',
    label: 'Speed Monitor',
    icon: SpeedIcon,
    data: { type: 'speed', label: 'Speed Monitor' },
  },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      // Validate connection
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      // Only allow connections to alert nodes
      if (targetNode.data.type !== 'alert') {
        setError('Connections can only be made to Alert nodes');
        return;
      }

      // Validate source node type
      if (!['forklift', 'person', 'speed'].includes(sourceNode.data.type)) {
        setError('Invalid source node type');
        return;
      }

      setEdges((eds) => addEdge(params, eds));
      setError(null);
    },
    [nodes, setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const element = elements.find((el) => el.type === type);

      if (typeof element === 'undefined' || !element) {
        return;
      }

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${nodes.length + 1}`,
        type: 'custom',
        position,
        data: element.data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes]
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Find all alert nodes
      const alertNodes = nodes.filter((node) => node.data.type === 'alert');
      
      // For each alert node, create an alert rule
      for (const alertNode of alertNodes) {
        // Find incoming connections
        const incomingEdges = edges.filter((edge) => edge.target === alertNode.id);
        
        // Get source nodes
        const sourceNodes = incomingEdges.map((edge) => 
          nodes.find((node) => node.id === edge.source)
        ).filter(Boolean);

        // Create alert rule
        const response = await fetch('/api/alert-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Workflow Alert: ${alertNode.data.label}`,
            description: `Alert triggered by ${sourceNodes.map(n => n?.data.label).join(', ')}`,
            severity: alertNode.data.config?.severity || 'MEDIUM',
            condition: alertNode.data.config?.condition || {
              type: 'proximity',
              parameters: {
                distance: 5,
                speed: 30,
              },
            },
            isActive: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create alert rule');
        }
      }

      // Clear the workflow after successful save
      setNodes([]);
      setEdges([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Elements</h3>
          <div className="space-y-2">
            {elements.map((element) => (
              <div
                key={element.type}
                className="flex items-center p-2 border border-gray-200 rounded-md cursor-move hover:bg-gray-50"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow', element.type);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <element.icon className="w-6 h-6 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700">{element.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <Panel position="top-right" className="bg-white p-2 rounded-md shadow-sm space-y-2">
              {error && (
                <div className="text-red-600 text-sm mb-2">{error}</div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || nodes.length === 0}
                className={`px-4 py-2 rounded-md text-white ${
                  isSaving || nodes.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Workflow'}
              </button>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
} 