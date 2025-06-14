'use client';

import { useState } from 'react';
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import Toast, { ToastType } from '../ui/Toast';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
}

interface AIRuleCreatorProps {
  onRuleCreated?: (rule: AlertRule) => void;
}

export default function AIRuleCreator({ onRuleCreated }: AIRuleCreatorProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRule = async () => {
    if (!description.trim()) {
      setToast({ message: 'Please describe the rule you want to create', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/create-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error('Failed to create rule');
      }

      const data = await response.json();
      onRuleCreated?.(data);
      setDescription('');
      setToast({ message: 'Rule created successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to create rule. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRule = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate rule');
      }

      const rule: AlertRule = await response.json();

      if (onRuleCreated) {
        onRuleCreated(rule);
      }
    } catch (error) {
      setError('Failed to generate rule');
      console.error('Error generating rule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900">AI Rule Creator</h3>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 py-5 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Describe the safety rule you want to create in natural language. Our AI will help you create it.
            For example: "Alert me when a forklift gets within 10 feet of a person" or "Notify me if someone enters the restricted area without proper PPE".
          </p>
          <div className="space-y-6">
            <div>
              <label htmlFor="rule-description" className="block text-sm font-medium text-gray-700 mb-2">
                Describe your rule
              </label>
              <textarea
                id="rule-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Alert me when a forklift gets within 10 feet of a person"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateRule}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Rule...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="-ml-1 mr-2 h-4 w-4" />
                    Create Rule with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI Rule Generator</h3>
        
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerateRule}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Rule with AI'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 