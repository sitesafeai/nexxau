'use client';

import React from 'react';

interface WorkflowBuilderProps {
  onWorkflowCreated?: (workflow: any) => void;
}

export default function WorkflowBuilder({ onWorkflowCreated }: WorkflowBuilderProps) {
  // Temporarily disabled for build compatibility
  return (
    <div className="h-full w-full p-8 text-center">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Workflow Builder</h3>
        <p className="text-yellow-700">
          This component is temporarily disabled for production build compatibility.
          It will be re-enabled after resolving dependency issues.
        </p>
      </div>
    </div>
  );
} 