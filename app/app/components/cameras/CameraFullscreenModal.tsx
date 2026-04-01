'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { useGo2RTCStream } from '../../lib/hooks/useGo2RTCStream';

const VIOLATION_LABELS: Record<string, string> = {
  no_helmet: 'No Helmet',
  no_vest: 'No Vest',
  person_detected: 'Person Detected',
};

const VIOLATION_COLORS: Record<string, string> = {
  no_helmet: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  no_vest: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  person_detected: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
};

interface CameraFullscreenModalProps {
  camera: any;
  onClose: () => void;
  /** Pass stream from parent so video shows immediately without reconnecting */
  initialStream?: MediaStream | null;
}

export default function CameraFullscreenModal({ camera, onClose, initialStream }: CameraFullscreenModalProps) {
  const [violations, setViolations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { stream: hookStream } = useGo2RTCStream({
    cameraId: camera.id,
    autoPlay: !initialStream, // Skip hook connection if we already have a stream
  });

  const stream = initialStream ?? hookStream;

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        cameraId: camera.id,
        limit: '100',
      });
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/violations?${params}`);
        const data = await res.json();
        setViolations(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [camera.id, typeFilter, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[95vw] h-full max-h-[95vh] flex flex-row bg-slate-950 rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 transition-colors border border-slate-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Video: landscape rectangle (16:9) */}
        <div className="flex-[1] min-w-0 flex items-center justify-center bg-black p-4">
          <div className="relative w-full max-w-full aspect-video bg-slate-900 rounded-lg overflow-hidden min-h-[200px]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                <p className="text-slate-400 text-sm">Connecting...</p>
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white font-medium text-sm drop-shadow">{camera.name}</span>
              {camera.zone && (
                <span className="text-white/70 text-xs drop-shadow">· {camera.zone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Detection log: portrait sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-slate-900/95 border-l border-slate-700/50">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm mb-3">Detection Log</h3>
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All types</option>
              <option value="no_helmet">No Helmet</option>
              <option value="no_vest">No Vest</option>
              <option value="person_detected">Person Detected</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <p className="text-slate-500 text-xs text-center py-8">Loading...</p>
            ) : violations.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No detections yet</p>
            ) : (
              violations.map((v) => (
                <div
                  key={v.id}
                  className={`p-2.5 rounded-lg border text-xs ${
                    VIOLATION_COLORS[v.violationType] ??
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <div className="font-semibold mb-0.5">
                    {VIOLATION_LABELS[v.violationType] ?? v.violationType}
                  </div>
                  <div className="opacity-70 flex justify-between">
                    <span>
                      {v.confidence != null
                        ? `${Math.round(v.confidence * 100)}%`
                        : '—'}{' '}
                      confidence
                    </span>
                    <span>
                      {new Date(v.detectedAt || v.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-800">
            <p className="text-slate-500 text-xs">{violations.length} events shown</p>
          </div>
        </div>
      </div>
    </div>
  );
}
