import { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/outline';
import Toast, { ToastType } from '../ui/Toast';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SavedWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      setToast({ message: 'Failed to fetch workflows', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      setWorkflows(workflows.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, enabled: !enabled }
          : workflow
      ));

      setToast({
        message: `Workflow ${enabled ? 'disabled' : 'enabled'} successfully`,
        type: 'success',
      });
    } catch (error) {
      setToast({ message: 'Failed to update workflow', type: 'error' });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      setWorkflows(workflows.filter(workflow => workflow.id !== workflowId));
      setToast({ message: 'Workflow deleted successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to delete workflow', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200">
      <div className="px-6 py-5">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Workflows</h3>
        
        {workflows.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No workflows saved yet</p>
        ) : (
          <div className="space-y-4">
            {workflows.map(workflow => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                  {workflow.description && (
                    <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleWorkflow(workflow.id, workflow.enabled)}
                    className={`p-2 rounded-md ${
                      workflow.enabled
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                  >
                    {workflow.enabled ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete workflow"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
} 