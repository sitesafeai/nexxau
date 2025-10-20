import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getWebSocketManager } from '@/app/lib/websocket';

export async function GET(request: NextRequest) {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Check AI detection service
    const aiHealth = await checkAIServiceHealth();
    
    // Check MediaMTX service
    const mediaHealth = await checkMediaMTXHealth();
    
    // Check WebSocket service
    const wsHealth = await checkWebSocketHealth();
    
    // Check notification service
    const notificationHealth = await checkNotificationHealth();
    
    // Get system metrics
    const metrics = await getSystemMetrics();

    const uptimeSeconds = process.uptime();
    const uptimeFormatted = formatUptime(uptimeSeconds);
    const memUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;

    const systemStatus = {
      database: dbHealth,
      aiDetection: aiHealth,
      mediaMTX: mediaHealth,
      websocket: wsHealth,
      notifications: notificationHealth,
      uptime: uptimeFormatted,
      memoryUsage: Math.round(memUsage),
      cpuUsage: await getCPUUsage(),
      diskUsage: await getDiskUsage(),
      ...metrics
    };

    return NextResponse.json(systemStatus);

  } catch (error) {
    console.error('System status check failed:', error);
    
    return NextResponse.json({
      database: 'unhealthy',
      aiDetection: 'unhealthy',
      mediaMTX: 'unhealthy',
      websocket: 'unhealthy',
      notifications: 'unhealthy',
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      error: 'System status check failed'
    }, { status: 503 });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

async function checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) return 'healthy';
    if (responseTime < 5000) return 'degraded';
    return 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkAIServiceHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const response = await fetch('http://localhost:8000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) return 'healthy';
    return 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkMediaMTXHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const response = await fetch('http://localhost:8889/v3/config/global/get', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) return 'healthy';
    return 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkWebSocketHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager) return 'unhealthy';
    
    const connectionCount = wsManager.getConnectionCount();
    if (connectionCount > 0) return 'healthy';
    return 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkNotificationHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    // Check if notification service is configured
    const response = await fetch('/api/notifications/send', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.configuration.email || data.configuration.sms) {
        return 'healthy';
      }
      return 'degraded';
    }
    return 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}

async function getSystemMetrics() {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCameras,
      activeCameras,
      totalAlerts,
      activeAlerts,
      totalIncidents,
      resolvedIncidents
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActivity: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.camera.count(),
      prisma.camera.count({
        where: { isActive: true }
      }),
      prisma.alertRule.count(),
      prisma.alertRule.count({
        where: { isActive: true }
      }),
      prisma.alertResponse.count(),
      prisma.alertResponse.count({
        where: { status: 'resolved' }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      totalCameras,
      activeCameras,
      totalAlerts,
      activeAlerts,
      totalIncidents,
      resolvedIncidents
    };
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalCameras: 0,
      activeCameras: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      totalIncidents: 0,
      resolvedIncidents: 0
    };
  }
}

async function getCPUUsage(): Promise<number> {
  try {
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    return Math.round(100 - (100 * totalIdle / totalTick));
  } catch (error) {
    return 0;
  }
}

async function getDiskUsage(): Promise<number> {
  try {
    const fs = require('fs');
    const stats = fs.statSync('.');
    // This is a simplified calculation - in production you'd want to use a proper disk usage library
    return Math.round(Math.random() * 100); // Mock value for now
  } catch (error) {
    return 0;
  }
}
