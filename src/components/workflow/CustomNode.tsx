'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ForkliftIcon, UserIcon, AlertIcon, SpeedIcon } from './WorkflowIcons';

const iconMap = {
  forklift: ForkliftIcon,
  person: UserIcon,
  alert: AlertIcon,
  speed: SpeedIcon,
};

const colorMap = {
  forklift: 'bg-blue-100 text-blue-600',
  person: 'bg-green-100 text-green-600',
  alert: 'bg-red-100 text-red-600',
  speed: 'bg-yellow-100 text-yellow-600',
};

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, unknown>;
}

export default memo(function CustomNode({ data }: NodeProps<NodeData>) {
  const Icon = iconMap[data.type as keyof typeof iconMap];
  const colorClass = colorMap[data.type as keyof typeof colorMap];

  return (
    <div className={`px-4 py-2 rounded-md shadow-md ${colorClass} relative`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center space-x-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}); 