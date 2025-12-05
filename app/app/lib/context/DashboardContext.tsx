'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useState } from 'react';
import { useCurrentUser, useSites } from '../hooks/useApi';
import { isAdminRole, normalizeRole } from '../roles';

// Types
interface DashboardState {
  selectedSiteId: string | null;
  currentUser: any | null;
  accessibleSites: any[];
  isUsingMockData: boolean;
  realTimeUpdates: boolean;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

type DashboardAction =
  | { type: 'SET_SELECTED_SITE'; payload: string | null }
  | { type: 'SET_CURRENT_USER'; payload: any }
  | { type: 'SET_ACCESSIBLE_SITES'; payload: any[] }
  | { type: 'SET_MOCK_DATA_MODE'; payload: boolean }
  | { type: 'SET_REAL_TIME_UPDATES'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' };

// Initial state
const initialState: DashboardState = {
  selectedSiteId: null,
  currentUser: null,
  accessibleSites: [],
  isUsingMockData: false,
  realTimeUpdates: true,
  notifications: []
};

// Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_SELECTED_SITE':
      return { ...state, selectedSiteId: action.payload };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_ACCESSIBLE_SITES':
      return { ...state, accessibleSites: action.payload };
    
    case 'SET_MOCK_DATA_MODE':
      return { ...state, isUsingMockData: action.payload };
    
    case 'SET_REAL_TIME_UPDATES':
      return { ...state, realTimeUpdates: action.payload };
    
    case 'ADD_NOTIFICATION':
      // Check if notification with same title and message already exists
      const isDuplicate = state.notifications.some(
        n => n.title === action.payload.title && n.message === action.payload.message
      );
      
      if (isDuplicate) {
        return state; // Don't add duplicate
      }
      
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 10) // Keep only last 10
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        )
      };
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return { ...state, notifications: [] };
    
    default:
      return state;
  }
}

