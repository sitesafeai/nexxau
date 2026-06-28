"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import { DashboardProvider, useDashboard, useSiteManagement, useNotifications } from '../lib/context/DashboardContext';
import { useAlerts, useAnalytics } from '../lib/hooks/useApi';
import { NotificationContainer } from '../components/NotificationToast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AcknowledgeAlertModal from '../components/AcknowledgeAlertModal';
import ActiveAlerts from '@/app/components/dashboard/ActiveAlerts';
import RealtimeDetectionOverlay from '../components/RealtimeDetectionOverlay';
import ExportButton from '../components/ExportButton';
import SafetyScoreCard from '../components/SafetyScoreCard';
import { formatRoleLabel, isAdminRole, normalizeRole } from '../lib/roles';
import DetectionFeedback from '../components/DetectionFeedback';
import CreateWorksiteModal from '../components/modals/CreateWorksiteModal';
import {
  OverviewSkeleton,
  GlobalDashboardSkeleton,
  CamerasTabSkeleton,
  SiteManagementSkeleton,
  AlertsSkeleton,
  AlertRulesSkeleton,
  ReportsSkeleton,
  WorkflowsSkeleton,
  AuditLogSkeleton,
} from '../components/dashboard/DashboardSkeleton';

// Heavy dashboard components: load on demand to avoid ChunkLoadError (timeout)
const ReportsPageNew = dynamic(() => import('../components/reports/ReportsPage'), { loading: () => <ReportsSkeleton />, ssr: false });
const GlobalDashboard = dynamic(() => import('../components/dashboard/GlobalDashboard').then((m) => m.default), { loading: () => <GlobalDashboardSkeleton />, ssr: false });
const UserDashboard = dynamic(() => import('../components/dashboard/UserDashboard').then((m) => m.default), { loading: () => <OverviewSkeleton />, ssr: false });
const SiteManagement = dynamic(() => import('../components/dashboard/SiteManagement').then((m) => m.default), { loading: () => <SiteManagementSkeleton />, ssr: false });
const AlertsAndRules = dynamic(() => import('../components/dashboard/AlertsAndRules').then((m) => m.default), { loading: () => <AlertsSkeleton />, ssr: false });
const ReportsAnalytics = dynamic(() => import('../components/dashboard/ReportsAnalytics').then((m) => m.default), { loading: () => <ReportsSkeleton />, ssr: false });
const WorkflowDashboard = dynamic(() => import('../components/dashboard/WorkflowDashboard').then((m) => m.default), { loading: () => <WorkflowsSkeleton />, ssr: false });
const WorksiteUserManagementModal = dynamic(() => import('../components/dashboard/WorksiteUserManagementModal').then((m) => m.default), { ssr: false });
const CamerasTab = dynamic(() => import('../components/dashboard/CamerasTab').then((m) => m.default), { loading: () => <CamerasTabSkeleton />, ssr: false });

// Wrapper component that provides the dashboard context
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <DashboardContent />
      </Suspense>
    </DashboardProvider>
  );
}

