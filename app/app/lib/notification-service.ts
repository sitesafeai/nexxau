import { prisma } from './prisma';

export interface NotificationData {
  title: string;
  message: string;
  type: 'ALERT' | 'SYSTEM' | 'SECURITY' | 'MAINTENANCE' | 'WORKFLOW' | 'CUSTOM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: any;
}

export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async createNotification(
    userId: string,
    data: NotificationData
  ): Promise<any> {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(
    userIds: string[],
    data: NotificationData
  ): Promise<any[]> {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        metadata: data.metadata,
      }));

      return await prisma.notification.createMany({
        data: notifications,
      });
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Create notification for all users in a worksite
   */
  static async createWorksiteNotification(
    worksiteId: string,
    data: NotificationData
  ): Promise<any[]> {
    try {
      // Get all users in the worksite
      const users = await prisma.user.findMany({
        where: { worksiteId },
        select: { id: true },
      });

      const userIds = users.map(user => user.id);
      return await this.createBulkNotifications(userIds, data);
    } catch (error) {
      console.error('Error creating worksite notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for all users in a company
   */
  static async createCompanyNotification(
    companyId: string,
    data: NotificationData
  ): Promise<any[]> {
    try {
      // Get all users in the company
      const users = await prisma.user.findMany({
        where: { companyId },
        select: { id: true },
      });

      const userIds = users.map(user => user.id);
      return await this.createBulkNotifications(userIds, data);
    } catch (error) {
      console.error('Error creating company notification:', error);
      throw error;
    }
  }

  /**
   * Create alert notification
   */
  static async createAlertNotification(
    userId: string,
    alert: any,
    severity: string
  ): Promise<any> {
    const priority = severity === 'CRITICAL' || severity === 'EMERGENCY' ? 'URGENT' : 'HIGH';
    
    return await this.createNotification(userId, {
      title: `Safety Alert: ${alert.title}`,
      message: alert.description,
      type: 'ALERT',
      priority,
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
        location: alert.location,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Create system notification
   */
  static async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
  ): Promise<any> {
    return await this.createNotification(userId, {
      title,
      message,
      type: 'SYSTEM',
      priority,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Create security notification
   */
  static async createSecurityNotification(
    userId: string,
    title: string,
    message: string,
    details: any
  ): Promise<any> {
    return await this.createNotification(userId, {
      title,
      message,
      type: 'SECURITY',
      priority: 'HIGH',
      metadata: {
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Create maintenance notification
   */
  static async createMaintenanceNotification(
    userId: string,
    title: string,
    message: string,
    scheduledTime?: Date
  ): Promise<any> {
    return await this.createNotification(userId, {
      title,
      message,
      type: 'MAINTENANCE',
      priority: 'MEDIUM',
      metadata: {
        scheduledTime: scheduledTime?.toISOString(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      return await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<any> {
    try {
      return await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<any> {
    try {
      return await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId,
        },
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId: string) {
    try {
      const [total, unread, byType, byPriority] = await Promise.all([
        prisma.notification.count({
          where: { userId },
        }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true },
        }),
        prisma.notification.groupBy({
          by: ['priority'],
          where: { userId },
          _count: { priority: true },
        }),
      ]);

      return {
        total,
        unread,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.priority;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true,
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}
