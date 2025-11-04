'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Home, RefreshCcw } from 'lucide-react';

export default function ServerErrorPage() {
  const router = useRouter();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-yellow-500/20 p-4 rounded-full">
              <AlertTriangle className="h-16 w-16 text-yellow-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold text-white mb-4">500</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Server Error</h2>
          
          {/* Message */}
          <p className="text-slate-300 mb-8">
            Something went wrong on our end. We're working to fix it. Please try again in a moment.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh Page
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
              <Link
                href="/dashboard"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

