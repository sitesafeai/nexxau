'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ImpersonateInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing impersonation token.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await signIn('credentials', {
          impersonationToken: token,
          redirect: false,
        });

        if (cancelled) return;

        if (result?.error) {
          setError('Impersonation failed. The link may have expired — request a new one from Support.');
          setStatus('error');
          return;
        }

        const session = await getSession();
        if (cancelled) return;

        const role = (session?.user as { role?: string })?.role?.toUpperCase();
        setStatus('done');
        if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') {
          router.replace('/super-admin');
        } else {
          router.replace('/dashboard');
        }
      } catch {
        if (!cancelled) {
          setError('Something went wrong during impersonation.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <h1 className="text-xl font-semibold text-white mb-2">Impersonation failed</h1>
          <p className="text-sm text-red-300 mb-6">{error}</p>
          <Link
            href="/super-admin"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Super Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-slate-300">
          {status === 'done' ? 'Redirecting…' : 'Opening session…'}
        </p>
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
          <p className="text-slate-300">Loading…</p>
        </div>
      }
    >
      <ImpersonateInner />
    </Suspense>
  );
}
