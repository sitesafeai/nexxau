'use client';

import { useEffect, useState } from 'react';

/** Minimal row shape from AlertsAndRules list */
export type AlertListRow = {
  id: string;
  siteName: string;
  cameraName: string;
  alertType: string;
  severity: string;
  status: string;
  createdAt: string;
  assignedUserName?: string;
  detectionSnapshot?: string | null;
};

type DetailTab = 'overview' | 'acknowledgment' | 'followup' | 'activity';

function formatWhen(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export default function AlertDetailModal({
  open,
  onClose,
  listAlert,
  onOpenAckWizard,
  getSeverityBadge,
  getStatusBadge,
}: {
  open: boolean;
  onClose: () => void;
  listAlert: AlertListRow | null;
  onOpenAckWizard: (a: AlertListRow) => void;
  getSeverityBadge: (severity: string) => string;
  getStatusBadge: (status: string) => string;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!open || !listAlert?.id) {
      setDetail(null);
      return;
    }
    setTab('overview');
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/alerts/${listAlert.id}`);
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setDetail(json.data);
        } else if (!cancelled) {
          setDetail(null);
        }
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listAlert?.id]);

  if (!open || !listAlert) return null;

  const meta = (detail?.metadata || {}) as Record<string, any>;
  const ack = meta.acknowledgment as
    | {
        acknowledgedAt?: string;
        acknowledgedBy?: { id?: string; name?: string | null; email?: string | null };
        notes?: string | null;
        actionTaken?: string | null;
        severityAssessment?: string;
        requiresFollowUp?: boolean;
        followUpDate?: string | null;
      }
    | undefined;

  const hasResponseAck =
    Array.isArray(detail?.responses) &&
    detail.responses.some((r: { response?: string }) => r.response === 'ACKNOWLEDGED');

  const isAcknowledged =
    listAlert.status === 'acknowledged' ||
    detail?.status === 'ACKNOWLEDGED' ||
    !!ack ||
    hasResponseAck;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'acknowledgment', label: 'Acknowledgment' },
    { id: 'followup', label: 'Follow-up' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl ring-1 ring-white/5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/40 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-100">
              {detail?.title || listAlert.alertType}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {detail?.worksite?.name || listAlert.siteName} · {detail?.camera?.name || listAlert.cameraName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700/40 px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-slate-800/80 text-blue-300'
                  : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex justify-center py-12 text-sm text-slate-500">Loading alert details…</div>
          )}

          {!loading && tab === 'overview' && (
            <div className="space-y-4">
              {listAlert.detectionSnapshot && (
                <div className="overflow-hidden rounded-xl border border-slate-700/40 bg-slate-950/40">
                  <img
                    src={listAlert.detectionSnapshot}
                    alt="Detection snapshot"
                    className="max-h-64 w-full cursor-pointer object-cover object-center"
                    onClick={() => window.open(listAlert.detectionSnapshot!, '_blank')}
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alert type</p>
                  <p className="mt-1 text-sm text-slate-200">{detail?.title || listAlert.alertType}</p>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Source</p>
                  <p className="mt-1 text-sm text-slate-200">{detail?.source || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Violation / type</p>
                  <p className="mt-1 text-sm text-slate-200">{detail?.violationType || meta?.type || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rule</p>
                  <p className="mt-1 text-sm text-slate-200">{detail?.rule?.name || '—'}</p>
                  {detail?.rule?.category && (
                    <p className="mt-1 text-xs text-slate-500">Category: {detail.rule.category}</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Severity</p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getSeverityBadge(
                      (detail?.severity || listAlert.severity).toLowerCase()
                    )}`}
                  >
                    {String(detail?.severity || listAlert.severity).toUpperCase()}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(
                      (detail?.status || listAlert.status).toLowerCase()
                    )}`}
                  >
                    {String(detail?.status || listAlert.status)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{detail?.description || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</p>
                  <p className="mt-1 text-sm text-slate-200">{formatWhen(detail?.createdAt || listAlert.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Updated</p>
                  <p className="mt-1 text-sm text-slate-200">{formatWhen(detail?.updatedAt)}</p>
                </div>
                {detail?.snoozeUntil && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Snoozed until</p>
                    <p className="mt-1 text-sm text-blue-200">{formatWhen(detail.snoozeUntil)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'acknowledgment' && (
            <div className="space-y-4">
              {!isAcknowledged && (
                <p className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4 text-sm text-slate-400">
                  This alert has not been acknowledged yet. Use the checkmark on the row or{' '}
                  <strong className="text-slate-300">Acknowledge…</strong> below to open the wizard and record notes
                  (stored in the audit log).
                </p>
              )}
              {isAcknowledged && ack && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Acknowledged by</p>
                    <p className="mt-1 text-sm font-medium text-slate-100">
                      {ack.acknowledgedBy?.name || ack.acknowledgedBy?.email || '—'}
                    </p>
                    {ack.acknowledgedBy?.email && (
                      <p className="text-xs text-slate-500">{ack.acknowledgedBy.email}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">Time: {formatWhen(ack.acknowledgedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{ack.notes || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action taken</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{ack.actionTaken || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/35 bg-slate-800/30 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Severity at acknowledgment
                    </p>
                    <p className="mt-1 text-sm text-slate-200">{ack.severityAssessment || '—'}</p>
                  </div>
                </div>
              )}
              {isAcknowledged && !ack && (
                <p className="text-sm text-slate-400">
                  Status is acknowledged, but detailed wizard metadata is not stored on this alert (older record).
                  Response history may still appear under <strong className="text-slate-300">Activity</strong>.
                </p>
              )}
            </div>
          )}

          {!loading && tab === 'followup' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4 text-sm leading-relaxed text-slate-400">
                <p className="font-medium text-sky-200/90">How follow-ups work</p>
                <p className="mt-2">
                  When someone completes the <strong className="text-slate-300">acknowledgment wizard</strong> and checks
                  that a <strong className="text-slate-300">follow-up</strong> is required, we save the follow-up date on
                  this alert and create a <strong className="text-slate-300">high-priority in-app notification</strong>{' '}
                  for that person as a reminder. Check your notifications list for pending follow-ups—there is no
                  separate ticket created automatically unless you use another workflow.
                </p>
              </div>
              {ack?.requiresFollowUp ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Follow-up requested</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Target date: <strong>{formatWhen(ack.followUpDate)}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {isAcknowledged
                    ? 'No follow-up was requested when this alert was acknowledged.'
                    : 'Follow-up options appear after acknowledgment in the wizard.'}
                </p>
              )}
            </div>
          )}

          {!loading && tab === 'activity' && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Responses</p>
                {detail?.responses?.length ? (
                  <ul className="space-y-2">
                    {detail.responses.map((r: any) => (
                      <li
                        key={r.id}
                        className="rounded-lg border border-slate-700/40 bg-slate-800/25 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-200">{r.response}</span>
                          <span className="text-xs text-slate-500">{formatWhen(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {r.user?.name || r.user?.email || 'User'}
                          {r.notes ? ` · ${r.notes}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No responses recorded.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Resolution / snooze log
                </p>
                {detail?.resolutionLogs?.length ? (
                  <ul className="space-y-2">
                    {detail.resolutionLogs.map((log: any) => (
                      <li
                        key={log.id}
                        className="rounded-lg border border-slate-700/40 bg-slate-800/25 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-200">{log.status}</span>
                          <span className="text-xs text-slate-500">{formatWhen(log.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {log.user?.name || log.user?.email || 'User'}
                          {log.notes ? ` · ${log.notes}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No resolution or snooze events logged.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-700/40 bg-slate-950/30 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700/50 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            Close
          </button>
          {listAlert.status === 'active' && (
            <button
              type="button"
              onClick={() => {
                onOpenAckWizard(listAlert);
                onClose();
              }}
              className="rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
            >
              Acknowledge…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
