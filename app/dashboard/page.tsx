"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Sidebar from '@/src/components/dashboard/Sidebar';
import WorkflowBuilder from '@/src/components/workflow/WorkflowBuilder';
import ActiveAlertsTable from '@/src/components/dashboard/ActiveAlertsTable';
import AlertRulesConfig from '@/src/components/dashboard/AlertRulesConfig';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import PasswordProtect from '@/app/components/PasswordProtect';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <h2 className="text-2xl font-semibold mb-2 text-white">{title}</h2>
      <p>Content coming soon.</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 bg-gray-900">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [selected, setSelected] = useState('active-alerts');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchApproval() {
      if (session?.user?.email) {
        try {
          const res = await fetch(`/api/user/approved?email=${encodeURIComponent(session.user.email)}`);
          if (!res.ok) {
            throw new Error('Failed to fetch approval status');
          }
          const data = await res.json();
          setApproved(data.approved);
        } catch (err) {
          console.error('Error fetching approval status:', err);
          setError('Failed to load dashboard. Please try again later.');
        }
      }
    }
    fetchApproval();
  }, [session?.user?.email]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  if (!approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Account Pending Approval</h2>
          <p className="text-gray-400 mb-4">
            Your account is currently pending approval. Please contact our sales team to get started.
          </p>
          <a
            href="mailto:sales@nexxau.com"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Contact Sales
          </a>
        </div>
      </div>
    );
  }

  return (
    <PasswordProtect>
      <ErrorBoundary fallback={<ErrorDisplay error="Something went wrong" onRetry={() => window.location.reload()} />}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
          <Sidebar
            selected={selected}
            onSelect={(key) => setSelected(key)}
          />
          <main className="pl-64">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {selected === 'active-alerts' && <ActiveAlertsTable />}
                {selected === 'alert-rules' && <AlertRulesConfig />}
                {selected === 'workflow' && <WorkflowBuilder />}
                {selected === 'sites' && <Placeholder title="Sites Management" />}
                {selected === 'reports' && <Placeholder title="Reports" />}
              </div>
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </PasswordProtect>
  );
} 