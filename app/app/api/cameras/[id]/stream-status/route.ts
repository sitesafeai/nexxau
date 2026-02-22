import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getMountpointInfo } from '@/app/lib/services/janusRtspService';
import { getRtpStreamStatus } from '@/app/lib/services/cameraIngestClient';
import { resolveRtpPort } from '@/app/api/worksites/[id]/cameras/route';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: cameraId } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        streamUrl: true,
        janusFeedId: true,
        metadata: true,
      },
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const metadata = camera.metadata as any;
    const inputCodec = metadata?.inputCodec || 'unknown';
    const needsTranscoding = inputCodec === 'hevc' || inputCodec === 'h265';

    const status: any = {
      cameraId: camera.id,
      cameraName: camera.name,
      rtspUrl: camera.streamUrl,
      janusFeedId: camera.janusFeedId,
      rtpPort: null,
      inputCodec: inputCodec,
      transcodingRequired: needsTranscoding,
      mountpointStatus: 'unknown',
      rtpWorkerStatus: 'unknown',
      issues: [],
      diagnostics: {
        codecInfo: {
          input: inputCodec,
          output: 'h264',
          transcoding: needsTranscoding,
        },
        mountpoint: {},
        rtpWorker: {},
      },
    };

    let mountpointInfo: any | null = null;

    if (camera.janusFeedId) {
      status.rtpPort = metadata?.janusRtpPort || resolveRtpPort(Number(camera.janusFeedId));

      // Check Janus Mountpoint
      try {
        mountpointInfo = await getMountpointInfo(Number(camera.janusFeedId));
        if (mountpointInfo) {
          status.mountpointStatus = 'exists';
          status.mountpointInfo = mountpointInfo;
          status.diagnostics.mountpoint = {
            id: mountpointInfo.id,
            videoPort: mountpointInfo.videoport,
            videoCodec: mountpointInfo.videocodec,
            videoPayloadType: mountpointInfo.videopt,
            name: mountpointInfo.name,
            description: mountpointInfo.description,
          };
          
          // Check if mountpoint is receiving data
          if (mountpointInfo.videoport !== status.rtpPort) {
            status.issues.push(`Port mismatch: Expected ${status.rtpPort}, Got ${mountpointInfo.videoport}`);
          }
          
          // Check codec mismatch
          const expectedCodec = (process.env.JANUS_RTP_CODEC || 'h264').toLowerCase();
          if (mountpointInfo.videocodec?.toLowerCase() !== expectedCodec) {
            status.issues.push(`Codec mismatch: Expected ${expectedCodec}, Got ${mountpointInfo.videocodec}`);
          }
          
          // Check payload type mismatch
          const expectedPayloadType = Number(process.env.JANUS_RTP_PAYLOAD_TYPE || '96');
          
          // Add detailed configuration comparison
          status.diagnostics.configComparison = {
            ffmpeg: {
              rtpHost: process.env.JANUS_RTP_HOST || '127.0.0.1',
              rtpPort: status.rtpPort,
              payloadType: expectedPayloadType,
              codec: 'h264',
              rtpMap: 'H264/90000'
            },
            janus: {
              videoPort: mountpointInfo.videoport,
              videoPayloadType: mountpointInfo.videopt,
              videoCodec: mountpointInfo.videocodec,
              videoRtpMap: mountpointInfo.videortpmap || 'H264/90000'
            },
            match: {
              port: mountpointInfo.videoport === status.rtpPort,
              payloadType: mountpointInfo.videopt === expectedPayloadType,
              codec: mountpointInfo.videocodec?.toLowerCase() === 'h264'
            }
          };
          if (mountpointInfo.videopt !== expectedPayloadType) {
            status.issues.push(`Payload type mismatch: Expected ${expectedPayloadType}, Got ${mountpointInfo.videopt}`);
          }
        } else {
          status.mountpointStatus = 'not_found';
          status.issues.push(`Mountpoint ${camera.janusFeedId} not found in Janus`);
        }
      } catch (janusError: any) {
        status.mountpointStatus = 'error';
        status.issues.push(`Error checking mountpoint: ${janusError.message}`);
        status.diagnostics.mountpoint = { error: janusError.message };
      }
    } else {
      status.issues.push('Camera missing janusFeedId');
    }

    // Check RTP Worker
    try {
      const rtpStatus = await getRtpStreamStatus(camera.id);
      if (rtpStatus.success && rtpStatus.data) {
        status.rtpWorkerStatus = rtpStatus.data.status || 'unknown';
        status.rtpWorkerInfo = rtpStatus.data;
        status.diagnostics.rtpWorker = {
          status: rtpStatus.data.status,
          isProcessRunning: rtpStatus.data.isProcessRunning || false,
          failureCount: rtpStatus.data.failureCount || 0,
          lastFailureAt: rtpStatus.data.lastFailureAt,
          startedAt: rtpStatus.data.startedAt,
          rtspUrl: rtpStatus.data.rtspUrl,
          rtpHost: rtpStatus.data.rtpHost,
          rtpPort: rtpStatus.data.rtpPort,
          payloadType: rtpStatus.data.payloadType,
          videoCodec: rtpStatus.data.videoCodec,
          inputCodec: rtpStatus.data.inputCodec,
        };
        
        // Calculate uptime
        if (rtpStatus.data.startedAt) {
          const startedAt = new Date(rtpStatus.data.startedAt).getTime();
          const uptime = Date.now() - startedAt;
          status.diagnostics.rtpWorker.uptimeSeconds = Math.round(uptime / 1000);
          status.diagnostics.rtpWorker.uptimeMinutes = Math.round(uptime / 60000);
        }
        
        // Verify configuration matches Janus mountpoint (only if we successfully fetched it above)
        if (mountpointInfo) {
          const portMatch = rtpStatus.data.rtpPort === mountpointInfo.videoport;
          const payloadMatch = rtpStatus.data.payloadType === mountpointInfo.videopt;
          const codecMatch = (rtpStatus.data.videoCodec || 'h264').toLowerCase() === (mountpointInfo.videocodec || 'h264').toLowerCase();
          
          if (!portMatch) {
            status.issues.push(`RTP port mismatch: FFmpeg sending to ${rtpStatus.data.rtpPort}, Janus listening on ${mountpointInfo.videoport}`);
          }
          if (!payloadMatch) {
            status.issues.push(`Payload type mismatch: FFmpeg using ${rtpStatus.data.payloadType}, Janus expecting ${mountpointInfo.videopt}`);
          }
          if (!codecMatch) {
            status.issues.push(`Codec mismatch: FFmpeg using ${rtpStatus.data.videoCodec}, Janus expecting ${mountpointInfo.videocodec}`);
          }
          
          status.diagnostics.configMatch = {
            port: portMatch,
            payloadType: payloadMatch,
            codec: codecMatch,
            allMatch: portMatch && payloadMatch && codecMatch
          };
        }
        
        if (rtpStatus.data.status !== 'RUNNING') {
          status.issues.push(`RTP worker status: ${rtpStatus.data.status}`);
        }
        
        if (!rtpStatus.data.isProcessRunning) {
          status.issues.push('FFmpeg process is not running');
        }
        
        // Check if process has been failing
        if (rtpStatus.data.failureCount > 0) {
          const lastFailure = rtpStatus.data.lastFailureAt 
            ? new Date(rtpStatus.data.lastFailureAt).getTime() 
            : 0;
          const timeSinceFailure = Date.now() - lastFailure;
          if (timeSinceFailure < 60000) { // Less than 1 minute ago
            status.issues.push(`RTP worker has ${rtpStatus.data.failureCount} failures (last failure ${Math.round(timeSinceFailure / 1000)}s ago)`);
          } else {
            status.issues.push(`RTP worker has ${rtpStatus.data.failureCount} historical failures`);
          }
        }
      } else {
        status.rtpWorkerStatus = 'not_found';
        status.issues.push('RTP worker not found or not responding');
        status.diagnostics.rtpWorker = { error: 'RTP worker not found in camera-ingest-service' };
      }
    } catch (rtpError: any) {
      status.rtpWorkerStatus = 'error';
      status.issues.push(`Error checking RTP worker: ${rtpError.message}`);
      status.diagnostics.rtpWorker = { error: rtpError.message };
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error(`[API /cameras/${cameraId}/stream-status] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get stream status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
