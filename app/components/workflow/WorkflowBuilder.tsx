'use client';

import React from 'react';
import ReactFlow, { 
  Background,
  Controls,
  MiniMap,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialNodes = [],
  initialEdges = []
}) => {
  const [nodes, setNodes] = React.useState<Node[]>(initialNodes);
  const [edges, setEdges] = React.useState<Edge[]>(initialEdges);

  return (
    <div className="w-full h-[600px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          setNodes((nds) => {
            return nds.map((node) => {
              const change = changes.find((c) => c.id === node.id);
              if (change) {
                return { ...node, ...change };
              }
              return node;
            });
          });
        }}
        onEdgesChange={(changes) => {
          setEdges((eds) => {
            return eds.map((edge) => {
              const change = changes.find((c) => c.id === edge.id);
              if (change) {
                return { ...edge, ...change };
              }
              return edge;
            });
          });
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default WorkflowBuilder; 