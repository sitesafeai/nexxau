'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Segment error UI for /super-admin (matches dark dashboard chrome).
 */
export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[super-admin error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 px-8 py-10 shadow-xl">
        <h1 className="text-xl font-semibold text-white">Super Admin — something went wrong</h1>
        <p className="mt-3 text-sm text-slate-400">
          A client error stopped this page from rendering. Try again or leave this section.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-left font-mono text-xs text-red-200 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