function DashboardContent() {
  const router = useRouter();
  // Initialize with default - make server and client render the same initially
  const [selected, setSelected] = useState('overview');
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['overview']));
  
  // Load from localStorage after mount (client-only)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dashboard_selected_tab');
    if (saved) {
      setSelected(saved);
      setVisitedTabs((prev) => new Set([...prev, saved]));
    }
  }, []);

  // Overview camera thumbnails can request navigation to the Cameras tab
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail !== 'string' || !detail) return;
      setSelected(detail);
      setVisitedTabs((prev) => new Set([...prev, detail]));
      if (typeof window !== 'undefined') {
        localStorage.setItem('dashboard_selected_tab', detail);
      }
    };
    window.addEventListener('switchTab', handler as EventListener);
    return () => window.removeEventListener('switchTab', handler as EventListener);
  }, []);
  const { state, selectSite, hasPermission, addNotification } = useDashboard();
  const { selectedSiteId, selectedSite, accessibleSites } = useSiteManagement();
  const { notifications, removeNotification } = useNotifications();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  const normalizedUserRole = normalizeRole(state.currentUser?.role);
  const isSuperAdmin = normalizedUserRole === 'SUPER_ADMIN';
  const isAdminUser = isAdminRole(normalizedUserRole);
  const roleBadgeClass = useMemo(() => {
    if (normalizedUserRole === 'SUPER_ADMIN') {
      return 'bg-purple-900 text-purple-300';
    }
    if (isAdminUser) {
      return 'bg-blue-900 text-blue-300';
    }
    if (normalizedUserRole === 'SUPERVISOR') {
      return 'bg-green-900 text-green-300';
    }
    if (normalizedUserRole === 'WORKER') {
      return 'bg-amber-900 text-amber-300';
    }
    return 'bg-gray-700 text-gray-300';
  }, [normalizedUserRole, isAdminUser]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const navigationItems = useMemo(() => {
    const items = [
      {
        key: 'overview',
        name: isSuperAdmin ? 'Global Dashboard' : 'Overview',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Always render same structure - use mounted to determine which path to show */}
            {mounted && isSuperAdmin ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </>
            )}
          </svg>
        ),
      },
      {
        key: 'cameras',
        name: 'Cameras',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        key: 'sites',
        name: 'Site Management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        key: 'alerts',
        name: isSuperAdmin ? 'Alerts & Rules' : 'Alerts',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
      },
      ...(!isSuperAdmin ? [{
        key: 'alert-rules',
        name: 'Alert Rules',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      }] : []),
      {
        key: 'reports',
        name: 'Reports',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        key: 'workflows',
        name: 'Workflows',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        key: 'settings',
        name: 'Settings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        key: 'audit',
        name: 'Audit Log',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ];

    return items;
  }, [isSuperAdmin, mounted]);

  // Sync URL with selected site - only update URL if site is selected but URL doesn't match
  useEffect(() => {
    if (selectedSiteId && !worksiteParam) {
      // We have a selected site but no URL parameter - add it
      const url = new URL(window.location.href);
      url.searchParams.set('worksite', selectedSiteId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSiteId, worksiteParam]);

  // Welcome notification removed - was showing fake camera feed status



  // Super Admin Global Dashboard View - when no specific worksite is selected
  if (isSuperAdmin && selected === 'overview' && !worksiteParam) {
    return <GlobalDashboard currentUser={state.currentUser} />;
  }

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

            
            {/* Worksite Info - No Selector, Just Display */}
            {/* Always render same structure - normalize empty state for SSR/client consistency */}
            <div className="px-4 mt-4">
              {selectedSite && mounted ? (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 backdrop-blur-sm overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Worksite</p>
                    <h3 className="text-lg font-bold text-white mb-1">{selectedSite.name}</h3>
                    <p className="text-xs text-slate-400">{selectedSite.address || 'No address'}</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Status</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded ${
                        selectedSite.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedSite.status === 'maintenance' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedSite.status}
                    </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Safety Score</span>
                      <span className="text-sm font-bold text-blue-400">
                        {selectedSite.safetyScore !== null && selectedSite.safetyScore !== undefined 
                          ? `${selectedSite.safetyScore}%` 
                          : 'N/A'}
                    </span>
        </div>
                    <div className="pt-2 mt-2 border-t border-slate-700/30">
                      <p className="text-xs text-slate-500">
                        ID: <span className="font-mono text-slate-400">{selectedSite.id?.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 text-center">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-sm text-slate-400">No worksite selected</p>
        </div>
      )}
    </div>

            <nav className="mt-6 flex-1 space-y-1.5 bg-transparent px-3">
              {navigationItems.map((item) => {
                // Ensure active state is only applied after mount to prevent hydration mismatch
                const isActive = mounted && selected === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelected(item.key);
                      setVisitedTabs((prev) => new Set([...prev, item.key]));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('dashboard_selected_tab', item.key);
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group flex w-full items-center px-3.5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="mr-3 h-5 w-5 flex-shrink-0">{item.icon}</span>
                    {item.name}
                  </button>
                );
              })}
            </nav>

                                {/* User Info */}
                    <div className="px-4 mt-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Logged in as</p>
                        <p className="text-sm font-medium text-white">{state.currentUser?.name || 'Loading...'}</p>
                        <p className="text-xs text-gray-400">{state.currentUser?.email || 'Loading...'}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${roleBadgeClass}`}>
                          {formatRoleLabel(state.currentUser?.role)}
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => router.push('/admin')}
                            className="w-full mt-3 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium rounded-lg border border-purple-500/30 transition-colors flex items-center justify-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Admin Panel</span>
                          </button>
                        )}
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
            {/* Worksite Info - Mobile Version - No Selector, Just Display */}
            <div className="px-4 mt-4">
              {selectedSite ? (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 overflow-hidden">
                  <div className="p-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Worksite</p>
                    <h3 className="text-base font-bold text-white">{selectedSite.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedSite.address || 'No address'}</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Status</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase rounded ${
                        selectedSite.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedSite.status === 'maintenance' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedSite.status}
                    </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Safety</span>
                      <span className="text-sm font-bold text-blue-400">
                        {selectedSite.safetyScore !== null && selectedSite.safetyScore !== undefined 
                        ? `${selectedSite.safetyScore}%` 
                          : 'N/A'}
                    </span>
        </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 text-center">
                  <p className="text-sm text-slate-400">No worksite selected</p>
        </div>
      )}
    </div>

                {/* Navigation */}
            <nav className="mt-5 flex-1 space-y-1 bg-gray-900 px-2">
              {navigationItems.map((item) => (
                <button
                  key={item.key}
                      onClick={() => {
                        setSelected(item.key);
                        setVisitedTabs((prev) => new Set([...prev, item.key]));
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${roleBadgeClass}`}>
                          {formatRoleLabel(state.currentUser?.role)}
                        </span>
                      </div>
                    </div>
          </div>
        </div>
      </div>
        )}

        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {selected === 'overview' && (
              <UserDashboard currentUser={state.currentUser} selectedSite={selectedSite} />
            )}
            {visitedTabs.has('cameras') && (
              <div className={selected === 'cameras' ? 'block' : 'hidden'}>
                <CamerasTab selectedSite={selectedSite} currentUser={state.currentUser} />
              </div>
            )}
            {selected === 'sites' && (
              selectedSite
                ? <SitesTab currentSite={selectedSite} />
                : isSuperAdmin 
                ? <SiteManagement currentUser={state.currentUser} />
                  : <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 max-w-md text-center">
                        <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Site Selected</h3>
                        <p className="text-slate-400 mb-6">Please select a worksite from the dropdown above to view site management options.</p>
                        {accessibleSites.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-500 mb-3">Quick select:</p>
                            {accessibleSites.slice(0, 3).map((site: any) => (
                              <button
                                key={site.id}
                                onClick={() => window.location.href = `/dashboard?worksite=${site.id}&tab=sites`}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                {site.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
            )}
            {selected === 'alerts' && (
              isSuperAdmin
                ? <AlertsAndRules currentUser={state.currentUser} siteFilter={selectedSite?.id} />
                : <AlertsPage currentSite={selectedSite} />
            )}
            {selected === 'alert-rules' && (
              <AlertRulesPage currentSite={selectedSite} />
            )}
            {selected === 'reports' && (
              isSuperAdmin
                ? (
                    <ReportsAnalytics
                      currentUser={state.currentUser}
                      siteFilter={selectedSite?.id ?? worksiteParam ?? undefined}
                    />
                  )
                : <ReportsPageNew 
                    currentSite={selectedSite} 
                    worksites={accessibleSites.map((s: any) => ({ id: s.id, name: s.name }))} 
                  />
            )}
            {selected === 'workflows' && (
              // Show WorkflowsPage for both super admin and regular users when worksite is selected
              selectedSite 
                ? <WorkflowsPage currentSite={selectedSite} />
                : isSuperAdmin
                ? <WorkflowDashboard currentUser={state.currentUser} />
                : <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
                    <p className="text-slate-400">Select a worksite to manage workflows</p>
                  </div>
            )}
            {selected === 'settings' && <SettingsPage currentUser={state.currentUser} />}
            {selected === 'audit' && <AuditPage currentSite={selectedSite} currentUser={state.currentUser} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function OverviewPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  // Initialize from localStorage or default to 'overview'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('overview_active_tab');
      return saved || 'overview';
    }
    return 'overview';
  });
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['overview']));

  const handleTabChange = useCallback((tab: string) => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set([...prev, tab]);
    });
    setActiveTab(tab);
  }, []);

  // Check if we should auto-switch to a specific tab (e.g., from alert builder)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['overview', 'monitoring', 'alerts', 'reports', 'sites'].includes(tab)) {
      handleTabChange(tab);
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('overview_active_tab', tab);
      }
    }
  }, [handleTabChange]);

  // Persist tab changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      localStorage.setItem('overview_active_tab', activeTab);
    }
  }, [activeTab]);

  // Early return AFTER all hooks are called
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
            <span className="text-sm text-gray-400">
              Safety Score: {currentSite.safetyScore !== null && currentSite.safetyScore !== undefined 
                ? `${currentSite.safetyScore}%` 
                : 'Not calculated'}
            </span>
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
              onClick={() => {
                handleTabChange(tab.id);
                // Persist to localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('overview_active_tab', tab.id);
                }
              }}
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
        {mountedTabs.has('overview') && (
          <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
            <OverviewTab key="overview" currentSite={currentSite} />
          </div>
        )}
        {mountedTabs.has('alerts') && (
          <div className={activeTab === 'alerts' ? 'block' : 'hidden'}>
            <AlertsTab key="alerts" currentSite={currentSite} />
          </div>
        )}
        {mountedTabs.has('monitoring') && (
          <div className={activeTab === 'monitoring' ? 'block' : 'hidden'}>
            <MonitoringTab key="monitoring" currentSite={currentSite} />
          </div>
        )}
        {mountedTabs.has('reports') && (
          <div className={activeTab === 'reports' ? 'block' : 'hidden'}>
            <ReportsTab key="reports" currentSite={currentSite} />
          </div>
        )}
        {mountedTabs.has('sites') && (
          <div className={activeTab === 'sites' ? 'block' : 'hidden'}>
            <SitesTab key="sites" currentSite={currentSite} />
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  
  // Safety Score State
  const [safetyScoreData, setSafetyScoreData] = useState<any>(null);
  const [safetyScoreLoading, setSafetyScoreLoading] = useState(true);
  const [safetyScoreError, setSafetyScoreError] = useState<string | null>(null);

  // Fetch safety score on mount
  useEffect(() => {
    const fetchSafetyScore = async () => {
      if (!currentSite?.id) return;
      
      try {
        setSafetyScoreError(null);
        setSafetyScoreLoading(true);
        const response = await fetch(
          `/api/safety-score?worksiteId=${currentSite.id}&date=${new Date().toISOString().split('T')[0]}`
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSafetyScoreData(result.data);
            setSafetyScoreError(null); // Clear any previous errors on success
          } else {
            // Score doesn't exist, try to calculate it
            await calculateSafetyScore();
          }
        } else {
          // Score doesn't exist, try to calculate it
          await calculateSafetyScore();
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to load safety score. Please check your connection and try again.';
        console.error('Error fetching safety score:', error);
        setSafetyScoreError(errorMessage);
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
            setSafetyScoreError(null); // Clear any previous errors on success
          } else {
            setSafetyScoreError('Failed to calculate safety score. Please try again.');
          }
        } else {
          setSafetyScoreError(`Failed to calculate safety score: ${response.status} ${response.statusText}`);
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to calculate safety score. Please check your connection and try again.';
        console.error('Error calculating safety score:', error);
        setSafetyScoreError(errorMessage);
      }
    };
    
    fetchSafetyScore();
  }, [currentSite?.id]);

  const handleGenerateReport = () => {
    console.log('Generate Report clicked', currentSite);
    const worksiteParam = currentSite?.id ? `?worksite=${currentSite.id}` : '';
    const url = `/dashboard/reports${worksiteParam}`;
    console.log('Navigating to:', url);
    router.push(url);
  };

  const handleConfigureAlerts = () => {
    console.log('Configure Alerts clicked', currentSite);
    const worksiteParam = currentSite?.id ? `?worksite=${currentSite.id}` : '';
    const url = `/dashboard/alert-builder${worksiteParam}`;
    console.log('Navigating to:', url);
    router.push(url);
  };

  const navigateToReports = () => {
    setShowReportModal(false);
    router.push(`/dashboard/reports${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`);
  };

  const navigateToAlerts = () => {
    setShowAlertConfig(false);
    router.push(`/dashboard/alerts${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`);
  };

  return (
    <div className="space-y-6">
      {/* Safety Score Card */}
      {safetyScoreLoading ? (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 animate-pulse">
          <div className="flex items-center space-x-6 py-4">
            <div className="h-24 w-24 rounded-full bg-slate-700 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-40 bg-slate-700 rounded" />
              <div className="h-10 w-24 bg-slate-700 rounded" />
              <div className="h-3 w-56 bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      ) : safetyScoreError ? (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-red-700">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 font-medium text-lg mb-1">Failed to Load Safety Score</p>
            <p className="text-gray-400 text-sm mb-4 max-w-md text-center">{safetyScoreError}</p>
            <button
              onClick={async () => {
                setSafetyScoreError(null);
                setSafetyScoreLoading(true);
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
                      setSafetyScoreError(null);
                    } else {
                      setSafetyScoreError('Failed to calculate safety score. Please try again.');
                    }
                  } else {
                    setSafetyScoreError(`Failed to calculate safety score: ${response.status} ${response.statusText}`);
                  }
                } catch (error: any) {
                  const errorMessage = error?.message || 'Failed to calculate safety score. Please check your connection and try again.';
                  setSafetyScoreError(errorMessage);
                } finally {
                  setSafetyScoreLoading(false);
                }
              }}
              disabled={safetyScoreLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {safetyScoreLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Retrying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </>
              )}
            </button>
          </div>
        </div>
      ) : safetyScoreData ? (
        <SafetyScoreCard
          data={safetyScoreData}
          loading={safetyScoreLoading}
          onRefresh={async () => {
            setSafetyScoreLoading(true);
            setSafetyScoreError(null);
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
                  setSafetyScoreError(null);
                } else {
                  setSafetyScoreError('Failed to refresh safety score. Please try again.');
                }
              } else {
                setSafetyScoreError(`Failed to refresh safety score: ${response.status} ${response.statusText}`);
              }
            } catch (error: any) {
              const errorMessage = error?.message || 'Failed to refresh safety score. Please check your connection and try again.';
              console.error('Error refreshing safety score:', error);
              setSafetyScoreError(errorMessage);
            } finally {
              setSafetyScoreLoading(false);
            }
          }}
        />
      ) : (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-300 font-medium text-lg mb-1">No Safety Score Available</p>
            <p className="text-gray-400 text-sm mb-4">Safety score data is not available for this worksite yet.</p>
            <button
              onClick={async () => {
                setSafetyScoreLoading(true);
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
                } finally {
                  setSafetyScoreLoading(false);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Calculate Safety Score
            </button>
          </div>
        </div>
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
          <p className="text-3xl font-bold text-red-400">{currentSite.alerts}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Safety Score</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {currentSite.safetyScore !== null && currentSite.safetyScore !== undefined 
              ? `${currentSite.safetyScore}%` 
              : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Last Activity</h3>
          <p className="text-lg font-semibold text-green-400">{currentSite.lastActivity}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Generate Report Button */}
          <button 
            type="button"
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

          {/* View Active Alerts Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('View Active Alerts clicked', currentSite);
              const worksiteParam = currentSite?.id ? `?worksite=${currentSite.id}` : '';
              const url = `/dashboard/alerts${worksiteParam}`;
              console.log('Navigating to:', url);
              router.push(url);
            }}
            className="group relative bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-6 rounded-xl border border-emerald-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg hover:shadow-emerald-500/25"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-100 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">View Active Alerts</div>
                <div className="text-green-100 text-sm">Monitor current alerts & status</div>
              </div>
            </div>
          </button>

          {/* Custom Rules Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Custom Rules clicked', currentSite);
              const worksiteParam = currentSite?.id ? `?worksite=${currentSite.id}` : '';
              const url = `/dashboard/alert-builder${worksiteParam}`;
              console.log('Navigating to:', url);
              router.push(url);
            }}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowReportModal(false)}
        >
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Generate Safety Report</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowReportModal(false); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 mb-6">Generate a comprehensive safety report for {currentSite.name} including alert history and compliance metrics.</p>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowAlertConfig(false)}
        >
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Configure Alerts</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowAlertConfig(false); }}
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

    </div>
  );
}

function AlertsTab({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [alertToAcknowledge, setAlertToAcknowledge] = useState<any>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [videoClipUrl, setVideoClipUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'severity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const url = currentSite?.id 
        ? `/api/alerts?worksiteId=${currentSite.id}&status=ACTIVE`
        : '/api/alerts?status=ACTIVE';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Handle both response formats: { success: true, data: [...] } or array
        let alertsArray: any[] = [];
        if (data.success !== undefined && data.data) {
          alertsArray = Array.isArray(data.data) ? data.data : [];
        } else if (Array.isArray(data)) {
          alertsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          alertsArray = data.data;
        }
        
        // Filter for current worksite only if not already filtered by API
        const filteredAlerts = alertsArray.filter((alert: any) => 
          !currentSite || alert.worksiteId === currentSite.id
        );
        setAlerts(filteredAlerts);
        setError(null); // Clear any previous errors on success
      } else {
        const errorMessage = `Failed to load alerts: ${res.status} ${res.statusText}`;
        console.error(errorMessage);
        setError(errorMessage);
        setAlerts([]);
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to load alerts. Please check your connection and try again.';
      console.error('Failed to load alerts:', e);
      setError(errorMessage);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [currentSite?.id]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadAlerts]);

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

  const handleViewFullAlert = async (alert: any) => {
    setSelectedAlert(alert);
    setShowFullAlert(true);
    setOpenDropdown(null);
    
    // Load video clip
    setLoadingVideo(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/video-clip`);
      if (res.ok) {
        const data = await res.json();
        setVideoClipUrl(data.videoClipUrl);
      }
    } catch (error) {
      console.error('Failed to load video clip:', error);
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleAcknowledge = (alert: any) => {
    setAlertToAcknowledge(alert);
    setShowAcknowledgeModal(true);
    setOpenDropdown(null);
  };

  const handleAcknowledgeFromModal = () => {
    if (alertToAcknowledge) {
      setAcknowledging(alertToAcknowledge.id);
    }
    setAlertToAcknowledge(null);
    setShowAcknowledgeModal(false);
    loadAlerts().finally(() => {
      setAcknowledging(null);
    }); // Reload alerts after acknowledgment
  };

  const handleDownloadReport = async (alertId: string) => {
    setOpenDropdown(null);
    setDownloadingReport(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/report`);
      if (res.ok) {
        const data = await res.json();
        
        // Create a downloadable file
        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alert-report-${alertId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success feedback (could use toast instead of alert)
        alert('Report downloaded successfully!');
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloadingReport(null);
    }
  };

  const toggleDropdown = (alertId: string) => {
    setOpenDropdown(openDropdown === alertId ? null : alertId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Active Alerts - {currentSite.name}</h2>
        <button
          onClick={() => router.push(`/dashboard/alert-builder?from=alerts${currentSite?.id ? `&worksite=${currentSite.id}` : ''}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create Alert Rule
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-medium text-white">Active Alerts List</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'severity')}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="severity">Sort by Severity</option>
            </select>
            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
        </div>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Alert Cause</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Level</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Manager</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-400 font-medium text-lg mb-1">Failed to Load Alerts</p>
                      <p className="text-gray-400 text-sm mb-4 max-w-md">{error}</p>
                      <button
                        onClick={() => loadAlerts()}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Retrying...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-300 font-medium text-lg mb-1">No Active Alerts</p>
                      <p className="text-gray-400 text-sm">All systems are operating normally for {currentSite?.name || 'this worksite'}.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-gray-300 font-medium text-lg mb-1">No Alerts Match Your Filters</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filter or sort options.</p>
                      <button
                        onClick={() => {
                          setSeverityFilter('all');
                          setSortBy('date');
                          setSortOrder('desc');
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedAlerts.map((alert) => (
                <tr 
                  key={alert.id} 
                  className={`hover:bg-gray-700 transition-colors cursor-pointer ${
                    selectedAlert?.id === alert.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleViewFullAlert(alert)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                      {alert.location || alert.worksite?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-white truncate max-w-xs">{alert.title || 'Alert'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{alert.description}</div>
                  </td>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewFullAlert(alert);
                            }}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left transition-colors"
                          >
                            View Full Alert
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(alert);
                            }}
                            disabled={acknowledging === alert.id}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {acknowledging === alert.id ? (
                              <>
                                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                                Acknowledging...
                              </>
                            ) : (
                              'Acknowledge'
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadReport(alert.id)}
                            disabled={downloadingReport === alert.id}
                            className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {downloadingReport === alert.id ? (
                              <>
                                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                                Downloading...
                              </>
                            ) : (
                              'Download Report'
                            )}
                          </button>
                          {alert.metadata?.detectionId && (
                            <button
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowFullAlert(true);
                              }}
                              className="block px-3 py-2 text-xs text-gray-300 hover:bg-gray-600 w-full text-left"
                            >
                              Provide Feedback
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Feedback indicator in table */}
                  {alert.metadata?.detectionId && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <DetectionFeedback
                        detectionId={alert.metadata.detectionId}
                        compact={true}
                      />
                    </td>
                  )}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acknowledge Alert Modal */}
      {showAcknowledgeModal && alertToAcknowledge && (
        <AcknowledgeAlertModal
          alert={alertToAcknowledge}
          onClose={() => setShowAcknowledgeModal(false)}
          onSuccess={handleAcknowledgeFromModal}
        />
      )}

      {/* Full Alert Modal */}
      {showFullAlert && selectedAlert && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFullAlert(false);
              setVideoClipUrl(null);
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-white">Full Alert Details</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullAlert(false);
                  setVideoClipUrl(null);
                }}
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
                <h4 className="text-lg font-semibold text-white mb-4">Alert Video Clip (20 seconds)</h4>
                <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                  {loadingVideo ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-400 mt-4">Loading video clip...</p>
                    </div>
                  ) : videoClipUrl ? (
                    <div className="w-full h-full">
                      <video 
                        controls 
                        className="w-full h-full rounded-lg"
                        src={videoClipUrl}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎥</div>
                      <p className="text-gray-400">Video clip unavailable</p>
                      <p className="text-sm text-gray-500 mt-2">~20 second clip of the incident</p>
                  </div>
                  )}
                </div>
              </div>

              {/* Alert Information */}
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Alert Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Location</label>
                      <p className="text-white">{selectedAlert.location || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Alert Cause</label>
                      <p className="text-white">{selectedAlert.title || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Danger Level</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getDangerLevelColor(selectedAlert.severity)}`}>
                        {selectedAlert.severity}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Date & Time</label>
                      <p className="text-white">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Status</label>
                      <p className="text-white capitalize">{selectedAlert.status}</p>
                    </div>
                    {selectedAlert.worksite && (
                    <div>
                        <label className="text-sm font-medium text-gray-400">Worksite</label>
                        <p className="text-white">{selectedAlert.worksite.name}</p>
                    </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Description</h4>
                  <p className="text-gray-300">{selectedAlert.description || 'No description available'}</p>
                </div>

                {/* Detection Feedback Section */}
                {selectedAlert.metadata?.detectionId && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Detection Feedback</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Help improve our AI by marking this detection as accurate or incorrect.
                    </p>
                    <DetectionFeedback
                      detectionId={selectedAlert.metadata.detectionId}
                      onFeedbackSubmitted={() => {
                        // Refresh alert data if needed
                        console.log('[Dashboard] Feedback submitted for detection:', selectedAlert.metadata.detectionId);
                        loadAlerts(); // Refresh alerts after feedback
                      }}
                    />
                  </div>
                )}

                {/* Mark as False Positive Button */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Alert Actions</h4>
                  <button
                    onClick={async () => {
                      try {
                        console.log('[Dashboard] Marking alert as false positive:', selectedAlert.id);
                        const response = await fetch(`/api/alerts/${selectedAlert.id}/mark-false-positive`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            reason: 'Marked as false positive from dashboard',
                            violationType: selectedAlert.violationType || selectedAlert.title,
                          }),
                        });
                        const data = await response.json();
                        console.log('[Dashboard] Mark false positive response:', data);
                        if (data.success) {
                          alert('Alert marked as false positive. Report created for training team.');
                          loadAlerts();
                          setShowFullAlert(false);
                        } else {
                          alert('Failed to mark as false positive: ' + (data.error || 'Unknown error'));
                        }
                      } catch (error) {
                        console.error('[Dashboard] Error marking as false positive:', error);
                        alert('Error marking alert as false positive');
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors mb-2"
                  >
                    Mark as False Positive
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button 
                    onClick={() => {
                      setShowFullAlert(false);
                      handleAcknowledge(selectedAlert);
                    }}
                    disabled={selectedAlert.status !== 'ACTIVE'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Acknowledge Alert
                  </button>
                  <button 
                    onClick={() => handleDownloadReport(selectedAlert.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    Download Report
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
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-12 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">Monitoring</h2>
        <p className="text-slate-400">Monitoring functionality has been removed.</p>
      </div>
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
          <p className="text-gray-300 mb-4">System performance and analytics</p>
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
  const { state } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSite, setEditedSite] = useState({
    name: currentSite?.name || '',
    address: currentSite?.address || '',
    location: currentSite?.location || '',
    status: currentSite?.status || 'active'
  });
  const [saving, setSaving] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  
  // Get user role and determine permissions
  const userRole = normalizeRole(state.currentUser?.role);
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
  const isCompanyAdmin = userRole === 'COMPANY_ADMIN';
  const isSiteAdmin = userRole === 'SITE_ADMIN';
  
  // Permission checks for each button - Super Admin has full access to everything
  const canManageUsers = isSuperAdmin || isCompanyAdmin; // Super Admin and Company Admin can manage users
  const canConfigureAlerts = isSuperAdmin || isCompanyAdmin || isSiteAdmin;
  const canViewAnalytics = true; // Everyone can view analytics

  // Update editedSite when currentSite changes
  useEffect(() => {
    if (currentSite) {
      setEditedSite({
        name: currentSite.name || '',
        address: currentSite.address || '',
        location: currentSite.location || '',
        status: currentSite.status || 'active'
      });
    }
  }, [currentSite]);

  const handleSave = async () => {
    if (!currentSite?.id) {
      alert('Error: No worksite selected');
      return;
    }

    setSaving(true);
    try {
      console.log('[SitesTab] Saving worksite:', currentSite.id, editedSite);
      
      const response = await fetch(`/api/worksites/${currentSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSite)
      });
      
      const data = await response.json();
      console.log('[SitesTab] Update response:', data);
      
      if (response.ok && data.success) {
        setIsEditing(false);
        // Update sessionStorage cache
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`worksite_${currentSite.id}`, JSON.stringify(data.data));
        }
        // Instead of full reload, just update the URL to refresh data
        window.location.href = `/dashboard?worksite=${currentSite.id}`;
      } else {
        const errorMsg = data.error || data.details || 'Failed to update worksite';
        alert(`Failed to update worksite: ${errorMsg}`);
        console.error('[SitesTab] Update failed:', data);
      }
    } catch (error: any) {
      console.error('[SitesTab] Error updating worksite:', error);
      alert(`Error updating worksite: ${error.message || 'Network error'}`);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Edit Controls */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedSite.name}
              onChange={(e) => setEditedSite({ ...editedSite, name: e.target.value })}
              className="text-2xl font-bold bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none w-full max-w-lg"
            />
          ) : (
            <h2 className="text-2xl font-bold text-white">
              {currentSite?.name || currentSite?.worksiteName || 'Unnamed Site'}
            </h2>
          )}
          <p className="text-sm text-gray-400 mt-1">Worksite Management & Configuration</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Saving...' : 'Save'}
        </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedSite({
                    name: currentSite?.name || '',
                    address: currentSite?.address || '',
                    location: currentSite?.location || '',
                    status: currentSite?.status || 'active'
                  });
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={!canConfigureAlerts}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                canConfigureAlerts
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
              }`}
              title={!canConfigureAlerts ? 'You do not have permission to edit site information' : 'Edit Site Info'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Site Info
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Information */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Site Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1">Site ID</label>
              <p className="text-white font-mono text-sm bg-gray-700 px-3 py-2 rounded">{currentSite.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSite.address}
                  onChange={(e) => setEditedSite({ ...editedSite, address: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter address"
                />
              ) : (
                <p className="text-white">{currentSite.address || currentSite.location || 'No address set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1">Status</label>
              {isEditing ? (
                <select
                  value={editedSite.status}
                  onChange={(e) => setEditedSite({ ...editedSite, status: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              ) : (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  currentSite.status === 'active' ? 'bg-green-900/30 text-green-400 border border-green-700/30' :
                  currentSite.status === 'maintenance' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30' :
                  'bg-red-900/30 text-red-400 border border-red-700/30'
                }`}>
                  {(currentSite.status || 'active').toUpperCase()}
              </span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1">Company</label>
              <p className="text-white">{currentSite.company?.name || 'No company assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 block mb-1">Safety Score</label>
              <p className={`text-3xl font-bold ${
                (currentSite.safetyScore || 0) >= 80 ? 'text-green-400' :
                (currentSite.safetyScore || 0) >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {currentSite.safetyScore !== null && currentSite.safetyScore !== undefined 
                  ? `${currentSite.safetyScore}%` 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Site Statistics */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Site Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">Active Alerts</p>
              <p className="text-white font-bold text-3xl">{currentSite.alerts || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-4 col-span-2">
              <p className="text-gray-400 text-xs mb-1">Last Activity</p>
              <p className="text-white font-semibold text-lg">{currentSite.lastActivity || 'No activity'}</p>
            </div>
            </div>
          
          {/* Timestamps */}
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Created:</span>
              <span className="text-white">{currentSite.createdAt ? new Date(currentSite.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Last Updated:</span>
              <span className="text-white">{currentSite.updatedAt ? new Date(currentSite.updatedAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Manage Users Button - Only for Company Admin, goes to company users page */}
          <button 
            onClick={() => canManageUsers && setShowUsersModal(true)}
            disabled={!canManageUsers}
            className={`p-4 rounded-lg text-center transition-colors border ${
              canManageUsers
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 cursor-pointer'
                : 'bg-slate-800/50 text-gray-500 border-slate-700/50 cursor-not-allowed opacity-50'
            }`}
            title={!canManageUsers ? 'You do not have permission to manage users. Only Company Admins can access this.' : 'Manage Users'}
          >
            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <div className="font-medium text-sm">Manage Users</div>
          </button>
          
          {/* Configure Alerts Button */}
          <button 
            onClick={() => canConfigureAlerts && router.push(`/dashboard/alerts${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
            disabled={!canConfigureAlerts}
            className={`p-4 rounded-lg text-center transition-colors border ${
              canConfigureAlerts
                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 cursor-pointer'
                : 'bg-slate-800/50 text-gray-500 border-slate-700/50 cursor-not-allowed opacity-50'
            }`}
            title={!canConfigureAlerts ? 'You do not have permission to configure alerts' : 'Configure Alerts'}
          >
            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <div className="font-medium text-sm">Configure Alerts</div>
          </button>
          
          {/* View Analytics Button - Available to all roles */}
          <button 
            onClick={() => router.push(`/dashboard/analytics${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
            className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-lg text-center transition-colors border border-slate-600 cursor-pointer"
            title="View Analytics"
          >
            <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div className="font-medium text-sm">View Analytics</div>
          </button>
        </div>
      </div>

      {/* Worksite User Management Modal */}
      {showUsersModal && currentSite && (
        <WorksiteUserManagementModal
          isOpen={showUsersModal}
          onClose={() => setShowUsersModal(false)}
          worksiteId={currentSite.id}
          worksiteName={currentSite.name || currentSite.worksiteName || 'Unnamed Site'}
        />
      )}
    </div>
  );
}



function SitesPage({ sites, currentUser, companies }: { sites: any[]; currentUser: any; companies?: any[] }) {
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const normalizedRole = normalizeRole(currentUser?.role);
  const isAdminUser = isAdminRole(normalizedRole);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'inactive': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getSafetyColor = (score: number | null) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Site Management</h1>
          <p className="text-sm text-slate-400 mt-1">{sites.length} sites available</p>
        </div>
        {isAdminUser && (
        <button 
          onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
            Add Site
        </button>
        )}
      </div>

      {/* Sites Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Site</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Alerts</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Safety Score</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No sites available
                </td>
              </tr>
            ) : (
              sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
              <div>
                      <p className="text-sm font-medium text-white">{site.name}</p>
                      <p className="text-xs text-slate-400">{site.address || site.location || '—'}</p>
              </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(site.status)}`}>
                      {site.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(site.alerts || 0) > 0 ? (
                      <span className="text-sm font-medium text-red-400">{site.alerts}</span>
                    ) : (
                      <span className="text-sm text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${getSafetyColor(site.safetyScore)}`}>
                      {site.safetyScore != null ? `${site.safetyScore}%` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
              <button 
                onClick={() => router.push(`/dashboard?worksite=${site.id}`)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                        Open
              </button>
              <button 
                        onClick={() => setSelectedSite(site)}
                        className="px-3 py-1.5 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
                      >
                        Details
              </button>
              </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
            </div>

      {/* Site Details Modal */}
      {selectedSite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{selectedSite.name}</h3>
              <button onClick={() => setSelectedSite(null)} className="p-1 hover:bg-slate-700 rounded">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                    <div>
                  <p className="text-xs text-slate-400 mb-1">Address</p>
                  <p className="text-sm text-white">{selectedSite.address || '—'}</p>
              </div>
                    <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(selectedSite.status)}`}>
                        {selectedSite.status}
                      </span>
            </div>
              <div>
                  <p className="text-xs text-slate-400 mb-1">Safety Score</p>
                  <p className={`text-sm font-semibold ${getSafetyColor(selectedSite.safetyScore)}`}>
                    {selectedSite.safetyScore != null ? `${selectedSite.safetyScore}%` : 'Not calculated'}
                  </p>
              </div>
            </div>
              <div className="pt-4 border-t border-slate-700 flex gap-3">
                  <button
                  onClick={() => { setSelectedSite(null); router.push(`/dashboard?worksite=${selectedSite.id}`); }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Open Dashboard
                  </button>
                  <button
                  onClick={() => { setSelectedSite(null); router.push(`/dashboard/settings?worksite=${selectedSite.id}`); }}
                  className="py-2 px-4 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
                  >
                    Settings
                  </button>
                    </div>
                    </div>
                    </div>
                    </div>
      )}

      {/* Create Worksite Modal */}
      <CreateWorksiteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        companies={companies || []}
        defaultCompanyId={currentUser?.companyId}
        onSave={async (worksite) => {
          const response = await fetch('/api/worksites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(worksite),
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create worksite');
          }
          // Refresh the page to show new worksite
          window.location.reload();
        }}
      />
                  </div>
  );
}

// FALSE POSITIVE REASONS
const FALSE_POSITIVE_REASONS = [
  { id: 'incorrect_detection', label: 'Incorrect detection' },
  { id: 'ppe_present', label: 'PPE was actually present' },
  { id: 'not_worker', label: 'Not a worker (visitor, mannequin, etc.)' },
  { id: 'object_misclassified', label: 'Object misclassified' },
  { id: 'bad_angle', label: 'Bad camera angle / lighting' },
  { id: 'camera_glitch', label: 'Camera glitch or artifact' },
  { id: 'rule_too_sensitive', label: 'Rule is too sensitive' },
  { id: 'other', label: 'Other reason' },
];

// VIOLATION TYPES
const VIOLATION_TYPES = [
  { id: 'missing_helmet', label: 'Missing Hard Hat' },
  { id: 'missing_vest', label: 'Missing Safety Vest' },
  { id: 'missing_gloves', label: 'Missing Gloves' },
  { id: 'missing_goggles', label: 'Missing Safety Goggles' },
  { id: 'missing_harness', label: 'Missing Fall Harness' },
  { id: 'restricted_zone', label: 'Entered Restricted Zone' },
  { id: 'unsafe_behavior', label: 'Unsafe Behavior' },
  { id: 'equipment_misuse', label: 'Equipment Misuse' },
  { id: 'other', label: 'Other Violation' },
];

// SNOOZE DURATIONS
const SNOOZE_DURATIONS = [
  { id: 5, label: '5 minutes' },
  { id: 30, label: '30 minutes' },
  { id: 120, label: '2 hours' },
  { id: 480, label: '8 hours (end of shift)' },
  { id: 1440, label: 'Until tomorrow' },
];

// Alert Resolution Modal Component
function AlertResolutionModal({
  alertData,
  currentSite,
  onClose,
  onResolved,
  getSeverityBadge,
  getStatusBadge,
}: {
  alertData: any;
  currentSite: any;
  onClose: () => void;
  onResolved: (alert: any) => void;
  getSeverityBadge: (s: string) => string;
  getStatusBadge: (s: string) => string;
}) {
  const [step, setStep] = useState(1); // 1: Summary, 2: Resolution, 3: Confirm
  const [resolutionType, setResolutionType] = useState<'CONFIRMED' | 'FALSE_POSITIVE' | 'SNOOZED' | null>(null);
  const [notes, setNotes] = useState('');
  const [fpReason, setFpReason] = useState('');
  const [violationType, setViolationType] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [snoozeDuration, setSnoozeDuration] = useState(30);
  const [openIncidentReport, setOpenIncidentReport] = useState(false);
  const [isTrainingCandidate, setIsTrainingCandidate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [alertDetails, setAlertDetails] = useState<any>(null);
  // Dispute a super-admin "Confirmed real" ruling
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeMsg, setDisputeMsg] = useState<string | null>(null);
  
  // Check if alert is already resolved/acknowledged
  const isAlreadyResolved = ['ACKNOWLEDGED', 'RESOLVED', 'CONFIRMED', 'FALSE_POSITIVE', 'ARCHIVED'].includes(alertData.status);

  // Load full alert details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/alerts/${alertData.id}`);
        if (res.ok) {
          const data = await res.json();
          setAlertDetails(data.data);
        }
      } catch (error) {
        console.error('Error fetching alert details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [alertData.id]);

  const isHighSeverity = ['high', 'critical', 'emergency'].includes(alertData.severity?.toLowerCase());
  const canSubmit = resolutionType && (
    (resolutionType === 'CONFIRMED' && (!isHighSeverity || notes.length > 0)) ||
    (resolutionType === 'FALSE_POSITIVE' && fpReason) ||
    (resolutionType === 'SNOOZED' && snoozeDuration > 0)
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/alerts/${alertData.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionType,
          notes,
          fpReason: resolutionType === 'FALSE_POSITIVE' ? fpReason : null,
          violationType: resolutionType === 'CONFIRMED' ? violationType : null,
          workerId: workerId || null,
          snoozeDuration: resolutionType === 'SNOOZED' ? snoozeDuration : null,
          openIncidentReport,
          isTrainingCandidate: resolutionType === 'FALSE_POSITIVE' ? isTrainingCandidate : false,
        })
      });

      if (res.ok) {
        const data = await res.json();
        onResolved(data.data.alert);
      } else {
        const error = await res.json();
        window.alert('Failed to resolve alert: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      window.alert('Failed to resolve alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reopening an alert
  const handleReopenAlert = async () => {
    setIsReopening(true);
    try {
      const res = await fetch(`/api/alerts/${alertData.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
      });

      if (res.ok) {
        const data = await res.json();
        onResolved(data.data.alert);
      } else {
        const error = await res.json();
        window.alert('Failed to reopen alert: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error reopening alert:', error);
      window.alert('Failed to reopen alert');
    } finally {
      setIsReopening(false);
    }
  };

  // Get resolution type display name
  const getResolutionTypeName = (type: string) => {
    const types: Record<string, string> = {
      'CONFIRMED': 'Violation Confirmed',
      'FALSE_POSITIVE': 'False Positive',
      'SNOOZED': 'Snoozed',
      'ACKNOWLEDGED': 'Acknowledged',
      'RESOLVED': 'Resolved',
      'REOPENED': 'Reopened',
    };
    return types[type] || type;
  };

  // Get FP reason display name
  const getFPReasonName = (reason: string) => {
    const r = FALSE_POSITIVE_REASONS.find(fp => fp.id === reason);
    return r?.label || reason;
  };

  const timeSinceAlert = alertDetails?.timeSinceAlertFormatted || 
    (alertData.createdAt ? `${Math.floor((Date.now() - new Date(alertData.createdAt).getTime()) / 60000)} minutes ago` : 'Unknown');

  // Generate auto-summary
  const autoSummary = `${alertData.title || 'Safety violation'} detected at ${alertData.location || currentSite?.name || 'worksite'}. Alert has been active for ${timeSinceAlert}.`;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Only close if clicking on backdrop, not content
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-5xl w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Incident Evaluation</h3>
              <p className="text-sm text-slate-400">
                Step {step} of 3 — {['Incident Summary', 'Resolution', 'Confirm & Save'][step - 1]}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-medium rounded border ${getSeverityBadge(alertData.severity)}`}>
                {alertData.severity || 'Low'}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded border ${getStatusBadge(alertData.status, alertData.resolutionType)}`}>
                {getStatusDisplayName(alertData.status, alertData.resolutionType) || 'Active'}
              </span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="p-2 hover:bg-slate-700 rounded"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-slate-800 shrink-0">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  s < step ? 'bg-emerald-500' : s === step ? 'bg-blue-500' : 'bg-slate-700'
                }`} />
                <p className={`text-xs mt-1 ${s === step ? 'text-blue-400' : 'text-slate-500'}`}>
                  {['Summary', 'Resolution', 'Confirm'][s - 1]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: INCIDENT SUMMARY */}
          {step === 1 && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Detection Snapshot */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Detection Snapshot</h4>
                  <div className="aspect-video bg-slate-800 rounded border border-slate-700 overflow-hidden relative">
                    {alertData.detectionSnapshot || alertData.evidenceUrl ? (
                      <img 
                        src={alertData.detectionSnapshot || alertData.evidenceUrl} 
                        alt="Detection" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">No snapshot available</p>
                        </div>
                      </div>
                    )}
                    {/* Bounding box overlay would go here */}
                  </div>

                  {/* Detection Data */}
                  {(alertData.detectionData || alertData.metadata) && (
                    <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
                      <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">Detection Data</h5>
                      <div className="text-sm text-slate-300 font-mono text-xs max-h-32 overflow-y-auto">
                        <pre>{JSON.stringify(alertData.detectionData || alertData.metadata, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Metadata & Summary */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Alert Metadata</h4>
                  
                  <div className="bg-slate-800/50 rounded border border-slate-700 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-slate-500 text-xs">Timestamp</p>
                        <p className="text-white">{alertData.createdAt ? new Date(alertData.createdAt).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs">Duration</p>
                        <p className="text-white">{timeSinceAlert}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs">Camera</p>
                        <p className="text-white">{alertDetails?.camera?.name || alertData.location || '—'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs">Worksite</p>
                        <p className="text-white">{alertDetails?.worksite?.name || currentSite?.name || '—'}</p>
                    </div>
                      <div>
                        <p className="text-slate-500 text-xs">Rule Triggered</p>
                        <p className="text-white">{alertDetails?.rule?.name || alertData.ruleId || 'Manual'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Alert Type</p>
                        <p className="text-white">
                          {alertDetails?.isRepeatedAlert ? (
                            <span className="text-amber-400">Repeated ({alertDetails.previousAlertCount} prior)</span>
                          ) : (
                            <span className="text-emerald-400">First occurrence</span>
                          )}
                        </p>
                      </div>
                  </div>
                </div>

                  {/* Auto-generated Summary */}
                  <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
                    <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">Summary</h5>
                    <p className="text-sm text-white leading-relaxed">{autoSummary}</p>
                    </div>

                  {/* Alert Title & Description */}
                  <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
                    <h5 className="text-lg font-semibold text-white mb-2">{alertData.title || 'Safety Alert'}</h5>
                    <p className="text-sm text-slate-400">{alertData.description || 'No additional description.'}</p>
                    </div>

                  {/* Previous Responses */}
                  {alertDetails?.responses?.length > 0 && (
                    <div className="bg-slate-800/50 rounded border border-slate-700 p-4">
                      <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">Previous Activity</h5>
                      <div className="space-y-2 max-h-24 overflow-y-auto">
                        {alertDetails.responses.map((r: any) => (
                          <div key={r.id} className="text-xs text-slate-300">
                            <span className="text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                            {' — '}
                            <span className="text-white">{r.user?.name || 'User'}</span>
                            {': '}
                            {r.response}
                    </div>
                        ))}
                    </div>
                  </div>
                  )}

                  {/* RESOLUTION HISTORY - Show when alert is already resolved */}
                  {isAlreadyResolved && (
                    <div className="bg-emerald-500/5 rounded border border-emerald-500/30 p-4 space-y-4">
                      <h5 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Resolution Details
                      </h5>
                      
                      {/* Current Resolution Status */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Status</p>
                          <p className="text-white font-medium">{alertData.status}</p>
                </div>
                        <div>
                          <p className="text-slate-500 text-xs">Resolution Type</p>
                          <p className="text-white">{getResolutionTypeName(alertData.resolutionType || alertData.status)}</p>
                        </div>
                        {alertData.resolvedAt && (
                          <div>
                            <p className="text-slate-500 text-xs">Resolved At</p>
                            <p className="text-white">{new Date(alertData.resolvedAt).toLocaleString()}</p>
                          </div>
                        )}
                        {(alertDetails?.resolvedByUser || alertData.resolvedBy) && (
                          <div className="col-span-2">
                            <p className="text-slate-500 text-xs">Resolved By</p>
                            <div className="text-white">
                              {alertDetails?.resolvedByUser ? (
                                <div>
                                  <p className="font-medium">{alertDetails.resolvedByUser.name || 'Unknown User'}</p>
                                  {alertDetails.resolvedByUser.email && (
                                    <p className="text-xs text-slate-400">{alertDetails.resolvedByUser.email}</p>
                                  )}
                                </div>
                              ) : (
                                <p>{alertData.resolvedBy || 'Unknown'}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {alertData.fpReason && (
                          <div className="col-span-2">
                            <p className="text-slate-500 text-xs">False Positive Reason</p>
                            <p className="text-amber-400">{getFPReasonName(alertData.fpReason)}</p>
                          </div>
                        )}
                        {alertData.violationType && (
                          <div>
                            <p className="text-slate-500 text-xs">Violation Type</p>
                            <p className="text-red-400">{VIOLATION_TYPES.find(v => v.id === alertData.violationType)?.label || alertData.violationType}</p>
                          </div>
                        )}
                        {alertData.workerId && (
                          <div>
                            <p className="text-slate-500 text-xs">Worker ID</p>
                            <p className="text-white">{alertData.workerId}</p>
                          </div>
                        )}
                        {alertData.resolutionNotes && (
                          <div className="col-span-2">
                            <p className="text-slate-500 text-xs">Notes</p>
                            <p className="text-slate-300">{alertData.resolutionNotes}</p>
                          </div>
                        )}
              </div>

                      {/* Resolution Log History */}
                      {alertDetails?.resolutionLogs?.length > 0 && (
                        <div className="border-t border-emerald-500/20 pt-3 mt-3">
                          <p className="text-xs text-slate-400 uppercase mb-2">Resolution History</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {alertDetails.resolutionLogs.map((log: any) => (
                              <div key={log.id} className="text-xs bg-slate-800/50 rounded p-2">
                                <div className="flex justify-between items-start">
                                  <span className="text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    log.status === 'CONFIRMED' ? 'bg-red-500/20 text-red-400' :
                                    log.status === 'FALSE_POSITIVE' ? 'bg-amber-500/20 text-amber-400' :
                                    log.status === 'SNOOZED' ? 'bg-blue-500/20 text-blue-400' :
                                    log.status === 'REOPENED' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {getResolutionTypeName(log.status)}
                                  </span>
                                </div>
                                <p className="text-white mt-1">By: {log.user?.name || log.user?.email || 'Unknown'}</p>
                                {log.notes && <p className="text-slate-400 mt-1">{log.notes}</p>}
                                {log.fpReason && <p className="text-amber-400 mt-1">Reason: {getFPReasonName(log.fpReason)}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dispute Nexxau ruling — only shown when super-admin confirmed the violation */}
                      {alertData.resolutionType === 'CONFIRMED_BY_SUPER_ADMIN' && (
                        <div className="border-t border-amber-500/30 pt-3 mt-1">
                          <p className="text-xs text-amber-400 font-semibold uppercase mb-2">
                            ⚠ Nexxau Review Ruling
                          </p>
                          <p className="text-sm text-slate-300 mb-3">
                            Nexxau's review team has confirmed this was a <strong className="text-red-400">real violation</strong>, not a false positive.
                            {alertData.resolutionNotes ? ` Note: "${alertData.resolutionNotes}"` : ''}
                          </p>
                          {!showDisputeForm ? (
                            <button
                              onClick={() => setShowDisputeForm(true)}
                              className="w-full px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                              </svg>
                              Dispute this ruling
                            </button>
                          ) : (
                            <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                              <p className="text-sm text-amber-400 font-medium">Explain why you disagree</p>
                              <textarea
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                placeholder="e.g. Worker had PPE on — camera angle was misleading."
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm resize-none"
                              />
                              {disputeMsg && (
                                <p className={`text-xs ${disputeMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                  {disputeMsg}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!disputeReason.trim()) return;
                                    setIsSubmittingDispute(true);
                                    setDisputeMsg(null);
                                    try {
                                      // Get the FP review ID from the alert's fpReview relation
                                      const detailRes = await fetch(`/api/alerts/${alertData.id}`);
                                      const detail = await detailRes.json();
                                      const reviewId = detail?.data?.fpReview?.id;
                                      if (!reviewId) throw new Error('No review found for this alert');
                                      const res = await fetch(`/api/admin/fp-reviews/${reviewId}/dispute`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reason: disputeReason.trim() }),
                                      });
                                      const json = await res.json();
                                      if (!res.ok) throw new Error(json.error ?? 'Failed');
                                      setDisputeMsg('Dispute submitted — Nexxau will review it shortly.');
                                      setShowDisputeForm(false);
                                      setDisputeReason('');
                                    } catch (e: any) {
                                      setDisputeMsg(`Error: ${e.message}`);
                                    } finally {
                                      setIsSubmittingDispute(false);
                                    }
                                  }}
                                  disabled={isSubmittingDispute || !disputeReason.trim()}
                                  className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                                >
                                  {isSubmittingDispute ? 'Submitting...' : 'Submit dispute'}
                                </button>
                                <button
                                  onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeMsg(null); }}
                                  className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm rounded transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reopen Alert Button */}
                      {!showReopenForm ? (
                  <button
                          onClick={() => setShowReopenForm(true)}
                          className="w-full mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Reopen Alert
                  </button>
                      ) : (
                        <div className="mt-2 space-y-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                          <p className="text-sm text-purple-400 font-medium">Reopen this alert?</p>
                          <textarea
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            placeholder="Why are you reopening this alert? (optional)"
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                          />
                          <div className="flex gap-2">
                  <button
                              onClick={handleReopenAlert}
                              disabled={isReopening}
                              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                            >
                              {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                  </button>
                  <button
                    onClick={() => {
                                setShowReopenForm(false);
                                setReopenReason('');
                    }}
                              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm rounded transition-colors"
                  >
                              Cancel
                  </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: RESOLUTION */}
          {step === 2 && (
            <div className="p-6 space-y-6">
              <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Choose Resolution</h4>
              
              {/* Resolution Options */}
              <div className="grid grid-cols-3 gap-4">
                {/* Confirm Violation */}
                  <button
                  onClick={() => setResolutionType('CONFIRMED')}
                  className={`p-4 rounded border text-left transition-all ${
                    resolutionType === 'CONFIRMED'
                      ? 'bg-red-500/10 border-red-500/50 ring-2 ring-red-500/30'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      resolutionType === 'CONFIRMED' ? 'border-red-500 bg-red-500' : 'border-slate-500'
                    }`}>
                      {resolutionType === 'CONFIRMED' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-white">Confirm Violation</span>
                  </div>
                  <p className="text-xs text-slate-400">The alert is accurate. This was a real safety violation.</p>
                  </button>

                {/* False Positive */}
                <button
                  onClick={() => setResolutionType('FALSE_POSITIVE')}
                  className={`p-4 rounded border text-left transition-all ${
                    resolutionType === 'FALSE_POSITIVE'
                      ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      resolutionType === 'FALSE_POSITIVE' ? 'border-amber-500 bg-amber-500' : 'border-slate-500'
                    }`}>
                      {resolutionType === 'FALSE_POSITIVE' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                </div>
                    <span className="font-medium text-white">False Positive</span>
              </div>
                  <p className="text-xs text-slate-400">The detection was incorrect. This will improve AI accuracy.</p>
                </button>

                {/* Snooze */}
                <button
                  onClick={() => setResolutionType('SNOOZED')}
                  className={`p-4 rounded border text-left transition-all ${
                    resolutionType === 'SNOOZED'
                      ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      resolutionType === 'SNOOZED' ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                    }`}>
                      {resolutionType === 'SNOOZED' && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
            </div>
                    <span className="font-medium text-white">Snooze / Defer</span>
          </div>
                  <p className="text-xs text-slate-400">Temporarily dismiss. Alert will return if issue persists.</p>
                </button>
              </div>

              {/* Conditional Fields based on Resolution Type */}
              {resolutionType === 'CONFIRMED' && (
                <div className="space-y-4 p-4 bg-red-500/5 border border-red-500/20 rounded">
                  <h5 className="text-sm font-medium text-red-400">Confirm Violation Details</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Violation Type</label>
                      <select
                        value={violationType}
                        onChange={(e) => setViolationType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                      >
                        <option value="">Select violation type...</option>
                        {VIOLATION_TYPES.map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Worker ID (optional)</label>
                      <input
                        type="text"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        placeholder="Enter worker ID if known"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Notes {isHighSeverity && <span className="text-red-400">*required for high severity</span>}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the violation and any corrective actions taken..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openIncidentReport}
                      onChange={(e) => setOpenIncidentReport(e.target.checked)}
                      className="rounded border-slate-500 bg-slate-700 text-red-600"
                    />
                    <span className="text-sm text-slate-300">Open full incident report after saving</span>
                  </label>
        </div>
      )}

              {resolutionType === 'FALSE_POSITIVE' && (
                <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded">
                  <h5 className="text-sm font-medium text-amber-400">False Positive Details</h5>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Why was this a false positive? *</label>
                    <select
                      value={fpReason}
                      onChange={(e) => setFpReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                    >
                      <option value="">Select reason...</option>
                      {FALSE_POSITIVE_REASONS.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Additional Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Provide additional context to help improve the AI model..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrainingCandidate}
                      onChange={(e) => setIsTrainingCandidate(e.target.checked)}
                      className="rounded border-slate-500 bg-slate-700 text-amber-600"
                    />
                    <span className="text-sm text-slate-300">Include this sample in future training datasets</span>
                  </label>

                  <p className="text-xs text-slate-500">
                    This feedback will be used to improve detection accuracy for this camera.
                  </p>
                </div>
              )}

              {resolutionType === 'SNOOZED' && (
                <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded">
                  <h5 className="text-sm font-medium text-blue-400">Snooze Settings</h5>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">Snooze Duration</label>
                    <div className="grid grid-cols-5 gap-2">
                      {SNOOZE_DURATIONS.map(d => (
          <button 
                          key={d.id}
                          onClick={() => setSnoozeDuration(d.id)}
                          className={`px-3 py-2 rounded text-sm transition-colors ${
                            snoozeDuration === d.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why is this being snoozed?"
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded text-sm"
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    Alert will become active again after {SNOOZE_DURATIONS.find(d => d.id === snoozeDuration)?.label || 'the snooze period'} if the condition persists.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 3 && (
            <div className="p-6 space-y-6">
              <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Confirm Resolution</h4>
              
              <div className="bg-slate-800/50 rounded border border-slate-700 p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    resolutionType === 'CONFIRMED' ? 'bg-red-500/20' :
                    resolutionType === 'FALSE_POSITIVE' ? 'bg-amber-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    {resolutionType === 'CONFIRMED' && (
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
                    )}
                    {resolutionType === 'FALSE_POSITIVE' && (
                      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {resolutionType === 'SNOOZED' && (
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h5 className="text-lg font-semibold text-white">
                      {resolutionType === 'CONFIRMED' && 'Violation Confirmed'}
                      {resolutionType === 'FALSE_POSITIVE' && 'Marked as False Positive'}
                      {resolutionType === 'SNOOZED' && 'Alert Snoozed'}
                    </h5>
                    <p className="text-sm text-slate-400">{alertData.title}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-700">
                  {resolutionType === 'CONFIRMED' && (
                    <>
                      <div>
                        <p className="text-slate-500">Violation Type</p>
                        <p className="text-white">{VIOLATION_TYPES.find(v => v.id === violationType)?.label || 'Not specified'}</p>
                      </div>
                      {workerId && (
                        <div>
                          <p className="text-slate-500">Worker ID</p>
                          <p className="text-white">{workerId}</p>
                        </div>
                      )}
                    </>
                  )}
                  {resolutionType === 'FALSE_POSITIVE' && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Reason</p>
                      <p className="text-white">{FALSE_POSITIVE_REASONS.find(r => r.id === fpReason)?.label}</p>
                    </div>
                  )}
                  {resolutionType === 'SNOOZED' && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Snooze Duration</p>
                      <p className="text-white">{SNOOZE_DURATIONS.find(d => d.id === snoozeDuration)?.label}</p>
                    </div>
                  )}
                  {notes && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Notes</p>
                      <p className="text-white">{notes}</p>
                    </div>
                  )}
                </div>

                {openIncidentReport && (
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-amber-400">A full incident report will be created after saving.</p>
                  </div>
                )}
              </div>

              {isHighSeverity && resolutionType === 'CONFIRMED' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                  <p className="text-sm text-red-400 font-medium">High Severity Alert</p>
                  <p className="text-xs text-slate-400 mt-1">
                    This is a high-severity alert. Your resolution will be logged for compliance and may trigger additional notifications to management.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center shrink-0">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          
          <div className="flex gap-3">
            {step < 3 ? (
          <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && !resolutionType}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
                Next →
          </button>
            ) : (
          <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                className={`px-6 py-2 text-white text-sm font-medium rounded transition-colors ${
                  resolutionType === 'CONFIRMED' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : resolutionType === 'FALSE_POSITIVE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Saving...' : 'Acknowledge & Save'}
          </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// PPE Types for detection
const PPE_TYPES = [
  { id: 'helmet', label: 'Hard Hat / Helmet', icon: '🪖' },
  { id: 'vest', label: 'Safety Vest', icon: '🦺' },
  { id: 'gloves', label: 'Safety Gloves', icon: '🧤' },
  { id: 'goggles', label: 'Safety Goggles', icon: '🥽' },
  { id: 'boots', label: 'Safety Boots', icon: '👢' },
  { id: 'harness', label: 'Fall Harness', icon: '🪢' },
  { id: 'mask', label: 'Respirator / Mask', icon: '😷' },
  { id: 'earplugs', label: 'Ear Protection', icon: '🎧' },
  { id: 'faceshield', label: 'Face Shield', icon: '🛡️' },
  { id: 'coveralls', label: 'Coveralls', icon: '🥋' },
];

// Detection condition types
const CONDITION_TYPES = {
  object: [
    { id: 'person_detected', label: 'Person detected' },
    { id: 'person_count_gt', label: 'Person count greater than' },
    { id: 'vehicle_detected', label: 'Vehicle detected' },
    { id: 'forklift_detected', label: 'Forklift detected' },
    { id: 'crane_detected', label: 'Crane detected' },
  ],
  ppe: [
    { id: 'missing_ppe', label: 'Missing PPE' },
    { id: 'ppe_present', label: 'PPE present' },
  ],
  zone: [
    { id: 'in_zone', label: 'Worker in zone' },
    { id: 'near_hazard', label: 'Worker near hazard' },
    { id: 'restricted_area', label: 'Entering restricted area' },
    { id: 'near_machinery', label: 'Near moving machinery' },
  ],
  behavior: [
    { id: 'running', label: 'Running detected' },
    { id: 'phone_usage', label: 'Phone usage' },
    { id: 'smoking', label: 'Smoking detected' },
    { id: 'worker_alone', label: 'Worker alone in danger zone' },
    { id: 'fall_risk_posture', label: 'Fall-risk posture' },
    { id: 'on_ladder', label: 'Worker on ladder' },
    { id: 'in_trench', label: 'Worker in trench' },
  ],
  camera: [
    { id: 'camera_obstruction', label: 'Camera obstruction' },
    { id: 'camera_offline', label: 'Camera offline' },
  ],
};

// Schedule presets
const SCHEDULE_PRESETS = [
  { id: 'always', label: 'Always Active' },
  { id: 'work_hours', label: 'Work Hours (6AM-6PM)' },
  { id: 'night_shift', label: 'Night Shift (6PM-6AM)' },
  { id: 'weekdays', label: 'Weekdays Only' },
  { id: 'weekends', label: 'Weekends Only' },
  { id: 'custom', label: 'Custom Schedule' },
];

// Action types
const ACTION_TYPES = [
  { id: 'create_alert', label: 'Create Alert', category: 'notification' },
  { id: 'push_notification', label: 'Push Notification', category: 'notification' },
  { id: 'send_email', label: 'Send Email', category: 'notification' },
  { id: 'send_sms', label: 'Send SMS', category: 'notification' },
  { id: 'send_whatsapp', label: 'Send WhatsApp', category: 'notification' },
  { id: 'trigger_webhook', label: 'Trigger Webhook', category: 'integration' },
  { id: 'save_evidence', label: 'Save to Evidence Folder', category: 'data' },
  { id: 'log_event', label: 'Log Event', category: 'data' },
  { id: 'increment_violation', label: 'Increment Violation Score', category: 'data' },
  { id: 'create_incident', label: 'Auto-create Incident Report', category: 'data' },
  { id: 'require_acknowledgment', label: 'Require Supervisor Acknowledgment', category: 'workflow' },
  { id: 'escalate', label: 'Escalate to Safety Manager', category: 'workflow' },
];

interface RuleCondition {
  id: string;
  type: string;
  operator: 'AND' | 'OR';
  value: any;
  duration?: number;
}

function AlertsPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleStep, setRuleStep] = useState(1);
  
  // Advanced rule form state
  const [ruleForm, setRuleForm] = useState({
    // Basic Info
    name: '',
    description: '',
    tags: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    
    // Scope
    scopeType: 'cameras' as 'worksite' | 'zone' | 'camera_group' | 'cameras',
    cameraIds: [] as string[],
    zones: [] as string[],
    schedule: 'always' as string,
    customSchedule: {
      startTime: '06:00',
      endTime: '18:00',
      days: [1, 2, 3, 4, 5] as number[]
    },
    
    // Conditions
    conditions: [] as RuleCondition[],
    
    // Thresholds
    confidenceThreshold: 0.7,
    minDuration: 3,
    minOccurrences: 1,
    timeWindowMinutes: 5,
    allowRepeatedAlerts: false,
    cooldownSeconds: 60,
    
    // Actions
    actions: ['create_alert'] as string[],
    escalationActions: [] as string[],
    escalationDelayMinutes: 10,
    
    // Alert Content
    severity: 'high' as string,
    alertTitle: '',
    alertMessage: '',
    includeSnapshot: true,
    includeVideoClip: true,
    blurFaces: false,
  });

  useEffect(() => {
    if (currentSite?.id) {
      fetch(`/api/alerts?worksiteId=${currentSite.id}&limit=50`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => setAlerts(data.data || []))
        .catch(() => setAlerts([]))
        .finally(() => setLoading(false));
      
      fetch(`/api/cameras?worksiteId=${currentSite.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setCameras(Array.isArray(data) ? data : data.data || []))
        .catch(() => setCameras([]));
    }
  }, [currentSite?.id]);

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'critical' || s === 'emergency') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (s === 'high') return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (s === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (s === 'low') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'info') return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  const getStatusBadge = (status: string, resolutionType?: string) => {
    const s = status?.toUpperCase();
    const rt = resolutionType?.toUpperCase();
    // Super-admin overrides take priority
    if (s === 'RESOLVED' && rt === 'CONFIRMED_BY_SUPER_ADMIN') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (s === 'FALSE_POSITIVE' && (rt === 'CONFIRMED_FALSE_POSITIVE' || rt === 'DISPUTE_UPHELD')) return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
    if (s === 'ACTIVE') return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (s === 'ACKNOWLEDGED') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (s === 'RESOLVED') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (s === 'CONFIRMED') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (s === 'FALSE_POSITIVE') return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    if (s === 'SNOOZED') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'ARCHIVED') return 'bg-slate-600/10 text-slate-500 border-slate-600/30';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  };

  // Get user-friendly status display name
  const getStatusDisplayName = (status: string, resolutionType?: string) => {
    const s = status?.toUpperCase();
    const rt = resolutionType?.toUpperCase();
    // Super-admin overrides take priority
    if (s === 'RESOLVED' && rt === 'CONFIRMED_BY_SUPER_ADMIN') return 'Override: Real Violation';
    if (s === 'FALSE_POSITIVE' && (rt === 'CONFIRMED_FALSE_POSITIVE' || rt === 'DISPUTE_UPHELD')) return 'Confirmed False Positive';
    if (s === 'ACTIVE') return 'Active';
    if (s === 'ACKNOWLEDGED') return 'In Progress';
    if (s === 'RESOLVED') return 'Resolved';
    if (s === 'CONFIRMED') return 'Confirmed';
    if (s === 'FALSE_POSITIVE') return 'False Positive';
    if (s === 'SNOOZED') return 'Snoozed';
    if (s === 'ARCHIVED') return 'Archived';
    return status || 'Unknown';
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: '' })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, status: 'acknowledged' } : a
        ));
        if (selectedAlert?.id === alertId) {
          setSelectedAlert((prev: any) => prev ? { ...prev, status: 'acknowledged' } : null);
        }
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const addCondition = (type: string) => {
    const newCondition: RuleCondition = {
      id: Date.now().toString(),
      type,
      operator: 'AND',
      value: type === 'missing_ppe' ? ['helmet'] : type === 'person_count_gt' ? 5 : true,
      duration: 0
    };
    setRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const removeCondition = (id: string) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id)
    }));
  };

  const handleCreateRule = async () => {
    if (!ruleForm.name) {
      alert('Please enter a rule name');
      return;
    }
    if (ruleForm.cameraIds.length === 0 && ruleForm.scopeType === 'cameras') {
      alert('Please select at least one camera');
      return;
    }
    if (ruleForm.conditions.length === 0) {
      alert('Please add at least one condition');
      return;
    }
    
    setCreatingRule(true);
    try {
      const res = await fetch('/api/custom-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleForm.name,
          description: ruleForm.description,
          worksiteId: currentSite.id,
          cameraId: ruleForm.cameraIds[0],
          ruleType: 'advanced',
          severity: ruleForm.severity,
          priority: ruleForm.priority === 'critical' ? 1 : ruleForm.priority === 'high' ? 2 : ruleForm.priority === 'medium' ? 3 : 4,
          confidenceThreshold: ruleForm.confidenceThreshold,
          detectionCriteria: {
            conditions: ruleForm.conditions,
            scopeType: ruleForm.scopeType,
            cameraIds: ruleForm.cameraIds,
            zones: ruleForm.zones
          },
          triggerConditions: { 
            minDuration: ruleForm.minDuration,
            minOccurrences: ruleForm.minOccurrences,
            timeWindowMinutes: ruleForm.timeWindowMinutes,
            cooldownSeconds: ruleForm.cooldownSeconds,
            allowRepeatedAlerts: ruleForm.allowRepeatedAlerts
          },
          alertSettings: { 
            actions: ruleForm.actions,
            escalationActions: ruleForm.escalationActions,
            escalationDelayMinutes: ruleForm.escalationDelayMinutes,
            title: ruleForm.alertTitle,
            message: ruleForm.alertMessage,
            includeSnapshot: ruleForm.includeSnapshot,
            includeVideoClip: ruleForm.includeVideoClip,
            blurFaces: ruleForm.blurFaces
          },
          schedule: ruleForm.schedule === 'custom' ? ruleForm.customSchedule : ruleForm.schedule,
          tags: ruleForm.tags,
          isActive: true
        })
      });
      
      if (res.ok) {
        setShowCreateRuleModal(false);
        resetRuleForm();
        alert('Rule created successfully!');
      } else {
        const error = await res.json();
        alert('Failed to create rule: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Failed to create rule');
    } finally {
      setCreatingRule(false);
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '', description: '', tags: [], priority: 'medium',
      scopeType: 'cameras', cameraIds: [], zones: [], schedule: 'always',
      customSchedule: { startTime: '06:00', endTime: '18:00', days: [1,2,3,4,5] },
      conditions: [], confidenceThreshold: 0.7, minDuration: 3, minOccurrences: 1,
      timeWindowMinutes: 5, allowRepeatedAlerts: false, cooldownSeconds: 60,
      actions: ['create_alert'], escalationActions: [], escalationDelayMinutes: 10,
      severity: 'high', alertTitle: '', alertMessage: '',
      includeSnapshot: true, includeVideoClip: true, blurFaces: false,
    });
    setRuleStep(1);
  };

  // Archive statuses - alerts in these states are considered "archived" for review
  const ARCHIVE_STATUSES = ['RESOLVED', 'CONFIRMED', 'FALSE_POSITIVE', 'ARCHIVED'];
  
  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity !== 'all' && a.severity?.toLowerCase() !== filterSeverity.toLowerCase()) return false;
    
    // Special handling for "ARCHIVED" filter - shows all closed/resolved alerts
    if (filterStatus === 'ARCHIVED') {
      return ARCHIVE_STATUSES.includes(a.status?.toUpperCase() || '');
    }
    
    if (filterStatus !== 'all' && a.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
    return true;
  }).sort((a, b) => {
    // Sort by date descending (most recent first)
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (!currentSite) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Alerts</h1>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
          <p className="text-slate-400">Select a worksite to view alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Alerts</h1>
          <p className="text-sm text-slate-400 mt-1">{currentSite.name}</p>
        </div>
              <button
          onClick={() => router.push(`/dashboard/alert-builder?from=alerts${currentSite?.id ? `&worksite=${currentSite.id}` : ''}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Create Rule
              </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-sm bg-slate-800 border border-slate-600 text-white rounded px-3 py-2"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="emergency">Emergency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-slate-800 border border-slate-600 text-white rounded px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active (Needs Action)</option>
          <option value="ACKNOWLEDGED">In Progress</option>
          <option value="SNOOZED">Snoozed</option>
          <option value="ARCHIVED">Archive (All Closed)</option>
          <option value="RESOLVED">— Resolved</option>
          <option value="CONFIRMED">— Confirmed Violations</option>
          <option value="FALSE_POSITIVE">— False Positives</option>
        </select>
        <span className="text-sm text-slate-400">{filteredAlerts.length} alerts</span>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Severity</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Snapshot</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Alert</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-400 uppercase">Camera</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-slate-400 uppercase">Time</th>
              <th className="pl-6 pr-8 py-4 text-right text-xs font-medium text-slate-400 uppercase whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(7)].map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-slate-700/60 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredAlerts.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No alerts found</td></tr>
            ) : (
              filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${getSeverityBadge(alert.severity)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        alert.severity?.toLowerCase() === 'critical' || alert.severity?.toLowerCase() === 'emergency' ? 'bg-purple-400' :
                        alert.severity?.toLowerCase() === 'high' ? 'bg-red-400' : 
                        alert.severity?.toLowerCase() === 'medium' ? 'bg-amber-400' : 
                        alert.severity?.toLowerCase() === 'low' ? 'bg-blue-400' : 'bg-slate-400'
                      }`} />
                      {alert.severity || 'Low'}
              </span>
                  </td>
                  <td className="px-6 py-4">
                    {alert.detectionSnapshot ? (
                      <img
                        src={alert.detectionSnapshot}
                        alt="Alert snapshot"
                        className="w-12 h-9 object-cover rounded border border-slate-700/50 cursor-pointer"
                        onClick={() => window.open(alert.detectionSnapshot, '_blank')}
                        title="Open snapshot"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{alert.title || 'Alert'}</p>
                    <p className="text-xs text-slate-400 truncate max-w-xs">{alert.description || '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{alert.camera?.name || alert.worksite?.name || alert.location || '—'}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(alert.status, alert.resolutionType)}`}>
                      {getStatusDisplayName(alert.status, alert.resolutionType)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="pl-6 pr-8 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      {/* ACTIVE alerts → show Acknowledge button */}
                      {alert.status?.toUpperCase() === 'ACTIVE' && (
              <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
                        >
                          Acknowledge
                        </button>
                      )}
                      {/* ACKNOWLEDGED alerts → show Resolve button */}
                      {alert.status?.toUpperCase() === 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"
                        >
                          Resolve
                        </button>
                      )}
                      {/* View button for all alerts */}
                      <button 
                        onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-1 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded"
                      >
                        View
              </button>
            </div>
                  </td>
                </tr>
              ))
          )}
          </tbody>
        </table>
        </div>
      
      {/* Comprehensive Alert Resolution Modal */}
      {selectedAlert && (
        <AlertResolutionModal 
          alertData={selectedAlert} 
          currentSite={currentSite}
          onClose={() => setSelectedAlert(null)}
          onResolved={(updatedAlert) => {
            setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
            setSelectedAlert(null);
          }}
          getSeverityBadge={getSeverityBadge}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Advanced Create Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                  <div>
                <h3 className="text-lg font-semibold text-white">Create Advanced Alert Rule</h3>
                <p className="text-sm text-slate-400">Step {ruleStep} of 5 — {['Basic Info', 'Scope & Schedule', 'Conditions', 'Thresholds', 'Actions & Alerts'][ruleStep - 1]}</p>
                  </div>
              <button onClick={() => { setShowCreateRuleModal(false); resetRuleForm(); }} className="p-2 hover:bg-slate-700 rounded">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
                  </div>

            {/* Progress Bar */}
            <div className="px-6 py-3 border-b border-slate-800 shrink-0">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex-1">
                    <div className={`h-1.5 rounded-full ${step <= ruleStep ? 'bg-blue-500' : 'bg-slate-700'}`} />
                    <p className={`text-xs mt-1 ${step === ruleStep ? 'text-blue-400' : 'text-slate-500'}`}>
                      {['Info', 'Scope', 'Conditions', 'Thresholds', 'Actions'][step - 1]}
                    </p>
                  </div>
                ))}
                  </div>
                </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Basic Info */}
              {ruleStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name *</label>
                    <input
                      type="text"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="e.g., Roof Work PPE Enforcement"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea
                      value={ruleForm.description}
                      onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                      placeholder="Describe what this rule monitors and why it's important..."
                      rows={3}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
            </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                      <select
                        value={ruleForm.priority}
                        onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value as any })}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="critical">🔴 Critical</option>
                        <option value="high">🟠 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
              </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
                      <select
                        value={ruleForm.severity}
                        onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="emergency">Emergency (Life Threat)</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="info">Info</option>
                      </select>
              </div>
            </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['PPE', 'Fall Risk', 'Night Shift', 'High Priority', 'Zone Entry', 'Vehicle'].map((tag) => (
        <button 
                          key={tag}
                          onClick={() => {
                            if (ruleForm.tags.includes(tag)) {
                              setRuleForm({ ...ruleForm, tags: ruleForm.tags.filter(t => t !== tag) });
                            } else {
                              setRuleForm({ ...ruleForm, tags: [...ruleForm.tags, tag] });
                            }
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                            ruleForm.tags.includes(tag) 
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                              : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {tag}
          </button>
                      ))}
      </div>
                  </div>
                </div>
              )}

              {/* Step 2: Scope & Schedule */}
              {ruleStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Scope Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'worksite', label: 'Entire Worksite', desc: 'Apply to all cameras' },
                        { id: 'cameras', label: 'Specific Cameras', desc: 'Select individual cameras' },
                      ].map((scope) => (
          <button
                          key={scope.id}
                          onClick={() => setRuleForm({ ...ruleForm, scopeType: scope.id as any })}
                          className={`p-4 text-left rounded border transition-colors ${
                            ruleForm.scopeType === scope.id
                              ? 'bg-blue-500/10 border-blue-500/50'
                              : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <p className="text-sm font-medium text-white">{scope.label}</p>
                          <p className="text-xs text-slate-400 mt-1">{scope.desc}</p>
          </button>
                      ))}
        </div>
                  </div>

                  {ruleForm.scopeType === 'cameras' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Select Cameras</label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-slate-800/50 rounded p-3">
                        {cameras.length === 0 ? (
                          <p className="text-sm text-slate-400 col-span-2 text-center py-4">No cameras available</p>
                        ) : (
                          cameras.map((cam) => (
                            <label key={cam.id} className={`flex items-center space-x-2 p-3 rounded cursor-pointer transition-colors ${
                              ruleForm.cameraIds.includes(cam.id) ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                            }`}>
                              <input
                                type="checkbox"
                                checked={ruleForm.cameraIds.includes(cam.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRuleForm({ ...ruleForm, cameraIds: [...ruleForm.cameraIds, cam.id] });
                                  } else {
                                    setRuleForm({ ...ruleForm, cameraIds: ruleForm.cameraIds.filter(id => id !== cam.id) });
                                  }
                                }}
                                className="rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                              />
                  <div>
                                <span className="text-sm text-white">{cam.name}</span>
                                <p className="text-xs text-slate-400">{cam.location || 'Unknown location'}</p>
                  </div>
                            </label>
                          ))
                        )}
                  </div>
                      <p className="text-xs text-slate-500 mt-2">{ruleForm.cameraIds.length} camera(s) selected</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Active Schedule</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SCHEDULE_PRESETS.map((schedule) => (
                  <button 
                          key={schedule.id}
                          onClick={() => setRuleForm({ ...ruleForm, schedule: schedule.id })}
                          className={`p-3 text-left rounded border transition-colors ${
                            ruleForm.schedule === schedule.id
                              ? 'bg-blue-500/10 border-blue-500/50'
                              : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <p className="text-sm font-medium text-white">{schedule.label}</p>
                  </button>
                      ))}
                  </div>
                </div>

                  {ruleForm.schedule === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={ruleForm.customSchedule.startTime}
                          onChange={(e) => setRuleForm({ 
                            ...ruleForm, 
                            customSchedule: { ...ruleForm.customSchedule, startTime: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded"
                  />
              </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">End Time</label>
                        <input
                          type="time"
                          value={ruleForm.customSchedule.endTime}
                          onChange={(e) => setRuleForm({ 
                            ...ruleForm, 
                            customSchedule: { ...ruleForm.customSchedule, endTime: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded"
                        />
            </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-2">Active Days</label>
                        <div className="flex gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <button
                              key={day}
                              onClick={() => {
                                const days = ruleForm.customSchedule.days.includes(idx)
                                  ? ruleForm.customSchedule.days.filter(d => d !== idx)
                                  : [...ruleForm.customSchedule.days, idx];
                                setRuleForm({ 
                                  ...ruleForm, 
                                  customSchedule: { ...ruleForm.customSchedule, days }
                                });
                              }}
                              className={`w-10 h-10 rounded text-xs font-medium ${
                                ruleForm.customSchedule.days.includes(idx)
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
              </div>
              </div>
            </div>
                  )}
        </div>
      )}

              {/* Step 3: Conditions */}
              {ruleStep === 3 && (
                <div className="space-y-5">
                <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-slate-300">Trigger Conditions</label>
                      <span className="text-xs text-slate-500">Build IF / AND / OR logic</span>
                </div>
                    
                    {/* Condition Builder */}
                    <div className="space-y-2 mb-4">
                      {ruleForm.conditions.length === 0 ? (
                        <div className="p-6 border border-dashed border-slate-600 rounded text-center">
                          <p className="text-slate-400 text-sm">No conditions added yet</p>
                          <p className="text-slate-500 text-xs mt-1">Add conditions below to define when this rule triggers</p>
                        </div>
                      ) : (
                        ruleForm.conditions.map((condition, idx) => (
                          <div key={condition.id} className="flex items-start gap-2 p-3 bg-slate-800 rounded border border-slate-700">
                            {idx > 0 && (
                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(condition.id, { operator: e.target.value as 'AND' | 'OR' })}
                                className="px-2 py-1 bg-slate-700 border border-slate-600 text-blue-400 text-xs font-bold rounded"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            )}
                            {idx === 0 && <span className="px-2 py-1 text-blue-400 text-xs font-bold">IF</span>}
                            
                            <div className="flex-1">
                              <span className="text-sm text-white">
                                {CONDITION_TYPES.object.find(c => c.id === condition.type)?.label ||
                                 CONDITION_TYPES.ppe.find(c => c.id === condition.type)?.label ||
                                 CONDITION_TYPES.zone.find(c => c.id === condition.type)?.label ||
                                 CONDITION_TYPES.behavior.find(c => c.id === condition.type)?.label ||
                                 CONDITION_TYPES.camera.find(c => c.id === condition.type)?.label ||
                                 condition.type}
                              </span>
                              
                              {condition.type === 'missing_ppe' && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {PPE_TYPES.map((ppe) => (
                  <button 
                                      key={ppe.id}
                                      onClick={() => {
                                        const current = condition.value || [];
                                        const newValue = current.includes(ppe.id)
                                          ? current.filter((p: string) => p !== ppe.id)
                                          : [...current, ppe.id];
                                        updateCondition(condition.id, { value: newValue });
                                      }}
                                      className={`px-2 py-1 text-xs rounded ${
                                        (condition.value || []).includes(ppe.id)
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                                      }`}
                                    >
                                      {ppe.icon} {ppe.label}
                  </button>
                                  ))}
                                </div>
                              )}
                              
                              {condition.type === 'person_count_gt' && (
                                <input
                                  type="number"
                                  value={condition.value || 5}
                                  onChange={(e) => updateCondition(condition.id, { value: parseInt(e.target.value) })}
                                  className="mt-2 w-20 px-2 py-1 bg-slate-700 border border-slate-600 text-white text-sm rounded"
                                  min={1}
                                />
                              )}
                              
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500">Persist for</span>
                                <input
                                  type="number"
                                  value={condition.duration || 0}
                                  onChange={(e) => updateCondition(condition.id, { duration: parseInt(e.target.value) })}
                                  className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 text-white text-xs rounded"
                                  min={0}
                                />
                                <span className="text-xs text-slate-500">seconds</span>
                              </div>
                            </div>
                            
                  <button 
                              onClick={() => removeCondition(condition.id)}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                  >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  </button>
                </div>
                        ))
                      )}
              </div>

                    {/* Add Condition Buttons */}
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Object Detection</p>
                      <div className="flex flex-wrap gap-2">
                        {CONDITION_TYPES.object.map((cond) => (
                          <button
                            key={cond.id}
                            onClick={() => addCondition(cond.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600"
                          >
                            + {cond.label}
                          </button>
                        ))}
            </div>
                      
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">PPE Detection</p>
                      <div className="flex flex-wrap gap-2">
                        {CONDITION_TYPES.ppe.map((cond) => (
                          <button
                            key={cond.id}
                            onClick={() => addCondition(cond.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600"
                          >
                            + {cond.label}
                          </button>
          ))}
        </div>
                      
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Zone & Location</p>
                      <div className="flex flex-wrap gap-2">
                        {CONDITION_TYPES.zone.map((cond) => (
                          <button
                            key={cond.id}
                            onClick={() => addCondition(cond.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600"
                          >
                            + {cond.label}
                          </button>
                        ))}
                </div>
                      
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Behavioral</p>
                      <div className="flex flex-wrap gap-2">
                        {CONDITION_TYPES.behavior.map((cond) => (
                <button
                            key={cond.id}
                            onClick={() => addCondition(cond.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600"
                >
                            + {cond.label}
                </button>
                        ))}
              </div>

                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Camera Status</p>
                      <div className="flex flex-wrap gap-2">
                        {CONDITION_TYPES.camera.map((cond) => (
                          <button
                            key={cond.id}
                            onClick={() => addCondition(cond.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-600"
                          >
                            + {cond.label}
                          </button>
                        ))}
              </div>
            </div>
          </div>
        </div>
      )}

              {/* Step 4: Thresholds */}
              {ruleStep === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Confidence Threshold</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={ruleForm.confidenceThreshold}
                          onChange={(e) => setRuleForm({ ...ruleForm, confidenceThreshold: parseFloat(e.target.value) })}
                          className="flex-1 accent-blue-500"
                        />
                        <span className="text-white font-mono w-12">{(ruleForm.confidenceThreshold * 100).toFixed(0)}%</span>
    </div>
                      <p className="text-xs text-slate-500 mt-1">Minimum detection confidence to trigger</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Duration (seconds)</label>
                      <input
                        type="number"
                        value={ruleForm.minDuration}
                        onChange={(e) => setRuleForm({ ...ruleForm, minDuration: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={300}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <p className="text-xs text-slate-500 mt-1">Condition must persist for this duration</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Min Occurrences</label>
                      <input
                        type="number"
                        value={ruleForm.minOccurrences}
                        onChange={(e) => setRuleForm({ ...ruleForm, minOccurrences: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={100}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <p className="text-xs text-slate-500 mt-1">Event must occur X times to trigger</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Time Window (minutes)</label>
                      <input
                        type="number"
                        value={ruleForm.timeWindowMinutes}
                        onChange={(e) => setRuleForm({ ...ruleForm, timeWindowMinutes: parseInt(e.target.value) || 5 })}
                        min={1}
                        max={60}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <p className="text-xs text-slate-500 mt-1">Window for counting occurrences</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Cooldown (seconds)</label>
                      <input
                        type="number"
                        value={ruleForm.cooldownSeconds}
                        onChange={(e) => setRuleForm({ ...ruleForm, cooldownSeconds: parseInt(e.target.value) || 60 })}
                        min={10}
                        max={3600}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <p className="text-xs text-slate-500 mt-1">Minimum time between alerts</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleForm.allowRepeatedAlerts}
                          onChange={(e) => setRuleForm({ ...ruleForm, allowRepeatedAlerts: e.target.checked })}
                          className="rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-300">Allow repeated alerts for same violation</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Actions & Alerts */}
              {ruleStep === 5 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Primary Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTION_TYPES.map((action) => (
                        <label
                          key={action.id}
                          className={`flex items-center space-x-2 p-3 rounded cursor-pointer transition-colors ${
                            ruleForm.actions.includes(action.id)
                              ? 'bg-blue-500/10 border border-blue-500/30'
                              : 'bg-slate-800 border border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={ruleForm.actions.includes(action.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRuleForm({ ...ruleForm, actions: [...ruleForm.actions, action.id] });
                              } else {
                                setRuleForm({ ...ruleForm, actions: ruleForm.actions.filter(a => a !== action.id) });
                              }
                            }}
                            className="rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-white">{action.label}</span>
                        </label>
                      ))}
        </div>
      </div>
                  
                  {/* Acknowledgment Workflow */}
                  <div className="p-4 bg-slate-800/80 border border-slate-700 rounded">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-blue-400 font-medium text-sm">Acknowledgment Workflow</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ruleForm.actions.includes('require_acknowledgment')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRuleForm({ ...ruleForm, actions: [...ruleForm.actions, 'require_acknowledgment'] });
                            } else {
                              setRuleForm({ ...ruleForm, actions: ruleForm.actions.filter(a => a !== 'require_acknowledgment') });
                            }
                          }}
                          className="rounded border-slate-500 bg-slate-700 text-blue-600"
                        />
                        <span className="text-xs text-slate-400">Require acknowledgment</span>
                      </label>
                    </div>
                    
                    {ruleForm.actions.includes('require_acknowledgment') && (
                      <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                        <div className="grid grid-cols-2 gap-3">
        <div>
                            <label className="block text-xs text-slate-400 mb-1">Acknowledge within (minutes)</label>
                            <input
                              type="number"
                              value={ruleForm.escalationDelayMinutes}
                              onChange={(e) => setRuleForm({ ...ruleForm, escalationDelayMinutes: parseInt(e.target.value) || 10 })}
                              min={1}
                              max={120}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                            />
        </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Acknowledgment level</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                              defaultValue="supervisor"
                            >
                              <option value="any">Any team member</option>
                              <option value="supervisor">Supervisor or above</option>
                              <option value="manager">Site Manager only</option>
                              <option value="safety_officer">Safety Officer only</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-slate-500 bg-slate-700 text-blue-600"
                            />
                            <span className="text-xs text-slate-300">Require acknowledgment note</span>
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-slate-500 bg-slate-700 text-blue-600"
                            />
                            <span className="text-xs text-slate-300">Require corrective action plan</span>
                          </label>
                        </div>
                      </div>
                    )}
      </div>

                  {/* Escalation Workflow */}
                  <div className="p-4 bg-slate-800/80 border border-slate-700 rounded">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-amber-400 font-medium text-sm">Escalation Workflow</span>
            </div>
                      <span className="text-xs text-slate-500">If alert is not acknowledged</span>
                    </div>
                    
          <div className="space-y-4">
                      {/* Escalation Level 1 */}
                      <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                          <span className="text-sm text-white">First Escalation</span>
            </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">After (minutes)</label>
                            <input
                              type="number"
                              value={ruleForm.escalationDelayMinutes}
                              onChange={(e) => setRuleForm({ ...ruleForm, escalationDelayMinutes: parseInt(e.target.value) || 10 })}
                              min={1}
                              max={60}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                            />
          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Escalate to</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                              defaultValue="supervisor"
                            >
                              <option value="supervisor">Shift Supervisor</option>
                              <option value="site_manager">Site Manager</option>
                              <option value="safety_officer">Safety Officer</option>
                              <option value="regional_manager">Regional Manager</option>
                            </select>
        </div>
            </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {['send_email', 'send_sms', 'push_notification'].map((action) => (
                            <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ruleForm.escalationActions.includes(action)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRuleForm({ ...ruleForm, escalationActions: [...ruleForm.escalationActions, action] });
                                  } else {
                                    setRuleForm({ ...ruleForm, escalationActions: ruleForm.escalationActions.filter(a => a !== action) });
                                  }
                                }}
                                className="rounded border-slate-500 bg-slate-600 text-amber-500 w-3.5 h-3.5"
                              />
                              <span className="text-xs text-slate-300 capitalize">{action.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
          </div>
        </div>

                      {/* Escalation Level 2 */}
                      <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold">2</span>
                          <span className="text-sm text-white">Final Escalation</span>
      </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">After additional (minutes)</label>
                            <input
                              type="number"
                              defaultValue={15}
                              min={5}
                              max={120}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                            />
                </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Escalate to</label>
                            <select
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded text-sm"
                              defaultValue="safety_manager"
                            >
                              <option value="safety_manager">Safety Manager</option>
                              <option value="operations_director">Operations Director</option>
                              <option value="regional_safety">Regional Safety Team</option>
                            </select>
      </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-slate-500 bg-slate-600 text-red-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs text-slate-300">Create incident report</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-slate-500 bg-slate-600 text-red-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs text-slate-300">Log to compliance</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Alert Content</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={ruleForm.alertTitle}
                        onChange={(e) => setRuleForm({ ...ruleForm, alertTitle: e.target.value })}
                        placeholder="Alert title (e.g., PPE Violation Detected)"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <textarea
                        value={ruleForm.alertMessage}
                        onChange={(e) => setRuleForm({ ...ruleForm, alertMessage: e.target.value })}
                        placeholder="Alert message. Use variables: {camera_name}, {zone}, {timestamp}, {confidence}"
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded"
                      />
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ruleForm.includeSnapshot}
                            onChange={(e) => setRuleForm({ ...ruleForm, includeSnapshot: e.target.checked })}
                            className="rounded border-slate-500 bg-slate-700 text-blue-600"
                          />
                          <span className="text-slate-300">Include snapshot</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ruleForm.includeVideoClip}
                            onChange={(e) => setRuleForm({ ...ruleForm, includeVideoClip: e.target.checked })}
                            className="rounded border-slate-500 bg-slate-700 text-blue-600"
                          />
                          <span className="text-slate-300">Include 5s video clip</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ruleForm.blurFaces}
                            onChange={(e) => setRuleForm({ ...ruleForm, blurFaces: e.target.checked })}
                            className="rounded border-slate-500 bg-slate-700 text-blue-600"
                          />
                          <span className="text-slate-300">Blur faces (privacy)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center shrink-0">
              <button
                onClick={() => ruleStep > 1 && setRuleStep(ruleStep - 1)}
                disabled={ruleStep === 1}
                className="px-4 py-2 border border-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded transition-colors"
              >
                ← Back
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCreateRuleModal(false); resetRuleForm(); }}
                  className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
                >
                  Cancel
                </button>
                {ruleStep < 5 ? (
                  <button
                    onClick={() => setRuleStep(ruleStep + 1)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleCreateRule}
                    disabled={creatingRule || !ruleForm.name || ruleForm.conditions.length === 0}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                  >
                    {creatingRule ? 'Creating...' : '✓ Create Rule'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();

  if (!currentSite) {
  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
          <p className="text-slate-400">Select a worksite to generate reports.</p>
            </div>
          </div>
    );
  }

  const reportTypes: { id: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance' | 'custom'; name: string; description: string }[] = [
    { id: 'daily', name: 'Daily Summary', description: 'Activity and alerts from today' },
    { id: 'weekly', name: 'Weekly Report', description: 'Trends and analysis for the past 7 days' },
    { id: 'monthly', name: 'Monthly Compliance', description: 'Audit-ready monthly report' },
    { id: 'incident', name: 'Incident Report', description: 'Detailed incident logs and evidence' },
    { id: 'compliance', name: 'Compliance Report', description: 'Regulatory compliance documentation' },
    { id: 'custom', name: 'Custom Report', description: 'Build your own report' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">{currentSite.name}</p>
        </div>
        <ExportButton 
          siteId={currentSite.id}
          siteName={currentSite.name}
          variant="primary"
        />
      </div>
      
      {/* Report Types Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Report Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {reportTypes.map((report) => (
              <tr key={report.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{report.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{report.description}</td>
                <td className="px-6 py-4">
                  {report.id === 'custom' ? (
                    <button 
                      onClick={() => router.push(`/dashboard/analytics${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
                      className="px-4 py-1.5 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
                    >
                      Build
                    </button>
                  ) : (
          <ExportButton 
            siteId={currentSite.id}
            siteName={currentSite.name}
            variant="outline"
            size="sm"
                      reportType={report.id}
                      reportTitle={report.name}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
  );
}

function WorkflowsPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Debug logging
  useEffect(() => {
    console.log('[WorkflowsPage] currentSite:', currentSite);
    console.log('[WorkflowsPage] worksiteParam:', worksiteParam);
  }, [currentSite, worksiteParam]);

  useEffect(() => {
    if (currentSite?.id) {
      fetchWorkflows();
    }
  }, [currentSite?.id]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workflows?worksiteId=${currentSite.id}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error('[Workflows] Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });

      if (response.ok) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error('[Workflows] Error toggling workflow:', error);
    }
  };
  
  if (!currentSite) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Workflows</h1>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
          <p className="text-slate-400">Select a worksite to manage workflows.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Workflows</h1>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
          <p className="text-slate-400">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
      <div>
          <h1 className="text-2xl font-semibold text-white">Workflow Automation</h1>
          <p className="text-sm text-slate-400 mt-1">{currentSite.name} • {workflows.length} workflows configured</p>
      </div>
          <button 
          onClick={() => {
            const siteId = currentSite?.id || worksiteParam;
            console.log('[Create Workflow] currentSite:', currentSite);
            console.log('[Create Workflow] worksiteParam:', worksiteParam);
            console.log('[Create Workflow] siteId:', siteId);
            if (siteId) {
              const url = `/dashboard/workflow-builder?worksite=${siteId}`;
              console.log('[Create Workflow] Navigating to:', url);
              router.push(url);
            } else {
              alert('No worksite selected - currentSite: ' + JSON.stringify(currentSite?.id) + ', param: ' + worksiteParam);
            }
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
          Create Workflow
          </button>
        </div>

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-300 mb-1">Automated Safety Workflows</h4>
            <p className="text-xs text-blue-200/80">
              These workflows automatically process alerts, send notifications, and escalate incidents. 
              They run in the background to ensure timely response to safety events.
            </p>
          </div>
        </div>
        </div>

      {/* Workflows Table */}
      {workflows.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-white font-medium mb-2">No Workflows Configured</p>
          <p className="text-slate-400 text-sm">Default workflows will be auto-provisioned when the first alert is created.</p>
        </div>
      ) : (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Workflow</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Trigger</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Last Run</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {workflows.map((workflow) => (
              <tr key={workflow.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{workflow.name}</p>
                    {workflow.description && (
                      <p className="text-xs text-slate-500 mt-1">{workflow.description}</p>
                    )}
                </td>
                <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                      {workflow.type.replace(/_/g, ' ')}
                  </span>
                </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {workflow.triggerType === 'scheduled' && workflow.triggerConfig?.schedule ? (
                      <span className="font-mono text-xs">{workflow.triggerConfig.schedule}</span>
                    ) : (
                      workflow.triggerType.replace(/_/g, ' ')
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border cursor-pointer ${
                        workflow.enabled 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20'
                      }`}
                    >
                      {workflow.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {workflow.lastRunAt 
                      ? new Date(workflow.lastRunAt).toLocaleString()
                      : 'Never'}
                  </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {workflow.createdBy === 'system' ? (
                      <span className="px-3 py-1 bg-slate-700/50 text-slate-400 text-xs font-medium rounded cursor-not-allowed">
                        Read-Only
                      </span>
                    ) : (
                      <button 
                        onClick={() => alert('Edit functionality coming soon')}
                        className="px-3 py-1 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded"
                      >
                      Edit
                    </button>
                    )}
                    <button 
                      onClick={() => alert('Test run functionality coming soon')}
                      className="px-3 py-1 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded"
                    >
                      Test
          </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {/* Workflow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-lg p-4">
          <p className="text-emerald-400 text-xs font-semibold uppercase mb-1">Active Workflows</p>
          <p className="text-3xl font-bold text-white">{workflows.filter(w => w.enabled).length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-lg p-4">
          <p className="text-blue-400 text-xs font-semibold uppercase mb-1">Total Executions</p>
          <p className="text-3xl font-bold text-white">{workflows.reduce((sum, w) => sum + (w._count?.executions || 0), 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-lg p-4">
          <p className="text-purple-400 text-xs font-semibold uppercase mb-1">Escalation Chains</p>
          <p className="text-3xl font-bold text-white">1</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/30 rounded-lg p-4">
          <p className="text-amber-400 text-xs font-semibold uppercase mb-1">Auto-Reports</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
          onClick={() => router.push(`/dashboard/alert-rules${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
          className="p-4 bg-slate-800/50 border border-slate-700/50 rounded hover:border-slate-600 transition-colors text-left group"
          >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Alert Rules</p>
              <p className="text-xs text-slate-400 mt-1">Configure detection rules & thresholds</p>
            </div>
            <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          </button>
          <button 
            onClick={() => router.push(`/dashboard/sms-notifications${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
          className="p-4 bg-slate-800/50 border border-slate-700/50 rounded hover:border-slate-600 transition-colors text-left group"
          >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Notification Settings</p>
              <p className="text-xs text-slate-400 mt-1">SMS & email contacts</p>
            </div>
            <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          </button>
          <button 
          onClick={() => router.push(`/dashboard/reports${currentSite?.id ? `?worksite=${currentSite.id}` : ''}`)}
          className="p-4 bg-slate-800/50 border border-slate-700/50 rounded hover:border-slate-600 transition-colors text-left group"
          >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Incident Reports</p>
              <p className="text-xs text-slate-400 mt-1">View auto-generated reports</p>
            </div>
            <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          </button>
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
    console.log('Saving user settings:', formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Settings saved successfully
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-white">Profile</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="block w-full border border-slate-600 bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="block w-full border border-slate-600 bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <input
              type="text"
              className="block w-full border border-slate-600 bg-slate-900 text-slate-500 rounded px-3 py-2 text-sm cursor-not-allowed"
              defaultValue={currentUser?.role || 'User'}
              disabled
            />
            <p className="text-xs text-slate-500 mt-1">Contact an administrator to change your role</p>
          </div>
          <div className="pt-2 flex gap-3">
            <button 
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              Save Changes
            </button>
            <button 
              onClick={() => setFormData({ name: currentUser?.name || '', email: currentUser?.email || '' })}
              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-sm font-medium text-white">Notifications</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Email Notifications</p>
              <p className="text-xs text-slate-400">Receive alerts via email</p>
            </div>
            <button className="w-10 h-5 bg-blue-600 rounded-sm relative">
              <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-sm" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">SMS Notifications</p>
              <p className="text-xs text-slate-400">Receive alerts via SMS</p>
            </div>
            <button className="w-10 h-5 bg-slate-600 rounded-sm relative">
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-800/50 border border-red-500/30 rounded">
        <div className="px-6 py-4 border-b border-red-500/30">
          <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Delete Account</p>
              <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-sm font-medium rounded transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertRulesPage({ currentSite }: { currentSite: any }) {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSite?.id) {
      setLoading(true);
      console.log('[AlertRulesPage] Fetching rules for worksite:', currentSite.id, 'worksite name:', currentSite.name);
      fetch(`/api/custom-rules?worksiteId=${currentSite.id}`)
        .then(res => {
          console.log('[AlertRulesPage] Response status:', res.status);
          if (!res.ok) {
            return res.json().then(err => {
              console.error('[AlertRulesPage] API error:', err);
              throw new Error(err.error || 'Failed to fetch rules');
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('[AlertRulesPage] API response:', data);
          const allRules = Array.isArray(data) ? data : (data.data || []);
          console.log('[AlertRulesPage] All rules received:', allRules.length);
          console.log('[AlertRulesPage] Rules details:', allRules.map((r: any) => ({
            id: r.id,
            name: r.name,
            worksiteId: r.worksiteId,
            worksiteName: r.worksite?.name
          })));
          // Filter to ensure only rules for this worksite
          const filteredRules = allRules.filter((rule: any) => {
            const matches = rule.worksiteId === currentSite.id;
            if (!matches) {
              console.log('[AlertRulesPage] Rule filtered out:', {
                ruleId: rule.id,
                ruleName: rule.name,
                ruleWorksiteId: rule.worksiteId,
                expectedWorksiteId: currentSite.id,
                worksiteName: rule.worksite?.name
              });
            }
            return matches;
          });
          console.log('[AlertRulesPage] Filtered rules count:', filteredRules.length);
          setRules(filteredRules);
        })
        .catch((err) => {
          console.error('[AlertRulesPage] Error fetching rules:', err);
          setRules([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentSite?.id]);

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive: !isActive } : r));
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await fetch(`/api/custom-rules/${ruleId}`, { method: 'DELETE' });
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  if (!currentSite) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Alert Rules</h1>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded p-8 text-center">
          <p className="text-slate-400">Select a worksite to view alert rules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Alert Rules</h1>
          <p className="text-sm text-slate-400 mt-1">{currentSite.name}</p>
        </div>
        <button 
          onClick={() => router.push(`/dashboard/alert-builder?worksite=${currentSite.id}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Create Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Rule</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Severity</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-slate-700/60 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No rules found. Create your first rule to get started.</td></tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{rule.name}</p>
                    <p className="text-xs text-slate-400">{rule.description || 'No description'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{rule.ruleType || 'Detection'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${
                      rule.severity === 'critical' || rule.severity === 'high' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : rule.severity === 'medium'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                      {rule.severity || 'Low'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${
                        rule.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => router.push(`/dashboard/alert-builder?edit=${rule.id}&worksite=${currentSite.id}`)}
                        className="px-3 py-1 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-3 py-1 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-medium rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// AUDIT PAGE COMPONENT
// ============================================
function AuditPage({ currentSite, currentUser }: { currentSite: any; currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'cameras' | 'users' | 'rules' | 'integrations' | 'system'>('alerts');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    search: '',
    from: '',
    to: '',
    userId: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const tabs = [
    { key: 'alerts', label: 'Alerts Activity', entity: 'ALERT' },
    { key: 'cameras', label: 'Camera Activity', entity: 'CAMERA' },
    { key: 'users', label: 'User Activity', entity: 'USER' },
    { key: 'rules', label: 'Rules & Settings', entity: 'RULE' },
    { key: 'integrations', label: 'Integrations & API', entity: 'INTEGRATION' },
    { key: 'system', label: 'System Events', entity: 'SYSTEM' },
  ];

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      const params = new URLSearchParams({
        entity: currentTab?.entity || 'ALERT',
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (currentSite?.id) params.append('worksiteId', currentSite.id);
      if (filters.search) params.append('search', filters.search);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setAuditLogs(data.data || []);
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0, totalPages: data.pagination?.totalPages || 0 }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, currentSite?.id, filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setExportLoading(true);
    try {
      const currentTab = tabs.find(t => t.key === activeTab);
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters: {
            objectTypes: [currentTab?.entity],
            projects: currentSite?.id ? [currentSite.id] : undefined,
          },
          range: {
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
        }),
      });

      if (format === 'csv' || format === 'json') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_${activeTab}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const data = await response.json();
        console.log('PDF data:', data);
        alert('PDF export prepared. Check console for data.');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export audit logs');
    } finally {
      setExportLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('SUCCESS')) return 'text-emerald-400';
    if (action.includes('DELETED') || action.includes('REMOVED') || action.includes('FAILED')) return 'text-red-400';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'text-blue-400';
    if (action.includes('ACKNOWLEDGED') || action.includes('RESOLVED')) return 'text-amber-400';
    return 'text-slate-400';
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      WARNING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
      CRITICAL: 'bg-red-600/30 text-red-300 border-red-600/40',
    };
    return colors[severity] || colors.INFO;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track all system activity and changes • {currentSite?.name || 'All Sites'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <button
              onClick={() => {}}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg border border-slate-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 hidden group-hover:block">
              <button onClick={() => handleExport('csv')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">CSV</button>
              <button onClick={() => handleExport('json')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">JSON</button>
              <button onClick={() => handleExport('pdf')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700/50">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-blue-400 border-blue-500'
                  : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search events..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
          className="bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
          className="bg-slate-800/50 border border-slate-700/50 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <div className="flex space-x-2">
          <button
            onClick={() => fetchAuditLogs()}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({ search: '', from: '', to: '', userId: '' });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2.5 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-slate-500">Export:</span>
        <button
          onClick={() => handleExport('csv')}
          disabled={exportLoading}
          className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded border border-slate-600/50 transition-colors disabled:opacity-50"
        >
          CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={exportLoading}
          className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded border border-slate-600/50 transition-colors disabled:opacity-50"
        >
          JSON
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exportLoading}
          className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded border border-slate-600/50 transition-colors disabled:opacity-50"
        >
          PDF
        </button>
        {exportLoading && <span className="text-xs text-slate-500">Exporting...</span>}
      </div>

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4">
            <AuditLogSkeleton />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchAuditLogs} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
              Retry
            </button>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-400">No audit events found</p>
            <p className="text-sm text-slate-500 mt-1">Activity will appear here as actions are performed</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Object</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{formatTimestamp(log.createdAt)}</div>
                    <div className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{log.user?.name || 'SYSTEM'}</div>
                    <div className="text-xs text-slate-500">{log.user?.email || 'Automated'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{log.entityName || log.entityId || '—'}</div>
                    <div className="text-xs text-slate-500">{log.entity}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${getSeverityBadge(log.severity)}`}>
                      {log.severity || 'INFO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-400 max-w-xs truncate">
                      {log.details?.notes || log.details?.reason || JSON.stringify(log.changes?.new || {}).slice(0, 50)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedEvent(log)}
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded border border-slate-600/50 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium rounded border border-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium rounded border border-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">Event Details</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Header */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-lg font-semibold ${getActionColor(selectedEvent.action)}`}>
                      {selectedEvent.action.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm text-slate-400 mt-1">{selectedEvent.entity}</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded border ${getSeverityBadge(selectedEvent.severity)}`}>
                    {selectedEvent.severity || 'INFO'}
                  </span>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Timestamp</h3>
                <p className="text-white">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
                <p className="text-sm text-slate-500">{formatTimestamp(selectedEvent.createdAt)}</p>
              </div>

              {/* User */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Performed By</h3>
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <p className="text-white font-medium">{selectedEvent.user?.name || 'SYSTEM'}</p>
                  <p className="text-sm text-slate-400">{selectedEvent.user?.email || 'Automated action'}</p>
                  {selectedEvent.user?.role && (
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-700 text-slate-300 mt-1">
                      {selectedEvent.user.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Object */}
              {selectedEvent.entityName && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Affected Object</h3>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-white font-medium">{selectedEvent.entityName}</p>
                    <p className="text-sm text-slate-500">ID: {selectedEvent.entityId || '—'}</p>
                  </div>
                </div>
              )}

              {/* Worksite */}
              {selectedEvent.worksite && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Worksite</h3>
                  <p className="text-white">{selectedEvent.worksite.name}</p>
                </div>
              )}

              {/* Changes */}
              {selectedEvent.changes && (Object.keys(selectedEvent.changes.old || {}).length > 0 || Object.keys(selectedEvent.changes.new || {}).length > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Changes</h3>
                  <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 gap-px bg-slate-700/50">
                      <div className="bg-slate-800/50 p-3">
                        <p className="text-xs font-semibold text-red-400 mb-2">Before</p>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                          {JSON.stringify(selectedEvent.changes.old || {}, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-slate-800/50 p-3">
                        <p className="text-xs font-semibold text-emerald-400 mb-2">After</p>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                          {JSON.stringify(selectedEvent.changes.new || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Additional Details</h3>
                  <pre className="bg-slate-800/30 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Request Metadata</h3>
                <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">IP Address</span>
                    <span className="text-sm text-slate-300 font-mono">{selectedEvent.ipAddress || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">User Agent</span>
                    <span className="text-sm text-slate-300 truncate max-w-[200px]" title={selectedEvent.userAgent}>
                      {selectedEvent.userAgent || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Result</span>
                    <span className={`text-sm font-medium ${selectedEvent.result === 'SUCCESS' ? 'text-emerald-400' : selectedEvent.result === 'FAILURE' ? 'text-red-400' : 'text-slate-300'}`}>
                      {selectedEvent.result || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw JSON */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Raw Event Data (Debug)</h3>
                <pre className="bg-slate-800/30 rounded-lg p-4 text-xs text-slate-400 whitespace-pre-wrap overflow-x-auto max-h-64">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}