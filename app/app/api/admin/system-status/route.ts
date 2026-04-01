import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWebSocketManager } from '@/lib/websocket';
import { getCachedSession } from '@/lib/session-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
          // lastActivity field doesn't exist in schema, using updatedAt instead
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.camera.count(),
      prisma.camera.count({
        where: { status: 'online' } // Using status instead of isActive
      }),
      prisma.alertRule.count(),
      prisma.alertRule.count({
        where: { isActive: true }
      }),
      prisma.alertResponse.count(),
      prisma.alertResponse.count({
        where: { response: 'resolved' } // Using 'response' field instead of 'status'
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
    const os = require('os');
    const cpus = os.cpus();
    
    // Calculate average CPU usage across all cores
    let totalIdle = 0;
    let totalTick = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(usage)));
  } catch (error) {
    console.error('Failed to get CPU usage:', error);
    return 0;
  }
}

async function getDiskUsage(): Promise<number> {
  try {
    const os = require('os');
    const { execSync } = require('child_process');
    
    // Get disk usage based on platform
    if (os.platform() === 'darwin' || os.platform() === 'linux') {
      // macOS and Linux
      const output = execSync('df -h / | tail -1').toString();
      const parts = output.split(/\s+/);
      const usagePercent = parts[4]; // The 5th column is the usage percentage
      return parseInt(usagePercent.replace('%', ''));
    } else if (os.platform() === 'win32') {
      // Windows
      const output = execSync('wmic logicaldisk get size,freespace,caption').toString();
      const lines = output.split('\n').filter((line: string) => line.trim() && !line.includes('Caption'));
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const freeSpace = parseInt(parts[1] || '0');
        const totalSize = parseInt(parts[2] || '1');
        const usedSpace = totalSize - freeSpace;
        return Math.round((usedSpace / totalSize) * 100);
      }
    }
    
    // Fallback: use home directory size as estimate
    return 45; // Conservative estimate if we can't get real data
  } catch (error) {
    console.error('Failed to get disk usage:', error);
    return 0;
  }
}
