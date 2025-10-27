"use client";
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { DashboardProvider, useDashboard, useSiteManagement, useNotifications } from '../lib/context/DashboardContext';
import { useAlerts, useCameras, useAnalytics } from '../lib/hooks/useApi';
import CameraFeed from '../components/CameraFeed';
import { NotificationContainer } from '../components/NotificationToast';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ActiveAlerts from '@/app/components/dashboard/ActiveAlerts';
import RealtimeDetectionOverlay from '../components/RealtimeDetectionOverlay';
import ExportButton from '../components/ExportButton';
import { useCameraStore } from '../lib/camera-store';
import SafetyScoreCard from '../components/SafetyScoreCard';

// Wrapper component that provides the dashboard context
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const [selected, setSelected] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { state, selectSite, hasPermission, addNotification } = useDashboard();
  const { selectedSiteId, selectedSite, accessibleSites } = useSiteManagement();
  const { notifications, removeNotification } = useNotifications();
  const welcomeNotificationShown = useRef(false);

  // Update selected site when context changes
  useEffect(() => {
    if (!selectedSiteId && accessibleSites.length > 0) {
      selectSite(accessibleSites[0].id);
    }
  }, [selectedSiteId, accessibleSites, selectSite]);

  // Show welcome notification (only once)
  useEffect(() => {
    if (selectedSite && !state.isUsingMockData && !welcomeNotificationShown.current) {
      welcomeNotificationShown.current = true;
      addNotification({
        type: 'info',
        title: 'Camera Feed Status',
        message: 'Live camera feeds are now connected. YOLOv8 stream will automatically fallback to demo video if unavailable.'
      });
    }
  }, [selectedSite, state.isUsingMockData, addNotification]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
      {/* Enhanced Sidebar with Site Selector */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-slate-700/50 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">

            
            {/* Site Selector */}
            <div className="px-4 mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Worksite Selection
              </label>
              <select
                value={selectedSiteId || ''}
                onChange={(e) => selectSite(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm font-medium"
              >
                {accessibleSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              {selectedSite && (
                <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Current Site</p>
                  <p className="text-sm font-semibold text-white mb-0.5">{selectedSite.name}</p>
                  <p className="text-xs text-slate-400 mb-2">{selectedSite.address}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md ${
                      selectedSite.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      selectedSite.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {selectedSite.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Safety: <span className="text-blue-400">{selectedSite.safetyScore}%</span>
                    </span>
        </div>
        </div>
      )}
    </div>

            <nav className="mt-6 flex-1 space-y-1.5 bg-transparent px-3">
              {[
                { 
                  key: 'overview', 
                  name: 'Overview', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                    </svg>
                  )
                },
                { 
                  key: 'sites', 
                  name: 'Site Management', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )
                },
                { 
                  key: 'cameras', 
                  name: 'Cameras', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
                { 
                  key: 'alerts', 
                  name: 'Alerts', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )
                },
                { 
                  key: 'reports', 
                  name: 'Reports', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )
                },
                { 
                  key: 'workflows', 
                  name: 'Workflows', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
                { 
                  key: 'settings', 
                  name: 'Settings', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelected(item.key)}
                  className={`group flex w-full items-center px-3.5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    selected === item.key
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <span className="mr-3 h-5 w-5 flex-shrink-0">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </nav>

                                {/* User Info */}
                    <div className="px-4 mt-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Logged in as</p>
                        <p className="text-sm font-medium text-white">{state.currentUser?.name || 'Loading...'}</p>
                        <p className="text-xs text-gray-400">{state.currentUser?.email || 'Loading...'}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                          state.currentUser?.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                          state.currentUser?.role === 'site-manager' ? 'bg-blue-900 text-blue-300' :
                          'bg-green-900 text-green-300'
                        }`}>
                          {state.currentUser?.role || 'Loading...'}
                        </span>
                      </div>
                      

                    </div>
          </div>
        </div>
      </div>
      <main className="md:pl-64">
        {/* Mobile menu button */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-gray-800 text-white p-2 rounded-md border border-gray-700 hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto">
              <div className="flex flex-col h-full pt-4 pb-4">
            {/* Site Selector */}
            <div className="px-4 mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Worksite Selector
              </label>
              <select
                value={selectedSiteId || ''}
                onChange={(e) => selectSite(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {accessibleSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              {selectedSite && (
                <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Current Site</p>
                  <p className="text-sm font-medium text-white">{selectedSite.name}</p>
                  <p className="text-xs text-gray-400">{selectedSite.address}</p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedSite.status === 'active' ? 'bg-green-900 text-green-300' :
                      selectedSite.status === 'maintenance' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {selectedSite.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      Safety: {selectedSite.safetyScore}%
                    </span>
        </div>
        </div>
      )}
    </div>

                {/* Navigation */}
            <nav className="mt-5 flex-1 space-y-1 bg-gray-900 px-2">
              {[
                    { 
                      key: 'overview', 
                      name: 'Overview', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                        </svg>
                      )
                    },
                    { 
                      key: 'sites', 
                      name: 'Site Management', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )
                    },
                    { 
                      key: 'cameras', 
                      name: 'Cameras', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    },
                    { 
                      key: 'alerts', 
                      name: 'Alerts', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )
                    },
                    { 
                      key: 'reports', 
                      name: 'Reports', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )
                    },
                    { 
                      key: 'workflows', 
                      name: 'Workflows', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    },
                    { 
                      key: 'settings', 
                      name: 'Settings', 
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )
                    },
              ].map((item) => (
                <button
                  key={item.key}
                      onClick={() => {
                        setSelected(item.key);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex w-full items-center px-3.5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    selected === item.key
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                      <span className="mr-3 h-5 w-5 flex-shrink-0">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </nav>

                                {/* User Info */}
                    <div className="px-4 mt-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Logged in as</p>
                        <p className="text-sm font-medium text-white">{state.currentUser?.name || 'Loading...'}</p>
                        <p className="text-xs text-gray-400">{state.currentUser?.email || 'Loading...'}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                          state.currentUser?.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                          state.currentUser?.role === 'site-manager' ? 'bg-blue-900 text-blue-300' :
                          'bg-green-900 text-green-300'
                        }`}>
                          {state.currentUser?.role || 'Loading...'}
                        </span>
                      </div>
                    </div>
          </div>
        </div>
      </div>
        )}

        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {selected === 'overview' && <OverviewPage currentSite={selectedSite} />}
            {selected === 'sites' && <SitesPage sites={accessibleSites} currentUser={state.currentUser} />}
            {selected === 'cameras' && <CamerasPage currentSite={selectedSite} />}
            {selected === 'alerts' && <AlertsPage currentSite={selectedSite} />}
            {selected === 'reports' && <ReportsPage currentSite={selectedSite} />}
            {selected === 'workflows' && <WorkflowsPage currentSite={selectedSite} />}
            {selected === 'settings' && <SettingsPage currentUser={state.currentUser} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if we should auto-switch to a specific tab (e.g., from alert builder)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['overview', 'monitoring', 'alerts', 'reports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  if (!currentSite) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-300">Please select a worksite to view its overview.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'overview', 
      name: 'Overview', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'alerts', 
      name: 'Alerts', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    { 
      id: 'monitoring', 
      name: 'Monitoring', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'reports', 
      name: 'Reports', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'sites', 
      name: 'Sites', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{currentSite.name}</h1>
          <p className="text-gray-300">{currentSite.address}</p>
        </div>
        <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            currentSite.status === 'active' ? 'bg-green-900 text-green-300' :
            currentSite.status === 'maintenance' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            {currentSite.status}
          </span>
          <span className="text-sm text-gray-400">Safety Score: {currentSite.safetyScore}%</span>
          </div>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="md"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab currentSite={currentSite} />}
        {activeTab === 'alerts' && <AlertsTab currentSite={currentSite} />}
        {activeTab === 'monitoring' && <MonitoringTab currentSite={currentSite} />}
        {activeTab === 'reports' && <ReportsTab currentSite={currentSite} />}
        {activeTab === 'sites' && <SitesTab currentSite={currentSite} />}
      </div>
    </div>
  );
}

function OverviewTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const { cameras } = useCameraStore();

  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showCameraManager, setShowCameraManager] = useState(false);
  const [enableDetection, setEnableDetection] = useState(false);
  
  // Safety Score State
  const [safetyScoreData, setSafetyScoreData] = useState<any>(null);
  const [safetyScoreLoading, setSafetyScoreLoading] = useState(true);

  // Fetch safety score on mount
  useEffect(() => {
    const fetchSafetyScore = async () => {
      if (!currentSite?.id) return;
      
      try {
        setSafetyScoreLoading(true);
        const response = await fetch(
          `/api/safety-score?worksiteId=${currentSite.id}&date=${new Date().toISOString().split('T')[0]}`
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSafetyScoreData(result.data);
          } else {
            // Score doesn't exist, try to calculate it
            await calculateSafetyScore();
          }
        } else {
          // Score doesn't exist, try to calculate it
          await calculateSafetyScore();
        }
      } catch (error) {
        console.error('Error fetching safety score:', error);
      } finally {
        setSafetyScoreLoading(false);
      }
    };
    
    const calculateSafetyScore = async () => {
      try {
        const response = await fetch('/api/safety-score/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worksiteId: currentSite.id,
            date: new Date().toISOString().split('T')[0]
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSafetyScoreData(result.data);
          }
        }
      } catch (error) {
        console.error('Error calculating safety score:', error);
      }
    };
    
    fetchSafetyScore();
  }, [currentSite]);

  const currentCamera = cameras.length > 0 ? cameras[currentCameraIndex] : null;

  const nextCamera = () => {
    if (cameras.length > 0) {
    setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
    }
  };

  const previousCamera = () => {
    if (cameras.length > 0) {
    setCurrentCameraIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900 text-green-300';
      case 'offline': return 'bg-red-900 text-red-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const handleGenerateReport = () => {
    // Navigate to reports tab instead of analytics (which is under construction)
    router.push('/dashboard?tab=reports');
  };

  const handleConfigureAlerts = () => {
    // Navigate to alert management page
    router.push('/dashboard/alerts');
  };

  const navigateToReports = () => {
    setShowReportModal(false);
    router.push('/dashboard/reports');
  };

  const navigateToAlerts = () => {
    setShowAlertConfig(false);
    router.push('/dashboard/alerts');
  };

  const navigateToCameras = () => {
    setShowCameraManager(false);
    router.push('/dashboard/cameras');
  };

  return (
    <div className="space-y-6">
      {/* Safety Score Card */}
      {safetyScoreData && (
        <SafetyScoreCard
          data={safetyScoreData}
          loading={safetyScoreLoading}
          onRefresh={async () => {
            setSafetyScoreLoading(true);
            try {
              const response = await fetch('/api/safety-score/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  worksiteId: currentSite.id,
                  date: new Date().toISOString().split('T')[0],
                  forceRecalculate: true
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.success) {
                  setSafetyScoreData(result.data);
                }
              }
            } catch (error) {
              console.error('Error refreshing safety score:', error);
            } finally {
              setSafetyScoreLoading(false);
            }
          }}
        />
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Active Cameras</h3>
          <p className="text-3xl font-bold text-blue-400">{currentSite.cameras}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
          <p className="text-3xl font-bold text-red-400">{currentSite.alerts}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Safety Score</h3>
          <p className="text-3xl font-bold text-yellow-400">{currentSite.safetyScore}%</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Last Activity</h3>
          <p className="text-lg font-semibold text-green-400">{currentSite.lastActivity}</p>
        </div>
      </div>

      {/* Live Stream with Camera Navigation */}
      <div className="bg-gray-800 p-6 rounded-lg">
        {currentCamera ? (
          <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={previousCamera}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              title="Previous Camera"
              disabled={cameras.length <= 1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white">{currentCamera.name}</h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentCamera.status)}`}>
                {currentCamera.status}
              </div>
            </div>
            <button
              onClick={nextCamera}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              title="Next Camera"
              disabled={cameras.length <= 1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Camera {currentCameraIndex + 1} of {cameras.length}</span>
            <div className="flex space-x-1">
              {cameras.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentCameraIndex ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            </div>
            <button
              onClick={() => setEnableDetection(!enableDetection)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                enableDetection 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              AI {enableDetection ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        
        <CameraFeed 
          streamUrl={currentCamera.streamUrl}
          cameraId={currentCamera.id}
          autoPlay={true}
          enableDetection={enableDetection}
        />
        </>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Cameras Available</h3>
            <p className="text-gray-400 mb-6">Add your first camera to start monitoring</p>
            <button
              onClick={() => router.push('/dashboard/camera-management')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add Camera
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Generate Report Button */}
          <button 
            onClick={handleGenerateReport}
            className="group relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-6 rounded-xl border border-blue-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-blue-500/25"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-100 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Generate Report</div>
                <div className="text-blue-100 text-sm">Safety analytics & insights</div>
              </div>
            </div>
          </button>

          {/* Configure Alerts Button */}
          <button 
            onClick={handleConfigureAlerts}
            className="group relative bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-6 rounded-xl border border-emerald-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-emerald-500/25"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-100 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">View Active Alerts</div>
                <div className="text-green-100 text-sm">Monitor current alerts & status</div>
              </div>
            </div>
          </button>

          {/* Custom Rules Button - NEW! */}
          <button 
            onClick={() => router.push('/dashboard/custom-rules')}
            className="group relative bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-6 rounded-xl border border-purple-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-purple-500/25"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-100 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Custom Rules</div>
                <div className="text-purple-100 text-sm">Build intelligent alerts</div>
              </div>
            </div>
          </button>

          {/* Manage Cameras Button */}
          <button 
            onClick={() => router.push('/dashboard/camera-management')}
            className="group relative bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white p-6 rounded-xl border border-violet-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-violet-500/25"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-violet-100 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Manage Cameras</div>
                <div className="text-violet-100 text-sm">Add & configure feeds</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <Suspense fallback={
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-700 rounded"></div>
            </div>
          </div>
        }>
          <ActiveAlerts />
        </Suspense>
      </div>

      {/* Modals for functionality */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Generate Safety Report</h3>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 mb-6">Generate a comprehensive safety report for {currentSite.name} including camera analytics, alert history, and compliance metrics.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={navigateToReports}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Configure Alerts</h3>
              <button 
                onClick={() => setShowAlertConfig(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 mb-6">Configure safety alert settings, notification preferences, and detection sensitivity for {currentSite.name}.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowAlertConfig(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={navigateToAlerts}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Open Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Manage Cameras</h3>
              <button 
                onClick={() => setShowCameraManager(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 mb-6">Access camera management interface for {currentSite.name} to configure settings, adjust positioning, and monitor camera health.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowCameraManager(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={navigateToCameras}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Open Manager
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AlertsTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const getDangerLevelColor = (level: string) => {
    const normalizedLevel = level?.toUpperCase();
    switch (normalizedLevel) {
      case 'CRITICAL': return 'bg-red-900 text-red-300 border-red-700';
      case 'HIGH': return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'MEDIUM': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'LOW': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  const handleViewFullAlert = (alert: any) => {
    setSelectedAlert(alert);
    setShowFullAlert(true);
    setOpenDropdown(null);
  };

  const handleAcknowledge = (alertId: string) => {
    // Handle acknowledge logic
    console.log('Acknowledging alert:', alertId);
    setOpenDropdown(null);
  };

  const handleDownloadReport = (alertId: string) => {
    // Handle download report logic
    console.log('Downloading report for alert:', alertId);
    setOpenDropdown(null);
  };

  const toggleDropdown = (alertId: string) => {
    setOpenDropdown(openDropdown === alertId ? null : alertId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Active Alerts - {currentSite.name}</h2>
        <button
          onClick={() => router.push('/dashboard/alert-builder?from=alerts')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create Alert Rule
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Active Alerts List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Alert Cause</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Camera</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Level</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Manager</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No alerts found. All systems are operating normally.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                      {alert.location || alert.worksite?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-white truncate max-w-xs">{alert.title || 'Alert'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{alert.description}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-white">{alert.metadata?.cameraId || alert.source || 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getDangerLevelColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-white">{alert.metadata?.manager || alert.metadata?.assignedTo || 'N/A'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <button 
                        onClick={() => toggleDropdown(alert.id)}
                        className="text-gray-400 hover:text-white p-1 rounded"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {openDropdown === alert.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-gray-700 rounded-md shadow-lg py-1 z-10 border border-gray-600">
                          <button
                            onClick={() => handleViewFullAlert(alert)}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left"
                          >
                            View Full Alert
                          </button>
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleDownloadReport(alert.id)}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left"
                          >
                            Download Report
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Alert Modal */}
      {showFullAlert && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-white">Full Alert Details</h3>
              <button
                onClick={() => setShowFullAlert(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alert Video */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Alert Video Clip ({selectedAlert.duration})</h4>
                <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎥</div>
                    <p className="text-gray-300">Video: {selectedAlert.videoClip}</p>
                    <p className="text-sm text-gray-400 mt-2">~20 second clip of the incident</p>
                  </div>
                </div>
              </div>

              {/* Alert Information */}
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Alert Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Location</label>
                      <p className="text-white">{selectedAlert.location}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Alert Cause</label>
                      <p className="text-white">{selectedAlert.alertCause}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Camera</label>
                      <p className="text-white">{selectedAlert.camera}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Danger Level</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getDangerLevelColor(selectedAlert.dangerLevel)}`}>
                        {selectedAlert.dangerLevel}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Date & Time</label>
                      <p className="text-white">{selectedAlert.date}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Assigned Manager</label>
                      <p className="text-white">{selectedAlert.manager}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Coordinates</label>
                      <p className="text-white">{selectedAlert.coordinates}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Description</h4>
                  <p className="text-gray-300">{selectedAlert.description}</p>
                </div>

                <div className="flex space-x-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
                    Acknowledge Alert
                  </button>
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors">
                    Download Report
                  </button>
                  <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors">
                    Share Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonitoringTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const { cameras } = useCameraStore();

  const [enableDetection, setEnableDetection] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCameraForLive, setSelectedCameraForLive] = useState<any>(null);
  
  const camerasPerPage = 4;
  const totalPages = Math.ceil(cameras.length / camerasPerPage);
  const startIndex = currentPage * camerasPerPage;
  const endIndex = startIndex + camerasPerPage;
  const currentCameras = cameras.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900 text-green-300';
      case 'offline': return 'bg-red-900 text-red-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-white">Camera Monitoring - {currentSite.name}</h2>
          {cameras.length > camerasPerPage && (
            <div className="flex items-center gap-2">
              <button
                onClick={previousPage}
                disabled={currentPage === 0}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Previous cameras"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-gray-400 text-sm">
                {startIndex + 1}-{Math.min(endIndex, cameras.length)} of {cameras.length}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages - 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Next cameras"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setEnableDetection(!enableDetection)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              enableDetection 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
            }`}
          >
            AI Detection {enableDetection ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={() => router.push('/dashboard/camera-management')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
          Add Camera
        </button>
        </div>
      </div>

      {cameras.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Cameras Available</h3>
          <p className="text-gray-400 mb-6">Add your first camera to start monitoring</p>
          <button
            onClick={() => router.push('/dashboard/camera-management')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Camera
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-4">
          {currentCameras.map((camera) => (
          <div key={camera.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-white">{camera.name}</h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                  {camera.status}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => router.push('/dashboard/camera-management')}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Camera settings"
                  >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                  <button 
                    onClick={() => setSelectedCameraForLive(camera)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="View fullscreen"
                  >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>

              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              <CameraFeed
                streamUrl={camera.streamUrl}
                  cameraId={camera.id}
                  autoPlay={camera.status === 'online'}
                  className="absolute inset-0 w-full h-full"
                  enableDetection={enableDetection}
              />
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Fullscreen Modal */}
      {selectedCameraForLive && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">{selectedCameraForLive.name}</h2>
              <button
                onClick={() => setSelectedCameraForLive(null)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              <CameraFeed
                streamUrl={selectedCameraForLive.streamUrl}
                cameraId={selectedCameraForLive.id}
                autoPlay={true}
                className="w-full h-full"
                enableDetection={enableDetection}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Reports - {currentSite.name}</h2>
        <ExportButton 
          siteId={currentSite.id}
          siteName={currentSite.name}
          variant="primary"
          size="md"
          reportType="custom"
          reportTitle="Custom Report"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Report</h3>
          <p className="text-gray-300 mb-4">Safety compliance summary for today</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="primary"
            size="sm"
            reportType="daily"
            reportTitle="Daily Safety Report"
          />
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Report</h3>
          <p className="text-gray-300 mb-4">Weekly safety trends and incidents</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="primary"
            size="sm"
            reportType="weekly"
            reportTitle="Weekly Safety Report"
          />
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Report</h3>
          <p className="text-gray-300 mb-4">Comprehensive monthly safety analysis</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="primary"
            size="sm"
            reportType="monthly"
            reportTitle="Monthly Safety Report"
          />
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Incident Report</h3>
          <p className="text-gray-300 mb-4">Detailed incident analysis and recommendations</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="secondary"
            size="sm"
            reportType="incident"
            reportTitle="Incident Report"
          />
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance Report</h3>
          <p className="text-gray-300 mb-4">Regulatory compliance status and audit trail</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="primary"
            size="sm"
            reportType="compliance"
            reportTitle="Compliance Report"
          />
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Report</h3>
          <p className="text-gray-300 mb-4">System performance and camera analytics</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="primary"
            size="sm"
            reportType="performance"
            reportTitle="Performance Report"
          />
        </div>
      </div>
    </div>
  );
}

function SitesTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Site Management - {currentSite.name}</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Edit Site
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Information */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Site Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-400">Site Name</label>
              <p className="text-white">{currentSite.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400">Address</label>
              <p className="text-white">{currentSite.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                currentSite.status === 'active' ? 'bg-green-900 text-green-300' :
                currentSite.status === 'maintenance' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {currentSite.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400">Safety Score</label>
              <p className="text-white">{currentSite.safetyScore}%</p>
            </div>
          </div>
        </div>

        {/* Site Statistics */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Site Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Total Cameras</p>
              <p className="text-white font-semibold text-xl">{currentSite.cameras}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Active Alerts</p>
              <p className="text-white font-semibold text-xl">{currentSite.alerts}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Last Activity</p>
              <p className="text-white font-semibold text-sm">{currentSite.lastActivity}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Site Managers</p>
              <p className="text-white font-semibold text-xl">{currentSite.managers?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Site Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/dashboard/camera-management')}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div className="font-semibold">Manage Cameras</div>
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-emerald-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div className="font-semibold">Manage Users</div>
          </button>
          <button 
            onClick={() => router.push('/dashboard/alerts')}
            className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-amber-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="font-semibold">Configure Alerts</div>
          </button>
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-violet-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-violet-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="font-semibold">View Analytics</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SitesPage({ sites, currentUser }: { sites: any[], currentUser: any }) {
  const router = useRouter();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900 text-green-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      case 'inactive': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Site Management</h1>
          <p className="text-gray-300">
            {currentUser.role === 'admin' ? 'Managing all worksites' : 'Managing your assigned worksites'}
          </p>
        </div>
        {currentUser.role === 'admin' && (
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Add New Site
        </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sites.map((site) => (
          <div key={site.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">{site.name}</h3>
                <p className="text-gray-400 text-sm">{site.address}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(site.status)}`}>
                {site.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Cameras</p>
                <p className="text-white font-semibold">{site.cameras}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-white font-semibold">{site.alerts}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-gray-400 text-sm">Safety Score</p>
                <p className={`text-2xl font-bold ${getSafetyScoreColor(site.safetyScore)}`}>
                  {site.safetyScore}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Activity</p>
                <p className="text-white text-sm">{site.lastActivity}</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // Navigate to site overview
                  router.push(`/dashboard?site=${site.id}`);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                View Details
              </button>
              {(currentUser.role === 'admin' || site.managers?.includes(currentUser.email)) && (
              <button 
                onClick={() => {
                  // Navigate to site settings
                  router.push(`/dashboard/settings?site=${site.id}`);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Manage
              </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Role-based Quick Actions */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-emerald-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="font-semibold">Generate Report</div>
          </button>
          <button 
            onClick={() => router.push('/dashboard/alerts')}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="font-semibold">Configure Alerts</div>
          </button>
          {currentUser?.role === 'admin' && (
          <button 
            onClick={() => router.push('/admin')}
            className="bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white p-4 rounded-xl text-center transition-all shadow-lg hover:shadow-violet-500/25"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-violet-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div className="font-semibold">Manage Users</div>
          </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CamerasPage({ currentSite }: { currentSite: any }) {
  const { cameras } = useCameraStore();
  const router = useRouter();
  const [selectedCameraForLive, setSelectedCameraForLive] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [enableDetection, setEnableDetection] = useState(true);
  
  const camerasPerPage = 2;
  const totalPages = Math.ceil(cameras.length / camerasPerPage);
  const startIndex = currentPage * camerasPerPage;
  const endIndex = startIndex + camerasPerPage;
  const currentCameras = cameras.slice(startIndex, endIndex);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900 text-green-300';
      case 'offline': return 'bg-red-900 text-red-300';
      case 'maintenance': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (!currentSite) {
    return (
      <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white">Camera Management</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-300">Please select a worksite to view its cameras.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
        <div>
        <h1 className="text-3xl font-bold text-white">Camera Management</h1>
          <p className="text-gray-300">{currentSite.name}</p>
        </div>
          {cameras.length > camerasPerPage && (
            <div className="flex items-center gap-2">
              <button
                onClick={previousPage}
                disabled={currentPage === 0}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Previous cameras"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-gray-400 text-sm">
                {startIndex + 1}-{Math.min(endIndex, cameras.length)} of {cameras.length}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages - 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Next cameras"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => router.push('/dashboard/camera-management')}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Camera
          </button>
      </div>
      
      {cameras.length === 0 ? (
        <div className="text-center py-20 bg-gray-800/50 rounded-2xl backdrop-blur">
          <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-2xl font-semibold text-gray-300 mb-3">No Cameras Available</h3>
          <p className="text-gray-400 mb-8 text-lg">Add your first camera to start monitoring</p>
          <button
            onClick={() => router.push('/dashboard/camera-management')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold shadow-lg"
          >
            Add Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {currentCameras.map((camera) => (
            <div key={camera.id} className="bg-gray-800/50 backdrop-blur rounded-2xl overflow-hidden border border-gray-700/50 hover:border-gray-600/50 transition-all">
              {/* Camera Header */}
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-2">{camera.name}</h3>
                    <p className="text-gray-400">{camera.location || 'No location'}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(camera.status)}`}>
                    {camera.status}
                  </div>
                  </div>
                </div>

              {/* Camera Feed */}
              <div className="px-6 pb-6">
                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative shadow-2xl">
                  <CameraFeed
                    streamUrl={camera.streamUrl}
                    cameraId={camera.id}
                    autoPlay={camera.status === 'online'}
                    className="absolute inset-0 w-full h-full"
                    enableDetection={enableDetection}
                  />
              </div>
            </div>

              {/* Stats & Actions */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                    <p className="text-gray-400 text-sm mb-1">Violations</p>
                    <p className="text-white text-2xl font-bold">{camera.violationCount || 0}</p>
              </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                    <p className="text-gray-400 text-sm mb-1">Detections</p>
                    <p className="text-white text-2xl font-bold">{camera.detectionCount || 0}</p>
              </div>
            </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedCameraForLive(camera)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25"
                  >
                    View Live
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/camera-management')}
                    className="px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-xl font-semibold transition-colors border border-gray-600/30"
                  >
                Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Camera Modal */}
      {selectedCameraForLive && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-6xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCameraForLive.name}</h2>
                  <p className="text-gray-400">{selectedCameraForLive.location || 'Camera Feed'}</p>
                </div>
                <button
                  onClick={() => setSelectedCameraForLive(null)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-black rounded-lg overflow-hidden">
                <CameraFeed 
                  streamUrl={selectedCameraForLive.streamUrl}
                  cameraId={selectedCameraForLive.id}
                  autoPlay={true}
                  enableDetection={true}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsPage({ currentSite }: { currentSite: any }) {
  const [alerts] = useState([
    {
      id: '1',
      type: 'Safety Violation',
      severity: 'high',
      camera: 'Safety Zone A',
      timestamp: '2 minutes ago',
      status: 'active',
      description: 'Worker not wearing hard hat in restricted area'
    },
    {
      id: '2',
      type: 'Equipment Malfunction',
      severity: 'medium',
      camera: 'Main Entrance',
      timestamp: '15 minutes ago',
      status: 'acknowledged',
      description: 'Crane movement detected outside operational hours'
    }
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900 text-red-300';
      case 'high': return 'bg-orange-900 text-orange-300';
      case 'medium': return 'bg-yellow-900 text-yellow-300';
      case 'low': return 'bg-blue-900 text-blue-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (!currentSite) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Alerts</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-300">Please select a worksite to view its alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-gray-300">{currentSite.name}</p>
        </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Create Alert Rule
          </button>
      </div>

      <div className="bg-gray-800 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Recent Alerts</h3>
            </div>
        <div className="p-6">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center">
                  <div className={`p-2 rounded-full ${alert.severity === 'high' || alert.severity === 'critical' ? 'bg-red-900' : 'bg-yellow-900'}`}>
                    <span className="text-red-400 text-lg">🚨</span>
            </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{alert.type}</p>
                    <p className="text-sm text-gray-400">{alert.camera} - {alert.description}</p>
          </div>
        </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="mr-1">⏰</span>
                    {alert.timestamp}
            </div>
          </div>
        </div>
        ))}
      </div>
                </div>
      </div>
    </div>
  );
}

function ReportsPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();

  if (!currentSite) {
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Reports</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-300">Please select a worksite to view its reports.</p>
            </div>
          </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
      <p className="text-gray-300">{currentSite.name}</p>
        </div>
        <ExportButton 
          siteId={currentSite.id}
          siteName={currentSite.name}
          variant="primary"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Daily Report</h3>
          <p className="text-gray-300 mb-4">Safety compliance summary for today</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
            reportType="daily"
            reportTitle="Daily Safety Report"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Weekly Report</h3>
          <p className="text-gray-300 mb-4">Weekly safety trends and incidents</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
            reportType="weekly"
            reportTitle="Weekly Safety Report"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Monthly Report</h3>
          <p className="text-gray-300 mb-4">Comprehensive monthly safety analysis</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
            reportType="monthly"
            reportTitle="Monthly Safety Report"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Incident Report</h3>
          <p className="text-gray-300 mb-4">Detailed incident analysis and logs</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
            reportType="incident"
            reportTitle="Incident Report"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Compliance Report</h3>
          <p className="text-gray-300 mb-4">Regulatory compliance documentation</p>
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
            reportType="compliance"
            reportTitle="Compliance Report"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Custom Report</h3>
          <p className="text-gray-300 mb-4">Build your own custom report</p>
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            Create Custom
            </button>
          </div>
        </div>
      </div>
  );
}

function WorkflowsPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  
  if (!currentSite) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Workflows</h1>
      <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-300">Please select a worksite to view its workflows.</p>
      </div>
    </div>
  );
}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Safety Workflows</h1>
      <p className="text-gray-300">{currentSite.name}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Alert Workflows</h3>
          <p className="text-gray-300 mb-4">Manage automated alert response procedures</p>
          <button 
            onClick={() => router.push('/dashboard/alerts')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            Configure Alerts
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Custom Rules</h3>
          <p className="text-gray-300 mb-4">Create custom safety detection rules</p>
          <button 
            onClick={() => router.push('/dashboard/custom-rules')}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            Manage Rules
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Notification Settings</h3>
          <p className="text-gray-300 mb-4">Configure SMS and email notifications</p>
          <button 
            onClick={() => router.push('/dashboard/sms-notifications')}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            SMS Settings
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Error Monitoring</h3>
          <p className="text-gray-300 mb-4">View system errors and recovery workflows</p>
          <button 
            onClick={() => router.push('/dashboard/errors')}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            Error Dashboard
          </button>
        </div>
            </div>
          </div>
  );
}

function SettingsPage({ currentUser }: { currentUser: any }) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });

  const handleSaveSettings = () => {
    // Simulate saving settings
    console.log('Saving user settings:', formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settings saved successfully!
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-white">User Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="block w-full border border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="block w-full border border-slate-600 bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Role</label>
            <input
              type="text"
              className="block w-full border border-slate-600 bg-slate-700 text-gray-400 rounded-lg px-3 py-2 cursor-not-allowed"
              defaultValue={currentUser?.role || 'User'}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Contact an administrator to change your role</p>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button 
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Save Settings
            </button>
            <button 
              onClick={() => setFormData({ name: currentUser?.name || '', email: currentUser?.email || '' })}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 