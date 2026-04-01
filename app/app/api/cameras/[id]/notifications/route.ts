/**
 * PATCH /api/cameras/:id/notifications
 *
 * Toggle per-camera SMS person-detection alerts (Twilio).
 * Updates metadata.personAlertsEnabled (default: false).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = normalizeRole(session.user.role);
    const canToggle =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'SITE_ADMIN' ||
      userRole === 'SAFETY_MANAGER';

    if (!canToggle) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id: cameraId } = await params;
    const body = await request.json();
    const enabled = body.notifications_enabled ?? body.enabled ?? false;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'notifications_enabled must be a boolean' },
        { status: 400 }
      );
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { id: true, metadata: true },
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const metadata = (camera.metadata as Record<string, unknown>) || {};
    const updatedMetadata = { ...metadata, personAlertsEnabled: enabled };

    await prisma.camera.update({
      where: { id: cameraId },
      data: { metadata: updatedMetadata },
    });

    // Forward to YOLO service for immediate effect (no wait for 60s sync)
    const yoloUrl = process.env.YOLO_SERVICE_URL || 'http://localhost:5001';
    try {
      await fetch(`${yoloUrl.replace(/\/$/, '')}/notifications/${cameraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: enabled }),
      });
    } catch {
      // YOLO service may be unreachable; next sync will pick up the change
    }

    return NextResponse.json({
      success: true,
      camera_id: cameraId,
      notifications_enabled: enabled,
    });
  } catch (error: unknown) {
    console.error('[API /cameras/:id/notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
