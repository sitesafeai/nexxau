'use client';

// Printable incident report for one alert. Opened in a new tab from the Incident
// Evaluation modal ("Open full incident report after saving"). Lives outside /dashboard
// so it renders without the sidebar, which keeps Print / Save as PDF clean.
//
// Data comes from GET /api/alerts/[id]/report, which enforces login + company access.
// Anonymous by design: no worker identity appears anywhere on this page.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Report = {
  reportGenerated: string;
  generatedBy: { name?: string | null; email?: string | null };
  alert: {
    id: string; title: string; description: string; severity: string; status: string;
    location: string | null; createdAt: string; resolvedAt: string | null;
    snapshotUrl: string | null;
  };
  camera: { name: string; location: string | null } | null;
  resolution: {
    type: 'CONFIRMED' | 'FALSE_POSITIVE' | 'SNOOZED' | string;
    violationType: string | null; falsePositiveReason: string | null;
    notes: string | null; resolvedAt: string | null;
  } | null;
  worksite: { name: string; location: string; company: string };
  rule: { name: string; category: string; description: string | null } | null;
  detection: { confidence?: number } | null;
  timeline: { event: string; timestamp: string; details?: string }[];
};

const VIOLATION_LABELS: Record<string, string> = {
  missing_helmet: 'Missing Hard Hat',
  missing_vest: 'Missing Safety Vest',
  missing_gloves: 'Missing Gloves',
  missing_goggles: 'Missing Safety Goggles',
  missing_harness: 'Missing Fall Harness',
  restricted_zone: 'Entered Restricted Zone',
  unsafe_behavior: 'Unsafe Behavior',
  equipment_misuse: 'Equipment Misuse',
  other: 'Other Violation',
};

const RESOLUTION_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmed violation',
  FALSE_POSITIVE: 'False positive',
  SNOOZED: 'Snoozed',
};

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const humanize = (s: string | null | undefined) =>
  s ? s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '—';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-slate-200 py-2 text-sm last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value}</dd>
    </div>
  );
}

export default function IncidentReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/alerts/${id}/report`)
      .then(async (res) => {
        if (res.status === 401) throw new Error('Please sign in to view this report.');
        if (!res.ok) throw new Error('Report not found, or you do not have access to it.');
        const data = await res.json();
        setReport(data.report);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (report) document.title = `Incident Report — ${report.alert.title}`;
  }, [report]);

  if (error) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-center text-slate-700">
        <p>{error}</p>
      </main>
    );
  }
  if (!report) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-center text-slate-500">
        Loading report…
      </main>
    );
  }

  const { alert, resolution, worksite, camera, rule, detection } = report;
  const confidence = typeof detection?.confidence === 'number'
    ? `${Math.round(detection.confidence * (detection.confidence <= 1 ? 100 : 1))}%`
    : null;

  return (
    <main className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl bg-white px-6 py-8 shadow-sm sm:px-10 print:max-w-none print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Nexxau · Incident Report</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{alert.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {worksite.company} · {worksite.name}{worksite.location && worksite.location !== 'Unknown' ? `, ${worksite.location}` : ''}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 print:hidden"
          >
            Print / Save PDF
          </button>
        </header>

        {alert.snapshotUrl && (
          <section className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={alert.snapshotUrl}
              alt="Detection snapshot"
              className="mx-auto max-h-96 w-full rounded border border-slate-200 object-contain"
            />
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Detection</h2>
          <dl>
            <Row label="Detected" value={fmt(alert.createdAt)} />
            <Row label="Severity" value={humanize(alert.severity)} />
            <Row label="Camera" value={camera ? `${camera.name}${camera.location ? ` — ${camera.location}` : ''}` : (alert.location || '—')} />
            {rule && <Row label="Rule" value={rule.name} />}
            {confidence && <Row label="Model confidence" value={confidence} />}
            <Row label="Description" value={alert.description || '—'} />
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Evaluation</h2>
          {resolution ? (
            <dl>
              <Row label="Outcome" value={RESOLUTION_LABELS[resolution.type] || humanize(resolution.type)} />
              {resolution.violationType && (
                <Row label="Violation type" value={VIOLATION_LABELS[resolution.violationType] || humanize(resolution.violationType)} />
              )}
              {resolution.falsePositiveReason && (
                <Row label="Reason" value={humanize(resolution.falsePositiveReason)} />
              )}
              <Row label="Notes" value={resolution.notes ? <span className="whitespace-pre-wrap">{resolution.notes}</span> : '—'} />
              <Row label="Evaluated" value={fmt(resolution.resolvedAt)} />
            </dl>
          ) : (
            <p className="text-sm text-slate-600">Not yet evaluated. Current status: {humanize(alert.status)}.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Evaluations are anonymous — this report records a PPE violation, not a person.
          </p>
        </section>

        {report.timeline?.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h2>
            <ol className="space-y-1 text-sm">
              {report.timeline.map((t, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-44 shrink-0 text-slate-500">{fmt(t.timestamp)}</span>
                  <span className="text-slate-900">{t.event}{t.details ? <span className="text-slate-500"> — {t.details}</span> : null}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
          Generated {fmt(report.reportGenerated)}{report.generatedBy?.name ? ` by ${report.generatedBy.name}` : ''} · Alert ID {alert.id}
        </footer>
      </div>
    </main>
  );
}
