/**
 * Branded PDF export for /dashboard/analytics (client-side jsPDF).
 */

export type AnalyticsPdfOptions = {
  worksiteName: string;
  worksiteId: string;
  timeRange: string;
  generatedAt?: Date;
};

function timeRangeLabel(tr: string): string {
  const m: Record<string, string> = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };
  return m[tr] || tr;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[^\x20-\x7E\n\r]/g, '?');
}

export async function buildAnalyticsReportPdf(analytics: any, opts: AnalyticsPdfOptions): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 0;

  const gen = opts.generatedAt ?? new Date();

  const addPageIf = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header stripe
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 100, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Nexxau — Safety analytics', margin, 42);
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text(esc(opts.worksiteName || 'Worksite'), margin, 62);
  doc.text(`${timeRangeLabel(opts.timeRange)} · Generated ${gen.toLocaleString()}`, margin, 78);
  doc.setTextColor(0, 0, 0);

  y = 118;
  doc.setFontSize(10);

  const kv = (label: string, value: string | number) => {
    addPageIf(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(esc(label), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(esc(String(value)), margin + 160, y);
    y += 16;
  };

  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text('Key metrics', margin, y);
  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const sc = analytics?.safetyScore;
  kv('Safety score (current)', sc?.current ?? '—');
  kv('Safety score (previous period)', sc?.previous ?? '—');
  kv('Trend', sc?.trend ?? '—');

  const v = analytics?.violations;
  kv('Total violations (period)', v?.total ?? 0);
  kv('Major', v?.major ?? 0);
  kv('Minor', v?.minor ?? 0);
  kv('Change vs previous', `${v?.change ?? 0}%`);

  const comp = analytics?.compliance;
  kv('Compliance rate', `${comp?.rate ?? 0}%`);
  kv('Compliance change', `${comp?.change ?? 0}%`);

  const cam = analytics?.cameras;
  kv('Cameras online', `${cam?.online ?? 0} / ${cam?.total ?? 0}`);
  kv('Camera uptime', `${cam?.uptime ?? 0}%`);

  const al = analytics?.alerts;
  kv('Total alerts', al?.total ?? 0);
  kv('Resolved', al?.resolved ?? 0);
  kv('Pending', al?.pending ?? 0);
  kv('Avg. response time', al?.avgResponseTime ?? 'N/A');

  y += 8;
  addPageIf(40);
  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text('Violations by type', margin, y);
  y += 18;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  const vbt = Array.isArray(analytics?.violationsByType) ? analytics.violationsByType : [];
  if (vbt.length === 0) {
    const lines = doc.splitTextToSize('No violations in this period.', pageW - margin * 2);
    doc.text(lines, margin, y);
    y += 14 * lines.length;
  } else {
    for (const row of vbt.slice(0, 20)) {
      addPageIf(28);
      const line = `${row.type || '—'} — ${row.count ?? 0} (${row.severity || '—'})`;
      const wrapped = doc.splitTextToSize(esc(line), pageW - margin * 2);
      doc.text(wrapped, margin, y);
      y += 12 * wrapped.length + 4;
    }
  }

  y += 10;
  addPageIf(40);
  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text('Violations by hour (sample)', margin, y);
  y += 18;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  const hourly = Array.isArray(analytics?.hourlyViolations) ? analytics.hourlyViolations : [];
  const topHours = [...hourly].sort((a: any, b: any) => (b.violations || 0) - (a.violations || 0)).slice(0, 12);
  if (topHours.length === 0) {
    doc.text('No hourly breakdown available.', margin, y);
    y += 14;
  } else {
    for (const h of topHours) {
      addPageIf(20);
      doc.text(esc(`${h.hour}: ${h.violations} violation(s)`), margin, y);
      y += 14;
    }
  }

  y += 16;
  addPageIf(36);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(esc(`Worksite ID: ${opts.worksiteId}`), margin, y);
  y += 12;
  doc.text('This report was generated from Nexxau analytics. Values reflect the selected time range.', margin, y);

  const buf = doc.output('arraybuffer');
  return new Uint8Array(buf);
}
