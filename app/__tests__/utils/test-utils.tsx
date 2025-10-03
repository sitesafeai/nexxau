import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

// Mock session data
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  worksiteId: 'test-worksite-id',
  companyId: 'test-company-id',
  isActivated: true,
  approved: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCamera = (overrides = {}) => ({
  id: 'test-camera-id',
  name: 'Test Camera',
  type: 'ip',
  status: 'active',
  streamUrl: 'rtsp://test-camera.com/stream',
  location: 'Test Location',
  ipAddress: '192.168.1.100',
  port: 554,
  username: 'admin',
  password: 'password',
  rtspPath: '/stream1',
  hlsUrl: 'http://localhost:8888/test-camera/index.m3u8',
  mediamtxPath: 'test-camera',
  worksiteId: 'test-worksite-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockDetection = (overrides = {}) => ({
  id: 'test-detection-id',
  cameraId: 'test-camera-id',
  timestamp: new Date(),
  detections: [
    {
      class: 'person',
      confidence: 0.95,
      bbox: [100, 100, 200, 200],
    },
  ],
  frameData: 'base64-encoded-image',
  frameWidth: 1920,
  frameHeight: 1080,
  metadata: {
    processingTime: 0.5,
    modelVersion: 'v1.0',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 'test-alert-id',
  title: 'Test Alert',
  description: 'Test alert description',
  severity: 'WARNING',
  status: 'ACTIVE',
  source: 'camera',
  location: 'Test Location',
  metadata: {
    cameraId: 'test-camera-id',
    detectionId: 'test-detection-id',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  resolvedAt: null,
  ...overrides,
});

export const createMockWorksite = (overrides = {}) => ({
  id: 'test-worksite-id',
  name: 'Test Worksite',
  worksiteName: 'test-worksite',
  address: '123 Test Street, Test City, TC 12345',
  companyId: 'test-company-id',
  cameraSystemType: 'ip',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCompany = (overrides = {}) => ({
  id: 'test-company-id',
  name: 'Test Company',
  companyUsername: 'testcompany',
  email: 'contact@testcompany.com',
  phone: '+1234567890',
  address: '123 Company Street, Company City, CC 12345',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// API response mocks
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

// Mock fetch responses
export const mockFetch = (responses: Array<{ url: string; response: any; status?: number }>) => {
  const mockResponses = new Map();
  responses.forEach(({ url, response, status = 200 }) => {
    mockResponses.set(url, { response, status });
  });

  global.fetch = jest.fn().mockImplementation((url: string) => {
    const mockResponse = mockResponses.get(url);
    if (mockResponse) {
      return Promise.resolve(mockApiResponse(mockResponse.response, mockResponse.status));
    }
    return Promise.resolve(mockApiResponse({ error: 'Not found' }, 404));
  });
};

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: 'http://localhost:3000/api/test',
  headers: new Headers({
    'content-type': 'application/json',
    'authorization': 'Bearer test-token',
  }),
  nextUrl: new URL('http://localhost:3000/api/test'),
  ...overrides,
});

export const createMockNextRequest = (overrides = {}) => ({
  method: 'GET',
  url: 'http://localhost:3000/api/test',
  headers: new Headers({
    'content-type': 'application/json',
    'authorization': 'Bearer test-token',
  }),
  nextUrl: new URL('http://localhost:3000/api/test'),
  json: jest.fn().mockResolvedValue({}),
  ...overrides,
});

// Database mock helpers
export const mockPrismaUser = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaCamera = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaDetection = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaAlert = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
