'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';

interface WorkflowNodeData {
  label: string;
  type: string;
  config?: Record<string, unknown>;
}

interface WorkflowNode extends Node<WorkflowNodeData> {}

interface WorkflowBuilderProps {
  onWorkflowCreated?: (workflow: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: Edge[];
  }) => void;
}

export default function WorkflowBuilder({ onWorkflowCreated }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: unknown, node: WorkflowNode) => {
    setSelectedNode(node);
  }, []);

  const handleSaveWorkflow = useCallback(async () => {
    if (!workflowName.trim()) {
      setError('Please enter a workflow name');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const workflow = {
        name: workflowName,
        description: workflowDescription,
        nodes: nodes as WorkflowNode[],
        edges,
      };

      if (onWorkflowCreated) {
        onWorkflowCreated(workflow);
      }
    } catch (error) {
      setError('Failed to save workflow');
      console.error('Error saving workflow:', error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, workflowName, workflowDescription, onWorkflowCreated]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <div className="bg-white shadow-lg rounded-lg border border-gray-200 mt-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Details</h3>
          
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <label htmlFor="workflow-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter workflow description"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Workflow'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 