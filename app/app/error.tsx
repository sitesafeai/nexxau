'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Catches runtime errors in the App Router tree (client + server-rendered children).
 * Keeps users on a friendly screen instead of a blank page or raw stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">
          An unexpected error occurred. You can try again, or return to the home page.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-left font-mono text-xs text-red-700 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
