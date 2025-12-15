'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { formatRoleLabel } from '../lib/roles';

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const requiredRole = searchParams.get('requiredRole');
  const userRole = searchParams.get('userRole');

  const handleGoBack = () => {
    window.history.back();
  };

  const getErrorMessage = () => {
    if (requiredRole && userRole) {
      return `This page is only accessible to ${formatRoleLabel(requiredRole)}. You are currently logged in as ${formatRoleLabel(userRole)}.`;
    } else if (requiredRole) {
      return `This page is only accessible to ${formatRoleLabel(requiredRole)}.`;
    } else if (userRole) {
      return `You don't have permission to access this page. Your current role is ${formatRoleLabel(userRole)}.`;
    }
    return 'You don't have permission to access this page.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            {getErrorMessage()}
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            {/* Role Information */}
            {(requiredRole || userRole) && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                {requiredRole && (
                  <div className="mb-2">
                    <span className="text-gray-600 text-sm font-medium">Required Role: </span>
                    <span className="text-blue-600 font-semibold">{formatRoleLabel(requiredRole)}</span>
                  </div>
                )}
                {userRole && (
                  <div>
                    <span className="text-gray-600 text-sm font-medium">Your Role: </span>
                    <span className="text-amber-600 font-semibold">{formatRoleLabel(userRole)}</span>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 mb-2">Why did this happen?</h3>
              <p className="text-sm text-gray-600">
                {requiredRole && userRole 
                  ? `This page requires the ${formatRoleLabel(requiredRole)} role, but you are logged in as ${formatRoleLabel(userRole)}.`
                  : 'This page requires specific permissions or a different user role than what you currently have.'}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">What can you do?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Contact your administrator for access</li>
                <li>• Check if you're logged in with the correct account</li>
                <li>• Return to the dashboard</li>
                <li>• Go back to the previous page</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/dashboard"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={handleGoBack}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Forbidden() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ForbiddenContent />
    </Suspense>
  );
} 