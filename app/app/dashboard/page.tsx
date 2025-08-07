"use client";
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { DashboardProvider, useDashboard, useSiteManagement, useNotifications } from '../lib/context/DashboardContext';
import { useAlerts, useCameras, useAnalytics } from '../lib/hooks/useApi';
import CameraFeed from '../components/CameraFeed';
import { NotificationContainer } from '../components/NotificationToast';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
      {/* Enhanced Sidebar with Site Selector */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-700 bg-gray-900">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">

            
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

            <nav className="mt-5 flex-1 space-y-1 bg-gray-900 px-2">
              {[
                { key: 'overview', name: 'Overview', icon: '🏠' },
                { key: 'sites', name: 'Site Management', icon: '🏗️' },
                { key: 'cameras', name: 'Cameras', icon: '📹' },
                { key: 'alerts', name: 'Alerts', icon: '🚨' },
                { key: 'reports', name: 'Reports', icon: '📊' },
                { key: 'workflows', name: 'Workflows', icon: '⚙️' },
                { key: 'settings', name: 'Settings', icon: '🔧' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelected(item.key)}
                  className={`group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
                    selected === item.key
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3 h-6 w-6 flex-shrink-0">{item.icon}</span>
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
      <main className="pl-64">
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
  const [activeTab, setActiveTab] = useState('overview');

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
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'alerts', name: 'Alerts', icon: '🚨' },
    { id: 'monitoring', name: 'Monitoring', icon: '📹' },
    { id: 'reports', name: 'Reports', icon: '📋' },
    { id: 'sites', name: 'Sites', icon: '🏗️' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{currentSite.name}</h1>
          <p className="text-gray-300">{currentSite.address}</p>
        </div>
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
  const [cameras] = useState([
    {
      id: '1',
      name: 'Main Construction Site Camera',
      status: 'online',
      lastSeen: '2 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: true
    },
    {
      id: '2',
      name: 'Safety Zone A Camera',
      status: 'online',
      lastSeen: '1 minute ago',
      alerts: 2,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    },
    {
      id: '3',
      name: 'Loading Dock Camera',
      status: 'offline',
      lastSeen: '5 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    },
    {
      id: '4',
      name: 'Warehouse B Camera',
      status: 'online',
      lastSeen: '30 seconds ago',
      alerts: 1,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    }
  ]);

  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showCameraManager, setShowCameraManager] = useState(false);

  const currentCamera = cameras[currentCameraIndex];

  const nextCamera = () => {
    setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
  };

  const previousCamera = () => {
    setCurrentCameraIndex((prev) => (prev - 1 + cameras.length) % cameras.length);
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
    setShowReportModal(true);
    // In a real app, this would trigger report generation
    console.log('Generating safety report for site:', currentSite.name);
  };

  const handleConfigureAlerts = () => {
    setShowAlertConfig(true);
    // In a real app, this would open alert configuration
    console.log('Opening alert configuration for site:', currentSite.name);
  };

  const handleManageCameras = () => {
    setShowCameraManager(true);
    // In a real app, this would open camera management
    console.log('Opening camera management for site:', currentSite.name);
  };

  return (
    <div className="space-y-6">
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={previousCamera}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
              title="Previous Camera"
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
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
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
        </div>
        
        <CameraFeed 
          title={currentCamera.name}
          streamUrl={currentCamera.streamUrl}
          fallbackVideo="/demo-third-aprty-sitesafe.mov"
          showControls={true}
          autoPlay={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Generate Report Button */}
          <button 
            onClick={handleGenerateReport}
            className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-blue-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Generate Report</div>
                <div className="text-blue-200 text-sm opacity-80">Safety analytics & insights</div>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Configure Alerts Button */}
          <button 
            onClick={handleConfigureAlerts}
            className="group relative bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-green-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Configure Alerts</div>
                <div className="text-green-200 text-sm opacity-80">Set up safety notifications</div>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Manage Cameras Button */}
          <button 
            onClick={handleManageCameras}
            className="group relative bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-purple-500/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Manage Cameras</div>
                <div className="text-purple-200 text-sm opacity-80">Camera settings & controls</div>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
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
                onClick={() => {
                  console.log('Report generated for:', currentSite.name);
                  setShowReportModal(false);
                }}
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
                onClick={() => {
                  console.log('Alert config opened for:', currentSite.name);
                  setShowAlertConfig(false);
                }}
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
                onClick={() => {
                  console.log('Camera manager opened for:', currentSite.name);
                  setShowCameraManager(false);
                }}
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
  const [alerts] = useState([
    {
      id: '1',
      location: 'MIA',
      alertCause: 'Safety Violation - No Hard Hat',
      camera: 'CAM-001',
      dangerLevel: 'high',
      date: '2024-01-15 14:32',
      manager: 'John Smith',
      status: 'active',
      description: 'Worker detected without required safety helmet in restricted construction zone',
      videoClip: 'alert_clip_001.mp4',
      coordinates: '25.7617° N, 80.1918° W',
      duration: '18 seconds'
    },
    {
      id: '2',
      location: 'ATL',
      alertCause: 'Equipment Malfunction - Crane Overload',
      camera: 'CAM-003',
      dangerLevel: 'critical',
      date: '2024-01-15 13:45',
      manager: 'Sarah Johnson',
      status: 'active',
      description: 'Crane operating beyond safe load capacity in loading area',
      videoClip: 'alert_clip_002.mp4',
      coordinates: '33.7490° N, 84.3880° W',
      duration: '22 seconds'
    },
    {
      id: '3',
      location: 'NYC',
      alertCause: 'Unauthorized Access - Restricted Area',
      camera: 'CAM-007',
      dangerLevel: 'medium',
      date: '2024-01-15 12:18',
      manager: 'Mike Davis',
      status: 'active',
      description: 'Unauthorized person detected entering restricted construction zone',
      videoClip: 'alert_clip_003.mp4',
      coordinates: '40.7128° N, 74.0060° W',
      duration: '15 seconds'
    },
    {
      id: '4',
      location: 'LAX',
      alertCause: 'Speed Violation - Forklift',
      camera: 'CAM-012',
      dangerLevel: 'high',
      date: '2024-01-15 11:30',
      manager: 'Lisa Chen',
      status: 'active',
      description: 'Forklift exceeding speed limit in warehouse area',
      videoClip: 'alert_clip_004.mp4',
      coordinates: '34.0522° N, 118.2437° W',
      duration: '25 seconds'
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const getDangerLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-900 text-red-300 border-red-700';
      case 'high': return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'medium': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'low': return 'bg-blue-900 text-blue-300 border-blue-700';
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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
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
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                      {alert.location}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-white truncate max-w-xs">{alert.alertCause}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{alert.description}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-white">{alert.camera}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getDangerLevelColor(alert.dangerLevel)}`}>
                      {alert.dangerLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">{alert.date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-white">{alert.manager}</td>
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
              ))}
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
  const [cameras] = useState([
    {
      id: '1',
      name: 'Main Entrance',
      status: 'online',
      lastSeen: '2 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: true
    },
    {
      id: '2',
      name: 'Safety Zone A',
      status: 'online',
      lastSeen: '1 minute ago',
      alerts: 2,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    },
    {
      id: '3',
      name: 'Loading Dock',
      status: 'offline',
      lastSeen: '5 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    },
    {
      id: '4',
      name: 'Warehouse B',
      status: 'online',
      lastSeen: '30 seconds ago',
      alerts: 1,
      streamUrl: 'http://localhost:5001/video_feed',
      hasVideo: false
    }
  ]);

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
        <h2 className="text-xl font-semibold text-white">Camera Monitoring - {currentSite.name}</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Add Camera
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cameras.map((camera) => (
          <div key={camera.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-white">{camera.name}</h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                  {camera.status}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <CameraFeed
                title={camera.name}
                streamUrl={camera.streamUrl}
                fallbackVideo="/demo-third-aprty-sitesafe.mov"
                showControls={false}
                autoPlay={camera.status === 'active'}
                className="h-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab({ currentSite }: { currentSite: any }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Reports - {currentSite.name}</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Generate Custom Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Report</h3>
          <p className="text-gray-300 mb-4">Safety compliance summary for today</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Report</h3>
          <p className="text-gray-300 mb-4">Weekly safety trends and incidents</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Report</h3>
          <p className="text-gray-300 mb-4">Comprehensive monthly safety analysis</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Incident Report</h3>
          <p className="text-gray-300 mb-4">Detailed incident analysis and recommendations</p>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance Report</h3>
          <p className="text-gray-300 mb-4">Regulatory compliance status and audit trail</p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Report</h3>
          <p className="text-gray-300 mb-4">System performance and camera analytics</p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function SitesTab({ currentSite }: { currentSite: any }) {
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
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Site Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">📹</div>
            <div className="font-medium">Manage Cameras</div>
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium">Assign Users</div>
          </button>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium">Configure Alerts</div>
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">View Analytics</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SitesPage({ sites, currentUser }: { sites: any[], currentUser: any }) {
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
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                View Details
              </button>
              {(currentUser.role === 'admin' || site.managers.includes(currentUser.email)) && (
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Manage
              </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Role-based Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Generate Report</div>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-medium">Configure Alerts</div>
          </button>
          {currentUser.role === 'admin' && (
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium">Manage Users</div>
          </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CamerasPage({ currentSite }: { currentSite: any }) {
  const [cameras, setCameras] = useState([
    {
      id: '1',
      name: 'Main Entrance',
    status: 'online',
      lastSeen: '2 minutes ago',
      alerts: 0,
    streamUrl: 'http://localhost:5001/video_feed'
    },
    {
      id: '2',
      name: 'Safety Zone A',
      status: 'online',
      lastSeen: '1 minute ago',
      alerts: 2,
      streamUrl: 'http://localhost:5001/video_feed'
    },
    {
      id: '3',
      name: 'Loading Dock',
      status: 'offline',
      lastSeen: '5 minutes ago',
      alerts: 0,
      streamUrl: 'http://localhost:5001/video_feed'
    }
  ]);

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
        <div>
        <h1 className="text-3xl font-bold text-white">Camera Management</h1>
          <p className="text-gray-300">{currentSite.name}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Add Camera
          </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cameras.map((camera) => (
          <div key={camera.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
                  <div>
                <h3 className="text-xl font-semibold text-white mb-1">{camera.name}</h3>
                <p className="text-gray-400 text-sm">Camera ID: {camera.id}</p>
                  </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                    {camera.status}
                  </div>
                </div>

            <div className="aspect-video bg-gray-900 flex items-center justify-center mb-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="aspect-video bg-gray-600 rounded flex items-center justify-center">
                  <span className="text-gray-300">Camera Feed: {camera.streamUrl}</span>
              </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Alerts</p>
                <p className="text-white font-semibold">{camera.alerts}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Last Seen</p>
                <p className="text-white font-semibold">{camera.lastSeen}</p>
              </div>
            </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                    View Live
                  </button>
                  <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
                Configure
                  </button>
              </div>
            </div>
          ))}
        </div>
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
      <h1 className="text-3xl font-bold text-white">Reports</h1>
      <p className="text-gray-300">{currentSite.name}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Report</h3>
          <p className="text-gray-300 mb-4">Safety compliance summary for today</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
              </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Report</h3>
          <p className="text-gray-300 mb-4">Weekly safety trends and incidents</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
              </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Report</h3>
          <p className="text-gray-300 mb-4">Comprehensive monthly safety analysis</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors">
            Generate
            </button>
          </div>
        </div>
      </div>
  );
}

function WorkflowsPage({ currentSite }: { currentSite: any }) {
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
      <h1 className="text-3xl font-bold text-white">Workflows</h1>
      <p className="text-gray-300">{currentSite.name}</p>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Safety Workflows</h3>
        <p className="text-gray-300">Workflow management interface will be implemented here.</p>
            </div>
          </div>
  );
}

function SettingsPage({ currentUser }: { currentUser: any }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      
      <div className="bg-gray-800 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">User Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={currentUser.name}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={currentUser.email}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Role</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              defaultValue={currentUser.role}
              disabled
            />
          </div>
          
          <div className="pt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 