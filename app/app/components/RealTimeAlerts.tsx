'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from './Toast';
import { AlertTriangle, Bell } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  worksiteId: string;
  worksite?: { name: string };
}

export default function RealTimeAlerts({ userId, worksiteIds }: { userId: string; worksiteIds: string[] }) {
  const [isConnected, setIsConnected] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const { success, warning, error: showError } = useToast();

  useEffect(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      worksiteIds.length > 0
        ? `${base}/api/alerts/stream?worksiteId=${worksiteIds[0]}`
        : `${base}/api/alerts/stream`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data);
        if (raw.ready) return;
        const alert = raw as Alert;
        if (!alert.id || seenIds.current.has(alert.id)) return;
        seenIds.current.add(alert.id);

        const sev = (alert.severity || 'MEDIUM').toUpperCase() as Alert['severity'];
        if (sev === 'CRITICAL') {
          showError(
            `🚨 Critical Alert: ${alert.title}`,
            `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
          );
          try {
            new Audio('/sounds/alert.mp3').play().catch(() => {});
          } catch {}
        } else if (sev === 'HIGH') {
          warning(
            `⚠️ High Priority: ${alert.title}`,
            `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
          );
        } else {
          success(
            `Alert: ${alert.title}`,
            `${alert.worksite?.name || 'Worksite'}: ${alert.description}`
          );
        }
        setAlertCount((prev) => prev + 1);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [worksiteIds, showError, warning, success]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isConnected && alertCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {alertCount} new {alertCount === 1 ? 'alert' : 'alerts'}
          </span>
        </div>
      )}

      {!isConnected && (
        <div className="bg-yellow-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs">
          <AlertTriangle className="h-3 w-3" />
          Real-time updates offline
        </div>
      )}
    </div>
  );
}
