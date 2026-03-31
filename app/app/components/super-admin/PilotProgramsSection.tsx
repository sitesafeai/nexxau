'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, CheckCircle2, Loader2, PlusCircle, XCircle } from 'lucide-react';

type PilotCompanyRow = {
  id: string;
  name: string;
  email?: string | null;
  companyUsername?: string | null;
  createdAt?: string;
  pilotEndsAt?: string | null;
  pilotStartedAt?: string | null;
};

export default function PilotProgramsSection({
  companies,
  loading,
  error,
  onRefresh,
}: {
  companies: PilotCompanyRow[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    companyEmail: '',
    handle: '',
    pilotDays: 30,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error' | null>(null);

  const pilotCompanies = useMemo(() => {
    const rows = (companies ?? []).filter((c) => c.pilotEndsAt);
    return rows.sort((a, b) => {
      const ta = a.pilotEndsAt ? new Date(a.pilotEndsAt).getTime() : 0;
      const tb = b.pilotEndsAt ? new Date(b.pilotEndsAt).getTime() : 0;
      return ta - tb;
    });
  }, [companies]);

  const now = Date.now();

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setFeedback(null);
    setFeedbackTone(null);
    setCreating(true);

    try {
      const name = form.name.trim();
      const email = form.companyEmail.trim().toLowerCase();
      const companyUsername = form.handle.trim();

      if (!name) throw new Error('Company name is required.');
      if (!email) throw new Error('Company email is required.');
      if (!Number.isFinite(form.pilotDays) || form.pilotDays <= 0) {
        throw new Error('Pilot days must be a positive number.');
      }

      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          companyUsername: companyUsername || undefined,
          pilotDurationDays: Number(form.pilotDays),
          pilotStartedAt: new Date().toISOString(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || `Failed to create pilot company (${response.status})`);
      }

      setFeedback(`Pilot company "${name}" created.`);
      setFeedbackTone('success');
      setForm({ name: '', companyEmail: '', handle: '', pilotDays: 30 });
      onRefresh();
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to create pilot company.');
      setFeedbackTone('error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePilotEndsAt = async (companyId: string, nextValue: string | null) => {
    setFeedback(null);
    setFeedbackTone(null);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilotEndsAt: nextValue,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.details || `Failed to update pilot (${response.status})`);
      }
      setFeedback(nextValue ? 'Pilot end date updated.' : 'Pilot cleared (converted).');
      setFeedbackTone('success');
      onRefresh();
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to update pilot settings.');
      setFeedbackTone('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Pilot programs</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create 30-day pilots and enforce tenant-wide access expiry.
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              feedbackTone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {feedback}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6">
        <h3 className="text-sm font-semibold text-slate-200">Create pilot company</h3>
        <p className="mt-1 text-xs text-slate-500">
          This creates a company with a pilot end date. Invite users from Onboarding or Users & Roles.
        </p>

        <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Acme Construction"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company email</label>
            <input
              value={form.companyEmail}
              onChange={(e) => setForm((p) => ({ ...p, companyEmail: e.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="ops@acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Handle (optional)</label>
            <input
              value={form.handle}
              onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="acme-construction"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilot length (days)</label>
            <input
              type="number"
              min={1}
              value={form.pilotDays}
              onChange={(e) => setForm((p) => ({ ...p, pilotDays: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Create pilot company
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Active and expired pilots</h3>
            <p className="mt-1 text-xs text-slate-500">
              Companies with a pilot end date set.
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800/60">
                  <th className="py-3 pr-4">Company</th>
                  <th className="py-3 pr-4">Pilot ends</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {pilotCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No pilot companies yet.
                    </td>
                  </tr>
                ) : (
                  pilotCompanies.map((c) => {
                    const endsAt = c.pilotEndsAt ? new Date(c.pilotEndsAt) : null;
                    const isExpired = endsAt ? endsAt.getTime() < now : false;
                    return (
                      <tr key={c.id} className="border-b border-slate-800/40">
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-white">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.email}</div>
                        </td>
                        <td className="py-4 pr-4 text-slate-300">
                          {endsAt ? endsAt.toLocaleString() : '—'}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                              isExpired
                                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {isExpired ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                                void handleUpdatePilotEndsAt(c.id, next);
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                            >
                              Extend 7d
                            </button>
                            <button
                              onClick={() => void handleUpdatePilotEndsAt(c.id, null)}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                            >
                              Convert (clear)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

