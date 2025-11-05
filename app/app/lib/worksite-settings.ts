import { prisma } from './prisma';

export interface WorksiteSettings {
  camera: {
    autoDetect: boolean;
    detectionConfidence: number;
    alertThreshold: number;
    frameRate: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    alertFrequency: string;
  };
  safety: {
    maxViolationsPerHour: number;
    autoEscalate: boolean;
    complianceThreshold: number;
  };
  user: {
    timezone: string;
    dateFormat?: string;
    language: string;
  };
}

const defaultSettings: WorksiteSettings = {
  camera: {
    autoDetect: true,
    detectionConfidence: 0.7,
    alertThreshold: 3,
    frameRate: 30
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    alertFrequency: 'immediate'
  },
  safety: {
    maxViolationsPerHour: 10,
    autoEscalate: true,
    complianceThreshold: 0.85
  },
  user: {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    language: 'en'
  }
};

// Cache for settings (refreshes every 5 minutes)
const settingsCache = new Map<string, { settings: WorksiteSettings; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track last notification time per worksite
const lastNotificationTime = new Map<string, Date>();

/**
 * Load worksite settings from database or cache
 */
export async function getWorksiteSettings(worksiteId: string): Promise<WorksiteSettings> {
  // Check cache first
  const cached = settingsCache.get(worksiteId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.settings;
  }

  try {
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      include: {
        cameraSystemConfig: true
      }
    });

    if (worksite?.cameraSystemConfig?.config) {
      const config = worksite.cameraSystemConfig.config as any;
      // Merge with defaults to ensure all fields are present
      const settings: WorksiteSettings = {
        camera: {
          ...defaultSettings.camera,
          ...(config.camera || {})
        },
        notifications: {
          ...defaultSettings.notifications,
          ...(config.notifications || {})
        },
        safety: {
          ...defaultSettings.safety,
          ...(config.safety || {})
        },
        user: {
          ...defaultSettings.user,
          ...(config.user || {})
        }
      };

      // Update cache
      settingsCache.set(worksiteId, { settings, timestamp: Date.now() });
      return settings;
    }
  } catch (error) {
    console.error('Error loading worksite settings:', error);
  }

  // Return defaults if no settings found
  return defaultSettings;
}

/**
 * Clear settings cache for a worksite (call after updating settings)
 */
export function clearWorksiteSettingsCache(worksiteId: string): void {
  settingsCache.delete(worksiteId);
}

/**
 * Clear all settings cache
 */
export function clearAllSettingsCache(): void {
  settingsCache.clear();
}

/**
 * Filter detections based on confidence threshold
 */
export function filterDetectionsByConfidence(
  detections: any[],
  confidenceThreshold: number
): any[] {
  return detections.filter(d => 
    (d.confidence || d.conf || 0) >= confidenceThreshold
  );
}

/**
 * Check if we should process detection based on autoDetect setting
 */
export function shouldProcessDetection(autoDetect: boolean): boolean {
  return autoDetect;
}

/**
 * Check if we should send notification based on settings and frequency
 */
export async function shouldSendNotification(
  settings: WorksiteSettings,
  worksiteId?: string
): Promise<boolean> {
  const { alertFrequency } = settings.notifications;

  if (alertFrequency === 'immediate') {
    if (worksiteId) {
      lastNotificationTime.set(worksiteId, new Date());
    }
    return true;
  }

  if (!worksiteId) {
    return true;
  }

  const lastTime = lastNotificationTime.get(worksiteId);
  if (!lastTime) {
    lastNotificationTime.set(worksiteId, new Date());
    return true;
  }

  const now = Date.now();
  const lastTimeMs = lastTime.getTime();
  const timeSinceLastNotification = now - lastTimeMs;

  let shouldSend = false;

  switch (alertFrequency) {
    case 'hourly':
      shouldSend = timeSinceLastNotification >= 60 * 60 * 1000; // 1 hour
      break;
    case 'daily':
      shouldSend = timeSinceLastNotification >= 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'weekly':
      shouldSend = timeSinceLastNotification >= 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    default:
      shouldSend = true;
  }

  if (shouldSend) {
    lastNotificationTime.set(worksiteId, new Date());
  }

  return shouldSend;
}

/**
 * Check if violation count exceeds hourly limit
 */
export async function checkViolationRateLimit(
  worksiteId: string,
  maxViolationsPerHour: number
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const violationCount = await prisma.safetyViolation.count({
      where: {
        worksiteId,
        detectedAt: {
          gte: oneHourAgo
        }
      }
    });

    return violationCount < maxViolationsPerHour;
  } catch (error) {
    console.error('Error checking violation rate limit:', error);
    return true; // Allow on error to avoid blocking
  }
}

