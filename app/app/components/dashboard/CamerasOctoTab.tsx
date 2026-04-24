'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, Plus, Settings, Trash2, X } from 'lucide-react';
import { isAdminRole, normalizeRole } from '../../lib/roles';
import DetectionPanel from './DetectionPanel';

interface CamerasOctoTabProps {
  selectedSite: {
    id: string;
    name: string;
    octoEmbedUrl?: string | null;
    octoEmbedUrls?: unknown;
    octoCameraConfigs?: unknown;
  } | null;
  currentUser: { role?: string | null } | null;
}

function normalizeOctoUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Please enter a valid URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('OctoStream URL must start with https://');
  }

  if (parsed.hostname === 'octo.stream' && parsed.pathname.startsWith('/live/')) {
    const streamId = parsed.pathname.replace('/live/', '').replace(/^\/+/, '');
    if (!streamId) {
      throw new Error('Invalid Octo watch URL.');
    }
    return `https://www.octostream.com/embed/${streamId}`;
  }

  if (parsed.hostname === 'www.octostream.com' && parsed.pathname.startsWith('/embed/')) {
    return `${parsed.origin}${parsed.pathname}`;
  }

  throw new Error('Use an Octo embed or watch URL.');
}

function toEmbedUrls(rawList: unknown, fallbackUrl?: string | null): string[] {
  const normalized = new Set<string>();

  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item === 'string' && item.trim()) {
        normalized.add(item.trim());
      }
    }
  }

  if (fallbackUrl && fallbackUrl.trim()) {
    normalized.add(fallbackUrl.trim());
  }

  return Array.from(normalized);
}

type WizardMode = 'single' | 'multiple';
type WizardStep = 0 | 1;
interface OctoCameraConfig {
  name: string;
  embedUrl: string;
}

function extractSlugFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

function toCameraConfigs(rawConfigs: unknown, fallbackUrls: string[]): OctoCameraConfig[] {
  const configs: OctoCameraConfig[] = [];

  if (Array.isArray(rawConfigs)) {
    for (const item of rawConfigs) {
      const asObj = item as { name?: unknown; embedUrl?: unknown };
      if (asObj && typeof asObj.embedUrl === 'string') {
        const embedUrl = asObj.embedUrl.trim();
        if (!embedUrl) continue;
        const name =
          typeof asObj.name === 'string' && asObj.name.trim()
            ? asObj.name.trim()
            : extractSlugFromUrl(embedUrl) || 'Octo Camera';
        configs.push({ name, embedUrl });
      }
    }
  }

  if (!configs.length) {
    for (const url of fallbackUrls) {
      configs.push({ name: extractSlugFromUrl(url) || 'Octo Camera', embedUrl: url });
    }
  }

  const unique = new Map<string, OctoCameraConfig>();
  for (const cfg of configs) {
    if (!unique.has(cfg.embedUrl)) unique.set(cfg.embedUrl, cfg);
  }
  return Array.from(unique.values());
}

