"use client";
import { useState } from 'react';
import CameraThumbnail from './CameraThumbnail';
import { CameraHealth } from './GlobalDashboard';

interface SystemHealthPanelProps {
  cameras: CameraHealth[];
  loading: boolean;
}

export default function SystemHealthPanel({ cameras, loading }: SystemHealthPanelProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'ai-on' | 'ai-off'>('all');

  const filteredCameras = cameras.filter(camera => {
    switch (filter) {
      case 'online':
        return camera.status === 'online';
      case 'offline':
        return camera.status === 'offline';
      case 'ai-on':
        return camera.aiEnabled;
      case 'ai-off':
        return !camera.aiEnabled;
      default:
        return true;
    }
  });

  const stats = {
    total: cameras.length,
    online: cameras.filter(c => c.status === 'online').length,
    offline: cameras.filter(c => c.status === 'offline').length,
    aiEnabled: cameras.filter(c => c.aiEnabled).length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'offline':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <div className="w-40 h-6 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-video bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>System Health</span>
          </h2>
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex bg-slate-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center space-x-4 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-full transition-colors ${filter === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-2 py-1 rounded-full transition-colors flex items-center space-x-1 ${filter === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-emerald-400'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Online ({stats.online})</span>
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={`px-2 py-1 rounded-full transition-colors flex items-center space-x-1 ${filter === 'offline' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-red-400'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Offline ({stats.offline})</span>
          </button>
          <button
            onClick={() => setFilter('ai-on')}
            className={`px-2 py-1 rounded-full transition-colors flex items-center space-x-1 ${filter === 'ai-on' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-blue-400'}`}
          >
            <span>AI On ({stats.aiEnabled})</span>
          </button>
        </div>
      </div>

      {/* Camera Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCameras.slice(0, 12).map((camera) => (
              <div
                key={camera.id}
                className="relative group bg-slate-700/30 rounded-lg overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
              >
                {/* Camera Thumbnail */}
                <div className="aspect-video overflow-hidden">
                  <CameraThumbnail
                    cameraId={camera.id}
                    cameraName={camera.name}
                    isOnline={camera.status === 'online'}
                  />
                </div>

                {/* Status Indicator */}
                <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${getStatusColor(camera.status)} ${camera.status === 'online' ? '' : 'animate-pulse'}`} />

                {/* AI Badge */}
                {camera.aiEnabled && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-500/80 text-white text-[10px] font-bold rounded">
                    AI
                  </div>
                )}

                {/* Alert Count */}
                {camera.recentAlerts > 0 && (
                  <div className="absolute bottom-2 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {camera.recentAlerts > 9 ? '9+' : camera.recentAlerts}
                  </div>
                )}

                {/* Info Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2">
                  <p className="text-xs font-medium text-white truncate">{camera.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{camera.site}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCameras.map((camera) => (
              <div
                key={camera.id}
                className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full ${getStatusColor(camera.status)} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">{camera.name}</p>
                    {camera.aiEnabled && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">AI</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{camera.site}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">{camera.lastDetection}</p>
                  {camera.recentAlerts > 0 && (
                    <span className="text-xs text-red-400">{camera.recentAlerts} alerts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCameras.length > 12 && viewMode === 'grid' && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View all {filteredCameras.length} cameras →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

