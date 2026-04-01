import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/alerts/[id]/video-clip
 * Get or generate 20-second video clip for an alert
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        worksite: true
      }
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if video clip already exists in metadata
    const metadata = alert.metadata as any;
    if (metadata?.videoClipUrl) {
      return NextResponse.json({
        success: true,
        videoClipUrl: metadata.videoClipUrl,
        duration: metadata.videoClipDuration || 20,
        cached: true
      });
    }

    // Generate video clip URL (in production, this would trigger video generation)
    // For now, we'll create a placeholder and update the alert metadata
    const cameraId = metadata?.cameraId;
    const timestamp = alert.createdAt;
    
    // Calculate clip timeframe: 5 seconds before alert, 15 seconds after
    const clipStart = new Date(timestamp.getTime() - 5000);
    const clipEnd = new Date(timestamp.getTime() + 15000);
    
    const videoClipUrl = `/api/camera-recordings/${cameraId}/clip?start=${clipStart.toISOString()}&end=${clipEnd.toISOString()}`;
    
    // Update alert with video clip information
    await prisma.alert.update({
      where: { id },
      data: {
        metadata: {
          ...metadata,
          videoClipUrl,
          videoClipDuration: 20,
          clipGenerated: true,
          clipGeneratedAt: new Date().toISOString(),
          clipTimeframe: {
            start: clipStart.toISOString(),
            end: clipEnd.toISOString()
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      videoClipUrl,
      duration: 20,
      cached: false,
      clipTimeframe: {
        start: clipStart.toISOString(),
        end: clipEnd.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error generating video clip:', error);
    return NextResponse.json(
      { error: 'Failed to generate video clip', details: error.message },
      { status: 500 }
    );
  }
}

