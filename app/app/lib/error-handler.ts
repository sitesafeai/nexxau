import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import notificationService from './notification-service';
import { broadcastSystemStatus } from './websocket';

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'validation' | 'database' | 'external' | 'system' | 'business';
  recoverable: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  id: string;
  name: string;
  description: string;
  action: () => Promise<boolean>;
  priority: number;
  autoExecute: boolean;
  conditions?: (error: any, context: ErrorContext) => boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryActions: Map<string, ErrorRecoveryAction> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTimes: Map<string, Date> = new Map();

  constructor() {
    this.initializeRecoveryActions();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private initializeRecoveryActions() {
    // Database connection recovery
    this.addRecoveryAction({
      id: 'db-reconnect',
      name: 'Database Reconnection',
      description: 'Attempt to reconnect to database',
      action: async () => {
        try {
          await prisma.$connect();
          return true;
        } catch {
          return false;
        }
      },
      priority: 1,
      autoExecute: true,
      conditions: (error) => error instanceof Prisma.PrismaClientKnownRequestError
    });

    // AI service recovery
    this.addRecoveryAction({
      id: 'ai-service-restart',
      name: 'AI Service Restart',
      description: 'Attempt to restart AI detection service',
      action: async () => {
        try {
          const response = await fetch('http://localhost:8000/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      priority: 2,
      autoExecute: false,
      conditions: (error, context) => context.category === 'external' && context.endpoint?.includes('ai')
    });

    // MediaMTX service recovery
    this.addRecoveryAction({
      id: 'mediamtx-restart',
      name: 'MediaMTX Service Restart',
      description: 'Attempt to restart MediaMTX streaming service',
      action: async () => {
        try {
          const response = await fetch('http://localhost:8889/v3/config/global/get', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      priority: 2,
      autoExecute: false,
      conditions: (error, context) => context.category === 'external' && context.endpoint?.includes('stream')
    });

    // WebSocket reconnection
    this.addRecoveryAction({
      id: 'websocket-reconnect',
      name: 'WebSocket Reconnection',
      description: 'Attempt to reconnect WebSocket connections',
      action: async () => {
        try {
          await broadcastSystemStatus({ status: 'reconnecting', timestamp: new Date().toISOString() });
          return true;
        } catch {
          return false;
        }
      },
      priority: 3,
      autoExecute: true,
      conditions: (error, context) => context.category === 'system' && context.endpoint?.includes('websocket')
    });
  }

  public addRecoveryAction(action: ErrorRecoveryAction) {
    this.recoveryActions.set(action.id, action);
  }

  public async handleError(
    error: any,
    request?: NextRequest,
    context?: Partial<ErrorContext>
  ): Promise<NextResponse> {
    const errorContext = await this.buildErrorContext(error, request, context);
    
    // Log error to database
    await this.logError(error, errorContext);
    
    // Check for recovery actions
    const recoveryResults = await this.attemptRecovery(error, errorContext);
    
    // Send notifications if critical
    if (errorContext.severity === 'critical') {
      await this.sendErrorNotifications(error, errorContext);
    }
    
    // Update error tracking
    this.updateErrorTracking(errorContext);
    
    // Return appropriate response
    return this.createErrorResponse(error, errorContext, recoveryResults);
  }

  private async buildErrorContext(
    error: any,
    request?: NextRequest,
    context?: Partial<ErrorContext>
  ): Promise<ErrorContext> {
    const session = request ? await getServerSession(authOptions) : null;
    
    return {
      userId: session?.user?.id || context?.userId,
      userRole: session?.user?.role || context?.userRole,
      ipAddress: request?.headers.get('x-forwarded-for') || 
                 request?.headers.get('x-real-ip') || 
                 context?.ipAddress,
      userAgent: request?.headers.get('user-agent') || context?.userAgent,
      endpoint: request?.url || context?.endpoint,
      method: request?.method || context?.method,
      timestamp: new Date(),
      severity: this.determineSeverity(error),
      category: this.categorizeError(error),
      recoverable: this.isRecoverable(error),
      metadata: context?.metadata
    };
  }

  private determineSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof ZodError) return 'low';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return 'medium'; // Unique constraint violation
      if (error.code === 'P2025') return 'high';   // Record not found
      return 'medium';
    }
    if (error.status === 401 || error.status === 403) return 'medium';
    if (error.status === 500) return 'high';
    if (error.message?.includes('database') || error.message?.includes('connection')) return 'critical';
    if (error.message?.includes('safety') || error.message?.includes('alert')) return 'critical';
    return 'medium';
  }

  private categorizeError(error: any): ErrorContext['category'] {
    if (error instanceof ZodError) return 'validation';
    if (error instanceof Prisma.PrismaClientKnownRequestError) return 'database';
    if (error.status === 401 || error.status === 403) return 'authentication';
    if (error.message?.includes('permission') || error.message?.includes('access')) return 'authorization';
    if (error.message?.includes('fetch') || error.message?.includes('http')) return 'external';
    if (error.message?.includes('safety') || error.message?.includes('monitoring')) return 'business';
    return 'system';
  }

  private isRecoverable(error: any): boolean {
    if (error instanceof ZodError) return true;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return !['P2002', 'P2025'].includes(error.code); // Unique constraint and not found are not recoverable
    }
    if (error.status >= 400 && error.status < 500) return false; // Client errors are not recoverable
    return true;
  }

  private async logError(error: any, context: ErrorContext) {
    try {
      await prisma.errorLog.create({
        data: {
          message: error.message || 'Unknown error',
          stack: error.stack,
          severity: context.severity,
          category: context.category,
          userId: context.userId,
          endpoint: context.endpoint,
          method: context.method,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            ...context.metadata,
            errorType: error.constructor.name,
            statusCode: error.status || error.statusCode,
            code: error.code
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private async attemptRecovery(error: any, context: ErrorContext): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [id, action] of this.recoveryActions) {
      if (action.conditions && !action.conditions(error, context)) continue;
      
      try {
        if (action.autoExecute || context.severity === 'critical') {
          results[id] = await action.action();
        }
      } catch (recoveryError) {
        console.error(`Recovery action ${id} failed:`, recoveryError);
        results[id] = false;
      }
    }
    
    return results;
  }

  private async sendErrorNotifications(error: any, context: ErrorContext) {
    try {
      const notificationData = {
        to: ['admin@nexxau.com'], // Get from config
        type: 'email' as const,
        template: 'system-status',
        data: {
          title: 'Critical System Error',
          message: `A critical error occurred in the safety monitoring system: ${error.message}`,
          status: 'error',
          severity: context.severity,
          category: context.category,
          endpoint: context.endpoint,
          timestamp: context.timestamp.toISOString(),
          metadata: context.metadata
        },
        priority: 'urgent' as const
      };

      await notificationService.sendNotification(notificationData);
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }

  private updateErrorTracking(context: ErrorContext) {
    const key = `${context.category}-${context.severity}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    this.lastErrorTimes.set(key, context.timestamp);
  }

  private createErrorResponse(
    error: any,
    context: ErrorContext,
    recoveryResults: Record<string, boolean>
  ): NextResponse {
    const isRecovered = Object.values(recoveryResults).some(result => result);
    
    const responseData = {
      error: {
        message: this.getUserFriendlyMessage(error, context),
        code: error.code || error.status || 'INTERNAL_ERROR',
        severity: context.severity,
        category: context.category,
        recoverable: context.recoverable,
        recovered: isRecovered,
        recoveryActions: recoveryResults,
        timestamp: context.timestamp.toISOString(),
        requestId: this.generateRequestId()
      }
    };

    const statusCode = this.getStatusCode(error, context);
    
    return NextResponse.json(responseData, { 
      status: statusCode,
      headers: {
        'X-Error-Severity': context.severity,
        'X-Error-Category': context.category,
        'X-Error-Recoverable': context.recoverable.toString(),
        'X-Request-ID': responseData.error.requestId
      }
    });
  }

  private getUserFriendlyMessage(error: any, context: ErrorContext): string {
    if (error instanceof ZodError) {
      return 'Invalid data provided. Please check your input and try again.';
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': return 'This record already exists. Please use a different value.';
        case 'P2025': return 'The requested record was not found.';
        default: return 'Database operation failed. Please try again.';
      }
    }
    if (error.status === 401) return 'Authentication required. Please log in.';
    if (error.status === 403) return 'Access denied. You do not have permission for this action.';
    if (error.status === 404) return 'The requested resource was not found.';
    if (error.status === 429) return 'Too many requests. Please wait before trying again.';
    if (context.severity === 'critical') return 'A critical system error occurred. Our team has been notified.';
    return 'An unexpected error occurred. Please try again later.';
  }

  private getStatusCode(error: any, context: ErrorContext): number {
    if (error.status) return error.status;
    if (error instanceof ZodError) return 400;
    if (error instanceof Prisma.PrismaClientKnownRequestError) return 400;
    if (context.severity === 'critical') return 503;
    return 500;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for manual error handling
  public async handleDatabaseError(error: any, context?: Partial<ErrorContext>) {
    return this.handleError(error, undefined, { ...context, category: 'database' });
  }

  public async handleValidationError(error: any, context?: Partial<ErrorContext>) {
    return this.handleError(error, undefined, { ...context, category: 'validation' });
  }

  public async handleExternalServiceError(error: any, service: string, context?: Partial<ErrorContext>) {
    return this.handleError(error, undefined, { 
      ...context, 
      category: 'external',
      metadata: { ...context?.metadata, service }
    });
  }

  // Error analytics
  public getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrorTimes: Object.fromEntries(this.lastErrorTimes),
      recoveryActions: Array.from(this.recoveryActions.keys())
    };
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export async function handleApiError(error: any, request: NextRequest) {
  return errorHandler.handleError(error, request);
}

export async function handleDatabaseError(error: any, context?: Partial<ErrorContext>) {
  return errorHandler.handleDatabaseError(error, context);
}

export async function handleValidationError(error: any, context?: Partial<ErrorContext>) {
  return errorHandler.handleValidationError(error, context);
}

export async function handleExternalServiceError(error: any, service: string, context?: Partial<ErrorContext>) {
  return errorHandler.handleExternalServiceError(error, service, context);
}
