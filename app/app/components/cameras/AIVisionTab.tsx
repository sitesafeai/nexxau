'use client';

/**
 * AI Vision — super-admin-only diagnostic view.
 *
 * Plays the camera's live HLS stream and draws the bounding boxes the Railway YOLO
 * service actually produced on top of it, labelled with class name + confidence.
 *
 * This is intentionally NOT the browser-side COCO-SSD overlay (RealtimeDetectionOverlay).
 * That one runs a generic model in the tab and tells you what the *browser* sees; this
 * one shows what *production* sees, which is the thing you need when a rule isn't firing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface LiveDetection {
  id: string;
  type: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  timestamp: string;
}

interface AIVisionTabProps {
  cameraId: string;
  cameraName?: string;
}

// Keys match the `type` values railway_service.py posts (see PPE_CLASS_MAP there).
// Keep label text in sync with DetectionPanel's TYPE_META.
const TYPE_STYLE: Record<string, { label: string; color: string }> = {
  // Violations
  fall_detected: { label: 'Fall Detected', color: '#ef4444' },
  no_helmet: { label: 'No Hardhat', color: '#f87171' },
  no_vest: { label: 'No Safety Vest', color: '#f87171' },
  no_gloves: { label: 'No Gloves', color: '#fbbf24' },
  no_goggles: { label: 'No Goggles', color: '#fbbf24' },
  no_mask: { label: 'No Mask', color: '#fbbf24' },
  no_boots: { label: 'No Safety Boots', color: '#fbbf24' },
  // Compliant / info
  helmet: { label: 'Hardhat', color: '#34d399' },
  vest: { label: 'Safety Vest', color: '#34d399' },
  gloves: { label: 'Gloves', color: '#34d399' },
  goggles: { label: 'Goggles', color: '#34d399' },
  mask: { label: 'Mask', color: '#34d399' },
  person_detected: { label: 'Person', color: '#60a5fa' },
  ladder: { label: 'Ladder', color: '#94a3b8' },
  safety_cone: { label: 'Safety Cone', color: '#94a3b8' },
};

function styleFor(type: string) {
  return (
    TYPE_STYLE[type] ?? {
      label: type
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' '),
      color: '#a3e635',
    }
  );
}

// How far back to pull detections. The YOLO service applies a per-class cooldown
// (VIOLATION_COOLDOWN_SEC, 30s by default) so boxes arrive in bursts rather than every
// frame — a window shorter than a second or two would usually render an empty canvas.
const WINDOW_MS = 4000;
const POLL_MS = 1000;

export default function AIVisionTab({ cameraId, cameraName }: AIVisionTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<any>(null);
  const detectionsRef = useRef<LiveDetection[]>([]);
  const rafRef = useRef<number | null>(null);

  const [detections, setDetections] = useState<LiveDetection[]>([]);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);

  detectionsRef.current = detections;

  // ── Resolve the HLS URL ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStreamLoading(true);
    setStreamError(null);

    fetch(`/api/cameras/${cameraId}/stream`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 503 ? 'Stream not available yet' : `HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.hlsUrl) setHlsUrl(data.hlsUrl);
        else setStreamError('No HLS URL returned for this camera');
      })
      .catch((e) => {
        if (!cancelled) setStreamError(e?.message ?? 'Failed to resolve stream');
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false);
      });

    return () => { cancelled = true; };
  }, [cameraId]);

  // ── Attach HLS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hlsUrl) return;
    let destroyed = false;

    import('hls.js').then(({ default: Hls }) => {
      const video = videoRef.current;
      if (!video || destroyed) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 2,
          maxBufferLength: 4,
          backBufferLength: 0,
          liveDurationInfinity: true,
        });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
          if (data?.fatal) setStreamError('Stream playback error — try Refresh Stream in the Health tab');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.play().catch(() => {});
      }
    });

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl]);

  // ── Poll production detections ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/cameras/${cameraId}/live-detections?windowMs=${WINDOW_MS}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          if (!cancelled) {
            setDetectionError(res.status === 403 ? 'Super admin access required' : `Detections HTTP ${res.status}`);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setDetections(data.detections ?? []);
        setDetectionError(null);
        setLastFetchAt(Date.now());
      } catch {
        // Transient network blips shouldn't clear the last good frame of boxes.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [cameraId]);

  // ── Draw loop ──────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Match the canvas backing store to the video's *native* resolution. That's the
    // same pixel space YOLO's bboxes are in, so boxes can be drawn 1:1 with no scaling
    // maths — CSS then stretches the canvas to fit the element alongside the video.
    if (vw && vh && (canvas.width !== vw || canvas.height !== vh)) {
      canvas.width = vw;
      canvas.height = vh;
      setVideoDims({ w: vw, h: vh });
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!vw || !vh) return;

    // Scale strokes/type with resolution so a 1080p feed doesn't get hairline boxes.
    const scale = Math.max(1, vw / 640);
    const fontPx = Math.round(14 * scale);
    ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'alphabetic';

    for (const det of detectionsRef.current) {
      const { x1, y1, x2, y2 } = det.bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      if (w <= 0 || h <= 0) continue;

      const { label, color } = styleFor(det.type);
      const text = `${label} ${Math.round(det.confidence * 100)}%`;

      ctx.lineWidth = Math.max(2, 2 * scale);
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, w, h);

      // Faint fill so overlapping boxes stay readable against busy footage.
      ctx.fillStyle = `${color}1f`;
      ctx.fillRect(x1, y1, w, h);

      const padX = 6 * scale;
      const labelH = fontPx + 8 * scale;
      const labelW = ctx.measureText(text).width + padX * 2;
      // Flip the label inside the box when the detection hugs the top edge.
      const labelY = y1 - labelH < 0 ? y1 : y1 - labelH;

      ctx.fillStyle = color;
      ctx.fillRect(x1, labelY, labelW, labelH);
      ctx.fillStyle = '#0b1220';
      ctx.fillText(text, x1 + padX, labelY + labelH - 7 * scale);
    }
  }, []);

  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of detections) counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [detections]);

  const isLive = lastFetchAt !== null && Date.now() - lastFetchAt < 5000;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Vision</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live boxes from the production YOLO model{cameraName ? ` · ${cameraName}` : ''}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {isLive ? 'Polling' : 'Idle'}
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-contain"
        />
        {/* object-contain on both keeps the canvas letterboxed identically to the video,
            so boxes stay registered regardless of the container's aspect ratio. */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />

        {streamLoading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Connecting to stream...
          </div>
        )}

        {streamError && !streamLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <AlertTriangle size={20} className="text-amber-400" />
            <p className="text-sm text-slate-300">{streamError}</p>
          </div>
        )}

        {detections.length > 0 && (
          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {detections.length} detection{detections.length !== 1 ? 's' : ''}
          </div>
        )}

        {videoDims && (
          <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-slate-300">
            {videoDims.w}×{videoDims.h}
          </div>
        )}
      </div>

      {detectionError && (
        <p className="flex items-center gap-1.5 text-xs text-amber-500">
          <AlertTriangle size={12} />
          {detectionError}
        </p>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Last {WINDOW_MS / 1000}s
        </h4>
        {summary.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            No detections in the last {WINDOW_MS / 1000} seconds.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.map(([type, count]) => {
              const { label, color } = styleFor(type);
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  style={{ borderColor: `${color}66`, color, backgroundColor: `${color}14` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                  {count > 1 && <span className="opacity-70">×{count}</span>}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
        Boxes come from the detection service, not the browser, so they lag the video by
        roughly one inference cycle and respect the per-class cooldown. An empty overlay
        with a healthy stream usually means confidence fell below <code>YOLO_CONFIDENCE</code>.
      </p>
    </div>
  );
}
