'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { normalizePhoneInput } from '@/app/lib/phone-normalize';

interface AcknowledgeAlertModalProps {
  alert: any;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 shadow-inner shadow-black/5 focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors';

type TeamChannelState = {
  include: boolean;
  in_app: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  /** When profile has no phone and SMS/WhatsApp is selected */
  phoneOverride: string;
  /** true = save to profile; false = one-time only */
  savePhoneToProfile: boolean;
};

const DEFAULT_TEAM_CHANNEL: TeamChannelState = {
  include: false,
  in_app: true,
  email: false,
  sms: false,
  whatsapp: false,
  phoneOverride: '',
  savePhoneToProfile: false,
};

export default function AcknowledgeAlertModal({ alert: alertData, onClose, onSuccess }: AcknowledgeAlertModalProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const initialSeverity = String(alertData.severity || 'MEDIUM').toUpperCase();
  const normalizedSeverity =
    initialSeverity === 'LOW' || initialSeverity === 'MEDIUM' || initialSeverity === 'HIGH'
      ? initialSeverity
      : 'MEDIUM';

  const [formData, setFormData] = useState({
    note: '',
    actionTaken: '',
    severity: normalizedSeverity,
    requiresFollowUp: false,
    followUpDate: '',
    notifyOthers: false,
  });

  const [worksiteUsers, setWorksiteUsers] = useState<
    Array<{ id: string; name: string | null; email: string | null; phoneNumber: string | null }>
  >([]);
  const [worksiteUsersLoading, setWorksiteUsersLoading] = useState(false);
  const [teamSelections, setTeamSelections] = useState<Record<string, TeamChannelState>>({});

  useEffect(() => {
    if (step !== 3 || !formData.notifyOthers || !alertData.worksiteId) {
      return;
    }
    let cancelled = false;
    (async () => {
      setWorksiteUsersLoading(true);
      try {
        const res = await fetch(`/api/worksites/${alertData.worksiteId}/users`);
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          const users = json.data.map(
            (u: { id: string; name: string | null; email: string | null; phoneNumber?: string | null }) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              phoneNumber: u.phoneNumber ?? null,
            })
          );
          setWorksiteUsers(users);
        } else if (!cancelled) {
          setWorksiteUsers([]);
        }
      } catch {
        if (!cancelled) setWorksiteUsers([]);
      } finally {
        if (!cancelled) setWorksiteUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, formData.notifyOthers, alertData.worksiteId]);

  useEffect(() => {
    if (worksiteUsers.length === 0) return;
    setTeamSelections((prev) => {
      const next = { ...prev };
      for (const u of worksiteUsers) {
        if (!next[u.id]) {
          next[u.id] = { ...DEFAULT_TEAM_CHANNEL };
        }
      }
      return next;
    });
  }, [worksiteUsers]);

  const updateTeamUser = useCallback((userId: string, patch: Partial<TeamChannelState>) => {
    setTeamSelections((prev) => {
      const cur = prev[userId] || { ...DEFAULT_TEAM_CHANNEL };
      const merged = { ...cur, ...patch };
      if (patch.include === true) {
        if (!merged.in_app && !merged.email && !merged.sms && !merged.whatsapp) {
          merged.in_app = true;
        }
      }
      if (
        merged.include &&
        !merged.in_app &&
        !merged.email &&
        !merged.sms &&
        !merged.whatsapp
      ) {
        merged.include = false;
      }
      return { ...prev, [userId]: merged };
    });
  }, []);

  const buildNotificationRecipients = useCallback(() => {
    return Object.entries(teamSelections)
      .filter(([_, v]) => v.include && (v.in_app || v.email || v.sms || v.whatsapp))
      .map(([userId, v]) => {
        const user = worksiteUsers.find((w) => w.id === userId);
        const hasPhone = !!(user?.phoneNumber && String(user.phoneNumber).trim());
        const needsPhone = (v.sms || v.whatsapp) && !hasPhone;
        const channels = [
          v.in_app ? 'IN_APP' : null,
          v.email ? 'EMAIL' : null,
          v.sms ? 'SMS' : null,
          v.whatsapp ? 'WHATSAPP' : null,
        ].filter(Boolean) as string[];
        const row: {
          userId: string;
          channels: string[];
          phoneOverride?: string;
          savePhoneToProfile?: boolean;
        } = { userId, channels };
        if (needsPhone && v.phoneOverride.trim()) {
          row.phoneOverride = v.phoneOverride.trim();
          if (v.savePhoneToProfile) {
            row.savePhoneToProfile = true;
          }
        }
        return row;
      })
      .filter((r) => r.channels.length > 0);
  }, [teamSelections, worksiteUsers]);

  const handleSubmit = async () => {
    if (formData.notifyOthers) {
      if (!alertData.worksiteId) {
        alert('This alert is not tied to a worksite, so team notifications are not available.');
        return;
      }
      const recipients = buildNotificationRecipients();
      if (recipients.length === 0) {
        alert('Choose at least one team member and one delivery method (in-app, email, SMS, or WhatsApp).');
        return;
      }
      for (const [userId, v] of Object.entries(teamSelections)) {
        if (!v.include || (!v.sms && !v.whatsapp)) continue;
        const user = worksiteUsers.find((w) => w.id === userId);
        const hasPhone = !!(user?.phoneNumber && String(user.phoneNumber).trim());
        if (!hasPhone && !normalizePhoneInput(v.phoneOverride)) {
          alert(
            `Enter a valid phone number for ${user?.name || user?.email || 'this team member'}, or turn off SMS and WhatsApp for them.`
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        note: formData.note,
        actionTaken: formData.actionTaken,
        severity: formData.severity,
        requiresFollowUp: formData.requiresFollowUp,
        followUpDate: formData.followUpDate,
        notifyOthers: formData.notifyOthers,
      };
      if (formData.notifyOthers) {
        payload.notificationRecipients = buildNotificationRecipients();
      }

      const res = await fetch(`/api/alerts/${alertData.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to acknowledge alert: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Failed to acknowledge alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const severityStyles = (s: string, selected: boolean) => {
    if (!selected) {
      return 'border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50 hover:text-slate-300';
    }
    if (s === 'HIGH') return 'border border-rose-500/35 bg-rose-500/10 text-rose-200 shadow-sm shadow-rose-900/20';
    if (s === 'MEDIUM') return 'border border-amber-500/35 bg-amber-500/10 text-amber-200 shadow-sm shadow-amber-900/20';
    return 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 shadow-sm shadow-emerald-900/20';
  };

  const badgeSeverity = () => {
    const s = formData.severity;
    if (s === 'HIGH') return 'border-rose-500/25 bg-rose-500/10 text-rose-200/90';
    if (s === 'MEDIUM') return 'border-amber-500/25 bg-amber-500/10 text-amber-200/90';
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200/90';
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ack-wizard-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden overflow-y-auto rounded-2xl border border-slate-700/40 bg-slate-900/90 shadow-2xl shadow-black/40 ring-1 ring-white/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/40 px-6 py-5">
          <div>
            <h3 id="ack-wizard-title" className="text-lg font-semibold tracking-tight text-slate-100">
              Acknowledge alert
            </h3>
            <p className="mt-1 text-sm text-slate-500">Step {step} of 3</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800/80 hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="border-b border-slate-700/30 bg-slate-950/30 px-6 py-4">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex flex-1 items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    step >= stepNum
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-slate-800/60 text-slate-500 ring-1 ring-slate-700/50'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`mx-2 h-px flex-1 transition-colors ${
                      step > stepNum ? 'bg-blue-500/35' : 'bg-slate-700/50'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <span>Details</span>
            <span>Assessment</span>
            <span>Follow-up</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Alert summary */}
          <div className="mb-6 rounded-xl border border-slate-700/35 bg-slate-800/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alert</p>
            <p className="mt-1 font-medium text-slate-100">{alertData.title || 'Alert'}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{alertData.description || '—'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{alertData.location || '—'}</span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeSeverity()}`}
              >
                {formData.severity}
              </span>
            </div>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Acknowledgment note *</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={4}
                  className={inputClass}
                  placeholder="Describe the situation and any immediate observations…"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Action taken *</label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  rows={3}
                  className={inputClass}
                  placeholder="What did you do in response to this alert?"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Acknowledged by</label>
                <input
                  type="text"
                  value={session?.user?.name || 'Unknown'}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-700/40 bg-slate-950/30 px-3 py-2.5 text-sm text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Severity assessment</label>
                <p className="mb-3 text-sm text-slate-500">Adjust based on what you found during review.</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity })}
                      className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${severityStyles(
                        severity,
                        formData.severity === severity
                      )}`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-4">
                <div className="flex gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-400/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-200/90">Assessment impact</p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-100/50">
                      Your severity choice is stored with this acknowledgment and may drive downstream workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700/35 bg-slate-800/20 p-3 transition-colors hover:bg-slate-800/35">
                <input
                  type="checkbox"
                  id="requiresFollowUp"
                  checked={formData.requiresFollowUp}
                  onChange={(e) => setFormData({ ...formData, requiresFollowUp: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30"
                />
                <span className="text-sm text-slate-300">This alert needs a follow-up</span>
              </label>

              {formData.requiresFollowUp && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Follow-up date *</label>
                  <input
                    type="datetime-local"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              )}

              <div className="rounded-xl border border-slate-700/35 bg-slate-800/20 p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    id="notifyOthers"
                    checked={formData.notifyOthers}
                    onChange={(e) => setFormData({ ...formData, notifyOthers: e.target.checked })}
                    disabled={!alertData.worksiteId}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30 disabled:opacity-40"
                  />
                  <div>
                    <span className="text-sm text-slate-300">Notify other team members</span>
                    {!alertData.worksiteId && (
                      <p className="mt-1 text-xs text-slate-500">
                        Unavailable: this alert is not linked to a worksite, so we cannot load the team list.
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {formData.notifyOthers && alertData.worksiteId && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Select people assigned to this worksite, then choose how each should be notified. In-app keeps the
                    message in their Nexxau notifications; email uses Resend; SMS and WhatsApp use{' '}
                    <strong className="text-slate-300">Twilio</strong> with the phone on file, or a number you enter for
                    this send (WhatsApp requires your Twilio WhatsApp sender to be configured).
                  </p>
                  {worksiteUsersLoading ? (
                    <p className="py-6 text-center text-sm text-slate-500">Loading team…</p>
                  ) : worksiteUsers.length === 0 ? (
                    <p className="rounded-lg border border-slate-700/40 bg-slate-950/30 px-3 py-2 text-sm text-slate-500">
                      No worksite users found.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {worksiteUsers.map((u) => {
                        const sel = teamSelections[u.id] || { ...DEFAULT_TEAM_CHANNEL };
                        const hasPhoneOnFile = !!(u.phoneNumber && String(u.phoneNumber).trim());
                        const needsPhoneInput = sel.include && (sel.sms || sel.whatsapp) && !hasPhoneOnFile;
                        return (
                          <div
                            key={u.id}
                            className="rounded-xl border border-slate-700/40 bg-slate-950/30 p-3 text-sm"
                          >
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={sel.include}
                                onChange={(e) => updateTeamUser(u.id, { include: e.target.checked })}
                                className="mt-0.5 rounded border-slate-600"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-slate-200">{u.name || u.email || u.id}</span>
                                {u.email && <span className="block truncate text-xs text-slate-500">{u.email}</span>}
                              </div>
                            </label>
                            {sel.include && (
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-700/40 pt-3 pl-6">
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={sel.in_app}
                                    onChange={(e) => updateTeamUser(u.id, { in_app: e.target.checked })}
                                  />
                                  In-app
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={sel.email}
                                    onChange={(e) => updateTeamUser(u.id, { email: e.target.checked })}
                                  />
                                  Email
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={sel.sms}
                                    onChange={(e) => updateTeamUser(u.id, { sms: e.target.checked })}
                                  />
                                  SMS
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={sel.whatsapp}
                                    onChange={(e) => updateTeamUser(u.id, { whatsapp: e.target.checked })}
                                  />
                                  WhatsApp
                                </label>
                              </div>
                            )}
                            {needsPhoneInput && (
                              <div className="mt-3 space-y-2 border-t border-slate-700/40 pt-3 pl-6">
                                <label className="block text-xs font-medium text-slate-500">
                                  Phone number (no number on file)
                                </label>
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  autoComplete="tel"
                                  placeholder="+1 555 123 4567"
                                  value={sel.phoneOverride}
                                  onChange={(e) => updateTeamUser(u.id, { phoneOverride: e.target.value })}
                                  className={inputClass}
                                />
                                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    checked={sel.savePhoneToProfile}
                                    onChange={(e) =>
                                      updateTeamUser(u.id, { savePhoneToProfile: e.target.checked })
                                    }
                                    className="mt-0.5 rounded border-slate-600"
                                  />
                                  <span>
                                    <span className="font-medium text-slate-300">Save number to their profile</span>
                                    <span className="mt-0.5 block text-slate-500">
                                      Checked: keep on file for future messages. Unchecked: use once for this
                                      notification only.
                                    </span>
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] p-4">
                <div className="flex gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-sky-400/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-sky-200/90">Audit trail</p>
                    <p className="mt-1 text-sm leading-relaxed text-sky-100/45">
                      This submission is recorded with a timestamp and your account for compliance and review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 bg-slate-950/25 px-6 py-4">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800/50 hover:text-slate-300"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={step === 1 && (!formData.note || !formData.actionTaken)}
                className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (formData.requiresFollowUp && !formData.followUpDate)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-emerald-300/90" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving…
                  </>
                ) : (
                  'Submit acknowledgment'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