export default function CamerasOctoTab({ selectedSite, currentUser }: CamerasOctoTabProps) {
  const [mode, setMode] = useState<WizardMode>('single');
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [showWizard, setShowWizard] = useState(false);
  const [draftCameras, setDraftCameras] = useState<OctoCameraConfig[]>([{ name: '', embedUrl: '' }]);
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const [savedCameras, setSavedCameras] = useState<OctoCameraConfig[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState<number | null>(null);
  const [cameraSettingsDraft, setCameraSettingsDraft] = useState<OctoCameraConfig>({ name: '', embedUrl: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = useMemo(() => isAdminRole(normalizeRole(currentUser?.role)), [currentUser?.role]);

  useEffect(() => {
    const nextUrls = toEmbedUrls(selectedSite?.octoEmbedUrls, selectedSite?.octoEmbedUrl);
    const nextConfigs = toCameraConfigs(selectedSite?.octoCameraConfigs, nextUrls);
    setSavedUrls(nextUrls);
    setSavedCameras(nextConfigs);
    setDraftCameras(nextConfigs.length ? nextConfigs : [{ name: '', embedUrl: '' }]);
    setMode(nextConfigs.length > 1 ? 'multiple' : 'single');
    setWizardStep(0);
    setShowWizard(false);
    setError('');
  }, [selectedSite?.id, selectedSite?.octoEmbedUrl, selectedSite?.octoEmbedUrls, selectedSite?.octoCameraConfigs]);

  if (!selectedSite) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Site Selected</h3>
          <p className="text-slate-400">Select a worksite from the dropdown above to open OctoStream cameras.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!canEdit || !selectedSite) return;

    try {
      setError('');
      setSaving(true);
      const relevantCameras =
        mode === 'single' ? [draftCameras[0] ?? { name: '', embedUrl: '' }] : draftCameras;

      const normalizedConfigs: OctoCameraConfig[] = [];
      for (const cam of relevantCameras) {
        const embedUrl = normalizeOctoUrl(cam.embedUrl || '');
        const fallbackName = extractSlugFromUrl(embedUrl) || 'Octo Camera';
        const name = (cam.name || '').trim() || fallbackName;
        normalizedConfigs.push({ name, embedUrl });
      }
      if (!normalizedConfigs.length) throw new Error('Add at least one Octo camera.');
      const deduped = Array.from(new Map(normalizedConfigs.map((c) => [c.embedUrl, c])).values());
      const normalizedList = deduped.map((cfg) => cfg.embedUrl);
      const primaryUrl = normalizedList[0] ?? null;

      const response = await fetch(`/api/worksites/${selectedSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          octoEmbedUrl: primaryUrl,
          octoEmbedUrls: normalizedList,
          octoCameraConfigs: deduped,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Failed to save Octo URL.');
      }

      setSavedUrls(normalizedList);
      setSavedCameras(deduped);
      setDraftCameras(deduped);
      setShowWizard(false);
      setWizardStep(0);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save Octo URL.');
    } finally {
      setSaving(false);
    }
  };

  const persistCameras = async (cameras: OctoCameraConfig[]) => {
    if (!selectedSite) return;
    const normalizedConfigs: OctoCameraConfig[] = [];
    for (const cam of cameras) {
      const embedUrl = normalizeOctoUrl(cam.embedUrl || '');
      const fallbackName = extractSlugFromUrl(embedUrl) || 'Octo Camera';
      const name = (cam.name || '').trim() || fallbackName;
      normalizedConfigs.push({ name, embedUrl });
    }
    const deduped = Array.from(new Map(normalizedConfigs.map((c) => [c.embedUrl, c])).values());
    const normalizedList = deduped.map((cfg) => cfg.embedUrl);
    const primaryUrl = normalizedList[0] ?? null;

    const response = await fetch(`/api/worksites/${selectedSite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        octoEmbedUrl: primaryUrl,
        octoEmbedUrls: normalizedList,
        octoCameraConfigs: deduped,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || 'Failed to save Octo URL.');
    }

    setSavedUrls(normalizedList);
    setSavedCameras(deduped);
    setDraftCameras(deduped.length ? deduped : [{ name: '', embedUrl: '' }]);
  };

  const watchLinks = savedCameras.map((camera) =>
    camera.embedUrl.replace('https://www.octostream.com/embed/', 'https://octo.stream/live/')
  );
  const steps = ['Mode', 'Camera Details'];

  const updateDraftCamera = (index: number, patch: Partial<OctoCameraConfig>) => {
    setDraftCameras((prev) =>
      prev.map((cam, i) => {
        if (i !== index) return cam;
        const next = { ...cam, ...patch };
        if (patch.embedUrl !== undefined && (!cam.name || cam.name === extractSlugFromUrl(cam.embedUrl))) {
          const slug = extractSlugFromUrl(patch.embedUrl);
          if (slug) next.name = slug;
        }
        return next;
      })
    );
  };

  const addDraftRow = () => setDraftCameras((prev) => [...prev, { name: '', embedUrl: '' }]);
  const removeDraftRow = (index: number) =>
    setDraftCameras((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const beginWizard = () => {
    setDraftCameras(savedCameras.length ? savedCameras : [{ name: '', embedUrl: '' }]);
    setWizardStep(0);
    setShowWizard(true);
    setError('');
  };
  const beginAddCamera = () => {
    setMode('multiple');
    const next = [...(savedCameras.length ? savedCameras : []), { name: '', embedUrl: '' }];
    setDraftCameras(next);
    setWizardStep(1);
    setShowWizard(true);
    setError('');
  };
  const openCameraSettings = (index: number) => {
    const camera = savedCameras[index];
    if (!camera) return;
    setActiveCameraIndex(index);
    setCameraSettingsDraft(camera);
    setError('');
  };
  const closeCameraSettings = () => {
    setActiveCameraIndex(null);
    setCameraSettingsDraft({ name: '', embedUrl: '' });
  };
  const saveCameraSettings = async () => {
    if (activeCameraIndex === null) return;
    try {
      setSaving(true);
      const next = savedCameras.map((camera, idx) => (idx === activeCameraIndex ? cameraSettingsDraft : camera));
      await persistCameras(next);
      closeCameraSettings();
    } catch (e: any) {
      setError(e?.message || 'Failed to save camera settings.');
    } finally {
      setSaving(false);
    }
  };
  const removeCamera = async () => {
    if (activeCameraIndex === null) return;
    try {
      setSaving(true);
      const next = savedCameras.filter((_, idx) => idx !== activeCameraIndex);
      if (!next.length) {
        if (!selectedSite) return;
        const response = await fetch(`/api/worksites/${selectedSite.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            octoEmbedUrl: null,
            octoEmbedUrls: [],
            octoCameraConfigs: [],
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Failed to remove camera.');
        }
        setSavedCameras([]);
        setSavedUrls([]);
        setDraftCameras([{ name: '', embedUrl: '' }]);
      } else {
        await persistCameras(next);
      }
      closeCameraSettings();
    } catch (e: any) {
      setError(e?.message || 'Failed to remove camera.');
    } finally {
      setSaving(false);
    }
  };
  const canGoNextFromStep0 = mode === 'single' || mode === 'multiple';
  const detailsRows = mode === 'single' ? [draftCameras[0] ?? { name: '', embedUrl: '' }] : draftCameras;
  const step1Valid = detailsRows.every((row) => row.embedUrl.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Cameras Octo</h2>
        <p className="text-slate-400 mt-1">{selectedSite.name}</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6 space-y-4">
        {canEdit && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={beginWizard}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-slate-300 text-white px-4 py-2 font-medium transition-colors"
            >
              Configure Octo Cameras
            </button>
            <p className="text-xs text-slate-400">
              Wizard supports single or multiple cameras with custom names.
            </p>
          </div>
        )}

        {!canEdit && (
          <p className="text-sm text-slate-400">
            You can view this stream here. Ask an admin to change the OctoStream URL.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {savedUrls.length ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Octo Cameras</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {savedUrls.length} camera{savedUrls.length !== 1 ? 's' : ''} streaming
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={beginAddCamera}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  Add Camera
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCameras.map((camera, idx) => {
                const cameraName = camera.name || `Camera ${idx + 1}`;
                return (
                <div
                  key={`${camera.embedUrl}-${idx}`}
                  className="rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{cameraName}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={watchLinks[idx]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-white"
                        aria-label={`Open live view for ${cameraName}`}
                        title="Open live view"
                      >
                        <Eye size={14} />
                      </a>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                        live
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openCameraSettings(idx)}
                          className="text-slate-300 hover:text-white"
                          aria-label={`Open settings for ${cameraName}`}
                        >
                          <Settings size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-black">
                    <iframe
                      src={camera.embedUrl}
                      title={`OctoStream live video player ${idx + 1}`}
                      className="w-full aspect-video border-0 block rounded-lg"
                      loading="lazy"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="px-3 py-2">
                    <a
                      href={watchLinks[idx]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-xs text-blue-300 hover:text-blue-200 underline"
                    >
                      Open watch link
                    </a>
                  </div>
                </div>
              )})}
            </div>
            {savedCameras.length > 0 && (
              <DetectionPanel
                siteId={selectedSite.id}
                cameras={savedCameras}
              />
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-600 p-6 text-center">
            <p className="text-slate-300 font-medium">No OctoStream cameras configured for this worksite yet.</p>
            <p className="text-slate-400 text-sm mt-1">Use Add One Camera or Add Multiple Cameras above.</p>
            {canEdit && (
              <button
                type="button"
                onClick={beginAddCamera}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium"
              >
                <Plus size={14} />
                Add Camera
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && showWizard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowWizard(false)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Configure Octo Cameras</h2>
              <button
                onClick={() => setShowWizard(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i <= wizardStep ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {i < wizardStep ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs ${i === wizardStep ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}>
                    {s}
                  </span>
                  {i < steps.length - 1 && <div className={`w-8 h-px ${i < wizardStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}`} />}
                </div>
              ))}
            </div>

            <div className="px-6 py-6 min-h-[260px] space-y-4">
              {wizardStep === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">Choose how you want to add Octo cameras.</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('single')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        mode === 'single' ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Add One Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('multiple')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        mode === 'multiple' ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Add Multiple Cameras
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-3">
                  {detailsRows.map((row, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-600/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">Camera {idx + 1}</p>
                        {mode === 'multiple' && detailsRows.length > 1 && (
                          <button type="button" onClick={() => removeDraftRow(idx)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateDraftCamera(idx, { name: e.target.value })}
                        placeholder={extractSlugFromUrl(row.embedUrl) || 'camera-name'}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="url"
                        value={row.embedUrl}
                        onChange={(e) => updateDraftCamera(idx, { embedUrl: e.target.value })}
                        placeholder="https://www.octostream.com/embed/testaaa or https://octo.stream/live/testaaa"
                        className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  {mode === 'multiple' && (
                    <button
                      type="button"
                      onClick={addDraftRow}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600"
                    >
                      <Plus size={14} />
                      Add another camera row
                    </button>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => (wizardStep > 0 ? setWizardStep((wizardStep - 1) as WizardStep) : setShowWizard(false))}
                className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep === 0 ? (
                <button
                  onClick={() => canGoNextFromStep0 && setWizardStep(1)}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !step1Valid}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving...' : mode === 'single' ? 'Save Camera' : 'Save Cameras'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {canEdit && activeCameraIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeCameraSettings()}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Camera Settings</h2>
              <button onClick={closeCameraSettings} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-slate-400">Camera #{activeCameraIndex + 1}</p>
              <input
                type="text"
                value={cameraSettingsDraft.name}
                onChange={(e) => setCameraSettingsDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={extractSlugFromUrl(cameraSettingsDraft.embedUrl) || 'camera-name'}
                className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={cameraSettingsDraft.embedUrl}
                onChange={(e) => setCameraSettingsDraft((prev) => ({ ...prev, embedUrl: e.target.value }))}
                placeholder="https://www.octostream.com/embed/testaaa or https://octo.stream/live/testaaa"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400">
                Slug preview: {extractSlugFromUrl(cameraSettingsDraft.embedUrl) || 'n/a'}
              </p>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={removeCamera}
                disabled={saving}
                className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-sm"
              >
                <Trash2 size={14} />
                Remove camera
              </button>
              <button
                type="button"
                onClick={saveCameraSettings}
                disabled={saving}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
