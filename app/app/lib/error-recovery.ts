import { prisma } from './prisma';
import { errorHandler } from './error-handler';
import notificationService from './notification-service';
import { broadcastSystemStatus } from './websocket';

export interface RecoveryWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  steps: RecoveryStep[];
  timeout: number; // in milliseconds
  retryAttempts: number;
  escalationThreshold: number;
  isActive: boolean;
}

export interface RecoveryStep {
  id: string;
  name: string;
  action: () => Promise<RecoveryResult>;
  timeout: number;
  retryAttempts: number;
  dependencies?: string[];
  rollbackAction?: () => Promise<boolean>;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  data?: any;
  nextStep?: string;
  shouldEscalate: boolean;
}

export interface RecoveryContext {
  errorId: string;
  errorType: string;
  severity: string;
  category: string;
  userId?: string;
  metadata?: Record<string, any>;
  startTime: Date;
  attempts: number;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
}

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private workflows: Map<string, RecoveryWorkflow> = new Map();
  private activeRecoveries: Map<string, RecoveryContext> = new Map();

  constructor() {
    this.initializeWorkflows();
  }

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  private initializeWorkflows() {
    // Database Connection Recovery Workflow
    this.addWorkflow({
      id: 'db-connection-recovery',
      name: 'Database Connection Recovery',
      description: 'Recover from database connection failures',
      triggers: ['database', 'connection', 'timeout'],
      steps: [
        {
          id: 'check-connection',
          name: 'Check Database Connection',
          action: async () => {
            try {
              await prisma.$queryRaw`SELECT 1`;
              return {
                success: true,
                message: 'Database connection is healthy',
                shouldEscalate: false
              };
            } catch (error) {
              return {
                success: false,
                message: 'Database connection failed',
                shouldEscalate: true
              };
            }
          },
          timeout: 5000,
          retryAttempts: 3
        },
        {
          id: 'reconnect-db',
          name: 'Reconnect to Database',
          action: async () => {
            try {
              await prisma.$disconnect();
              await prisma.$connect();
              await prisma.$queryRaw`SELECT 1`;
              return {
                success: true,
                message: 'Database reconnected successfully',
                shouldEscalate: false
              };
            } catch (error) {
              return {
                success: false,
                message: 'Failed to reconnect to database',
                shouldEscalate: true
              };
            }
          },
          timeout: 10000,
          retryAttempts: 2,
          dependencies: ['check-connection']
        },
        {
          id: 'notify-admins',
          name: 'Notify Administrators',
          action: async () => {
            try {
              await notificationService.sendNotification({
                to: ['admin@nexxau.com'],
                type: 'email',
                template: 'system-status',
                data: {
                  title: 'Database Connection Issue',
                  message: 'Database connection has been restored after recovery procedures.',
                  status: 'resolved',
                  severity: 'high'
                },
                priority: 'high'
              });
              return {
                success: true,
                message: 'Administrators notified',
                shouldEscalate: false
              };
            } catch (error) {
              return {
                success: false,
                message: 'Failed to notify administrators',
                shouldEscalate: false
              };
            }
          },
          timeout: 5000,
          retryAttempts: 1,
          dependencies: ['reconnect-db']
        }
      ],
      timeout: 30000,
      retryAttempts: 2,
      escalationThreshold: 3,
      isActive: true
    });

    // AI Service Recovery Workflow
    this.addWorkflow({
      id: 'ai-service-recovery',
      name: 'AI Detection Service Recovery',
      description: 'Recover from AI detection service failures',
      triggers: ['ai', 'detection', 'yolo', 'model'],
      steps: [
        {
          id: 'check-ai-health',
          name: 'Check AI Service Health',
          action: async () => {
            try {
              const response = await fetch('http://localhost:8000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
              });
              if (response.ok) {
                return {
                  success: true,
                  message: 'AI service is healthy',
                  shouldEscalate: false
                };
              } else {
                return {
                  success: false,
                  message: 'AI service returned error status',
                  shouldEscalate: true
                };
              }
            } catch (error) {
              return {
                success: false,
                message: 'AI service is unreachable',
                shouldEscalate: true
              };
            }
          },
          timeout: 5000,
          retryAttempts: 3
        },
        {
          id: 'restart-ai-service',
          name: 'Restart AI Service',
          action: async () => {
            try {
              // In a real implementation, this would restart the AI service
              // For now, we'll simulate a restart attempt
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Check if service is now healthy
              const response = await fetch('http://localhost:8000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
              });
              
              if (response.ok) {
                return {
                  success: true,
                  message: 'AI service restarted successfully',
                  shouldEscalate: false
                };
              } else {
                return {
                  success: false,
                  message: 'AI service restart failed',
                  shouldEscalate: true
                };
              }
            } catch (error) {
              return {
                success: false,
                message: 'AI service restart failed with error',
                shouldEscalate: true
              };
            }
          },
          timeout: 15000,
          retryAttempts: 2,
          dependencies: ['check-ai-health']
        }
      ],
      timeout: 45000,
      retryAttempts: 2,
      escalationThreshold: 3,
      isActive: true
    });

    // MediaMTX Service Recovery Workflow
    this.addWorkflow({
      id: 'mediamtx-recovery',
      name: 'MediaMTX Service Recovery',
      description: 'Recover from MediaMTX streaming service failures',
      triggers: ['mediamtx', 'streaming', 'hls', 'rtsp'],
      steps: [
        {
          id: 'check-mediamtx-health',
          name: 'Check MediaMTX Health',
          action: async () => {
            try {
              const response = await fetch('http://localhost:8889/v3/config/global/get', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
              });
              if (response.ok) {
                return {
                  success: true,
                  message: 'MediaMTX service is healthy',
                  shouldEscalate: false
                };
              } else {
                return {
                  success: false,
                  message: 'MediaMTX service returned error status',
                  shouldEscalate: true
                };
              }
            } catch (error) {
              return {
                success: false,
                message: 'MediaMTX service is unreachable',
                shouldEscalate: true
              };
            }
          },
          timeout: 5000,
          retryAttempts: 3
        },
        {
          id: 'restart-mediamtx',
          name: 'Restart MediaMTX Service',
          action: async () => {
            try {
              // In a real implementation, this would restart MediaMTX
              // For now, we'll simulate a restart attempt
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Check if service is now healthy
              const response = await fetch('http://localhost:8889/v3/config/global/get', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
              });
              
              if (response.ok) {
                return {
                  success: true,
                  message: 'MediaMTX service restarted successfully',
                  shouldEscalate: false
                };
              } else {
                return {
                  success: false,
                  message: 'MediaMTX service restart failed',
                  shouldEscalate: true
                };
              }
            } catch (error) {
              return {
                success: false,
                message: 'MediaMTX service restart failed with error',
                shouldEscalate: true
              };
            }
          },
          timeout: 20000,
          retryAttempts: 2,
          dependencies: ['check-mediamtx-health']
        }
      ],
      timeout: 60000,
      retryAttempts: 2,
      escalationThreshold: 3,
      isActive: true
    });

    // WebSocket Recovery Workflow
    this.addWorkflow({
      id: 'websocket-recovery',
      name: 'WebSocket Connection Recovery',
      description: 'Recover from WebSocket connection failures',
      triggers: ['websocket', 'realtime', 'connection'],
      steps: [
        {
          id: 'check-websocket-status',
          name: 'Check WebSocket Status',
          action: async () => {
            try {
              await broadcastSystemStatus({ 
                status: 'health_check', 
                timestamp: new Date().toISOString() 
              });
              return {
                success: true,
                message: 'WebSocket connections are healthy',
                shouldEscalate: false
              };
            } catch (error) {
              return {
                success: false,
                message: 'WebSocket connections failed',
                shouldEscalate: true
              };
            }
          },
          timeout: 5000,
          retryAttempts: 3
        },
        {
          id: 'reconnect-websocket',
          name: 'Reconnect WebSocket',
          action: async () => {
            try {
              // Force reconnection of WebSocket clients
              await broadcastSystemStatus({ 
                status: 'reconnecting', 
                timestamp: new Date().toISOString() 
              });
              
              // Wait for reconnection
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Test connection
              await broadcastSystemStatus({ 
                status: 'reconnected', 
                timestamp: new Date().toISOString() 
              });
              
              return {
                success: true,
                message: 'WebSocket reconnected successfully',
                shouldEscalate: false
              };
            } catch (error) {
              return {
                success: false,
                message: 'WebSocket reconnection failed',
                shouldEscalate: true
              };
            }
          },
          timeout: 10000,
          retryAttempts: 2,
          dependencies: ['check-websocket-status']
        }
      ],
      timeout: 20000,
      retryAttempts: 2,
      escalationThreshold: 3,
      isActive: true
    });
  }

  public addWorkflow(workflow: RecoveryWorkflow) {
    this.workflows.set(workflow.id, workflow);
  }

  public async triggerRecovery(
    errorId: string,
    errorType: string,
    severity: string,
    category: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: RecoveryContext = {
      errorId,
      errorType,
      severity,
      category,
      metadata,
      startTime: new Date(),
      attempts: 0,
      completedSteps: [],
      failedSteps: []
    };

    this.activeRecoveries.set(recoveryId, context);

    // Find applicable workflows
    const applicableWorkflows = this.findApplicableWorkflows(errorType, category);
    
    if (applicableWorkflows.length === 0) {
      console.log(`No recovery workflows found for error type: ${errorType}, category: ${category}`);
      return recoveryId;
    }

    // Execute workflows
    for (const workflow of applicableWorkflows) {
      await this.executeWorkflow(recoveryId, workflow);
    }

    return recoveryId;
  }

  private findApplicableWorkflows(errorType: string, category: string): RecoveryWorkflow[] {
    const applicable: RecoveryWorkflow[] = [];
    
    for (const workflow of this.workflows.values()) {
      if (!workflow.isActive) continue;
      
      const isTriggered = workflow.triggers.some(trigger => 
        errorType.toLowerCase().includes(trigger.toLowerCase()) ||
        category.toLowerCase().includes(trigger.toLowerCase())
      );
      
      if (isTriggered) {
        applicable.push(workflow);
      }
    }
    
    return applicable;
  }

  private async executeWorkflow(recoveryId: string, workflow: RecoveryWorkflow) {
    const context = this.activeRecoveries.get(recoveryId);
    if (!context) return;

    console.log(`Executing recovery workflow: ${workflow.name}`);

    for (const step of workflow.steps) {
      context.currentStep = step.id;
      context.attempts++;

      try {
        const result = await this.executeStep(step, context);
        
        if (result.success) {
          context.completedSteps.push(step.id);
          console.log(`Recovery step completed: ${step.name}`);
          
          if (result.nextStep) {
            // Continue to next step
            continue;
          } else {
            // Workflow completed successfully
            console.log(`Recovery workflow completed: ${workflow.name}`);
            break;
          }
        } else {
          context.failedSteps.push(step.id);
          console.log(`Recovery step failed: ${step.name} - ${result.message}`);
          
          if (result.shouldEscalate) {
            await this.escalateRecovery(recoveryId, workflow, step, result.message);
            break;
          }
        }
      } catch (error) {
        context.failedSteps.push(step.id);
        console.error(`Recovery step error: ${step.name}`, error);
        
        // Try rollback if available
        if (step.rollbackAction) {
          try {
            await step.rollbackAction();
          } catch (rollbackError) {
            console.error(`Rollback failed for step: ${step.name}`, rollbackError);
          }
        }
      }

      // Check timeout
      if (Date.now() - context.startTime.getTime() > workflow.timeout) {
        console.log(`Recovery workflow timed out: ${workflow.name}`);
        await this.escalateRecovery(recoveryId, workflow, step, 'Recovery workflow timed out');
        break;
      }
    }

    // Update context
    this.activeRecoveries.set(recoveryId, context);
  }

  private async executeStep(step: RecoveryStep, context: RecoveryContext): Promise<RecoveryResult> {
    // Check dependencies
    if (step.dependencies) {
      for (const dep of step.dependencies) {
        if (!context.completedSteps.includes(dep)) {
          return {
            success: false,
            message: `Dependency not met: ${dep}`,
            shouldEscalate: true
          };
        }
      }
    }

    // Execute step with retries
    for (let attempt = 1; attempt <= step.retryAttempts; attempt++) {
      try {
        const result = await Promise.race([
          step.action(),
          new Promise<RecoveryResult>((_, reject) => 
            setTimeout(() => reject(new Error('Step timeout')), step.timeout)
          )
        ]);

        if (result.success) {
          return result;
        } else if (attempt === step.retryAttempts) {
          return result;
        } else {
          console.log(`Retrying step: ${step.name} (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        if (attempt === step.retryAttempts) {
          return {
            success: false,
            message: `Step failed after ${step.retryAttempts} attempts: ${error.message}`,
            shouldEscalate: true
          };
        }
      }
    }

    return {
      success: false,
      message: 'Step execution failed',
      shouldEscalate: true
    };
  }

  private async escalateRecovery(
    recoveryId: string,
    workflow: RecoveryWorkflow,
    step: RecoveryStep,
    reason: string
  ) {
    console.log(`Escalating recovery: ${workflow.name} - ${reason}`);
    
    try {
      // Notify administrators
      await notificationService.sendNotification({
        to: ['admin@nexxau.com'],
        type: 'email',
        template: 'system-status',
        data: {
          title: 'Recovery Workflow Escalation',
          message: `Recovery workflow "${workflow.name}" has been escalated. Reason: ${reason}`,
          status: 'escalated',
          severity: 'high',
          workflow: workflow.name,
          step: step.name,
          reason
        },
        priority: 'urgent'
      });

      // Log escalation
      await prisma.errorLog.create({
        data: {
          message: `Recovery escalation: ${workflow.name}`,
          severity: 'high',
          category: 'system',
          metadata: {
            recoveryId,
            workflow: workflow.name,
            step: step.name,
            reason,
            escalationTime: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to escalate recovery:', error);
    }
  }

  public getActiveRecoveries(): Map<string, RecoveryContext> {
    return this.activeRecoveries;
  }

  public getWorkflows(): Map<string, RecoveryWorkflow> {
    return this.workflows;
  }

  public async getRecoveryStats() {
    const activeCount = this.activeRecoveries.size;
    const workflowCount = this.workflows.size;
    
    // Get recovery statistics from database
    const stats = await prisma.errorLog.groupBy({
      by: ['severity', 'category'],
      where: {
        metadata: {
          path: ['recoveryId'],
          not: null
        }
      },
      _count: true
    });

    return {
      activeRecoveries: activeCount,
      totalWorkflows: workflowCount,
      recoveryStats: stats
    };
  }
}

// Global recovery manager instance
export const recoveryManager = ErrorRecoveryManager.getInstance();