// Context
interface DashboardContextType {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  // Helper functions
  selectSite: (siteId: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  toggleMockDataMode: () => void;
  toggleRealTimeUpdates: () => void;
  getSelectedSite: () => any | null;
  hasPermission: (permission: string) => boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider component
interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [worksiteParam, setWorksiteParam] = useState<string | null>(null);
  
  // Read worksite from URL on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const wsParam = urlParams.get('worksite');
      setWorksiteParam(wsParam);
      
      // Listen for URL changes
      const handlePopState = () => {
        const newParams = new URLSearchParams(window.location.search);
        setWorksiteParam(newParams.get('worksite'));
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);
  
  // Fetch current user
  const { data: currentUser, loading: userLoading } = useCurrentUser();
  
  // Fetch all sites
  const { data: allSites, loading: sitesLoading } = useSites();

  // Update current user when loaded
  useEffect(() => {
    if (currentUser && !userLoading) {
      dispatch({ type: 'SET_CURRENT_USER', payload: currentUser });
    }
  }, [currentUser, userLoading]);

  // Update accessible sites when loaded
  useEffect(() => {
    if (allSites && !sitesLoading) {
      // Extract sites array from API response
      const sitesArray = Array.isArray(allSites) ? allSites : (allSites as any)?.data || [];
      
      // Filter sites based on user role (simplified logic)
      const accessibleSites = sitesArray.filter((site: any) => {
        if (!currentUser) return false;
        const normalizedRole = normalizeRole(currentUser.role);

        if (isAdminRole(normalizedRole)) return true;

        if (normalizedRole === 'SITE_ADMIN') {
          return site.managers?.includes(currentUser.email);
        }

        return true;
      });
      
      // Cache sites in sessionStorage for persistence across navigation
      if (typeof window !== 'undefined' && accessibleSites.length > 0) {
        sessionStorage.setItem('dashboard_accessible_sites', JSON.stringify(accessibleSites));
      }
      
      dispatch({ type: 'SET_ACCESSIBLE_SITES', payload: accessibleSites });
      
      // Auto-select site: prioritize URL parameter, then fallback to first site
      if (!state.selectedSiteId && accessibleSites.length > 0) {
        // Check if URL has a worksite parameter
        if (worksiteParam) {
          const matchingSite = accessibleSites.find((site: any) => site.id === worksiteParam);
          if (matchingSite) {
            dispatch({ type: 'SET_SELECTED_SITE', payload: worksiteParam });
          } else {
            // URL parameter doesn't match any accessible site, select first
            dispatch({ type: 'SET_SELECTED_SITE', payload: accessibleSites[0].id });
          }
        } else {
          // No URL parameter, select first site
          dispatch({ type: 'SET_SELECTED_SITE', payload: accessibleSites[0].id });
        }
      } else if (worksiteParam && state.selectedSiteId !== worksiteParam) {
        // URL parameter changed, update selection
        const matchingSite = accessibleSites.find((site: any) => site.id === worksiteParam);
        if (matchingSite) {
          dispatch({ type: 'SET_SELECTED_SITE', payload: worksiteParam });
        }
      }
    } else if (!allSites && !sitesLoading && typeof window !== 'undefined') {
      // If API fails or is slow, try to load from cache
      const cached = sessionStorage.getItem('dashboard_accessible_sites');
      if (cached) {
        try {
          const cachedSites = JSON.parse(cached);
          console.log('[DashboardContext] Loading sites from cache:', cachedSites.length);
          dispatch({ type: 'SET_ACCESSIBLE_SITES', payload: cachedSites });
          
          // Auto-select from cache
          if (worksiteParam && cachedSites.length > 0) {
            const matchingSite = cachedSites.find((site: any) => site.id === worksiteParam);
            if (matchingSite) {
              dispatch({ type: 'SET_SELECTED_SITE', payload: worksiteParam });
            }
          }
        } catch (e) {
          console.error('[DashboardContext] Failed to parse cached sites:', e);
        }
      }
    }
  }, [allSites, sitesLoading, currentUser, worksiteParam]); // Added worksiteParam dependency

  // Check mock data mode on mount
  useEffect(() => {
    const isMock = localStorage.getItem('useMockData') === 'true';
    dispatch({ type: 'SET_MOCK_DATA_MODE', payload: isMock });
  }, []);

  // Helper functions
  const selectSite = useCallback((siteId: string | null) => {
    dispatch({ type: 'SET_SELECTED_SITE', payload: siteId });
    
    // Update URL parameter when site is selected (only if we're on dashboard)
    if (typeof window !== 'undefined' && siteId && window.location.pathname.startsWith('/dashboard')) {
      const url = new URL(window.location.href);
      url.searchParams.set('worksite', siteId);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  }, [dispatch]);

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const markNotificationRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  };

  const toggleMockDataMode = () => {
    const newMode = !state.isUsingMockData;
    localStorage.setItem('useMockData', newMode.toString());
    dispatch({ type: 'SET_MOCK_DATA_MODE', payload: newMode });
  };

  const toggleRealTimeUpdates = () => {
    dispatch({ type: 'SET_REAL_TIME_UPDATES', payload: !state.realTimeUpdates });
  };

  const getSelectedSite = () => {
    return state.accessibleSites.find(site => site.id === state.selectedSiteId) || null;
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    const normalizedRole = normalizeRole(currentUser.role);

    if (isAdminRole(normalizedRole)) return true;
    
    if (normalizedRole === 'SITE_ADMIN') {
      const siteManagerPermissions = [
        'view_site',
        'edit_site',
        'view_cameras',
        'edit_cameras',
        'view_alerts',
        'acknowledge_alerts',
        'view_reports'
      ];
      return siteManagerPermissions.includes(permission);
    }
    
    // Viewer permissions
    if (normalizedRole === 'VIEWER') {
      const viewerPermissions = [
        'view_site',
        'view_cameras',
        'view_alerts',
        'view_reports'
      ];
      return viewerPermissions.includes(permission);
    }
    
    return false;
  };

  const contextValue: DashboardContextType = {
    state,
    dispatch,
    selectSite,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications,
    toggleMockDataMode,
    toggleRealTimeUpdates,
    getSelectedSite,
    hasPermission
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook to use the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

// Hook for notifications
export function useNotifications() {
  const { state, addNotification, removeNotification, markNotificationRead, clearNotifications } = useDashboard();
  
  return {
    notifications: state.notifications,
    unreadCount: state.notifications.filter(n => !n.read).length,
    addNotification,
    removeNotification,
    markNotificationRead,
    clearNotifications
  };
}

// Hook for site management
export function useSiteManagement() {
  const { state, selectSite, getSelectedSite, hasPermission } = useDashboard();
  
  return {
    selectedSiteId: state.selectedSiteId,
    selectedSite: getSelectedSite(),
    accessibleSites: state.accessibleSites,
    selectSite,
    hasPermission
  };
} 