import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

// Mock Prisma
jest.mock('./app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    camera: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    detection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    alert: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

// Mock Sentry
jest.mock('./app/lib/sentry', () => ({
  errorTracker: {
    trackAPIError: jest.fn(),
    trackDatabaseError: jest.fn(),
    trackAIDetectionError: jest.fn(),
    trackAuthError: jest.fn(),
    trackSecurityEvent: jest.fn(),
    trackPerformanceIssue: jest.fn(),
    trackBusinessMetric: jest.fn(),
    setUserContext: jest.fn(),
    setCustomContext: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
  Sentry: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setUser: jest.fn(), setContext: jest.fn(), setLevel: jest.fn() })),
    setUser: jest.fn(),
    setContext: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}))

// Mock metrics
jest.mock('./app/lib/metrics', () => ({
  metricsCollector: {
    recordHttpRequest: jest.fn(),
    recordDatabaseOperation: jest.fn(),
    recordAIDetection: jest.fn(),
    recordUserActivity: jest.fn(),
    recordAlert: jest.fn(),
    recordSafetyViolation: jest.fn(),
    recordError: jest.fn(),
    recordBusinessMetric: jest.fn(),
    updateSystemMetrics: jest.fn(),
    getMetrics: jest.fn().mockResolvedValue('# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1\n'),
  },
  metrics: {
    httpRequestsTotal: {
      inc: jest.fn(),
      get: jest.fn().mockReturnValue({ values: [] }),
    },
    rateLimitRejections: {
      inc: jest.fn(),
      get: jest.fn().mockReturnValue({ values: [] }),
    },
    httpRequestDuration: { observe: jest.fn() },
    databaseConnections: { set: jest.fn() },
    databaseQueryDuration: { observe: jest.fn() },
    databaseErrors: { inc: jest.fn() },
    aiDetectionRequests: { inc: jest.fn() },
    aiDetectionDuration: { observe: jest.fn() },
    aiDetectionAccuracy: { set: jest.fn() },
    cameraStreamsActive: { set: jest.fn() },
    cameraStreamHealth: { set: jest.fn() },
    userSessions: { set: jest.fn() },
    userLogins: { inc: jest.fn() },
    userActions: { inc: jest.fn() },
    alertsGenerated: { inc: jest.fn() },
    alertsResolved: { inc: jest.fn() },
    memoryUsage: { set: jest.fn() },
    cpuUsage: { set: jest.fn() },
    detectionsPerHour: { set: jest.fn() },
    safetyViolations: { inc: jest.fn() },
    apiResponseTime: { observe: jest.fn() },
    errorsTotal: { inc: jest.fn() },
    featureUsage: { inc: jest.fn() },
  },
}))

// Mock logger
jest.mock('./app/lib/logger', () => ({
  appLogger: {
    logHttpRequest: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logAIDetection: jest.fn(),
    logUserActivity: jest.fn(),
    logSecurityEvent: jest.fn(),
    logAlert: jest.fn(),
    logError: jest.fn(),
    logPerformance: jest.fn(),
    logBusinessMetric: jest.fn(),
    logSystemHealth: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock monitoring middleware
jest.mock('./app/lib/monitoring-middleware', () => ({
  monitoringMiddleware: {
    createContext: jest.fn(),
    recordRequest: jest.fn(),
    recordDatabaseOperation: jest.fn(),
    recordAIDetection: jest.fn(),
    recordUserActivity: jest.fn(),
    recordSecurityEvent: jest.fn(),
    recordAlert: jest.fn(),
    recordSafetyViolation: jest.fn(),
    recordError: jest.fn(),
    recordBusinessMetric: jest.fn(),
    recordSystemHealth: jest.fn(),
  },
}))

// Mock alerting system
jest.mock('./app/lib/alerting', () => ({
  alertingSystem: {
    acknowledgeAlert: jest.fn(),
    resolveAlert: jest.fn(),
    getActiveAlerts: jest.fn().mockReturnValue([]),
    getAlertStatistics: jest.fn().mockReturnValue({
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      last24Hours: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    }),
  },
}))

// Mock JWT manager
jest.mock('./app/lib/jwt', () => ({
  jwtManager: {
    generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    verifyAccessToken: jest.fn().mockReturnValue({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      worksiteId: 'test-worksite-id',
      companyId: 'test-company-id',
    }),
    verifyRefreshToken: jest.fn().mockReturnValue({
      userId: 'test-user-id',
      tokenVersion: 1,
    }),
    extractTokenFromRequest: jest.fn().mockReturnValue('mock-token'),
    isTokenExpired: jest.fn().mockReturnValue(false),
    getTokenExpiration: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
  },
}))

// Mock RBAC
jest.mock('./app/lib/rbac', () => ({
  rbacManager: {
    hasPermission: jest.fn().mockReturnValue(true),
    canAccessResource: jest.fn().mockResolvedValue(true),
    getUserPermissions: jest.fn().mockReturnValue(['read:user', 'write:user']),
    hasAllPermissions: jest.fn().mockReturnValue(true),
    hasAnyPermission: jest.fn().mockReturnValue(true),
  },
  requirePermission: jest.fn().mockReturnValue(jest.fn()),
  requireResourceAccess: jest.fn().mockReturnValue(jest.fn()),
}))

// Mock session manager
jest.mock('./app/lib/session-manager', () => ({
  sessionManager: {
    createSession: jest.fn().mockResolvedValue({
      id: 'test-session-id',
      userId: 'test-user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    }),
    getSession: jest.fn().mockReturnValue({
      id: 'test-session-id',
      userId: 'test-user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    }),
    updateSessionActivity: jest.fn(),
    invalidateSession: jest.fn(),
    invalidateUserSessions: jest.fn(),
    getUserSessions: jest.fn().mockReturnValue([]),
    isSessionValid: jest.fn().mockReturnValue(true),
    getSessionFromRequest: jest.fn().mockReturnValue({
      id: 'test-session-id',
      userId: 'test-user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    }),
    getUserFromSession: jest.fn().mockResolvedValue({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      worksiteId: 'test-worksite-id',
      companyId: 'test-company-id',
    }),
  },
}))

// Mock MFA
jest.mock('./app/lib/mfa', () => ({
  mfaManager: {
    setupTOTP: jest.fn().mockResolvedValue({
      secret: 'test-secret',
      qrCode: 'data:image/png;base64,test',
      backupCodes: ['123456', '789012'],
    }),
    verifyTOTP: jest.fn().mockResolvedValue(true),
    enableMFA: jest.fn(),
    disableMFA: jest.fn(),
    sendSMSCode: jest.fn().mockResolvedValue('123456'),
    sendEmailCode: jest.fn().mockResolvedValue('123456'),
    verifyMFACode: jest.fn().mockResolvedValue(true),
    verifyBackupCode: jest.fn().mockResolvedValue(true),
    getUserMFAMethods: jest.fn().mockResolvedValue([]),
  },
}))

// Global test utilities
global.fetch = jest.fn()
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
