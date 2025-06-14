"use client";
import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import WorkflowBuilder from '@/components/workflow/WorkflowBuilder';
import PublicActiveAlertsTable from '@/components/dashboard/PublicActiveAlertsTable';
import PublicAlertRulesConfig from '@/components/dashboard/PublicAlertRulesConfig';
import ErrorBoundary from '@/components/ErrorBoundary';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p>Content coming soon.</p>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 bg-white">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const [selected, setSelected] = useState('active-alerts');
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <ErrorBoundary fallback={<ErrorDisplay error="Something went wrong" onRetry={() => window.location.reload()} />}>
      <div className="min-h-screen bg-gray-100">
        <Sidebar
          selected={selected}
          onSelect={(key) => setSelected(key)}
        />
        <main className="pl-64">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {selected === 'active-alerts' && <PublicActiveAlertsTable />}
              {selected === 'alert-rules' && <PublicAlertRulesConfig />}
              {selected === 'workflow' && <WorkflowBuilder />}
              {selected === 'sites' && <Placeholder title="Sites Management" />}
              {selected === 'reports' && <Placeholder title="Reports" />}
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
} 