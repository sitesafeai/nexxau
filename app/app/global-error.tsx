'use client';

/**
 * Required when errors bubble past the root layout. Must define html/body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
          <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 px-8 py-10 shadow-xl">
            <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-400">
              The application hit a critical error. Please try again or return home.
            </p>
            {process.env.NODE_ENV === 'development' && error?.message && (
              <p className="mt-4 rounded-lg bg-slate-800 p-3 text-left font-mono text-xs text-amber-200 break-words">
                {error.message}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Try again
              </button>
              <a
                href="/"
                className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
