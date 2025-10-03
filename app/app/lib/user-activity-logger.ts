import { prisma } from './prisma';

export interface ActivityLogData {
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export class UserActivityLogger {
  /**
   * Log user activity
   */
  static async logActivity(
    userId: string,
    data: ActivityLogData
  ): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location,
        },
      });
    } catch (error) {
      console.error('Error logging user activity:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log login activity
   */
  static async logLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    location?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'login',
      resource: 'auth',
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'authentication',
      },
      ipAddress,
      userAgent,
      location,
    });
  }

  /**
   * Log logout activity
   */
  static async logLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'logout',
      resource: 'auth',
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'authentication',
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log dashboard view
   */
  static async logDashboardView(
    userId: string,
    dashboardType: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'view_dashboard',
      resource: 'dashboard',
      resourceId: dashboardType,
      metadata: {
        dashboardType,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log camera view
   */
  static async logCameraView(
    userId: string,
    cameraId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'view_camera',
      resource: 'camera',
      resourceId: cameraId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log alert action
   */
  static async logAlertAction(
    userId: string,
    alertId: string,
    action: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: `alert_${action}`,
      resource: 'alert',
      resourceId: alertId,
      metadata: {
        alertAction: action,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log API key creation
   */
  static async logApiKeyCreation(
    userId: string,
    apiKeyId: string,
    apiKeyName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'create_api_key',
      resource: 'api_key',
      resourceId: apiKeyId,
      metadata: {
        apiKeyName,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log API key revocation
   */
  static async logApiKeyRevocation(
    userId: string,
    apiKeyId: string,
    apiKeyName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'revoke_api_key',
      resource: 'api_key',
      resourceId: apiKeyId,
      metadata: {
        apiKeyName,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log profile update
   */
  static async logProfileUpdate(
    userId: string,
    updatedFields: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'update_profile',
      resource: 'profile',
      resourceId: userId,
      metadata: {
        updatedFields,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    userId: string,
    eventType: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logActivity(userId, {
      action: 'security_event',
      resource: 'security',
      metadata: {
        eventType,
        details,
        timestamp: new Date().toISOString(),
        severity: 'high',
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get user activity summary
   */
  static async getActivitySummary(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        action: true,
        resource: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group activities by action
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group activities by resource
    const resourceCounts = activities.reduce((acc, activity) => {
      acc[activity.resource || 'unknown'] = (acc[activity.resource || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActivities: activities.length,
      actionCounts,
      resourceCounts,
      recentActivities: activities.slice(0, 10),
    };
  }
}
