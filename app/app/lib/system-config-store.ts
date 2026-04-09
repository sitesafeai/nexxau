export type SystemConfig = {
  general: {
    siteName: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
  };
  homeBanner: {
    enabled: boolean;
    /** Plain text shown on the public marketing home page when enabled */
    message: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    twoFactorAuth: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    webhookEnabled: boolean;
    defaultRecipients: string[];
  };
  ai: {
    detectionEnabled: boolean;
    confidenceThreshold: number;
    alertThreshold: number;
    modelVersion: string;
  };
  storage: {
    maxFileSize: number;
    retentionPeriod: number;
    backupFrequency: string;
  };
};

const defaultSystemConfig: SystemConfig = {
  general: {
    siteName: 'Nexxau Safety System',
    timezone: 'UTC',
    language: 'en',
    maintenanceMode: false,
  },
  homeBanner: {
    enabled: false,
    message: '',
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: true,
    },
    twoFactorAuth: true,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    webhookEnabled: true,
    defaultRecipients: ['admin@nexxau.com'],
  },
  ai: {
    detectionEnabled: true,
    confidenceThreshold: 75,
    alertThreshold: 85,
    modelVersion: 'v1.0.0',
  },
  storage: {
    maxFileSize: 100,
    retentionPeriod: 90,
    backupFrequency: 'daily',
  },
};

let systemConfig: SystemConfig = JSON.parse(JSON.stringify(defaultSystemConfig)) as SystemConfig;

export function getSystemConfig(): SystemConfig {
  return systemConfig;
}

/** Shallow merge at top level; merges nested `homeBanner` when provided. */
export function patchSystemConfig(body: Partial<SystemConfig>): SystemConfig {
  systemConfig = {
    ...systemConfig,
    ...body,
    homeBanner:
      body.homeBanner != null
        ? { ...systemConfig.homeBanner, ...body.homeBanner }
        : systemConfig.homeBanner,
  };
  return systemConfig;
}
