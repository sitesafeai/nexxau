'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Flag,
  Clock,
  Shield,
  Ban,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FpAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  fpReason: string | null;
  violationType: string | null;
  detectionSnapshot: string | null;
  createdAt: string;
  worksite: { id: string; name: string } | null;
  camera:   { id: string; name: string } | null;
}

interface DisputeMessage {
  id: string;
  authorId: string;
  authorRole: 'SUPER_ADMIN' | 'COMPANY';
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
}

interface FpDispute {
  id: string;
  reason: string;
  status: string;
  resolvedNote: string | null;
  createdAt: string;
  submittedBy: { id: string; name: string | null; email: string };
  messages: DisputeMessage[];
}

interface FpReview {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  superAdminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  alert: FpAlert;
  markedBy:   { id: string; name: string | null; email: string };
  reviewedBy: { id: string; name: string | null; email: string } | null;
  disputes: FpDispute[];
}

type TabStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';

const SEV_COLOR: Record<string, string> = {
  HIGH:   'text-red-400 bg-red-900/30 border border-red-700',
  MEDIUM: 'text-yellow-400 bg-yellow-900/30 border border-yellow-700',
  LOW:    'text-slate-300 bg-slate-700 border border-slate-600',
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'bg-amber-600',  icon: Clock        },
  CONFIRMED: { label: 'Confirmed', color: 'bg-red-600',    icon: AlertTriangle },
  DISMISSED: { label: 'Dismissed', color: 'bg-green-700',  icon: CheckCircle2 },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function FalsePositivesTab() {
  const [tab, setTab]         = useState<TabStatus>('PENDING');
  const [reviews, setReviews] = useState<FpReview[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Selected review for the side panel
  const [selected, setSelected] = useState<FpReview | null>(null);

  // Review action state
  const [noteText, setNoteText]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMsg, setActionMsg]   = useState<string | null>(null);

  // Dispute thread state
  const [disputeReplyText, setDisputeReplyText] = useState('');
  const [disputeAction, setDisputeAction]       = useState<'REPLY' | 'UPHELD' | 'REJECTED' | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeMsg, setDisputeMsg]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fp-reviews?status=${tab}&limit=50`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setReviews(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setSelected(null);
    setNoteText('');
    setActionMsg(null);
    setDisputeReplyText('');
    setDisputeAction(null);
    setDisputeMsg(null);
  }, [tab]);

  const submitDisputeAction = async (d: FpDispute, action: 'REPLY' | 'UPHELD' | 'REJECTED') => {
    if (!selected) return;
    if (!disputeReplyText.trim()) { setDisputeMsg('Error: A message is required'); return; }
    setDisputeSubmitting(true);
    setDisputeMsg(null);
    try {
      const res = await fetch(`/api/admin/fp-reviews/${selected.id}/dispute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeId: d.id, action, message: disputeReplyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setDisputeMsg(
        action === 'UPHELD' ? 'Dispute accepted — ruling reversed to false positive.' :
        action === 'REJECTED' ? 'Dispute rejected — original ruling stands.' :
        'Reply sent.'
      );
      setDisputeReplyText('');
      setDisputeAction(null);
      load();
    } catch (e: any) {
      setDisputeMsg(`Error: ${e.message}`);
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const submitReview = async (action: 'CONFIRMED' | 'DISMISSED') => {
    if (!selected) return;
    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/fp-reviews/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: noteText.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setActionMsg(`Review ${action === 'CONFIRMED' ? 'confirmed' : 'dismissed'} successfully.`);
      setSelected(null);
      setNoteText('');
      load();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* ── Left: list ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header + tabs */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">False Positive Review Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Alerts flagged by company admins — confirm or dismiss each one
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
          {(['PENDING', 'CONFIRMED', 'DISMISSED'] as TabStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === s
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {actionMsg && (
          <div className="text-sm px-4 py-2 rounded bg-slate-700 text-slate-200 border border-slate-600">
            {actionMsg}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={load} className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                Retry
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No {tab.toLowerCase()} reviews
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Alert</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Worksite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Flagged by</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">Disputes</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => { setSelected(r); setNoteText(''); setActionMsg(null); }}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === r.id ? 'bg-slate-700' : 'hover:bg-slate-750'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white truncate max-w-[200px]">{r.alert.title}</div>
                      {r.alert.fpReason && (
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.alert.fpReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{r.alert.worksite?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{r.markedBy.name ?? r.markedBy.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEV_COLOR[r.alert.severity] ?? SEV_COLOR.LOW}`}>
                        {r.alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {r.disputes.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-700/50 text-amber-300 font-medium">
                          {r.disputes.length} dispute{r.disputes.length > 1 ? 's' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="pr-3 text-slate-500">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500">{total} total in this queue</p>
      </div>

      {/* ── Right: review panel ───────────────────────────────────────────── */}
      {selected && (
        <div className="w-96 shrink-0 bg-slate-800 rounded-lg p-5 space-y-5 self-start sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-white leading-snug">{selected.alert.title}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-white shrink-0"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Snapshot */}
          {selected.alert.detectionSnapshot && (
            <img
              src={selected.alert.detectionSnapshot}
              alt="Detection snapshot"
              className="w-full rounded object-cover max-h-40"
            />
          )}

          {/* Details */}
          <div className="space-y-2 text-sm">
            <Row label="Worksite"   value={selected.alert.worksite?.name ?? '—'} />
            <Row label="Camera"     value={selected.alert.camera?.name   ?? '—'} />
            <Row label="Type"       value={selected.alert.violationType  ?? '—'} />
            <Row label="Severity"   value={selected.alert.severity} />
            <Row label="FP reason"  value={selected.alert.fpReason ?? 'No reason given'} />
            <Row label="Flagged by" value={`${selected.markedBy.name ?? selected.markedBy.email}`} />
            <Row label="Alert date" value={new Date(selected.alert.createdAt).toLocaleString()} />
            {selected.reviewedBy && (
              <Row label="Reviewed by" value={selected.reviewedBy.name ?? selected.reviewedBy.email} />
            )}
            {selected.superAdminNote && (
              <div className="pt-1">
                <p className="text-xs text-slate-400 mb-0.5">Nexxau note</p>
                <p className="text-slate-200 bg-slate-700 rounded p-2 text-xs">{selected.superAdminNote}</p>
              </div>
            )}
          </div>

          {/* Disputes — threaded conversation */}
          {selected.disputes.length > 0 && selected.disputes.map((d) => (
            <div key={d.id} className="space-y-3 pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Dispute Thread
                </p>
                <DisputeStatusBadge status={d.status} />
              </div>

              {/* Messages */}
              <div className="space-y-2">
                {(d.messages ?? []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded p-3 text-xs ${
                      msg.authorRole === 'SUPER_ADMIN'
                        ? 'bg-blue-900/30 border border-blue-700'
                        : 'bg-slate-700 border border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${msg.authorRole === 'SUPER_ADMIN' ? 'text-blue-300' : 'text-slate-300'}`}>
                        {msg.authorRole === 'SUPER_ADMIN' ? '⚡ Nexxau' : (msg.author.name ?? msg.author.email)}
                      </span>
                      <span className="text-slate-500">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Super-admin reply/resolve area — only for PENDING disputes */}
              {d.status === 'PENDING' && (
                <div className="space-y-2">
                  {disputeMsg && (
                    <p className={`text-xs ${disputeMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                      {disputeMsg}
                    </p>
                  )}

                  {/* Pick action first */}
                  {!disputeAction && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setDisputeAction('REPLY')}
                        className="px-2 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs font-medium rounded transition-colors"
                      >
                        💬 Reply
                      </button>
                      <button
                        onClick={() => setDisputeAction('UPHELD')}
                        className="px-2 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 text-xs font-medium rounded transition-colors"
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={() => setDisputeAction('REJECTED')}
                        className="px-2 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 text-xs font-medium rounded transition-colors"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  {disputeAction && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${
                          disputeAction === 'UPHELD' ? 'text-green-400' :
                          disputeAction === 'REJECTED' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {disputeAction === 'UPHELD' ? '✅ Accept dispute' :
                           disputeAction === 'REJECTED' ? '❌ Reject dispute' : '💬 Reply'}
                        </span>
                        <button onClick={() => { setDisputeAction(null); setDisputeReplyText(''); }} className="text-xs text-slate-500 hover:text-slate-300">
                          cancel
                        </button>
                      </div>
                      <textarea
                        value={disputeReplyText}
                        onChange={(e) => setDisputeReplyText(e.target.value)}
                        rows={3}
                        placeholder={
                          disputeAction === 'UPHELD' ? 'Explain why you\'re accepting the dispute...' :
                          disputeAction === 'REJECTED' ? 'Explain why the ruling stands...' :
                          'Your reply to the company admin...'
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => submitDisputeAction(d, disputeAction)}
                        disabled={disputeSubmitting || !disputeReplyText.trim()}
                        className={`w-full py-2 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                          disputeAction === 'UPHELD' ? 'bg-green-700 hover:bg-green-600' :
                          disputeAction === 'REJECTED' ? 'bg-red-700 hover:bg-red-600' :
                          'bg-blue-700 hover:bg-blue-600'
                        }`}
                      >
                        {disputeSubmitting ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Action area — only for PENDING reviews */}
          {selected.status === 'PENDING' && (
            <div className="space-y-3 pt-2 border-t border-slate-700">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Note (optional — shown to company admin)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="e.g. PPE was not present — video confirmed"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => submitReview('CONFIRMED')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Confirm real
                </button>
                <button
                  onClick={() => submitReview('DISMISSED')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Dismiss FP
                </button>
              </div>

              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">Confirm real</strong> — it WAS a real violation; the FP flag was wrong. The company admin will see your note and can dispute.<br />
                <strong className="text-slate-400">Dismiss FP</strong> — you agree it was a false positive. No further action needed.
              </p>

              {actionMsg && (
                <p className={`text-xs ${actionMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {actionMsg}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-slate-200 break-words">{value}</span>
    </div>
  );
}

function DisputeStatusBadge({ status }: { status: string }) {
  if (status === 'PENDING')  return <span className="px-1.5 py-0.5 rounded bg-amber-700/50 text-amber-300 text-xs">Pending</span>;
  if (status === 'UPHELD')   return <span className="px-1.5 py-0.5 rounded bg-green-700/50 text-green-300 text-xs">Upheld</span>;
  if (status === 'REJECTED') return <span className="px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 text-xs">Rejected</span>;
  return <span className="px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 text-xs">{status}</span>;
}
