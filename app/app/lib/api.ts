// API Service Layer - Handles both mock data and real API calls
// Set this to false in production to use real APIs
// PRODUCTION MODE: Use real API endpoints, not mock data
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'; // Only use mock if explicitly enabled

// Mock data for development
const mockSites = [
  {
    id: '1',
    name: 'Downtown Construction Site',
    address: '123 Main St, Downtown, NY',
    status: 'active',
    cameras: 8,
    alerts: 2,
    lastActivity: '2 hours ago',
    safetyScore: 85,
    managers: ['john@nexxau.com', 'sarah@nexxau.com'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Industrial Warehouse',
    address: '456 Industrial Blvd, Queens, NY',
    status: 'active',
    cameras: 12,
    alerts: 0,
    lastActivity: '1 hour ago',
    safetyScore: 92,
    managers: ['mike@nexxau.com'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: '3',
    name: 'Highway Bridge Project',
    address: '789 Bridge Rd, Brooklyn, NY',
    status: 'maintenance',
    cameras: 6,
    alerts: 1,
    lastActivity: '30 minutes ago',
    safetyScore: 78,
    managers: ['alex@nexxau.com', 'lisa@nexxau.com'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '4',
    name: 'Shopping Center Renovation',
    address: '321 Mall Ave, Bronx, NY',
    status: 'inactive',
    cameras: 4,
    alerts: 0,
    lastActivity: '1 day ago',
    safetyScore: 65,
    managers: ['david@nexxau.com'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  }
];

const mockCameras = [
  {
    id: '1',
    name: 'Main Entrance Camera',
    type: 'IP Camera',
    status: 'active',
    streamUrl: 'http://localhost:5001/video_feed',
    location: 'Main Entrance',
    ipAddress: '192.168.1.100',
    port: 554,
    worksiteId: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Construction Zone A',
    type: 'IP Camera',
    status: 'active',
    streamUrl: 'http://localhost:5001/video_feed',
    location: 'Zone A',
    ipAddress: '192.168.1.101',
    port: 554,
    worksiteId: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '3',
    name: 'Warehouse Loading Dock',
    type: 'IP Camera',
    status: 'active',
    streamUrl: 'http://localhost:5001/video_feed',
    location: 'Loading Dock',
    ipAddress: '192.168.1.200',
    port: 554,
    worksiteId: '2',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-19')
  }
];

const mockAlerts = [
  {
    id: '1',
    title: 'PPE Violation Detected',
    description: 'Worker without hard hat detected in construction zone',
    severity: 'HIGH',
    status: 'ACTIVE',
    source: 'camera',
    location: 'Zone A',
    siteId: '1',
    cameraId: '2',
    createdAt: new Date('2024-01-20T10:30:00Z'),
    updatedAt: new Date('2024-01-20T10:30:00Z'),
    metadata: {
      cameraName: 'Construction Zone A',
      workerId: 'W001',
      violationType: 'PPE_MISSING',
      confidence: 0.95
    }
  },
  {
    id: '2',
    title: 'Safety Zone Violation',
    description: 'Unauthorized personnel in restricted area',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    source: 'camera',
    location: 'Main Entrance',
    siteId: '1',
    cameraId: '1',
    createdAt: new Date('2024-01-20T09:15:00Z'),
    updatedAt: new Date('2024-01-20T09:15:00Z'),
    metadata: {
      cameraName: 'Main Entrance Camera',
      zoneType: 'RESTRICTED',
      confidence: 0.87
    }
  },
  {
    id: '3',
    title: 'Equipment Malfunction',
    description: 'Crane operation outside safety parameters',
    severity: 'HIGH',
    status: 'RESOLVED',
    source: 'sensor',
    location: 'Bridge Section',
    siteId: '3',
    cameraId: null,
    createdAt: new Date('2024-01-19T14:20:00Z'),
    updatedAt: new Date('2024-01-19T15:30:00Z'),
    resolvedAt: new Date('2024-01-19T15:30:00Z'),
    metadata: {
      equipmentType: 'CRANE',
      parameter: 'LOAD_LIMIT',
      threshold: 5000,
      actual: 5200
    }
  }
];

const mockUsers = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@nexxau.com',
    role: 'SITE_ADMIN',
    company: 'Nexxau',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@nexxau.com',
    role: 'SITE_ADMIN',
    company: 'Nexxau',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike@nexxau.com',
    role: 'COMPANY_ADMIN',
    company: 'Nexxau',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20')
  }
];

// API Service Functions
export class ApiService {
  // Generic API call wrapper
  private static async apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle API responses that wrap data in { success: true, data: ... }
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data as T;
      }
      
      return data as T;
    } catch (error) {
      console.error(`API call error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Sites/Worksites
  static async getSites(): Promise<any[]> {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockSites;
    }
    return this.apiCall('/worksites');
  }

  static async getSite(id: string): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockSites.find(site => site.id === id) || null;
    }
    return this.apiCall(`/worksites/${id}`);
  }

  static async createSite(data: any): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newSite = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockSites.push(newSite);
      return newSite;
    }
    return this.apiCall('/worksites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSite(id: string, data: any): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const siteIndex = mockSites.findIndex(site => site.id === id);
      if (siteIndex !== -1) {
        mockSites[siteIndex] = { ...mockSites[siteIndex], ...data, updatedAt: new Date() };
        return mockSites[siteIndex];
      }
      throw new Error('Site not found');
    }
    return this.apiCall(`/worksites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Cameras
  static async getCameras(siteId?: string): Promise<any[]> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400));
      if (siteId) {
        return mockCameras.filter(camera => camera.worksiteId === siteId);
      }
      return mockCameras;
    }
    const endpoint = siteId ? `/cameras?siteId=${siteId}` : '/cameras';
    return this.apiCall(endpoint);
  }

  static async getCamera(id: string): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockCameras.find(camera => camera.id === id) || null;
    }
    return this.apiCall(`/cameras/${id}`);
  }

  static async createCamera(data: any): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newCamera = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockCameras.push(newCamera);
      return newCamera;
    }
    return this.apiCall('/cameras', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alerts
  static async getAlerts(siteId?: string, status?: string): Promise<any[]> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 600));
      let filteredAlerts = mockAlerts;
      if (siteId) {
        filteredAlerts = filteredAlerts.filter(alert => alert.siteId === siteId);
      }
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
      }
      return filteredAlerts;
    }
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (status) params.append('status', status);
    const endpoint = `/alerts${params.toString() ? `?${params.toString()}` : ''}`;
    return this.apiCall(endpoint);
  }

  static async getAlert(id: string): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockAlerts.find(alert => alert.id === id) || null;
    }
    return this.apiCall(`/alerts/${id}`);
  }

  static async updateAlert(id: string, data: any): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const alertIndex = mockAlerts.findIndex(alert => alert.id === id);
      if (alertIndex !== -1) {
        mockAlerts[alertIndex] = { ...mockAlerts[alertIndex], ...data, updatedAt: new Date() };
        return mockAlerts[alertIndex];
      }
      throw new Error('Alert not found');
    }
    return this.apiCall(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Users
  static async getCurrentUser(): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockUsers[0]; // Return first user as current user
    }
    return this.apiCall('/auth/me');
  }

  static async getUsers(): Promise<any[]> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockUsers;
    }
    return this.apiCall('/users');
  }

  // Analytics/Reports
  static async getAnalytics(siteId?: string, period?: string): Promise<any> {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        totalAlerts: mockAlerts.length,
        activeAlerts: mockAlerts.filter(a => a.status === 'ACTIVE').length,
        safetyScore: 87,
        incidentsThisWeek: 3,
        incidentsThisMonth: 12,
        topViolations: [
          { type: 'PPE_MISSING', count: 8 },
          { type: 'ZONE_VIOLATION', count: 5 },
          { type: 'EQUIPMENT_MISUSE', count: 3 }
        ],
        trends: {
          daily: [12, 15, 8, 20, 14, 18, 16],
          weekly: [45, 52, 38, 61, 49, 55, 48]
        }
      };
    }
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (period) params.append('period', period);
    const endpoint = `/analytics${params.toString() ? `?${params.toString()}` : ''}`;
    return this.apiCall(endpoint);
  }
}

// Utility functions for easy switching between mock and real data
export const isUsingMockData = () => USE_MOCK_DATA;

export const setMockDataMode = (useMock: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('useMockData', useMock.toString());
  }
};

export const getMockDataMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('useMockData') === 'true';
  }
  return USE_MOCK_DATA;
}; 