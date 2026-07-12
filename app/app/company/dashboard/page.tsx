'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  location: string | null;
  address: string | null;
  status: string;
  cameraCount: number;
  userCount: number;
  activeAlertCount: number;
  safetyScore: number | null;
  hasAccess: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const cls =
    s === 'ACTIVE'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : s === 'MAINTENANCE'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s}
    </span>
  );
}

function SafetyRing({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-sm">N/A</span>;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center gap-1.5">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
        <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="600" fill={color}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-slate-400">Safety</span>
    </div>
  );
}

export default function CompanyDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user as any;
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      // Super admin has their own panel
      if (user?.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
        return;
      }
      fetchWorksites();
    }
  }, [status, session]);

  const fetchWorksites = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/company/worksites');
      const data = await res.json();
      if (data.success) {
        setWorksites(data.data);
      } else {
        setError(data.error || 'Failed to load worksites');
      }
    } catch {
      setError('Failed to load worksites');
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = (ws: Worksite) => {
    if (!ws.hasAccess) return;
    router.push(`/dashboard?worksite=${ws.id}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading worksites…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-sm text-center">
          <p className="text-red-400 font-medium mb-2">Something went wrong</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button onClick={fetchWorksites} className="mt-4 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const accessible = worksites.filter((w) => w.hasAccess);
  const locked = worksites.filter((w) => !w.hasAccess);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo / brand placeholder */}
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Nexxau</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              {user?.name || user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Select a Worksite</h1>
            <p className="text-slate-400 text-sm mt-1">
              {accessible.length === worksites.length
                ? `${worksites.length} site${worksites.length !== 1 ? 's' : ''} available`
                : `You have access to ${accessible.length} of ${worksites.length} site${worksites.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/company/worksites/create"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Worksite
            </Link>
          )}
        </div>

        {/* Accessible worksites */}
        {accessible.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="font-medium">No worksites assigned</p>
            <p className="text-sm mt-1">Contact your admin to get access to a site.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessible.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleEnter(ws)}
              className="group text-left bg-slate-800/60 border border-slate-700 hover:border-blue-500/60 hover:bg-slate-800 rounded-xl p-5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                    {ws.name}
                  </h3>
                  {ws.location && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{ws.location}</p>
                  )}
                </div>
                <StatusBadge status={ws.status} />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 mb-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">{ws.cameraCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs">{ws.userCount}</span>
                </div>
                {ws.activeAlertCount > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-medium">{ws.activeAlertCount} alert{ws.activeAlertCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="ml-auto">
                  <SafetyRing score={ws.safetyScore} />
                </div>
              </div>

              {/* Enter arrow */}
              <div className="flex items-center justify-end text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
                Enter worksite
                <svg className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}

          {/* Locked worksites — only shown to admins who can see the full company picture */}
          {isAdmin && locked.map((ws) => (
            <div
              key={ws.id}
              className="text-left bg-slate-800/20 border border-slate-700/40 rounded-xl p-5 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-400 truncate">{ws.name}</h3>
                  {ws.location && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{ws.location}</p>
                  )}
                </div>
                <StatusBadge status={ws.status} />
              </div>
              <div className="flex items-center gap-2 mt-4 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">No access assigned</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
