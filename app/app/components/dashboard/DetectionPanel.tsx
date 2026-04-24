'use client';

import { useEffect, useMemo, useState } from 'react';

type CameraItem = {
  name: string;
  embedUrl: string;
};

type CameraInfo = {
  id: string;
  name: string;
};

type DetectionItem = {
  id: string;
  cameraId: string;
  type: string;
  confidence: number;
  timestamp: string;
};

type ViolationItem = {
  id: string;
  cameraId: string | null;
  violationType: string;
  severity: string;
  confidence: number | null;
  detectedAt: string;
};

type ApiResponse = {
  detections: DetectionItem[];
  violations: ViolationItem[];
  cameras: CameraInfo[];
  fetchedAt: string;
};

interface DetectionPanelProps {
  siteId: string;
  cameras: CameraItem[];
}

const TYPE_META: Record<string, { label: string; icon: string; tone: string }> = {
  no_helmet: { label: 'No Helmet', icon: '⚠', tone: 'text-red-300' },
  no_vest: { label: 'No Vest', icon: '⚠', tone: 'text-red-300' },
  helmet: { label: 'Helmet ✓', icon: '✓', tone: 'text-emerald-300' },
  vest: { label: 'Vest ✓', icon: '✓', tone: 'text-emerald-300' },
  person_detected: { label: 'Person Detected', icon: '●', tone: 'text-blue-300' },
};

function humanizeFallback(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function DetectionPanel({ siteId, cameras }: DetectionPanelProps) {
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [cameras_db, setCamerasDb] = useState<CameraInfo[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRecent = async () => {
      try {
        const response = await fetch(`/api/detections/recent?siteId=${encodeURIComponent(siteId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ApiResponse;
        if (cancelled) return;
        setDetections(payload.detections ?? []);
        setViolations(payload.violations ?? []);
        setCamerasDb(payload.cameras ?? []);
        setFetchedAt(payload.fetchedAt ?? new Date().toISOString());
      } catch {
        // Keep last known state if polling temporarily fails.
      }
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [siteId]);

  const isFresh = fetchedAt ? Date.now() - new Date(fetchedAt).getTime() < 10_000 : false;

  const groupedDetections = useMemo(() => {
    const grouped = new Map<string, DetectionItem[]>();
    for (const detection of detections) {
      const key = detection.cameraId || 'unknown';
      const current = grouped.get(key) ?? [];
      current.push(detection);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries());
  }, [detections]);

  const getCameraName = (cameraId: string): string => {
    const match = cameras_db.find((camera) => camera.id === cameraId);
    if (match) return match.name;
    return 'Camera Feed';
  };

  const severityClass = (severity: string) => {
    const normalized = severity.toLowerCase();
    if (normalized === 'high') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (normalized === 'medium') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Live Detections</h3>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className={`h-2.5 w-2.5 rounded-full ${isFresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {isFresh ? 'Live' : 'Stale'}
        </div>
      </div>

      {groupedDetections.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400">
          <span className="mr-2 text-slate-500">●</span>
          No detections in the last 60 seconds
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDetections.map(([cameraId, rows]) => (
            <div key={cameraId} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <p className="mb-2 text-sm font-medium text-white">{getCameraName(cameraId)}</p>
              <div className="space-y-1.5">
                {rows.map((row) => {
                  const meta = TYPE_META[row.type] ?? {
                    label: humanizeFallback(row.type),
                    icon: '●',
                    tone: 'text-blue-300',
                  };
                  return (
                    <div key={row.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={meta.tone}>{meta.icon}</span>
                        <span className="text-slate-200">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{Math.round((row.confidence || 0) * 100)}%</span>
                        <span>{timeAgo(row.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-200">Active Violations</h4>
        {violations.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-sm text-slate-400">
            No active violations in the last 5 minutes
          </div>
        ) : (
          <div className="space-y-2">
            {violations.map((violation) => (
              <div
                key={violation.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${severityClass(violation.severity)}`}>
                    {violation.severity}
                  </span>
                  <span className="text-sm text-slate-200">
                    {TYPE_META[violation.violationType]?.label ?? humanizeFallback(violation.violationType)}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{timeAgo(violation.detectedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
