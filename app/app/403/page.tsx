'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { formatRoleLabel } from '../lib/roles';

function ForbiddenPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requiredRole = searchParams.get('requiredRole');
  const userRole = searchParams.get('userRole');

  const getErrorMessage = () => {
    if (requiredRole && userRole) {
      return `This page is only accessible to ${formatRoleLabel(requiredRole)}. You are currently logged in as ${formatRoleLabel(userRole)}.`;
    } else if (requiredRole) {
      return `This page is only accessible to ${formatRoleLabel(requiredRole)}.`;
    } else if (userRole) {
      return `You don't have permission to access this resource. Your current role is ${formatRoleLabel(userRole)}.`;
    }
    return 'You don't have permission to access this resource. Please contact your administrator if you believe this is an error.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-red-500/20 p-4 rounded-full">
              <Shield className="h-16 w-16 text-red-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl font-bold text-white mb-4">403</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Access Forbidden</h2>
          
          {/* Message */}
          <p className="text-slate-300 mb-8">
            {getErrorMessage()}
          </p>
          
          {/* Role Information */}
          {(requiredRole || userRole) && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600 text-left">
              {requiredRole && (
                <div className="mb-2">
                  <span className="text-slate-400 text-sm">Required Role: </span>
                  <span className="text-blue-400 font-semibold">{formatRoleLabel(requiredRole)}</span>
                </div>
              )}
              {userRole && (
                <div>
                  <span className="text-slate-400 text-sm">Your Role: </span>
                  <span className="text-amber-400 font-semibold">{formatRoleLabel(userRole)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ForbiddenPageContent />
    </Suspense>
  );
}

