"use client";
import { GlobalStats } from './GlobalDashboard';

interface KeyMetricsCardsProps {
  stats: GlobalStats;
  loading: boolean;
}

export default function KeyMetricsCards({ stats, loading }: KeyMetricsCardsProps) {
  const metrics = [
    {
      title: 'Total Sites',
      value: stats.totalSites,
      subtitle: `${stats.activeSites} Active / ${stats.inactiveSites} Inactive`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'blue',
      trend: stats.activeSites > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Active Cameras',
      value: stats.totalCameras,
      subtitle: `${stats.onlineCameras} Online / ${stats.offlineCameras} Offline`,
      extra: `AI: ${stats.aiEnabledCameras}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'emerald',
      trend: stats.onlineCameras > stats.offlineCameras ? 'up' : 'down'
    },
    {
      title: 'Active Alerts',
      value: stats.totalAlerts,
      subtitle: `${stats.highAlerts} High / ${stats.mediumAlerts} Med / ${stats.lowAlerts} Low`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: stats.highAlerts > 0 ? 'red' : stats.mediumAlerts > 0 ? 'amber' : 'emerald',
      trend: stats.highAlerts > 0 ? 'down' : 'up'
    },
    {
      title: 'Safety Score',
      value: `${stats.averageSafetyScore}%`,
      subtitle: 'Average across all sites',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: stats.averageSafetyScore >= 80 ? 'emerald' : stats.averageSafetyScore >= 60 ? 'amber' : 'red',
      trend: stats.averageSafetyScore >= 80 ? 'up' : stats.averageSafetyScore >= 60 ? 'neutral' : 'down'
    },
    {
      title: 'Last System Activity',
      value: formatTimeAgo(stats.lastSystemActivity),
      subtitle: formatDateTime(stats.lastSystemActivity),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'purple',
      trend: 'neutral'
    }
  ];

  const colorClasses: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
    blue: {
      bg: 'from-blue-500/10 to-blue-600/5',
      icon: 'text-blue-400 bg-blue-500/20',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/10'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      icon: 'text-emerald-400 bg-emerald-500/20',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/10'
    },
    red: {
      bg: 'from-red-500/10 to-red-600/5',
      icon: 'text-red-400 bg-red-500/20',
      border: 'border-red-500/20',
      glow: 'shadow-red-500/10'
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-600/5',
      icon: 'text-amber-400 bg-amber-500/20',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/10'
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-600/5',
      icon: 'text-purple-400 bg-purple-500/20',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/10'
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-700" />
              <div className="w-16 h-4 rounded bg-slate-700" />
            </div>
            <div className="w-20 h-8 rounded bg-slate-700 mb-2" />
            <div className="w-32 h-3 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {metrics.map((metric, index) => {
        const colors = colorClasses[metric.color] || colorClasses.blue;
        
        return (
          <div
            key={index}
            className={`relative overflow-hidden bg-gradient-to-br ${colors.bg} rounded-xl p-5 border ${colors.border} shadow-lg ${colors.glow} hover:scale-[1.02] transition-all duration-300 group`}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white blur-2xl" />
            </div>

            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center`}>
                  {metric.icon}
                </div>
                {metric.trend !== 'neutral' && (
                  <div className={`flex items-center space-x-1 text-xs font-medium ${
                    metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {metric.trend === 'up' ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="mb-1">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-medium text-slate-300 mb-1">{metric.title}</h3>

              {/* Subtitle */}
              <p className="text-xs text-slate-400">{metric.subtitle}</p>

              {/* Extra info */}
              {metric.extra && (
                <p className="text-xs text-slate-500 mt-1">{metric.extra}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return 'Unknown';
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown';
  }
}

