import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/admin/support/troubleshooting
 * Troubleshooting tools for support team
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
      case 'test_ai_inference': {
        // Test AI inference by sending a test detection to the YOLO API
        try {
          const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
          
          // First check if AI service is accessible
          let aiServiceHealthy = false;
          let aiServiceError = null;
          try {
            const healthResponse = await fetch(`${aiServiceUrl}/health`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            aiServiceHealthy = healthResponse.ok;
            if (!healthResponse.ok) {
              aiServiceError = `HTTP ${healthResponse.status}: ${healthResponse.statusText}`;
            }
          } catch (error: any) {
            aiServiceError = error.message || 'Connection refused';
          }

          if (!aiServiceHealthy) {
            return NextResponse.json({
              success: false,
              error: 'AI service is not accessible',
              details: {
                aiServiceUrl,
                error: aiServiceError,
              },
              recommendation: `Ensure the AI detection service is running at ${aiServiceUrl}. Check the AI_SERVICE_URL environment variable and verify the service is accessible.`,
            });
          }

          // Try to send a test detection
          const testDetection = {
            camera_id: cameraId || 'test-camera',
            timestamp: new Date().toISOString(),
            detections: [
              {
                class: 'person',
                confidence: 0.85,
                bbox: [100, 100, 200, 300],
              },
            ],
            frame_data: 'test_frame_base64',
            frame_width: 640,
            frame_height: 480,
          };

          let inferenceResult = null;
          let inferenceError = null;
          try {
            const detectionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/yolo/detections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testDetection),
              signal: AbortSignal.timeout(10000),
            });

            if (detectionResponse.ok) {
              inferenceResult = await detectionResponse.json();
            } else {
              inferenceError = `HTTP ${detectionResponse.status}: ${detectionResponse.statusText}`;
            }
          } catch (error: any) {
            inferenceError = error.message || 'Request failed';
            console.error('Test detection failed:', error);
          }

          return NextResponse.json({
            success: true,
            message: inferenceResult ? 'AI inference test successful' : 'AI inference test completed with errors',
            details: {
              aiServiceHealthy: true,
              aiServiceUrl,
              inferenceTest: inferenceResult ? 'Success' : 'Failed',
              ...(inferenceError && { inferenceError }),
            },
            inferenceResult,
            ...(inferenceError && {
              recommendation: 'AI service is healthy but detection endpoint failed. Check the /api/yolo/detections endpoint and ensure the Next.js server is running.',
            }),
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: 'AI inference test failed',
            details: error.message,
            recommendation: 'Check that both the AI service and Next.js API are running and accessible.',
          });
        }
      }

      case 'snap_test_frame': {
        if (!cameraId) {
          return NextResponse.json({ success: false, error: 'cameraId is required' }, { status: 400 });
        }

        const camera = await prisma.camera.findUnique({
          where: { id: cameraId },
          select: {
            id: true,
            name: true,
            streamUrl: true,
            hlsUrl: true,
            ipAddress: true,
          },
        });

        if (!camera) {
          return NextResponse.json({ success: false, error: 'Camera not found' }, { status: 404 });
        }

        // Try to capture a frame from the camera stream
        // In production, this would use ffmpeg or similar to capture a frame
        try {
          const streamUrl = camera.hlsUrl || camera.streamUrl;
          let frameCaptured = false;
          let frameUrl = null;
          let streamAccessible = false;
          let streamError = null;

          if (!streamUrl) {
            return NextResponse.json({
              success: false,
              error: 'No stream URL configured',
              camera: {
                id: camera.id,
                name: camera.name,
              },
              note: 'Camera does not have a streamUrl or hlsUrl configured. Please configure a stream URL for this camera.',
            });
          }

          // Check if stream is accessible
          try {
            const testResponse = await fetch(streamUrl, {
              method: 'HEAD',
              signal: AbortSignal.timeout(10000),
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
            });
            streamAccessible = testResponse.ok;
            if (!testResponse.ok) {
              streamError = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
            }
          } catch (error: any) {
            streamError = error.message || 'Connection failed';
            // For HLS streams, HEAD might fail but the stream could still be valid
            // Try a GET request to the playlist
            if (streamUrl.includes('.m3u8')) {
              try {
                const playlistResponse = await fetch(streamUrl, {
                  method: 'GET',
                  signal: AbortSignal.timeout(10000),
                  headers: {
                    'User-Agent': 'Mozilla/5.0',
                  },
                });
                if (playlistResponse.ok) {
                  streamAccessible = true;
                  streamError = null;
                }
              } catch (playlistError: any) {
                streamError = playlistError.message || 'HLS playlist not accessible';
              }
            }
          }

          // Try to use ffmpeg if available (for actual frame capture)
          let ffmpegAvailable = false;
          let ffmpegError = null;
          try {
            await execAsync('which ffmpeg', { timeout: 2000 });
            ffmpegAvailable = true;
          } catch (error) {
            ffmpegAvailable = false;
            ffmpegError = 'ffmpeg not found in PATH. Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)';
          }

          return NextResponse.json({
            success: true,
            message: streamAccessible ? 'Stream is accessible' : 'Stream accessibility check completed',
            camera: {
              id: camera.id,
              name: camera.name,
              streamUrl: camera.streamUrl,
              hlsUrl: camera.hlsUrl,
            },
            streamAccessible,
            streamError,
            frameCaptured: false, // Actual frame capture requires ffmpeg
            frameUrl: null,
            ffmpegAvailable,
            ffmpegError,
            note: streamAccessible
              ? (ffmpegAvailable
                  ? 'Stream is accessible. Frame capture is possible with ffmpeg.'
                  : 'Stream is accessible, but ffmpeg is not installed. Install ffmpeg to enable frame capture.')
              : `Stream may not be accessible: ${streamError || 'Unknown error'}. Check the stream URL and network connectivity.`,
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: 'Failed to capture test frame',
            details: error.message,
          });
        }
      }

      case 'view_raw_detections': {
        if (!cameraId) {
          return NextResponse.json({ success: false, error: 'cameraId is required' }, { status: 400 });
        }

        const detections = await prisma.detection.findMany({
          where: {
            cameraId,
            timestamp: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
          select: {
            id: true,
            timestamp: true,
            detections: true,
            metadata: true,
            frameWidth: true,
            frameHeight: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Found ${detections.length} detections in last 5 minutes`,
          detections: detections.map((d) => ({
            id: d.id,
            timestamp: d.timestamp,
            detections: d.detections,
            metadata: d.metadata,
            frameDimensions: d.frameWidth && d.frameHeight ? `${d.frameWidth}x${d.frameHeight}` : null,
          })),
        });
      }

      case 'check_network_latency': {
        try {
          const latencies: Record<string, number> = {};

          // Check MediaMTX
          let mediaMTXError = null;
          try {
            const start = Date.now();
            const response = await fetch('http://localhost:8889/v3/config/global/get', {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
              latencies.mediaMTX = Date.now() - start;
            } else {
              latencies.mediaMTX = -1;
              mediaMTXError = `HTTP ${response.status}`;
            }
          } catch (error: any) {
            latencies.mediaMTX = -1; // Unreachable
            mediaMTXError = error.message || 'Connection refused';
          }

          // Check AI Service
          const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
          let aiServiceError = null;
          try {
            const start = Date.now();
            const response = await fetch(`${aiServiceUrl}/health`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
              latencies.aiService = Date.now() - start;
            } else {
              latencies.aiService = -1;
              aiServiceError = `HTTP ${response.status}`;
            }
          } catch (error: any) {
            latencies.aiService = -1; // Unreachable
            aiServiceError = error.message || 'Connection refused';
          }

          // Check Database
          try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            latencies.database = Date.now() - start;
          } catch (error) {
            latencies.database = -1; // Unreachable
          }

          // If cameraId provided, check camera IP latency
          if (cameraId) {
            const camera = await prisma.camera.findUnique({
              where: { id: cameraId },
              select: { ipAddress: true },
            });

            if (camera?.ipAddress) {
              try {
                // Use ping command to check latency
                const { stdout } = await execAsync(`ping -c 3 ${camera.ipAddress}`, { timeout: 10000 });
                const match = stdout.match(/min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/);
                if (match) {
                  latencies.camera = parseFloat(match[2]); // Average latency
                }
              } catch (error) {
                latencies.camera = -1; // Unreachable
              }
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Network latency check completed',
            latencies: {
              mediaMTX: latencies.mediaMTX >= 0 ? `${latencies.mediaMTX}ms` : 'Unreachable',
              aiService: latencies.aiService >= 0 ? `${latencies.aiService}ms` : 'Unreachable',
              database: latencies.database >= 0 ? `${latencies.database}ms` : 'Unreachable',
              ...(latencies.camera !== undefined && {
                camera: latencies.camera >= 0 ? `${latencies.camera}ms` : 'Unreachable',
              }),
            },
            rawLatencies: latencies,
            errors: {
              ...(mediaMTXError && { mediaMTX: mediaMTXError }),
              ...(aiServiceError && { aiService: aiServiceError }),
            },
            recommendations: [
              ...(latencies.mediaMTX < 0 ? [
                'MediaMTX is not accessible. Ensure MediaMTX is running on port 8889. Check with: docker ps | grep mediamtx'
              ] : []),
              ...(latencies.aiService < 0 ? [
                `AI Service is not accessible at ${aiServiceUrl}. Ensure the AI detection service is running. Check AI_SERVICE_URL environment variable.`
              ] : []),
            ],
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: 'Network latency check failed',
            details: error.message,
          });
        }
      }

      case 'resync_camera_streams': {
        if (!worksiteId) {
          return NextResponse.json({ success: false, error: 'worksiteId is required' }, { status: 400 });
        }

        const cameras = await prisma.camera.findMany({
          where: { worksiteId },
          select: { id: true, name: true, status: true },
        });

        // Update cameras to trigger reconnection
        const result = await prisma.camera.updateMany({
          where: { worksiteId },
          data: {
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Re-sync command sent for ${cameras.length} camera streams`,
          cameras: cameras.map((c) => ({ id: c.id, name: c.name, status: c.status })),
          updated: result.count,
        });
      }

      case 'export_camera_logs': {
        if (!cameraId) {
          return NextResponse.json({ success: false, error: 'cameraId is required' }, { status: 400 });
        }

        const camera = await prisma.camera.findUnique({
          where: { id: cameraId },
          select: { id: true, name: true },
        });

        if (!camera) {
          return NextResponse.json({ success: false, error: 'Camera not found' }, { status: 404 });
        }

        // Get audit logs
        const auditLogs = await prisma.auditLog.findMany({
          where: {
            entity: 'Camera',
            entityId: cameraId,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        });

        // Get camera health records
        const healthRecords = await prisma.cameraHealth.findMany({
          where: { cameraId },
          orderBy: { lastCheck: 'desc' },
          take: 100,
        });

        // Get detections
        const detections = await prisma.detection.findMany({
          where: { cameraId },
          orderBy: { timestamp: 'desc' },
          take: 100,
          select: {
            id: true,
            timestamp: true,
            detections: true,
            metadata: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Camera logs exported for ${camera.name}`,
          camera: {
            id: camera.id,
            name: camera.name,
          },
          logs: {
            auditLogs: auditLogs.map((log) => ({
              timestamp: log.createdAt,
              action: log.action,
              user: log.user?.email || 'System',
              ipAddress: log.ipAddress,
              metadata: log.metadata,
            })),
            healthRecords: healthRecords.map((h) => ({
              timestamp: h.lastCheck,
              status: h.status,
              frameRate: h.frameRate,
              streamQuality: h.streamQuality,
              errors: h.errors,
            })),
            detections: detections.map((d) => ({
              timestamp: d.timestamp,
              detectionCount: Array.isArray(d.detections) ? d.detections.length : 0,
              metadata: d.metadata,
            })),
          },
          summary: {
            totalAuditLogs: auditLogs.length,
            totalHealthRecords: healthRecords.length,
            totalDetections: detections.length,
          },
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[admin][support][troubleshooting] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute troubleshooting action', details: error.message },
      { status: 500 }
    );
  }
}
