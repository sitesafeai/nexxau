/**
 * GET /api/cameras/:id/detections
 *
 * Returns real-time detection data for a camera (e.g. YOLO person/PPE).
 * Mock implementation returns sample data until backend/Janus VM provides real detections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface DetectionItem {
  id: number;
  label: string;
  confidence: number;
}

/**
 * GET - Returns list of detections for the camera.
 * Mock: [{ label: "Person", confidence: 0.94, id: 1 }] so UI is ready when real data arrives.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DetectionItem[] | { error: string }>> {
  try {
    const { id: cameraId } = await params;

    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Replace with real detection source (e.g. Janus VM, Redis, WebSocket).
    // Mock response so the fullscreen detection sidebar is ready when real data arrives.
    const mockDetections: DetectionItem[] = [
      { id: 1, label: 'Person', confidence: 0.94 },
    ];

    return NextResponse.json(mockDetections);
  } catch (e) {
    console.error('[detections]', e);
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    );
  }
}
