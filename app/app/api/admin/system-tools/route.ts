import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/admin/system-tools
 * System tools for super-admins (restart streams, clear alerts, etc.)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, cameraId, worksiteId } = body;

    switch (action) {
      case 'restart_mediamtx':
        try {
          await execAsync('docker stop mediamtx || true');
          await execAsync('docker rm mediamtx || true');
          const configPath = process.env.MEDIAMTX_CONFIG_PATH || '/Users/luizcarneiro/mediamtx/mediamtx.yml';
          const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
          const rtspPort = process.env.MEDIAMTX_RTSP_PORT || '8554';
          await execAsync(
            `docker run -d --name mediamtx -p ${hlsPort}:${hlsPort} -p ${rtspPort}:${rtspPort} -v ${configPath}:/mediamtx.yml bluenviron/mediamtx`
          );
          return NextResponse.json({ success: true, message: 'MediaMTX restarted successfully' });
        } catch (error: any) {
          console.error('Error restarting MediaMTX:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to restart MediaMTX', details: error.message },
            { status: 500 }
          );
        }

      case 'restart_ai_worker':
        try {
          // Try to restart AI service if it's running in Docker
          // In production, this would restart the AI detection service container
          try {
            await execAsync('docker ps --filter "name=ai-detection" --format "{{.ID}}"', { timeout: 5000 });
            // If container exists, restart it
            await execAsync('docker restart ai-detection || true', { timeout: 10000 });
            return NextResponse.json({
              success: true,
              message: 'AI inference worker restart initiated',
              note: 'AI detection service container restarted',
            });
          } catch (error) {
            // Container might not exist or not be running in Docker
            // Check if AI service is accessible
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
            try {
              const healthCheck = await fetch(`${aiServiceUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
              });
              if (healthCheck.ok) {
                return NextResponse.json({
                  success: true,
                  message: 'AI inference worker is running',
                  note: 'AI service is accessible. Manual restart may be required.',
                });
              }
            } catch (error) {
              return NextResponse.json({
                success: false,
                message: 'AI inference worker not accessible',
                error: 'AI service is not running or not accessible. Please start the AI detection service manually.',
              });
            }
          }
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: 'Failed to restart AI worker',
            details: error.message,
          });
        }

      case 'clear_stuck_alerts':
        try {
          const cutoffDate = new Date();
          cutoffDate.setHours(cutoffDate.getHours() - 24); // Alerts older than 24 hours

          const result = await prisma.alert.updateMany({
            where: {
              status: 'ACTIVE',
              createdAt: {
                lt: cutoffDate,
              },
            },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            message: `Cleared ${result.count} stuck alerts`,
            count: result.count,
          });
        } catch (error: any) {
          console.error('Error clearing stuck alerts:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to clear stuck alerts', details: error.message },
            { status: 500 }
          );
        }

      case 'restart_camera_stream':
        if (!cameraId) {
          return NextResponse.json({ success: false, error: 'cameraId is required' }, { status: 400 });
        }

        try {
          // Update camera status to force reconnection
          await prisma.camera.update({
            where: { id: cameraId },
            data: {
              status: 'online',
              updatedAt: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Camera stream restart initiated',
            cameraId,
          });
        } catch (error: any) {
          console.error('Error restarting camera stream:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to restart camera stream', details: error.message },
            { status: 500 }
          );
        }

      case 'health_check':
        try {
          const dbHealth = await checkDatabaseHealth();
          const aiHealth = await checkAIServiceHealth();
          const mediaHealth = await checkMediaMTXHealth();

          return NextResponse.json({
            success: true,
            health: {
              database: dbHealth,
              aiDetection: aiHealth,
              mediaMTX: mediaHealth,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error: any) {
          return NextResponse.json(
            { success: false, error: 'Health check failed', details: error.message },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[admin][system-tools] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute system tool', details: error.message },
      { status: 500 }
    );
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
      signal: AbortSignal.timeout(5000),
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
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return 'healthy';
    return 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

