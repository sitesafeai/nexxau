import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../api';

// Generic API hook for data fetching
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    autoFetch?: boolean;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const {
    autoFetch = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData, ...dependencies]);

  // Refetch on window focus if enabled
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      if (lastFetched && (now - lastFetched) > cacheTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, lastFetched, cacheTime, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetched
  };
}

// Specific hooks for common API calls
export function useSites(siteId?: string) {
  return useApi(
    () => siteId ? ApiService.getSite(siteId) : ApiService.getSites(),
    [siteId]
  );
}

export function useCameras(siteId?: string) {
  return useApi(
    () => ApiService.getCameras(siteId),
    [siteId],
    { refetchOnWindowFocus: true }
  );
}

export function useAlerts(siteId?: string, status?: string) {
  return useApi(
    () => ApiService.getAlerts(siteId, status),
    [siteId, status],
    { refetchOnWindowFocus: true, cacheTime: 30 * 1000 } // 30 seconds for alerts
  );
}

export function useCurrentUser() {
  return useApi(
    () => ApiService.getCurrentUser(),
    [],
    { cacheTime: 10 * 60 * 1000 } // 10 minutes for user data
  );
}

export function useAnalytics(siteId?: string, period?: string) {
  return useApi(
    () => ApiService.getAnalytics(siteId, period),
    [siteId, period],
    { cacheTime: 2 * 60 * 1000 } // 2 minutes for analytics
  );
}

// Mutation hooks for data updates
export function useCreateSite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSite = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.createSite(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createSite, loading, error };
}

export function useUpdateSite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSite = useCallback(async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.updateSite(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update site');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateSite, loading, error };
}

export function useCreateCamera() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCamera = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.createCamera(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create camera');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCamera, loading, error };
}

export function useUpdateAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAlert = useCallback(async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.updateAlert(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateAlert, loading, error };
} 