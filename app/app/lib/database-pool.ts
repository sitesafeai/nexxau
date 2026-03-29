import { PrismaClient } from '@prisma/client';

// Database connection pool manager
class DatabasePoolManager {
  private static instance: DatabasePoolManager;
  private prisma: PrismaClient;
  private connectionCount = 0;
  private maxConnections = 50;
  private isHealthy = true;

  private constructor() {
    // Apply connection pool limit to avoid exhaustion (detections every 2s × many cameras = many queued connections).
    // If DATABASE_URL already has connection_limit, leave it; otherwise append one.
    let dbUrl = process.env.DATABASE_URL ?? '';
    if (dbUrl && !dbUrl.includes('connection_limit')) {
      dbUrl += dbUrl.includes('?') ? '&' : '?';
      dbUrl += 'connection_limit=5&pool_timeout=10';
    }
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl || process.env.DATABASE_URL },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Health check interval — keep rare to avoid consuming pool connections
    setInterval(() => this.healthCheck(), 300_000); // Every 5 minutes
  }

  public static getInstance(): DatabasePoolManager {
    if (!DatabasePoolManager.instance) {
      DatabasePoolManager.instance = new DatabasePoolManager();
    }
    return DatabasePoolManager.instance;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.isHealthy = true;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  public isConnectionHealthy(): boolean {
    return this.isHealthy;
  }

  public getConnectionCount(): number {
    return this.connectionCount;
  }

  public async gracefulShutdown(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('Database connection pool closed gracefully');
    } catch (error) {
      console.error('Error during database shutdown:', error);
    }
  }

  // Connection monitoring
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        console.warn(`Database operation failed, retrying (${attempt}/${maxRetries}):`, error);
      }
    }
    
    throw lastError!;
  }
}

// Export singleton instance
export const dbPool = DatabasePoolManager.getInstance();
export const prisma = dbPool.getPrisma();

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await dbPool.gracefulShutdown();
});

process.on('SIGINT', async () => {
  await dbPool.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbPool.gracefulShutdown();
  process.exit(0);
});
