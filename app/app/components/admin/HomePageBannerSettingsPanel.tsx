'use client';

import { useState, useEffect, useCallback } from 'react';

type Props = {
  /** Called after a successful save (e.g. parent toast) */
  onSaved?: () => void;
  variant?: 'light' | 'dark';
};

export default function HomePageBannerSettingsPanel({ onSaved, variant = 'light' }: Props) {
  const [homeBannerEnabled, setHomeBannerEnabled] = useState(false);
  const [homeBannerMessage, setHomeBannerMessage] = useState('');
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const isDark = variant === 'dark';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBannerLoading(true);
      setBannerError(null);
      try {
        const res = await fetch('/api/admin/config', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        const hb = data?.homeBanner;
        if (hb && typeof hb === 'object') {
          setHomeBannerEnabled(Boolean(hb.enabled));
          setHomeBannerMessage(typeof hb.message === 'string' ? hb.message : '');
        }
      } catch {
        if (!cancelled) setBannerError('Could not load home page banner settings.');
      } finally {
        if (!cancelled) setBannerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveHomeBanner = useCallback(async () => {
    setBannerSaving(true);
    setBannerError(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeBanner: {
            enabled: homeBannerEnabled,
            message: homeBannerMessage.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Save failed');
      }
      onSaved?.();
    } catch (e: unknown) {
      setBannerError(e instanceof Error ? e.message : 'Could not save home page banner.');
    } finally {
      setBannerSaving(false);
    }
  }, [homeBannerEnabled, homeBannerMessage, onSaved]);

  const cardClass = isDark
    ? 'rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6'
    : 'border border-gray-200 rounded-lg p-5 bg-gray-50/80';

  const titleClass = isDark ? 'text-lg font-semibold text-white mb-1' : 'text-lg font-medium text-gray-900 mb-1';
  const descClass = isDark ? 'text-sm text-slate-400 mb-4' : 'text-sm text-gray-600 mb-4';
  const labelClass = isDark ? 'ml-2 block text-sm text-slate-300' : 'ml-2 block text-sm text-gray-900';
  const fieldLabelClass = isDark
    ? 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2'
    : 'block text-sm font-medium text-gray-700';
  const inputClass = isDark
    ? 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
    : 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500';
  const hintClass = isDark ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-xs text-gray-500';
  const errorClass = isDark ? 'text-sm text-red-400 mb-3' : 'text-sm text-red-600 mb-3';
  const btnClass = isDark
    ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50'
    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors';

  return (
    <div className={cardClass}>
      <h3 className={titleClass}>Home page announcement</h3>
      <p className={descClass}>
        Show a banner at the top of the public marketing home page for notices, maintenance windows, or promotions.
      </p>
      {bannerError && (
        <p className={errorClass} role="alert">
          {bannerError}
        </p>
      )}
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            id="home-banner-enabled"
            type="checkbox"
            className={
              isDark
                ? 'rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500'
                : 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            }
            checked={homeBannerEnabled}
            onChange={(e) => setHomeBannerEnabled(e.target.checked)}
            disabled={bannerLoading}
          />
          <label htmlFor="home-banner-enabled" className={labelClass}>
            Show banner on home page
          </label>
        </div>
        <div>
          <label htmlFor="home-banner-message" className={fieldLabelClass}>
            Banner text
          </label>
          <textarea
            id="home-banner-message"
            rows={3}
            className={inputClass}
            placeholder="e.g. Scheduled maintenance Saturday 2–4am ET."
            value={homeBannerMessage}
            onChange={(e) => setHomeBannerMessage(e.target.value)}
            disabled={bannerLoading}
          />
          <p className={hintClass}>The banner is hidden if this field is empty, even when enabled.</p>
        </div>
        <div>
          <button type="button" onClick={saveHomeBanner} disabled={bannerLoading || bannerSaving} className={btnClass}>
            {bannerSaving ? 'Saving…' : 'Save home page banner'}
          </button>
        </div>
      </div>
    </div>
  );
}
