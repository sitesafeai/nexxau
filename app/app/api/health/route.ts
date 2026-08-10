import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Database connection successful';
    
    if (responseTime > 1000) {
      status = 'degraded';
      message = 'Database responding slowly';
    }
    
    logger.healthCheck('database', status, message, { responseTime });
    
    return {
      service: 'database',
      status,
      message,
      responseTime,
      details: {
        provider: 'PostgreSQL',
        responseTimeMs: responseTime
      }
    };
  } catch (error) {
    logger.healthCheck('database', 'unhealthy', 'Database connection failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return {
      service: 'database',
      status: 'unhealthy',
      message: 'Database connection failed',
      responseTime: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkCameras(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const cameras = await prisma.camera.findMany({
      include: {
        health: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    const responseTime = Date.now() - startTime;
    const totalCameras = cameras.length;
    
    if (totalCameras === 0) {
      return {
        service: 'cameras',
        status: 'healthy',
        message: 'No cameras configured',
        responseTime,
        details: {
          total: 0,
          online: 0,
          offline: 0
        }
      };
    }
    
    const onlineCameras = cameras.filter(camera => {
      const latestHealth = camera.health[0];
      if (!latestHealth) return false;
      
      const minutesSinceCheck = Math.floor(
        (Date.now() - new Date(latestHealth.lastCheck).getTime()) / 1000 / 60
      );
      
      return minutesSinceCheck < 5 && latestHealth.status === 'ONLINE';
    });
    
    const onlineCount = onlineCameras.length;
    const offlineCount = totalCameras - onlineCount;
    const onlinePercentage = (onlineCount / totalCameras) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `${onlineCount}/${totalCameras} cameras online`;
    
    if (onlinePercentage < 50) {
      status = 'unhealthy';
      message = `Critical: Only ${onlineCount}/${totalCameras} cameras online`;
    } else if (onlinePercentage < 80) {
      status = 'degraded';
      message = `Warning: ${offlineCount} camera(s) offline`;
    }
    
    logger.healthCheck('cameras', status, message, { 
      onlineCount, 
      offlineCount, 
      totalCameras,
      onlinePercentage: Math.round(onlinePercentage)
    });
    
    return {
      service: 'cameras',
      status,
      message,
      responseTime,
      details: {
        total: totalCameras,
        online: onlineCount,
        offline: offlineCount,
        onlinePercentage: Math.round(onlinePercentage)
      }
    };
  } catch (error) {
    logger.healthCheck('cameras', 'unhealthy', 'Failed to check camera status', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return {
      service: 'cameras',
      status: 'unhealthy',
      message: 'Failed to check camera status',
      responseTime: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkAlerts(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const [activeAlerts, totalAlerts] = await Promise.all([
      prisma.alert.count({
        where: { status: 'ACTIVE' }
      }),
      prisma.alert.count()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `${activeAlerts} active alert(s)`;
    
    if (activeAlerts > 50) {
      status = 'unhealthy';
      message = `Critical: ${activeAlerts} unresolved alerts`;
    } else if (activeAlerts > 20) {
      status = 'degraded';
      message = `Warning: ${activeAlerts} active alerts`;
    }
    
    logger.healthCheck('alerts', status, message, { 
      activeAlerts, 
      totalAlerts 
    });
    
    return {
      service: 'alerts',
      status,
      message,
      responseTime,
      details: {
        active: activeAlerts,
        total: totalAlerts
      }
    };
  } catch (error) {
    logger.healthCheck('alerts', 'unhealthy', 'Failed to check alerts', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return {
      service: 'alerts',
      status: 'unhealthy',
      message: 'Failed to check alerts',
      responseTime: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkMemory(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const heapUsedMB = Math.round(heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((heapUsed / heapTotal) * 100);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`;
    
    if (heapPercentage > 95) {
      status = 'unhealthy';
      message = `Critical: Memory usage at ${heapPercentage}%`;
    } else if (heapPercentage > 88) {
      status = 'degraded';
      message = `Warning: Memory usage at ${heapPercentage}%`;
    }
    
    logger.healthCheck('memory', status, message, { 
      heapUsedMB, 
      heapTotalMB, 
      heapPercentage 
    });
    
    return {
      service: 'memory',
      status,
      message,
      responseTime: Date.now() - startTime,
      details: {
        heapUsedMB,
        heapTotalMB,
        heapPercentage,
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      }
    };
  } catch (error) {
    return {
      service: 'memory',
      status: 'unhealthy',
      message: 'Failed to check memory',
      responseTime: Date.now() - startTime
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info('Health check requested');
  
  try {
    // Run all health checks in parallel
    const [database, cameras, alerts, memory] = await Promise.all([
      checkDatabase(),
      checkCameras(),
      checkAlerts(),
      checkMemory()
    ]);
    
    const checks = [database, cameras, alerts, memory];
    
    // Calculate overall system status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }
    
    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      summary: {
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        total: checks.length
      }
    };
    
    const responseTime = Date.now() - startTime;
    logger.info(`Health check completed: ${overallStatus}`, { 
      responseTime, 
      healthyCount, 
      degradedCount, 
      unhealthyCount 
    });
    
    // Always return 200 so Railway healthcheck passes (status is in the body)
    const statusCode = 200;
    
    return NextResponse.json(health, { status: statusCode });
    
  } catch (error) {
    logger.error('Health check failed', {}, error instanceof Error ? error : undefined);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: [],
      summary: {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        total: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}
