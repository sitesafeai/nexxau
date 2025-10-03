export const testConfig = {
  // Test environment configuration
  environment: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
  },

  // Test data configuration
  testData: {
    users: {
      admin: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      },
      siteManager: {
        id: 'site-manager-id',
        email: 'manager@example.com',
        name: 'Site Manager',
        role: 'site-manager',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      },
      worker: {
        id: 'worker-id',
        email: 'worker@example.com',
        name: 'Worker User',
        role: 'worker',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      },
      viewer: {
        id: 'viewer-id',
        email: 'viewer@example.com',
        name: 'Viewer User',
        role: 'viewer',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      },
    },
    cameras: {
      active: {
        id: 'camera-1',
        name: 'Test Camera 1',
        type: 'ip',
        status: 'active',
        streamUrl: 'rtsp://test-camera.com/stream',
        location: 'Test Location 1',
        ipAddress: '192.168.1.100',
        port: 554,
        username: 'admin',
        password: 'password',
        rtspPath: '/stream1',
        hlsUrl: 'http://localhost:8888/test-camera/index.m3u8',
        mediamtxPath: 'test-camera',
        worksiteId: 'test-worksite-id',
      },
      inactive: {
        id: 'camera-2',
        name: 'Test Camera 2',
        type: 'ip',
        status: 'inactive',
        streamUrl: 'rtsp://test-camera2.com/stream',
        location: 'Test Location 2',
        ipAddress: '192.168.1.101',
        port: 554,
        username: 'admin',
        password: 'password',
        rtspPath: '/stream1',
        hlsUrl: 'http://localhost:8888/test-camera2/index.m3u8',
        mediamtxPath: 'test-camera2',
        worksiteId: 'test-worksite-id',
      },
    },
    detections: {
      person: {
        id: 'detection-1',
        cameraId: 'camera-1',
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
      },
      vehicle: {
        id: 'detection-2',
        cameraId: 'camera-1',
        timestamp: new Date(),
        detections: [
          {
            class: 'vehicle',
            confidence: 0.88,
            bbox: [300, 300, 500, 400],
          },
        ],
        frameData: 'base64-encoded-image',
        frameWidth: 1920,
        frameHeight: 1080,
        metadata: {
          processingTime: 0.4,
          modelVersion: 'v1.0',
        },
      },
      safetyViolation: {
        id: 'detection-3',
        cameraId: 'camera-1',
        timestamp: new Date(),
        detections: [
          {
            class: 'person',
            confidence: 0.92,
            bbox: [150, 150, 250, 250],
            safetyViolation: true,
            violationType: 'no_helmet',
          },
        ],
        frameData: 'base64-encoded-image',
        frameWidth: 1920,
        frameHeight: 1080,
        metadata: {
          processingTime: 0.6,
          modelVersion: 'v1.0',
          safetyViolation: true,
          violationType: 'no_helmet',
        },
      },
    },
    alerts: {
      high: {
        id: 'alert-1',
        title: 'High Severity Alert',
        description: 'Critical safety violation detected',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        source: 'camera',
        location: 'Test Location 1',
        metadata: {
          cameraId: 'camera-1',
          detectionId: 'detection-3',
          violationType: 'no_helmet',
        },
      },
      medium: {
        id: 'alert-2',
        title: 'Medium Severity Alert',
        description: 'Equipment not in proper location',
        severity: 'WARNING',
        status: 'ACTIVE',
        source: 'camera',
        location: 'Test Location 1',
        metadata: {
          cameraId: 'camera-1',
          detectionId: 'detection-2',
        },
      },
      low: {
        id: 'alert-3',
        title: 'Low Severity Alert',
        description: 'Person detected in restricted area',
        severity: 'INFO',
        status: 'ACTIVE',
        source: 'camera',
        location: 'Test Location 1',
        metadata: {
          cameraId: 'camera-1',
          detectionId: 'detection-1',
        },
      },
    },
    worksites: {
      main: {
        id: 'test-worksite-id',
        name: 'Test Worksite',
        worksiteName: 'test-worksite',
        address: '123 Test Street, Test City, TC 12345',
        companyId: 'test-company-id',
        cameraSystemType: 'ip',
      },
    },
    companies: {
      main: {
        id: 'test-company-id',
        name: 'Test Company',
        companyUsername: 'testcompany',
        email: 'contact@testcompany.com',
        phone: '+1234567890',
        address: '123 Company Street, Company City, CC 12345',
      },
    },
  },

  // API endpoints configuration
  apiEndpoints: {
    auth: {
      signin: '/api/auth/signin',
      signout: '/api/auth/signout',
      refresh: '/api/auth/refresh',
      session: '/api/auth/session',
    },
    cameras: {
      list: '/api/cameras',
      create: '/api/cameras',
      get: '/api/cameras/[id]',
      update: '/api/cameras/[id]',
      delete: '/api/cameras/[id]',
    },
    detections: {
      list: '/api/detections',
      stream: '/api/yolo/detections/stream',
      analytics: '/api/analytics/detections',
    },
    alerts: {
      list: '/api/alerts',
      create: '/api/alerts',
      get: '/api/alerts/[id]',
      update: '/api/alerts/[id]',
      delete: '/api/alerts/[id]',
    },
    health: {
      check: '/api/health',
      metrics: '/api/metrics',
    },
  },

  // Test timeouts
  timeouts: {
    short: 5000,    // 5 seconds
    medium: 10000,  // 10 seconds
    long: 30000,    // 30 seconds
    veryLong: 60000, // 60 seconds
  },

  // Performance thresholds
  performance: {
    pageLoad: 3000,      // 3 seconds
    apiResponse: 1000,   // 1 second
    databaseQuery: 500,  // 500ms
    aiDetection: 2000,   // 2 seconds
  },

  // Test coverage thresholds
  coverage: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    critical: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Mock configurations
  mocks: {
    enableDatabase: true,
    enableExternalAPIs: true,
    enableFileSystem: true,
    enableNetwork: true,
  },
};
