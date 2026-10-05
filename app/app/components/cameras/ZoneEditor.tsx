'use client';

/**
 * Draw restricted/monitored areas on a camera's live view.
 *
 * Points are stored NORMALISED (0..1 of frame width/height), never in canvas pixels.
 * See app/lib/zones.ts — the drawing surface, the original frame the detector reads and
 * the stored snapshot are three different pixel sizes, so pixel coordinates would
 * silently match the wrong region of the frame with nothing erroring.
 *
 * The letterbox maths below exists for the same reason. A <video> with object-contain
 * centres the picture inside the element and pads the rest, so element coordinates are
 * NOT frame coordinates whenever the element's aspect ratio differs from the video's.
 * Clicking the padding would otherwise produce points outside [0,1].
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Trash2, Undo2, X } from 'lucide-react';
import type { CameraZone, ZoneKind, ZonePoint } from '@/app/lib/zones';

interface Props {
  cameraId: string;
  cameraName: string;
}

const KIND_COLOR: Record<ZoneKind, string> = {
  restricted: '#ef4444',
  monitored: '#f59e0b',
  safe: '#10b981',
};

const KIND_HELP: Record<ZoneKind, string> = {
  restricted: 'Alert when someone enters this area',
  monitored: 'Watch this area without treating entry as a violation',
  safe: 'Area where the rule should not apply',
};

/** The rectangle the video picture actually occupies inside its element. */
function contentRect(video: HTMLVideoElement) {
  const el = video.getBoundingClientRect();
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return { left: el.left, top: el.top, width: el.width, height: el.height };
  const elAspect = el.width / el.height;
  const vidAspect = vw / vh;
  if (vidAspect > elAspect) {
    // Picture is wider than the box: bars top and bottom.
    const h = el.width / vidAspect;
    return { left: el.left, top: el.top + (el.height - h) / 2, width: el.width, height: h };
  }
  const w = el.height * vidAspect;
  return { left: el.left + (el.width - w) / 2, top: el.top, width: w, height: el.height };
}

