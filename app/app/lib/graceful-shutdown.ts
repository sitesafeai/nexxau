/**
 * Graceful Shutdown Handler for SiteSafe
 * 
 * Ensures proper cleanup of resources and connections before process termination
 * to prevent data loss and maintain system integrity.
 */

import { prisma } from './prisma';
import { logger } from './logger';

type ShutdownHandler = () => Promise<void> | void;

class GracefulShutdown {
  private static instance: GracefulShutdown;
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds max shutdown time
  
  private constructor() {
    // Register signal handlers
    this.registerSignalHandlers();
  }
  
  static getInstance(): GracefulShutdown {
    if (!GracefulShutdown.instance) {
      GracefulShutdown.instance = new GracefulShutdown();
    }
    return GracefulShutdown.instance;
  }
  
  /**
   * Register a cleanup handler to be called during shutdown
   */
  register(handler: ShutdownHandler, name?: string) {
    this.handlers.push(handler);
    logger.debug(`Registered shutdown handler${name ? `: ${name}` : ''}`, { 
      handlerCount: this.handlers.length 
    });
  }
  
  /**
   * Set the maximum time allowed for graceful shutdown
   */
  setShutdownTimeout(ms: number) {
    this.shutdownTimeout = ms;
    logger.info(`Shutdown timeout set to ${ms}ms`);
  }
  
  /**
   * Register signal handlers for graceful shutdown
   */
  private registerSignalHandlers() {
    // SIGTERM - Graceful termination (e.g., from Docker, Kubernetes)
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      this.shutdown('SIGTERM');
    });
    
    // SIGINT - Ctrl+C
    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal (Ctrl+C)');
      this.shutdown('SIGINT');
    });
    
    // Uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.critical('Uncaught exception', {}, error);
      this.shutdown('uncaughtException', 1);
    });
    
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.critical('Unhandled promise rejection', {}, 
        reason instanceof Error ? reason : new Error(String(reason))
      );
      this.shutdown('unhandledRejection', 1);
    });
    
    logger.info('Graceful shutdown handlers registered');
  }
  
  /**
   * Perform graceful shutdown
   */
  private async shutdown(signal: string, exitCode: number = 0) {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal', { signal });
      return;
    }
    
    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown (signal: ${signal})`, { 
      exitCode,
      handlersToRun: this.handlers.length
    });
    
    // Set a timeout to force exit if shutdown takes too long
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit', { 
        timeout: this.shutdownTimeout 
      });
      process.exit(exitCode > 0 ? exitCode : 1);
    }, this.shutdownTimeout);
    
    try {
      // Run all shutdown handlers with a timeout for each
      const handlerPromises = this.handlers.map((handler, index) => 
        Promise.race([
          Promise.resolve(handler()).then(() => {
            logger.debug(`Shutdown handler ${index + 1} completed`);
            return { index, success: true };
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Handler ${index + 1} timeout`)), 10000)
          )
        ]).catch(error => {
          logger.error(`Shutdown handler ${index + 1} failed`, {}, error);
          return { index, success: false, error };
        })
      );
      
      await Promise.all(handlerPromises);
      
      // Close database connections
      logger.info('Closing database connections...');
      await prisma.$disconnect();
      logger.info('Database connections closed');
      
      // Clear the force exit timer
      clearTimeout(forceExitTimer);
      
      logger.info('Graceful shutdown completed successfully', { 
        signal, 
        exitCode 
      });
      
      // Export logs before exiting
      try {
        const logs = logger.exportLogs();
        // In production, you might want to save this to a file or send to a logging service
        if (process.env.NODE_ENV === 'development') {
          console.log('\n📋 Final logs exported (development mode)');
        }
      } catch (error) {
        console.error('Failed to export logs:', error);
      }
      
      // Exit the process
      process.exit(exitCode);
      
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.critical('Error during graceful shutdown', {}, error instanceof Error ? error : new Error(String(error)));
      process.exit(exitCode > 0 ? exitCode : 1);
    }
  }
  
  /**
   * Manually trigger shutdown (for testing or admin control)
   */
  async triggerShutdown(reason: string = 'manual', exitCode: number = 0) {
    logger.info(`Shutdown triggered manually: ${reason}`);
    await this.shutdown(reason, exitCode);
  }
}

// Export singleton instance
export const gracefulShutdown = GracefulShutdown.getInstance();

// Common shutdown handlers
export const shutdownHandlers = {
  /**
   * Handler for closing HTTP server
   */
  httpServer: (server: any) => {
    return () => new Promise<void>((resolve) => {
      logger.info('Closing HTTP server...');
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  },
  
  /**
   * Handler for closing WebSocket connections
   */
  websocket: (wss: any) => {
    return () => new Promise<void>((resolve) => {
      logger.info('Closing WebSocket connections...');
      wss.clients.forEach((client: any) => {
        client.close();
      });
      wss.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  },
  
  /**
   * Handler for flushing in-memory caches
   */
  cache: (cache: any, name: string = 'cache') => {
    return () => {
      logger.info(`Flushing ${name}...`);
      if (typeof cache.flush === 'function') {
        cache.flush();
      } else if (typeof cache.clear === 'function') {
        cache.clear();
      }
      logger.info(`${name} flushed`);
    };
  },
  
  /**
   * Handler for saving application state
   */
  saveState: (saveFunction: () => Promise<void>, name: string = 'state') => {
    return async () => {
      logger.info(`Saving ${name}...`);
      await saveFunction();
      logger.info(`${name} saved`);
    };
  },
  
  /**
   * Handler for closing camera streams
   */
  cameraStreams: (streamManager: any) => {
    return () => {
      logger.info('Closing camera streams...');
      if (typeof streamManager.closeAll === 'function') {
        streamManager.closeAll();
      }
      logger.info('Camera streams closed');
    };
  },
  
  /**
   * Handler for stopping AI detection processes
   */
  aiDetection: (detectionService: any) => {
    return async () => {
      logger.info('Stopping AI detection service...');
      if (typeof detectionService.stop === 'function') {
        await detectionService.stop();
      }
      logger.info('AI detection service stopped');
    };
  }
};

// Initialize graceful shutdown on module load
export default gracefulShutdown;

// Example usage in Next.js:
/*
import { gracefulShutdown, shutdownHandlers } from '@/lib/graceful-shutdown';

// Register custom shutdown handlers
gracefulShutdown.register(async () => {
  console.log('Saving camera states...');
  await saveCameraStates();
}, 'camera-states');

gracefulShutdown.register(async () => {
  console.log('Flushing detection queue...');
  await flushDetectionQueue();
}, 'detection-queue');

// Set custom timeout
gracefulShutdown.setShutdownTimeout(45000); // 45 seconds
*/

