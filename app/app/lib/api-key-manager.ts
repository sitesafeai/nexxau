import { prisma } from './prisma';
import crypto from 'crypto';

export interface ApiKeyPermissions {
  read: string[];
  write: string[];
  admin: string[];
}

export interface CreateApiKeyData {
  name: string;
  userId: string;
  permissions: ApiKeyPermissions;
  rateLimit?: number;
  expiresAt?: Date;
}

export interface ApiKeyUsage {
  requestCount: number;
  lastRequestAt: Date | null;
  rateLimit: number;
  isActive: boolean;
}

export class ApiKeyManager {
  /**
   * Generate a new API key
   */
  static generateApiKey(): string {
    const prefix = 'nx_';
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('hex');
    return `${prefix}${key}`;
  }

  /**
   * Create a new API key
   */
  static async createApiKey(data: CreateApiKeyData) {
    const key = this.generateApiKey();
    
    return await prisma.apiKey.create({
      data: {
        name: data.name,
        key,
        userId: data.userId,
        permissions: data.permissions,
        rateLimit: data.rateLimit || 1000,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Validate an API key
   */
  static async validateApiKey(key: string): Promise<{
    isValid: boolean;
    apiKey?: any;
    user?: any;
  }> {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { key },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActivated: true,
              approved: true,
            },
          },
        },
      });

      if (!apiKey) {
        return { isValid: false };
      }

      // Check if key is active
      if (!apiKey.isActive) {
        return { isValid: false };
      }

      // Check if key has expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return { isValid: false };
      }

      // Check if user is active
      if (!apiKey.user.isActivated || !apiKey.user.approved) {
        return { isValid: false };
      }

      return {
        isValid: true,
        apiKey,
        user: apiKey.user,
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { isValid: false };
    }
  }

  /**
   * Check if API key has permission for a specific action
   */
  static hasPermission(apiKey: any, action: string, resource: string): boolean {
    const permissions = apiKey.permissions as ApiKeyPermissions;
    
    // Admin permissions override everything
    if (permissions.admin.includes('*') || permissions.admin.includes(resource)) {
      return true;
    }

    // Check specific permissions
    if (action === 'read') {
      return permissions.read.includes('*') || permissions.read.includes(resource);
    }
    
    if (action === 'write') {
      return permissions.write.includes('*') || permissions.write.includes(resource);
    }

    return false;
  }

  /**
   * Update API key usage
   */
  static async updateUsage(key: string) {
    try {
      await prisma.apiKey.update({
        where: { key },
        data: {
          requestCount: { increment: 1 },
          lastRequestAt: new Date(),
          lastUsed: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating API key usage:', error);
    }
  }

  /**
   * Check rate limit for API key
   */
  static async checkRateLimit(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { key },
        select: {
          requestCount: true,
          rateLimit: true,
          lastRequestAt: true,
        },
      });

      if (!apiKey) {
        return { allowed: false, remaining: 0, resetTime: new Date() };
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Reset counter if last request was more than an hour ago
      if (!apiKey.lastRequestAt || apiKey.lastRequestAt < oneHourAgo) {
        await prisma.apiKey.update({
          where: { key },
          data: { requestCount: 1, lastRequestAt: now },
        });
        return {
          allowed: true,
          remaining: apiKey.rateLimit - 1,
          resetTime: new Date(now.getTime() + 60 * 60 * 1000),
        };
      }

      const remaining = Math.max(0, apiKey.rateLimit - apiKey.requestCount);
      const allowed = apiKey.requestCount < apiKey.rateLimit;

      return {
        allowed,
        remaining,
        resetTime: new Date(apiKey.lastRequestAt.getTime() + 60 * 60 * 1000),
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }
  }

  /**
   * Get API keys for a user
   */
  static async getUserApiKeys(userId: string) {
    return await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        lastUsed: true,
        expiresAt: true,
        requestCount: true,
        lastRequestAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(keyId: string, userId: string) {
    return await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Regenerate an API key
   */
  static async regenerateApiKey(keyId: string, userId: string) {
    const newKey = this.generateApiKey();
    
    return await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
      },
      data: {
        key: newKey,
        requestCount: 0,
        lastRequestAt: null,
        lastUsed: null,
      },
    });
  }

  /**
   * Get API key usage statistics
   */
  static async getUsageStats(userId: string) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        name: true,
        requestCount: true,
        lastRequestAt: true,
        rateLimit: true,
        isActive: true,
      },
    });

    const totalRequests = apiKeys.reduce((sum, key) => sum + key.requestCount, 0);
    const activeKeys = apiKeys.filter(key => key.isActive).length;
    const totalRateLimit = apiKeys.reduce((sum, key) => sum + key.rateLimit, 0);

    return {
      totalKeys: apiKeys.length,
      activeKeys,
      totalRequests,
      totalRateLimit,
      keys: apiKeys,
    };
  }
}