export default function ZoneEditor({ cameraId, cameraName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [zones, setZones] = useState<CameraZone[]>([]);
  const [draft, setDraft] = useState<ZonePoint[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ZoneKind>('restricted');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Load existing zones ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cameras/${cameraId}/zones`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (!cancelled) setZones(d.zones ?? []); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? 'Failed to load zones'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cameraId]);

  // ── Resolve + attach the stream (same approach as AIVisionTab) ─────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cameras/${cameraId}/stream`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 503 ? 'Stream not available yet' : `HTTP ${r.status}`))))
      .then((d) => { if (!cancelled) d?.hlsUrl ? setHlsUrl(d.hlsUrl) : setStreamError('No HLS URL for this camera'); })
      .catch((e) => { if (!cancelled) setStreamError(e?.message ?? 'Failed to resolve stream'); });
    return () => { cancelled = true; };
  }, [cameraId]);

  useEffect(() => {
    if (!hlsUrl) return;
    let destroyed = false;
    import('hls.js').then(({ default: Hls }) => {
      const video = videoRef.current;
      if (!video || destroyed) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 4, backBufferLength: 0 });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
          if (data?.fatal) setStreamError('Stream playback error — you can still draw on the last frame');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.play().catch(() => {});
      }
    });
    return () => { destroyed = true; hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [hlsUrl]);

  // ── Draw ───────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const r = contentRect(video);
    const el = video.getBoundingClientRect();
    // Canvas overlays the whole element; we offset drawing into the content rect.
    if (canvas.width !== el.width || canvas.height !== el.height) {
      canvas.width = Math.max(1, el.width);
      canvas.height = Math.max(1, el.height);
    }
    const ox = r.left - el.left;
    const oy = r.top - el.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toPx = (p: ZonePoint) => ({ x: ox + p.x * r.width, y: oy + p.y * r.height });

    const paint = (pts: ZonePoint[], color: string, label: string, closed: boolean) => {
      if (pts.length === 0) return;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = toPx(p);
        i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y);
      });
      if (closed) ctx.closePath();
      ctx.fillStyle = `${color}33`;
      if (closed) ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      pts.forEach((p) => {
        const q = toPx(p);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      if (label && closed) {
        const first = toPx(pts[0]);
        ctx.fillStyle = color;
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(label, first.x + 6, first.y - 6);
      }
    };

    zones.forEach((z) => paint(z.points, z.color ?? KIND_COLOR[z.kind], z.name, true));
    paint(draft, KIND_COLOR[kind], '', false);
  }, [zones, draft, kind]);

  useEffect(() => {
    redraw();
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    const id = window.setInterval(redraw, 500); // video metadata can arrive late
    return () => { window.removeEventListener('resize', onResize); window.clearInterval(id); };
  }, [redraw]);

  // ── Interaction ────────────────────────────────────────────────────────────
  const addPoint = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const r = contentRect(video);
    const x = (ev.clientX - r.left) / r.width;
    const y = (ev.clientY - r.top) / r.height;
    // Ignore clicks on the letterbox padding — they aren't part of the frame.
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setDraft((d) => [...d, { x, y }]);
  };

  const saveAll = async (next: CameraZone[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cameras/${cameraId}/zones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: next }),
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'You do not have permission to edit zones' : `HTTP ${res.status}`);
      const d = await res.json();
      setZones(d.zones ?? []);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save zones');
    } finally {
      setSaving(false);
    }
  };

  const commitDraft = () => {
    if (draft.length < 3) return;
    const zone: CameraZone = {
      id: `zone_${Date.now().toString(36)}`,
      name: name.trim() || `Zone ${zones.length + 1}`,
      kind,
      points: draft,
      color: KIND_COLOR[kind],
    };
    setDraft([]);
    setName('');
    saveAll([...zones, zone]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-200">Zones · {cameraName}</h4>
        <p className="mt-0.5 text-xs text-slate-400">
          Click the video to place corners, then name the area and save. Any alert rule can
          then be limited to this area.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-black">
        <video
          ref={videoRef}
          className="block h-auto w-full object-contain"
          muted
          playsInline
          style={{ aspectRatio: '16 / 9' }}
        />
        <canvas
          ref={canvasRef}
          onClick={addPoint}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
        {streamError && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-900/80 px-3 py-1.5 text-xs text-amber-100">
            {streamError}
          </div>
        )}
      </div>

      {/* Draft controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Area name (e.g. Loading bay)"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ZoneKind)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="restricted">Restricted</option>
          <option value="monitored">Monitored</option>
          <option value="safe">Safe</option>
        </select>
        <button
          type="button"
          onClick={() => setDraft((d) => d.slice(0, -1))}
          disabled={draft.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          type="button"
          onClick={() => setDraft([])}
          disabled={draft.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          <X size={14} /> Clear
        </button>
        <button
          type="button"
          onClick={commitDraft}
          disabled={draft.length < 3 || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save area
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {draft.length === 0
          ? KIND_HELP[kind]
          : draft.length < 3
          ? `${draft.length} of 3 corners minimum — an area needs at least a triangle.`
          : `${draft.length} corners. Save when the shape looks right.`}
      </p>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="text-xs text-emerald-400">Saved. Rules referencing these areas apply on the next detection.</p>
      )}

      {/* Existing zones */}
      <div>
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Saved areas
        </h5>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : zones.length === 0 ? (
          <p className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-xs text-slate-400">
            No areas yet. Rules without an area apply to the whole frame.
          </p>
        ) : (
          <div className="space-y-2">
            {zones.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: z.color ?? KIND_COLOR[z.kind] }}
                  />
                  <span className="text-sm text-slate-200">{z.name}</span>
                  <span className="text-xs text-slate-500">
                    {z.kind} · {z.points.length} corners
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => saveAll(zones.filter((o) => o.id !== z.id))}
                  disabled={saving}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-red-400 disabled:opacity-40"
                  title="Delete area"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Deleting an area does not delete rules that use it. Those rules fall back to
          covering the whole frame and log a warning, rather than silently stopping — a
          missed alert is worse than a wrongly-scoped one.
        </p>
      </div>
    </div>
  );
}
