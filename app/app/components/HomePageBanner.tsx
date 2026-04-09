'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

export default function HomePageBanner() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/home-banner', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { enabled?: boolean; message?: string }) => {
        if (cancelled) return;
        setEnabled(Boolean(data?.enabled));
        setMessage(typeof data?.message === 'string' ? data.message : '');
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setMessage('');
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !enabled || !message.trim()) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-400/40 bg-amber-500/15 text-amber-100"
    >
      <div className="container mx-auto flex items-start justify-center gap-3 px-6 py-3 text-center text-sm leading-relaxed">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <p className="min-w-0 flex-1 font-medium">{message.trim()}</p>
      </div>
    </div>
  );
}
