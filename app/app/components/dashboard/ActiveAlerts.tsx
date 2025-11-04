'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { canAcknowledgeAlerts, UserRole } from '@/app/lib/permissions';

interface Alert {
  id: string;
  title?: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
  source?: string;
  location?: string;
  createdAt: string;
  resolvedAt?: string;
  metadata?: any;
  ruleId?: string;
  worksiteId?: string;
  rule?: {
    name: string;
  };
  worksite?: {
    name: string;
  };
}

export default function ActiveAlerts() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(loadAlerts, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.filter((alert: Alert) => alert.status === 'ACTIVE'));
      }
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACKNOWLEDGED' })
      });
      
      if (res.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'border-green-500 text-green-400';
      case 'MEDIUM': return 'border-yellow-500 text-yellow-400';
      case 'HIGH': return 'border-orange-500 text-orange-400';
      case 'CRITICAL': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return '🟢';
      case 'MEDIUM': return '🟡';
      case 'HIGH': return '🟠';
      case 'CRITICAL': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
          {alerts.length}
        </span>
      </div>
      
      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-600 text-4xl mb-2">✅</div>
          <p className="text-gray-400">No active alerts</p>
          <p className="text-gray-500 text-sm">All systems are operating normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white font-medium text-sm mb-1">{alert.title || 'Alert'}</p>
                  <p className="text-gray-300 text-sm mb-2">{alert.description}</p>
                  <div className="text-gray-400 text-xs space-x-2">
                    {alert.location && <span>📍 {alert.location}</span>}
                    {alert.rule?.name && <span>• Rule: {alert.rule.name}</span>}
                    {alert.worksite?.name && <span>• Site: {alert.worksite.name}</span>}
                  </div>
                  {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {alert.metadata.confidence && (
                        <span>Confidence: {Math.round((alert.metadata.confidence || 0) * 100)}%</span>
                      )}
                      {alert.metadata.detectedObjects && (
                        <span className="ml-3">
                          Objects: {alert.metadata.detectedObjects.map((obj: any) => obj.class).join(', ')}
                        </span>
                      )}
                      {alert.metadata.cameraId && (
                        <span className="ml-3">Camera: {alert.metadata.cameraId}</span>
                      )}
                    </div>
                  )}
                </div>
                {canAcknowledgeAlerts((session?.user as any)?.role as UserRole) && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
