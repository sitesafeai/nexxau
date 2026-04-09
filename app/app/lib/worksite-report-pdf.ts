import type { WorksiteReportAnalytics } from '@/app/lib/worksite-report-analytics';

function esc(s: string): string {
  return s.replace(/\u2013|\u2014/g, '-').replace(/[^\x20-\x7E\n\r]/g, '?');
}

export async function buildWorksiteSummaryPdf(data: WorksiteReportAnalytics, titleSuffix: string): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const addLine = (text: string, size = 11, gap = 14) => {
    const lines = doc.splitTextToSize(esc(text), pageW - margin * 2);
    doc.setFontSize(size);
    doc.text(lines, margin, y);
    y += gap * (lines.length || 1);
  };

  const newPageIfNeeded = (need = 60) => {
    if (y > doc.internal.pageSize.getHeight() - need) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFontSize(18);
  doc.text(esc(`Worksite summary — ${titleSuffix}`), margin, y);
  y += 28;
  doc.setFontSize(10);
  doc.setTextColor(80);
  const from = new Date(data.dateRange.from).toLocaleString();
  const to = new Date(data.dateRange.to).toLocaleString();
  addLine(`Period: ${from} → ${to}`, 10, 12);
  doc.setTextColor(0);
  y += 8;

  addLine(
    `Average response time: ${data.responseTime.overall > 0 ? `${data.responseTime.overall.toFixed(1)} minutes` : 'N/A'} (based on ${data.responseTime.sampleCount} alert(s) with a logged first response).`,
    10,
    13
  );
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Safety score trend (daily)', margin, y);
  y += 20;
  doc.setFontSize(9);
  if (data.safetyScoreTrend.length === 0) {
    addLine('No daily safety scores in this period for this worksite.', 10, 14);
  } else {
    for (const row of data.safetyScoreTrend) {
      newPageIfNeeded(40);
      addLine(`${row.date}: ${row.safetyScore.toFixed(1)}`, 10, 12);
    }
  }
  y += 10;
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Detection violations by camera (safety violation records)', margin, y);
  y += 18;
  doc.setFontSize(10);
  if (data.cameraViolationHotspots.length === 0) {
    addLine('No detection rows with a camera in this period.', 10, 14);
  } else {
    for (const h of data.cameraViolationHotspots) {
      newPageIfNeeded(40);
      addLine(
        `${h.name} — ${h.total} violation(s) (${h.percentageOfSite}% of site total in period)`,
        10,
        14
      );
      for (const t of h.byType.slice(0, 8)) {
        newPageIfNeeded(24);
        addLine(`  • ${t.type}: ${t.count}`, 9, 12);
      }
      y += 6;
    }
  }
  y += 8;
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Alerts by camera (which camera raised each alert)', margin, y);
  y += 18;
  doc.setFontSize(10);
  if (data.alertsByCamera.length === 0) {
    addLine('No alerts linked to a camera in this period.', 10, 14);
  } else {
    for (const row of data.alertsByCamera) {
      newPageIfNeeded(36);
      addLine(
        `${row.name} — ${row.count} alert(s) (${row.percentageOfAlertsWithCamera}% of all alerts this period)`,
        10,
        14
      );
    }
  }
  y += 8;
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Recent alerts (camera)', margin, y);
  y += 18;
  doc.setFontSize(9);
  if (data.recentAlertsWithCamera.length === 0) {
    addLine('No alerts in this period.', 10, 14);
  } else {
    for (const r of data.recentAlertsWithCamera.slice(0, 20)) {
      newPageIfNeeded(28);
      const when = new Date(r.createdAt).toLocaleString();
      const cam = r.cameraName ? ` — ${r.cameraName}` : ' — (no camera on record)';
      addLine(`${when}${cam}: ${r.title}`, 9, 12);
    }
  }
  y += 8;
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Alerts by title (type)', margin, y);
  y += 18;
  doc.setFontSize(10);
  if (data.alertsByType.length === 0) {
    addLine('No alerts in this period.', 10, 14);
  } else {
    for (const a of data.alertsByType) {
      newPageIfNeeded(36);
      addLine(`${a.type}: ${a.count}`, 10, 14);
    }
  }
  y += 8;
  newPageIfNeeded();

  doc.setFontSize(13);
  doc.text('Violations by type (detections)', margin, y);
  y += 18;
  doc.setFontSize(10);
  if (data.violationsByType.length === 0) {
    addLine('No safety violations recorded in this period.', 10, 14);
  } else {
    for (const v of data.violationsByType) {
      newPageIfNeeded(36);
      addLine(`${v.type}: ${v.count}`, 10, 14);
    }
  }

  const buf = doc.output('arraybuffer');
  return new Uint8Array(buf);
}
