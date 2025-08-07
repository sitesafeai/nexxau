'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useCurrentUser, useSites } from '../hooks/useApi';

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
      // Filter sites based on user role (simplified logic)
      const accessibleSites = allSites.filter((site: any) => {
        if (!currentUser) return false;
        
        // Admin can see all sites
        if (currentUser.role === 'admin') return true;
        
        // Site managers can see sites they manage
        if (currentUser.role === 'site-manager') {
          return site.managers?.includes(currentUser.email);
        }
        
        // Viewers can see assigned sites (simplified)
        return true;
      });
      
      dispatch({ type: 'SET_ACCESSIBLE_SITES', payload: accessibleSites });
      
      // Auto-select first site if none selected
      if (!state.selectedSiteId && accessibleSites.length > 0) {
        dispatch({ type: 'SET_SELECTED_SITE', payload: accessibleSites[0].id });
      }
    }
  }, [allSites, sitesLoading, currentUser, state.selectedSiteId]);

  // Check mock data mode on mount
  useEffect(() => {
    const isMock = localStorage.getItem('useMockData') === 'true';
    dispatch({ type: 'SET_MOCK_DATA_MODE', payload: isMock });
  }, []);

  // Helper functions
  const selectSite = (siteId: string | null) => {
    dispatch({ type: 'SET_SELECTED_SITE', payload: siteId });
  };

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
    
    // Admin has all permissions
    if (currentUser.role === 'admin') return true;
    
    // Site manager permissions
    if (currentUser.role === 'site-manager') {
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
    if (currentUser.role === 'viewer') {
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