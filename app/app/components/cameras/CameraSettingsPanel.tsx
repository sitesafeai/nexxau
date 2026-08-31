'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { X, Trash2, RefreshCw, Activity, Copy, Check } from 'lucide-react';
import { normalizeRole } from '../../lib/roles';
import AIVisionTab from './AIVisionTab';

const BASE_TABS = ['Details', 'Health'] as const;
const AI_VISION_TAB = 'AI Vision';
type Tab = (typeof BASE_TABS)[number] | typeof AI_VISION_TAB;

interface HealthData {
  cameraId: string;
  health: {
    status: string;
    streamQuality?: number | null;
    frameRate?: number | null;
    resolution?: string | null;
    bitrate?: number | null;
    latency?: number | null;
    lastCheck: string;
  } | null;
  go2rtc: {
    healthy: boolean;
    streamRegistered: boolean;
  };
  derived: {
    isOnline: boolean;
    hasStreamUrl: boolean;
  };
}

interface CameraSettingsPanelProps {
  camera: any;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: (updated: { id: string; name: string; zone?: string | null; location?: string | null }) => void;
  onReconnect?: () => void;
}

interface FullCamera {
  id: string;
  name: string;
  type?: string;
  status?: string;
  streamUrl?: string | null;
  location?: string | null;
  zone?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  rtspPath?: string | null;
  hlsUrl?: string | null;
  mediamtxPath?: string | null;
  janusFeedId?: number | null;
  metadata?: any;
  worksiteId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CameraSettingsPanel({
  camera,
  onClose,
  onDeleted,
  onUpdated,
  // Was declared on the props interface and called by handleRefresh but never
  // destructured — "Refresh Stream" in the Health tab threw instead of reconnecting.
  onReconnect,
}: CameraSettingsPanelProps) {
  const { data: session } = useSession();
  // AI Vision surfaces raw model output (bboxes, per-class confidence). That's a
  // debugging tool for us, not a customer feature — SUPER_ADMIN only. The API route
  // behind it enforces the same check server-side; this just hides the tab.
  const isSuperAdmin = useMemo(
    () => normalizeRole((session?.user as { role?: string } | undefined)?.role) === 'SUPER_ADMIN',
    [session?.user]
  );
  const tabs = useMemo<Tab[]>(
    () => (isSuperAdmin ? [...BASE_TABS, AI_VISION_TAB] : [...BASE_TABS]),
    [isSuperAdmin]
  );

  const [tab, setTab] = useState<Tab>('Details');
  const [fullCamera, setFullCamera] = useState<FullCamera | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(camera.name ?? '');
  const [zone, setZone] = useState(camera.zone ?? camera.location ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchCamera() {
      try {
        const res = await fetch(`/api/cameras/${camera.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setFullCamera(data);
          setName(data.name ?? '');
          setZone(data.zone ?? data.location ?? '');
        }
      } catch {
        if (!cancelled) setFullCamera(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCamera();
    return () => { cancelled = true; };
  }, [camera.id]);

  const cam = fullCamera ?? camera;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, zone }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to update');
      }
      const updated = json.data;
      if (updated && onUpdated) {
        onUpdated({
          id: updated.id,
          name: updated.name,
          zone: updated.zone ?? undefined,
          location: updated.location ?? updated.zone ?? undefined,
        });
      }
      onClose();
    } catch (e: any) {
      alert(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      } else {
        setHealthData(null);
      }
    } catch {
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'Health') fetchHealth();
  }, [tab, camera.id]);

  // Session resolves after first paint. If it comes back as a non-super-admin while
  // the AI Vision tab is somehow selected, fall back rather than render a dead panel.
  useEffect(() => {
    if (tab === AI_VISION_TAB && !isSuperAdmin) setTab('Details');
  }, [tab, isSuperAdmin]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to refresh');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onReconnect?.();
      fetchHealth();
    } catch (e: any) {
      alert(e.message ?? 'Failed to refresh stream');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete camera "${camera.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onClose();
      onDeleted();
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* AI Vision needs real estate for the video — widen the modal on that tab only. */}
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl w-full shadow-2xl overflow-hidden transition-[max-width] duration-200 ${
          tab === AI_VISION_TAB ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Camera Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-slate-50 dark:bg-slate-800/50'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                {t}
                {t === AI_VISION_TAB && (
                  <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-300">
                    Admin
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {tab === AI_VISION_TAB ? (
            <AIVisionTab cameraId={camera.id} cameraName={cam.name} />
          ) : tab === 'Health' ? (
            healthLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading health...</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Activity size={16} />
                    Stream Health
                  </h3>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || !healthData?.derived.hasStreamUrl}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh Stream'}
                  </button>
                </div>

                {healthData && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Status</span>
                        <p className={`font-medium capitalize ${
                          healthData.derived.isOnline ? 'text-green-600 dark:text-green-400' :
                          healthData.health?.status === 'OFFLINE' || healthData.health?.status === 'ERROR' ? 'text-red-600 dark:text-red-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          {healthData.health?.status ?? (healthData.derived.hasStreamUrl ? 'Unknown' : 'No stream')}
                        </p>
                      </div>
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">go2rtc</span>
                        <p className={healthData.go2rtc.healthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {healthData.go2rtc.healthy ? 'Connected' : 'Unavailable'}
                        </p>
                      </div>
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Stream registered</span>
                        <p className={healthData.go2rtc.streamRegistered ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                          {healthData.go2rtc.streamRegistered ? 'Yes' : 'No'}
                        </p>
                      </div>
                      {healthData.health?.lastCheck && (
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Last check</span>
                          <p className="text-slate-700 dark:text-slate-300 text-xs">
                            {new Date(healthData.health.lastCheck).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {(healthData.health?.frameRate != null || healthData.health?.resolution || healthData.health?.streamQuality != null) && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                        {healthData.health.frameRate != null && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">Frame rate: {healthData.health.frameRate} fps</p>
                        )}
                        {healthData.health.resolution && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">Resolution: {healthData.health.resolution}</p>
                        )}
                        {healthData.health.streamQuality != null && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">Quality: {Math.round(healthData.health.streamQuality * 100)}%</p>
                        )}
                      </div>
                    )}
                    {!healthData.derived.hasStreamUrl && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs">Configure an RTSP URL in Details to enable streaming.</p>
                    )}
                  </div>
                )}
              </div>
            )
          ) : loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading camera details...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Zone / Location
                </label>
                <input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. Entry Gate"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Camera Details</h3>
                <div className="space-y-2.5 text-sm">
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Camera ID</span>
                    <div className="flex items-center gap-1.5">
                      <p className="flex-1 text-slate-900 dark:text-white break-all font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">
                        {cam.id}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cam.id);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="shrink-0 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        title="Copy ID"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {cam.streamUrl && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">RTSP URL</span>
                      <p className="text-slate-900 dark:text-white break-all font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">
                        {cam.streamUrl}
                      </p>
                    </div>
                  )}
                  {(cam.location || cam.zone) && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Location / Zone</span>
                      <p className="text-slate-900 dark:text-white">
                        {cam.zone && cam.location ? `${cam.zone} · ${cam.location}` : (cam.zone || cam.location)}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {cam.type && (
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Type</span>
                        <p className="text-slate-900 dark:text-white">{cam.type}</p>
                      </div>
                    )}
                    {cam.status && (
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Status</span>
                        <p className="text-slate-900 dark:text-white capitalize">{cam.status}</p>
                      </div>
                    )}
                    {(cam.ipAddress || cam.port != null) && (
                      <div>
                        <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">IP / Port</span>
                        <p className="text-slate-900 dark:text-white font-mono text-xs">
                          {cam.ipAddress ?? '—'}{cam.port != null ? `:${cam.port}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  {cam.rtspPath && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">RTSP Path</span>
                      <p className="text-slate-900 dark:text-white font-mono text-xs">{cam.rtspPath}</p>
                    </div>
                  )}
                  {cam.hlsUrl && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">HLS URL</span>
                      <p className="text-slate-900 dark:text-white font-mono text-xs break-all">{cam.hlsUrl}</p>
                    </div>
                  )}
                  {(cam.createdAt || cam.updatedAt) && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 text-xs mb-0.5">Last updated</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        {cam.updatedAt ? new Date(cam.updatedAt).toLocaleString() : cam.createdAt ? new Date(cam.createdAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI Vision is read-only — Save/Delete would act on fields that tab never shows. */}
        <div className={`flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 ${tab === AI_VISION_TAB ? 'hidden' : ''}`}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting...' : 'Delete Camera'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
