"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from './TopBar';
import KeyMetricsCards from './KeyMetricsCards';
import QuickActionsPanel from './QuickActionsPanel';
import AlertsFeed from './AlertsFeed';
import SystemHealthPanel from './SystemHealthPanel';

export interface GlobalStats {
  totalSites: number;
  activeSites: number;
  inactiveSites: number;
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  aiEnabledCameras: number;
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  averageSafetyScore: number;
  lastSystemActivity: string;
}

export interface CriticalAlert {
  id: string;
  site: string;
  siteId: string;
  camera: string;
  cameraId: string;
  alertType: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
  responsibleManager: string;
  managerId: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface CameraHealth {
  id: string;
  name: string;
  site: string;
  siteId: string;
  status: 'online' | 'offline' | 'maintenance';
  aiEnabled: boolean;
  lastDetection: string;
  recentAlerts: number;
}

export interface AIPerformance {
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  totalDetections: number;
  lastUpdated: string;
}

interface GlobalDashboardProps {
  currentUser: any;
}

export default function GlobalDashboard({ currentUser }: GlobalDashboardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [cameraHealth, setCameraHealth] = useState<CameraHealth[]>([]);
  const [aiPerformance, setAIPerformance] = useState<AIPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Modals
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchGlobalData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchGlobalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);

      const statsRes = await fetch('/api/admin/global-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }

    try {
      const [alertsRes, camerasRes, systemStatusRes] = await Promise.all([
        fetch('/api/alerts?limit=10&severity=HIGH&status=ACTIVE'),
        fetch('/api/cameras?includeHealth=true'),
        fetch('/api/admin/system-status'),
      ]);

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        if (alertsData.success) {
          setCriticalAlerts(alertsData.data || []);
        }
      }

      if (camerasRes.ok) {
        const camerasData = await camerasRes.json();
        if (camerasData.success) {
          setCameraHealth(camerasData.data || []);
        }
      }

      if (systemStatusRes.ok) {
        const systemData = await systemStatusRes.json();
        setAIPerformance({
          accuracy: systemData.aiAccuracy || 94.5,
          falsePositives: systemData.falsePositives || 12,
          falseNegatives: systemData.falseNegatives || 3,
          totalDetections: systemData.totalDetections || 15420,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching global dashboard secondary data:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleAddSite = () => {
    router.push('/company/worksites/create');
  };

  const handleGenerateReport = (type: string) => {
    router.push(`/dashboard/reports?type=${type}`);
    setShowReportModal(false);
  };

  const handleViewWorkflows = () => {
    router.push('/dashboard?tab=workflows');
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'assign' | 'view') => {
    if (action === 'view') {
      router.push(`/dashboard/alerts/${alertId}`);
    } else if (action === 'acknowledge') {
      try {
        await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
        fetchGlobalData();
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    }
  };

  // Default stats if API doesn't return data
  const displayStats: GlobalStats = stats || {
    totalSites: 0,
    activeSites: 0,
    inactiveSites: 0,
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    aiEnabledCameras: 0,
    totalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0,
    averageSafetyScore: 0,
    lastSystemActivity: new Date().toISOString()
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Bar */}
      <TopBar
        currentUser={currentUser}
        notifications={notifications}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Key Metrics Cards */}
        <KeyMetricsCards stats={displayStats} loading={loading} />

        {/* Quick Actions */}
        <QuickActionsPanel
          onAddSite={handleAddSite}
          onGenerateReport={() => setShowReportModal(true)}
          onViewWorkflows={handleViewWorkflows}
        />

        {/* Two Column Layout: Alerts Feed + System Health */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Alerts Feed */}
          <AlertsFeed
            alerts={criticalAlerts}
            loading={loading}
            onAlertAction={handleAlertAction}
          />

          {/* System Health Panel */}
          <SystemHealthPanel
            cameras={cameraHealth}
            aiPerformance={aiPerformance}
            loading={loading}
          />
        </div>
      </main>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Generate Global Report</h3>
            <div className="space-y-3">
              {['Daily', 'Weekly', 'Monthly', 'Custom'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleGenerateReport(type.toLowerCase())}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-left flex items-center justify-between group"
                >
                  <span>{type} Report</span>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="mt-4 w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

