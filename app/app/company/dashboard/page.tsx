'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { normalizeRole } from '@/app/lib/roles';

// ─── types ────────────────────────────────────────────────────────────────────

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

interface CompanyUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActivated: boolean;
  createdAt: string;
  lastLogin: string | null;
  worksiteAccess: { worksiteId: string; worksite: { id: string; name: string } }[];
}

interface BillingData {
  company: {
    id: string; name: string; email: string; phone: string | null;
    address: string | null; createdAt: string; suspended: boolean;
    pilotStartedAt: string | null; pilotEndsAt: string | null;
  };
  billing: {
    status: 'pilot' | 'active' | 'expired' | 'unknown';
    statusDetail: string;
    latestRecord: { id: string; paidThrough: string | null; proofUrl: string | null; notes: string | null; createdAt: string } | null;
    history: { id: string; paidThrough: string | null; proofUrl: string | null; notes: string | null; createdAt: string }[];
  };
}

// ─── small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const cls =
    s === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : s === 'MAINTENANCE' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
  const r = 16; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ;
  return (
    <div className="flex items-center gap-1.5">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 20 20)" />
        <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="600" fill={color}>{Math.round(score)}</text>
      </svg>
      <span className="text-xs text-slate-400">Safety</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    COMPANY_ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    SITE_ADMIN: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    SUPERVISOR: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    WORKER: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    VIEWER: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${colors[role] || colors.VIEWER}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({
  worksites, companyId, currentUserId, onClose, onSuccess,
}: {
  worksites: Worksite[]; companyId: string; currentUserId: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ email: '', role: 'WORKER', worksiteId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          role: form.role,
          companyId,
          worksiteId: form.worksiteId || undefined,
          invitedBy: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send invite'); return; }
      onSuccess();
    } catch { setError('Failed to send invite'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Invite Team Member</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
            <input
              type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="teammate@company.com"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SITE_ADMIN">Site Admin — can manage one site</option>
              <option value="SUPERVISOR">Supervisor — can view and manage alerts</option>
              <option value="WORKER">Worker — view only</option>
              <option value="VIEWER">Viewer — read-only, no alerts</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Worksite access <span className="text-slate-500">(optional)</span></label>
            <select
              value={form.worksiteId}
              onChange={e => setForm(p => ({ ...p, worksiteId: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Company-wide access</option>
              {worksites.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm rounded-lg">Cancel</button>
          <button
            onClick={send} disabled={loading || !form.email}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Action Modal ─────────────────────────────────────────────────────────

function UserActionModal({
  user: initialUser,
  worksites,
  currentUserId,
  onClose,
  onRefresh,
}: {
  user: CompanyUser;
  worksites: Worksite[];
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [u, setU] = useState(initialUser);
  const [pendingRole, setPendingRole] = useState(initialUser.role);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [addSiteId, setAddSiteId] = useState('');

  const assignedIds = new Set(u.worksiteAccess.map(wa => wa.worksiteId));
  const availableToAdd = worksites.filter(ws => !assignedIds.has(ws.id));
  const neverLoggedIn = !u.lastLogin;

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    if (type === 'ok') setTimeout(() => setMsg(null), 3500);
  };

  const call = async (action: string, fn: () => Promise<Response>) => {
    setBusy(action); setMsg(null);
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok || !data.success) { flash('err', data.error || 'Something went wrong'); return null; }
      return data;
    } catch { flash('err', 'Request failed'); return null; }
    finally { setBusy(null); }
  };

  const doResetPassword = async () => {
    const data = await call('reset', () => fetch(`/api/company/users/${u.id}/reset-password`, { method: 'POST' }));
    if (data) flash('ok', 'Password reset email sent');
  };

  const doResendInvite = async () => {
    const data = await call('invite', () => fetch(`/api/company/users/${u.id}/resend-invite`, { method: 'POST' }));
    if (data) flash('ok', 'Invite email resent');
  };

  const doSaveRole = async () => {
    const data = await call('role', () =>
      fetch(`/api/company/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: pendingRole }),
      })
    );
    if (data) { setU(prev => ({ ...prev, role: pendingRole })); flash('ok', 'Role updated'); onRefresh(); }
  };

  const doToggleStatus = async () => {
    const next = !u.isActivated;
    const data = await call('status', () =>
      fetch(`/api/company/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActivated: next }),
      })
    );
    if (data) { setU(prev => ({ ...prev, isActivated: next })); flash('ok', next ? 'Account reactivated' : 'Account deactivated'); onRefresh(); }
  };

  const doRemoveWorksite = async (worksiteId: string) => {
    const data = await call(`rmws-${worksiteId}`, () =>
      fetch(`/api/company/users/${u.id}/worksite-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: [worksiteId] }),
      })
    );
    if (data) { setU(prev => ({ ...prev, worksiteAccess: prev.worksiteAccess.filter(wa => wa.worksiteId !== worksiteId) })); onRefresh(); }
  };

  const doAddWorksite = async () => {
    if (!addSiteId) return;
    const ws = worksites.find(w => w.id === addSiteId);
    const data = await call('addws', () =>
      fetch(`/api/company/users/${u.id}/worksite-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: [addSiteId] }),
      })
    );
    if (data && ws) {
      setU(prev => ({ ...prev, worksiteAccess: [...prev.worksiteAccess, { worksiteId: ws.id, worksite: { id: ws.id, name: ws.name } }] }));
      setAddSiteId('');
      onRefresh();
    }
  };

  const doRemoveFromCompany = async () => {
    if (!confirm(`Remove ${u.name || u.email} from the company? This will revoke all their access.`)) return;
    const data = await call('remove', () => fetch(`/api/company/users?userId=${u.id}`, { method: 'DELETE' }));
    if (data) { onRefresh(); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-lg font-semibold text-slate-200 shrink-0">
              {(u.name || u.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{u.name || '—'}</p>
              <p className="text-sm text-slate-400 truncate">{u.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <RoleBadge role={u.role} />
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${u.isActivated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {u.isActivated ? 'Active' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          {msg && (
            <div className={`mx-6 mt-4 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
              msg.type === 'ok'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {msg.type === 'ok'
                ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              }
              {msg.text}
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Account actions */}
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Account</h4>
              <div className="flex flex-wrap gap-2">
                {u.isActivated ? (
                  <button
                    onClick={doResetPassword}
                    disabled={busy === 'reset'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {busy === 'reset' ? 'Sending…' : 'Send Password Reset'}
                  </button>
                ) : neverLoggedIn ? (
                  <button
                    onClick={doResendInvite}
                    disabled={busy === 'invite'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {busy === 'invite' ? 'Sending…' : 'Resend Invite'}
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 py-1">Account was deactivated — use the Reactivate button below to restore access.</p>
                )}
              </div>
            </section>

            {/* Role */}
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Role</h4>
              <div className="flex items-center gap-2">
                <select
                  value={pendingRole}
                  onChange={e => setPendingRole(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SITE_ADMIN">Site Admin</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="WORKER">Worker</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  onClick={doSaveRole}
                  disabled={pendingRole === u.role || busy === 'role'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {busy === 'role' ? '…' : 'Save'}
                </button>
              </div>
            </section>

            {/* Status */}
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</h4>
              <div className="flex items-center justify-between p-3 bg-slate-700/40 rounded-lg border border-slate-700">
                <div className="min-w-0 mr-4">
                  <p className="text-sm text-white">{u.isActivated ? 'Account is active' : 'Account is deactivated'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {u.isActivated ? 'User can log in and access their worksites' : 'User cannot log in until reactivated'}
                  </p>
                </div>
                <button
                  onClick={doToggleStatus}
                  disabled={busy === 'status'}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                    u.isActivated
                      ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                      : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {busy === 'status' ? '…' : u.isActivated ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </section>

            {/* Worksite Access */}
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Worksite Access</h4>
              {u.worksiteAccess.length === 0 ? (
                <p className="text-sm text-slate-400 italic px-1 mb-3">Company-wide access — not restricted to specific sites</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {u.worksiteAccess.map(wa => (
                    <div key={wa.worksiteId} className="flex items-center justify-between px-3 py-2 bg-slate-700/40 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-300">{wa.worksite.name}</span>
                      <button
                        onClick={() => doRemoveWorksite(wa.worksiteId)}
                        disabled={!!busy}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {busy === `rmws-${wa.worksiteId}` ? '…' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {availableToAdd.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={addSiteId}
                    onChange={e => setAddSiteId(e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Add to a worksite…</option>
                    {availableToAdd.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={doAddWorksite}
                    disabled={!addSiteId || busy === 'addws'}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {busy === 'addws' ? '…' : '+ Add'}
                  </button>
                </div>
              )}
            </section>

            {/* Danger zone */}
            {u.id !== currentUserId && (
              <section>
                <h4 className="text-xs font-semibold text-red-500/60 uppercase tracking-wider mb-3">Danger Zone</h4>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Remove from company</p>
                    <p className="text-xs text-slate-400 mt-0.5">Revokes all access and deactivates this account</p>
                  </div>
                  <button
                    onClick={doRemoveFromCompany}
                    disabled={busy === 'remove'}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {busy === 'remove' ? '…' : 'Remove'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Worksites ────────────────────────────────────────────────────────────

function WorksiteTabsGuide() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (key: string) => setOpenKey(prev => prev === key ? null : key);

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      iconBg: 'bg-blue-500/15 text-blue-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" /></svg>,
      description: "The site's home screen. Shows a live safety score ring, camera thumbnail previews, today's alert count, and team presence. The fastest way to take the pulse of a worksite at a glance.",
      tips: ['Click any camera thumbnail to jump straight to that feed in the Cameras tab', 'The safety score updates in real time as alerts are resolved'],
    },
    {
      key: 'cameras',
      label: 'Cameras',
      iconBg: 'bg-cyan-500/15 text-cyan-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      description: 'View and manage all cameras at this site. See live feeds, check detection status, browse recent snapshots, and add or remove cameras. A red dot on a camera means it has gone offline or stopped sending detections.',
      tips: ['Cameras showing "No signal" are offline — check the device connection', 'You can rename cameras and assign them to specific zones here'],
    },
    {
      key: 'sites',
      label: 'Site Management',
      iconBg: 'bg-slate-400/15 text-slate-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      description: "Configure this site's details: address, contact info, zones, and which team members have access. Admins can also manage per-site user roles from here.",
      tips: ['Site roles set here override the company-level role for that user on this site only', 'Adding a zone lets you tie alert rules to a specific area of the site'],
    },
    {
      key: 'alerts',
      label: 'Alerts',
      iconBg: 'bg-amber-500/15 text-amber-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      description: 'Browse and resolve safety alerts. Each alert shows the timestamp, which rule triggered it, the camera involved, and (if configured) an attached video clip. You can filter by status, type, or date range and bulk-resolve.',
      tips: ['Unresolved alerts drag down the safety score — resolve or dismiss them promptly', 'Click an alert to see the video clip if one was captured'],
    },
    {
      key: 'alert-rules',
      label: 'Alert Rules',
      iconBg: 'bg-orange-500/15 text-orange-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
      description: 'Define exactly what triggers an alert. Set rules like "no hard hat detected" or "person in restricted zone" with confidence thresholds, time-of-day filters, and which cameras to watch. Rules can be toggled on/off without deleting them.',
      tips: ['Lower confidence threshold = more alerts, fewer misses; higher = fewer alerts, more precision', 'Time-of-day filters are useful for areas that are legitimately empty at night'],
    },
    {
      key: 'reports',
      label: 'Reports',
      iconBg: 'bg-purple-500/15 text-purple-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      description: 'Generate and export safety reports. Covers compliance trends, alert frequency by type, camera uptime, and a safety score breakdown over time. Reports can be exported as PDFs for insurance or compliance submissions.',
      tips: ['Run a weekly report to catch patterns before they become incidents', 'PDF exports are formatted for insurance and compliance submissions'],
    },
    {
      key: 'workflows',
      label: 'Workflows',
      iconBg: 'bg-indigo-500/15 text-indigo-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      description: 'Automate responses to alerts without writing code. Build chains like "when a PPE violation is detected → send SMS to the site supervisor → create a report entry." Workflows run in the background the moment an alert fires.',
      tips: ['Start with a simple SMS notification workflow before building complex chains', 'Workflows can be paused temporarily without deleting them'],
    },
    {
      key: 'settings',
      label: 'Settings',
      iconBg: 'bg-slate-500/15 text-slate-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      description: 'Site-level configuration: default notification preferences, SMS recipient lists, third-party integrations (insurance portals, etc.), and camera detection sensitivity defaults. Changes here affect the whole site.',
      tips: ['Set SMS recipients here so supervisors get notified even if they\'re not logged in', 'Integration settings connect this site to insurance or compliance platforms'],
    },
    {
      key: 'audit',
      label: 'Audit Log',
      iconBg: 'bg-rose-500/15 text-rose-400',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      description: 'A tamper-evident record of everything that happened at this site: logins, alert creations and resolutions, rule changes, camera additions, and system events. Filterable by category, user, or date.',
      tips: ['Use the audit log if you need to prove compliance — it\'s the authoritative record', 'Filter by "User Activity" to see who made changes and when'],
    },
  ];

  return (
    <div className="mt-5 pt-4 border-t border-slate-700/30">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Inside each worksite</p>
      <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl overflow-hidden divide-y divide-slate-700/30">
        {tabs.map(t => (
          <div key={t.key}>
            <button
              onClick={() => toggle(t.key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${t.iconBg}`}>
                {t.icon}
              </div>
              <span className="flex-1 text-sm font-medium text-slate-300">{t.label}</span>
              <svg
                className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 shrink-0 ${openKey === t.key ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openKey === t.key && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-700/30">
                <p className="text-sm text-slate-400 leading-relaxed mb-2.5">{t.description}</p>
                <ul className="space-y-1.5">
                  {t.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="mt-0.5 shrink-0 text-slate-600">›</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorksitesTab({ worksites, isAdmin }: { worksites: Worksite[]; isAdmin: boolean }) {
  const accessible = worksites.filter(w => w.hasAccess);
  const locked = worksites.filter(w => !w.hasAccess);

  const enter = (ws: Worksite) => {
    if (!ws.hasAccess) return;
    window.location.href = `/dashboard?worksite=${ws.id}`;
  };

  if (accessible.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="font-medium">No worksites assigned</p>
        <p className="text-sm mt-1">Contact your admin to get access to a site.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Link href="/company/worksites/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Worksite
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessible.map(ws => (
          <button key={ws.id} onClick={() => enter(ws)}
            className="group text-left bg-slate-800/60 border border-slate-700 hover:border-blue-500/60 hover:bg-slate-800 rounded-xl p-5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{ws.name}</h3>
                {ws.location && <p className="text-xs text-slate-400 mt-0.5 truncate">{ws.location}</p>}
              </div>
              <StatusBadge status={ws.status} />
            </div>
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
              <div className="ml-auto"><SafetyRing score={ws.safetyScore} /></div>
            </div>
            <div className="flex items-center justify-end text-xs text-slate-500 group-hover:text-blue-400 transition-colors">
              Enter worksite
              <svg className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
        {isAdmin && locked.map(ws => (
          <div key={ws.id} className="text-left bg-slate-800/20 border border-slate-700/40 rounded-xl p-5 opacity-50 cursor-not-allowed">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-400 truncate">{ws.name}</h3>
                {ws.location && <p className="text-xs text-slate-500 mt-0.5 truncate">{ws.location}</p>}
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
  );
}

// ─── Tab: Team ─────────────────────────────────────────────────────────────────

function TeamTab({
  users, worksites, companyId, currentUserId, isAdmin, onRefresh,
}: {
  users: CompanyUser[]; worksites: Worksite[]; companyId: string;
  currentUserId: string; isAdmin: boolean; onRefresh: () => void;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);

  return (
    <div className="space-y-4">
      {inviteSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Invite sent — they'll receive an email with a link to join.
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <button onClick={() => { setShowInvite(true); setInviteSuccess(false); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </button>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/40 border-b border-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Sites</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {users.map(u => (
              <tr
                key={u.id}
                onClick={() => isAdmin && setSelectedUser(u)}
                className={`hover:bg-slate-700/20 transition-colors ${isAdmin ? 'cursor-pointer' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300 shrink-0">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm text-slate-400">
                    {u.worksiteAccess.length === 0 ? 'All sites' : u.worksiteAccess.map(wu => wu.worksite.name).join(', ')}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm text-slate-400">{timeAgo(u.lastLogin)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${u.isActivated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                    {u.isActivated ? 'Active' : 'Pending'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Manage →</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteModal
          worksites={worksites} companyId={companyId} currentUserId={currentUserId}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); setInviteSuccess(true); onRefresh(); }}
        />
      )}

      {selectedUser && isAdmin && (
        <UserActionModal
          user={selectedUser}
          worksites={worksites}
          currentUserId={currentUserId}
          onClose={() => setSelectedUser(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Tab: Billing ──────────────────────────────────────────────────────────────

function BillingTab({ data }: { data: BillingData }) {
  const { company, billing } = data;

  const statusColor = {
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    pilot: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    expired: 'bg-red-500/15 text-red-400 border-red-500/30',
    unknown: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }[billing.status];

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Subscription Status</p>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${statusColor}`}>
              {billing.status === 'active' ? '✓ Active' : billing.status === 'pilot' ? '⏱ Pilot' : billing.status === 'expired' ? '✗ Expired' : 'Unknown'}
            </span>
            {billing.statusDetail && <p className="text-sm text-slate-400 mt-2">{billing.statusDetail}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Member since</p>
            <p className="text-sm text-slate-300">{new Date(company.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {billing.status === 'expired' && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            Your subscription has expired. Contact your account manager to renew.
          </div>
        )}

        {company.pilotEndsAt && billing.status === 'pilot' && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
            You're on a pilot plan. Reach out to your account manager before {new Date(company.pilotEndsAt).toLocaleDateString()} to convert to a paid subscription.
          </div>
        )}
      </div>

      {/* Company info */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Company Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            ['Company name', company.name],
            ['Billing email', company.email],
            ['Phone', company.phone || '—'],
            ['Address', company.address || '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-slate-300">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      {billing.history.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Payment History</h3>
          </div>
          <table className="w-full">
            <thead className="bg-slate-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Paid Through</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {billing.history.map(r => (
                <tr key={r.id} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-sm text-slate-300">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {r.paidThrough ? new Date(r.paidThrough).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    {r.proofUrl
                      ? <a href={r.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">View</a>
                      : <span className="text-slate-500 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {billing.history.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-sm">No payment records on file yet.</div>
      )}
    </div>
  );
}

// ─── Tab: Guide ────────────────────────────────────────────────────────────────

function GuideTab({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set(['worksites']));

  const toggle = (key: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  type Section = {
    key: string;
    iconBg: string;
    badge: string | null;
    badgeCls: string;
    icon: React.ReactNode;
    label: string;
    description: string;
    tips: string[];
  };

  const sections: Section[] = [
    {
      key: 'worksites',
      iconBg: 'bg-blue-500/15 text-blue-400',
      badge: null,
      badgeCls: '',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      label: 'Worksites',
      description: "View and enter all your company's construction sites. Each card shows the camera count, active team members, live safety alerts, and a real-time safety score. Click any card to open that site's full dashboard.",
      tips: [
        'Safety score below 60 turns red — investigate active alerts first',
        'Cards without a score mean no camera data is available for that site yet',
        'Locked cards mean you don\'t have access — contact your admin to be added',
      ],
    },
    ...(isAdmin ? [
      {
        key: 'team',
        iconBg: 'bg-purple-500/15 text-purple-400',
        badge: 'Admin only',
        badgeCls: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        label: 'Team',
        description: "Manage everyone in your company. Click any member's row to open their management panel — from there you can change their role, reset their password, resend a pending invite, deactivate their account, or adjust which worksites they can access. Use \"Invite Member\" to add new people by email.",
        tips: [
          'Pending members haven\'t accepted their invite yet — click their row and hit Resend Invite',
          'Deactivating a user blocks their login immediately without deleting their account',
          'Worksite access empty = company-wide; listed sites = restricted to those sites only',
          'Role changes take effect on their next page load',
        ],
      },
      {
        key: 'billing',
        iconBg: 'bg-emerald-500/15 text-emerald-400',
        badge: 'Admin only',
        badgeCls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        ),
        label: 'Billing',
        description: 'Check your subscription status (Pilot, Active, or Expired), see payment history, and upload proof of payment when renewing. During a pilot period, contact your account manager before the expiry date to convert to a paid plan without service interruption.',
        tips: [
          'Pilot plans have an expiry date — your team loses access if it lapses without renewal',
          'Upload a PDF or image of your paid invoice as proof of payment',
          'Contact your account manager early if your pilot is running out',
        ],
      },
    ] as Section[] : []),
    {
      key: 'roles',
      iconBg: 'bg-amber-500/15 text-amber-400',
      badge: null,
      badgeCls: '',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: 'Roles & Permissions',
      description: '',
      tips: [],
    },
  ];

  const roleRows = [
    { key: 'COMPANY_ADMIN', desc: 'Full access — manages team, billing, and all worksites' },
    { key: 'SITE_ADMIN', desc: 'Manages assigned worksites — no billing or team tab' },
    { key: 'SUPERVISOR', desc: 'Views and responds to alerts on their assigned sites' },
    { key: 'WORKER', desc: 'Read-only access to their assigned worksite' },
    { key: 'VIEWER', desc: 'Read-only access, no alert notifications' },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Dashboard Guide</h2>
        <p className="text-sm text-slate-400 mt-1">Click any section to expand it.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden divide-y divide-slate-700/40">
        {sections.map(s => (
          <div key={s.key}>
            <button
              onClick={() => toggle(s.key)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700/30 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
                {s.icon}
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-white">{s.label}</span>
                {s.badge && (
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${s.badgeCls}`}>
                    {s.badge}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${open.has(s.key) ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open.has(s.key) && (
              <div className="border-t border-slate-700/40 px-5 pb-5 pt-4">
                {s.key === 'roles' ? (
                  <div className="space-y-1">
                    {roleRows.map(r => (
                      <div key={r.key} className="flex items-start gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
                        <div className="shrink-0 mt-0.5"><RoleBadge role={r.key} /></div>
                        <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">{s.description}</p>
                    {s.tips.length > 0 && (
                      <ul className="space-y-2">
                        {s.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                            <span className="mt-0.5 shrink-0 text-slate-600">›</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.key === 'worksites' && <WorksiteTabsGuide />}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function CompanyDashboard() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const userRole = normalizeRole(user?.role); // normalizes casing + aliases (ADMIN → COMPANY_ADMIN)
  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole);

  const [tab, setTab] = useState<'worksites' | 'team' | 'billing' | 'guide'>('worksites');
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      // Stale JWT (issued before role was stored) — force a server-side refresh
      // so the re-hydration logic in auth.ts runs and patches the cookie.
      if (!user?.role) {
        update();
        return;
      }
      if (userRole === 'SUPER_ADMIN') { router.push('/super-admin'); return; }
      fetchBase();
    }
  }, [status, user?.role]);

  const fetchBase = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/company/worksites');
      const data = await res.json();
      if (data.success) setWorksites(data.data);
      else setError(data.error || 'Failed to load');
    } catch { setError('Failed to load worksites'); }
    finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/company/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch { /* silent */ }
  }, [isAdmin]);

  const fetchBilling = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/company/billing');
      const data = await res.json();
      if (data.success) setBilling(data.data);
    } catch { /* silent */ }
  }, [isAdmin]);

  useEffect(() => { if (tab === 'team') fetchUsers(); }, [tab, fetchUsers]);
  useEffect(() => { if (tab === 'billing') fetchBilling(); }, [tab, fetchBilling]);

  const tabs = [
    { key: 'worksites', label: 'Worksites' },
    ...(isAdmin ? [{ key: 'team', label: 'Team' }, { key: 'billing', label: 'Billing' }] : []),
    { key: 'guide', label: 'Guide' },
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
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
          <button onClick={fetchBase} className="mt-4 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Nexxau</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.name || user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-slate-400 hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{user?.companyId ? 'Manage your worksites, team, and account' : 'Select a worksite to get started'}</p>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="border-b border-slate-700/50 mb-8">
            <div className="flex space-x-1">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? 'text-blue-400 border-blue-500'
                      : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab content */}
        {tab === 'worksites' && <WorksitesTab worksites={worksites} isAdmin={isAdmin} />}
        {tab === 'team' && (
          <TeamTab
            users={users} worksites={worksites}
            companyId={user?.companyId || ''} currentUserId={user?.id || ''}
            isAdmin={isAdmin} onRefresh={fetchUsers}
          />
        )}
        {tab === 'billing' && billing && <BillingTab data={billing} />}
        {tab === 'billing' && !billing && (
          <div className="text-center py-20 text-slate-500 text-sm">Loading billing info…</div>
        )}
        {tab === 'guide' && <GuideTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
