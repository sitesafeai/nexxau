import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { enforceCompanyScope } from '@/app/lib/auth-scope';
import { stopHlsStream } from '@/app/lib/streaming/hlsManager';
import { stopRtpPush } from '@/app/lib/services/cameraIngestClient';
import { removeStreamFromMediaMTX } from '@/app/lib/services/mediamtxClient';
import * as path from 'path';
import * as fs from 'fs';

function maskRtspCreds(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  return url.replace(/^(rtsp:\/\/)([^@/]+)@/i, '$1***@');
}

/**
 * DELETE /api/cameras/[id]
 * 
 * Delete a camera from the database and stop all associated streams.
 * 
 * Side effects (ALL REQUIRED):
 * - Stop FFmpeg/HLS stream for that camera
 * - Kill associated FFmpeg process
 * - Remove camera from active stream registry
 * - Delete camera record from database
 * - Remove HLS files: app/public/streams/{cameraId}/
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  try {
    // ============================================================
    // PART A: AUTHENTICATION & AUTHORIZATION
    // ============================================================
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Request received at:`, new Date().toISOString());
    
    // 1. Validate authenticated user exists
    let session;
    try {
      const sessionStart = Date.now();
      session = await Promise.race([
        getServerSession(authOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session lookup timeout after 5s')), 5000)
        )
      ]) as any;
      const sessionDuration = Date.now() - sessionStart;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Session lookup took ${sessionDuration}ms`);
    } catch (sessionError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Session lookup failed:`, {
        name: sessionError.name,
        message: sessionError.message,
        stack: sessionError.stack
      });
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: 'SESSION_ERROR',
          message: sessionError.message?.includes('timeout') 
            ? 'Session lookup timed out' 
            : 'Failed to validate session'
        },
        { status: sessionError.message?.includes('timeout') ? 504 : 401 }
      );
    }
    
    if (!session?.user) {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ❌ Unauthorized: No session`);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userRole = normalizeRole(session.user.role);
    
    console.log(`[API /cameras/[id] DELETE] [${requestId}] User authenticated:`, {
      userId,
      email: userEmail,
      role: userRole
    });

    // 2. Check delete permissions
    const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ❌ Forbidden: Role ${userRole} cannot delete cameras`);
      return NextResponse.json(
        { 
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role ${userRole} does not have permission to delete cameras`
        },
        { status: 403 }
      );
    }

    // ============================================================
    // PART B: VALIDATE REQUEST PARAMETERS
    // ============================================================
    const { id: cameraId } = await params;
    const trimmedCameraId = cameraId?.trim();

    if (!trimmedCameraId || trimmedCameraId.length === 0) {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ❌ Invalid camera ID:`, cameraId);
      return NextResponse.json(
        { 
          error: 'Camera ID is required',
          code: 'INVALID_CAMERA_ID'
        },
        { status: 400 }
      );
    }

    console.log(`[API /cameras/[id] DELETE] [${requestId}] Camera ID:`, trimmedCameraId);

    // ============================================================
    // PART C: VERIFY CAMERA EXISTS & USER HAS ACCESS
    // ============================================================
    let camera;
    try {
      const cameraQueryStart = Date.now();
      camera = await Promise.race([
        prisma.camera.findUnique({
          where: { id: trimmedCameraId },
          select: { 
            id: true, 
            name: true, 
            worksiteId: true,
            worksite: {
              select: {
                id: true,
                companyId: true
              }
            }
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Camera query timeout after 10s')), 10000)
        )
      ]) as any;
      const cameraQueryDuration = Date.now() - cameraQueryStart;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Camera query took ${cameraQueryDuration}ms`);
    } catch (dbError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Database error fetching camera:`, {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      return NextResponse.json(
        {
          error: 'Database error',
          code: 'DATABASE_ERROR',
          message: dbError.message || 'Failed to fetch camera from database'
        },
        { status: dbError.message?.includes('timeout') ? 504 : 500 }
      );
    }

    if (!camera) {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ❌ Camera not found:`, trimmedCameraId);
      return NextResponse.json(
        { 
          error: 'Camera not found',
          code: 'CAMERA_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    console.log(`[API /cameras/[id] DELETE] [${requestId}] Camera found:`, {
      id: camera.id,
      name: camera.name,
      worksiteId: camera.worksiteId
    });

    // 3. Verify user has access to the worksite
    if (userRole !== 'SUPER_ADMIN') {
      let hasAccess = false;
      
      if (userRole === 'COMPANY_ADMIN') {
        // COMPANY_ADMIN can delete cameras in their company's worksites
        try {
          const userCompany = await Promise.race([
            prisma.user.findUnique({
              where: { id: userId },
              select: { companyId: true }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('User query timeout after 5s')), 5000)
            )
          ]) as any;
          
          if (userCompany?.companyId && camera.worksite?.companyId === userCompany.companyId) {
            hasAccess = true;
          }
        } catch (err: any) {
          console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error checking company access:`, err);
          return NextResponse.json(
            {
              error: 'Database error',
              code: 'DATABASE_ERROR',
              message: 'Failed to verify access permissions'
            },
            { status: 500 }
          );
        }
      } else if (userRole === 'SITE_ADMIN') {
        // SITE_ADMIN can delete cameras in worksites they have access to
        try {
          const worksiteAccess = await Promise.race([
            prisma.worksiteUser.findFirst({
              where: {
                userId: userId,
                worksiteId: camera.worksiteId,
                role: 'SITE_ADMIN'
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Worksite access query timeout after 5s')), 5000)
            )
          ]) as any;
          
          hasAccess = !!worksiteAccess;
        } catch (err: any) {
          console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error checking worksite access:`, err);
          return NextResponse.json(
            {
              error: 'Database error',
              code: 'DATABASE_ERROR',
              message: 'Failed to verify access permissions'
            },
            { status: 500 }
          );
        }
      }

      if (!hasAccess) {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ❌ Forbidden: User does not have access to worksite:`, camera.worksiteId);
        return NextResponse.json(
          { 
            error: 'Forbidden',
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to delete cameras in this worksite'
          },
          { status: 403 }
        );
      }
    }

    console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ All guards passed. Starting deletion process...`);

    // ============================================================
    // PART D: STOP ALL STREAMS AND CLEANUP INFRASTRUCTURE
    // ============================================================
    
    // Step 1: Stop RTP worker (camera-ingest-service)
    if (camera.janusFeedId) {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 1a: Stopping RTP worker...`);
      try {
        const rtpStopResult = await stopRtpPush({ cameraId: trimmedCameraId });
        if (rtpStopResult.success) {
          console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ RTP worker stopped for camera ${trimmedCameraId}`);
        } else {
          console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ RTP worker not found or already stopped for camera ${trimmedCameraId}`);
        }
      } catch (rtpError: any) {
        console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error stopping RTP worker (continuing with deletion):`, {
          name: rtpError.name,
          message: rtpError.message,
        });
        // Continue with deletion even if RTP stop fails
      }
    } else {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ No janusFeedId, skipping RTP worker stop`);
    }

    // Step 2: Remove stream from MediaMTX (camera ID is stream name)
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 1b: Removing stream from MediaMTX...`);
    try {
      const mediamtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9000';
      const removed = await removeStreamFromMediaMTX(mediamtxApiUrl, trimmedCameraId);
      if (removed) {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Stream removed from MediaMTX`);
      } else {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ Stream not found in MediaMTX or already removed`);
      }
    } catch (mediamtxError: any) {
      console.warn(`[API /cameras/[id] DELETE] [${requestId}] ⚠️ Error removing from MediaMTX (continuing):`, mediamtxError?.message);
    }

    // Step 3: Stop HLS stream (if exists)
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 1c: Stopping HLS stream process...`);
    try {
      // Wait for stream to fully stop (FFmpeg process must exit completely)
      const streamStopped = await stopHlsStream(trimmedCameraId);
      if (streamStopped) {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ HLS stream process stopped for camera ${trimmedCameraId}`);
        // Give filesystem a moment to release file locks
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ No active HLS stream found for camera ${trimmedCameraId}`);
      }
    } catch (streamError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error stopping HLS stream (continuing with deletion):`, {
        name: streamError.name,
        message: streamError.message,
        stack: streamError.stack
      });
      // Continue with deletion even if stream stop fails
    }

    // ============================================================
    // PART E: DELETE STREAM FILES (must happen after stream is stopped)
    // ============================================================
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 2: Removing stream files...`);
    
    try {
      const cwd = process.cwd();
      let streamDir: string;
      
      if (fs.existsSync(path.join(cwd, 'public'))) {
        streamDir = path.join(cwd, 'public', 'streams', trimmedCameraId);
      } else if (fs.existsSync(path.join(cwd, 'app', 'public'))) {
        streamDir = path.join(cwd, 'app', 'public', 'streams', trimmedCameraId);
      } else {
        streamDir = path.join(cwd, 'public', 'streams', trimmedCameraId);
      }

      if (fs.existsSync(streamDir)) {
        // Remove all files in the directory
        const files = fs.readdirSync(streamDir);
        let filesDeleted = 0;
        files.forEach((file) => {
          try {
            fs.unlinkSync(path.join(streamDir, file));
            filesDeleted++;
          } catch (err) {
            console.warn(`[API /cameras/[id] DELETE] [${requestId}] Warning: Failed to delete file ${file}:`, err);
          }
        });

        // Remove the directory itself
        try {
          fs.rmdirSync(streamDir);
          console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Removed stream directory: ${streamDir} (${filesDeleted} files deleted)`);
        } catch (err) {
          console.warn(`[API /cameras/[id] DELETE] [${requestId}] Warning: Failed to remove directory:`, err);
        }
      } else {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ Stream directory not found: ${streamDir}`);
      }
    } catch (fileError: any) {
      console.warn(`[API /cameras/[id] DELETE] [${requestId}] Warning: Error removing stream files (continuing):`, fileError.message);
      // Continue with deletion even if file removal fails
    }

    // ============================================================
    // PART F/G: TRANSACTIONAL DB CLEANUP + CAMERA DELETE
    // ============================================================
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 3: Transactional delete of related records + camera...`);

    try {
      const deleteStart = Date.now();
      const deleteSummary = await Promise.race([
        prisma.$transaction(async (tx) => {
          const detectionsResult = await tx.detection.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const alertRows = await tx.alert.findMany({
            where: { cameraId: trimmedCameraId },
            select: { id: true }
          });
          const alertIds = alertRows.map((a) => a.id);

          let alertResponsesDeleted = 0;
          let alertResolutionLogsDeleted = 0;
          if (alertIds.length > 0) {
            const alertResponsesResult = await tx.alertResponse.deleteMany({
              where: { alertId: { in: alertIds } }
            });
            alertResponsesDeleted = alertResponsesResult.count;

            const alertResolutionLogsResult = await tx.alertResolutionLog.deleteMany({
              where: { alertId: { in: alertIds } }
            });
            alertResolutionLogsDeleted = alertResolutionLogsResult.count;
          }

          const alertsResult = await tx.alert.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const violationsResult = await tx.safetyViolation.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const customRulesResult = await tx.customRule.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const triggersResult = await tx.customRuleTrigger.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const ruleViolationsResult = await tx.customRuleViolation.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const smsResult = await tx.sMSNotification.deleteMany({
            where: { cameraId: trimmedCameraId }
          });

          const cameraDeleteResult = await tx.camera.delete({
            where: { id: trimmedCameraId },
            select: {
              id: true,
              name: true,
              worksiteId: true
            }
          });

          return {
            detectionsDeleted: detectionsResult.count,
            alertResponsesDeleted,
            alertResolutionLogsDeleted,
            alertsDeleted: alertsResult.count,
            violationsDeleted: violationsResult.count,
            customRulesDeleted: customRulesResult.count,
            triggersDeleted: triggersResult.count,
            ruleViolationsDeleted: ruleViolationsResult.count,
            smsDeleted: smsResult.count,
            camera: cameraDeleteResult
          };
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transactional delete timeout after 20s')), 20000)
        )
      ]) as any;

      const deleteDuration = Date.now() - deleteStart;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Transactional delete completed (${deleteDuration}ms):`, deleteSummary);

      // Write audit log for camera removal
      prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: 'CAMERA_REMOVED',
          entity: 'CAMERA',
          entityId: trimmedCameraId,
          worksiteId: camera.worksiteId || null,
          metadata: {
            entityName: camera.name,
            severity: 'WARNING',
            result: 'SUCCESS',
            details: { deletedBy: userEmail },
          },
        },
      }).catch(() => {});

      const totalDuration = Date.now() - startTime;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Total deletion completed in ${totalDuration}ms`);

      return new NextResponse(null, { status: 204 });
    } catch (deleteError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error during transactional delete:`, {
        name: deleteError.name,
        message: deleteError.message,
        code: deleteError.code,
        meta: deleteError.meta,
        stack: deleteError.stack
      });

      const status =
        deleteError?.code === 'P2025' ? 404 :
        deleteError?.code?.startsWith?.('P20') ? 409 :
        deleteError.message?.includes('timeout') ? 504 :
        500;

      return NextResponse.json(
        {
          error: 'Failed to delete camera',
          code: deleteError.code || 'DELETE_ERROR',
          message: deleteError.message || 'Database error during camera deletion',
          details: deleteError.meta || undefined
        },
        { status }
      );
    }

  } catch (error: any) {
    console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Unexpected error in DELETE handler:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'Failed to delete camera',
        code: 'UNEXPECTED_ERROR',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cameras/[id]
 * Returns full camera details for settings/info display.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cameraId } = await params;
    if (!cameraId?.trim()) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        streamUrl: true,
        location: true,
        zone: true,
        ipAddress: true,
        port: true,
        username: true,
        password: true,
        rtspPath: true,
        hlsUrl: true,
        mediamtxPath: true,
        janusFeedId: true,
        metadata: true,
        worksiteId: true,
        createdAt: true,
        updatedAt: true,
        worksite: { select: { companyId: true } },
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const scopeCheck = await enforceCompanyScope({
      session,
      resourceCompanyId: camera.worksite?.companyId ?? null,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status });
    }

    // Return a safe copy: mask stored password and strip RTSP credentials from streamUrl
    const { worksite: _worksite, ...rest } = camera as any;
    const safe = {
      ...rest,
      password: rest.password ? '••••••••' : null,
      streamUrl: maskRtspCreds(rest.streamUrl),
    };

    return NextResponse.json(safe);
  } catch (error: any) {
    console.error('[API /cameras/[id] GET] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch camera' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cameras/[id]
 * Update camera (name, streamUrl, location, metadata).
 * Janus streams (janusFeedId) are deprecated; use RTSP + MediaMTX.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = normalizeRole(session.user.role);
    const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: cameraId } = await params;
    if (!cameraId?.trim()) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.janusFeedId !== undefined && body.janusFeedId !== null) {
      return NextResponse.json(
        { error: 'Janus streams deprecated. Add cameras with RTSP URL for MediaMTX streaming.' },
        { status: 410 }
      );
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: {
        id: true,
        metadata: true,
        worksite: { select: { companyId: true } },
      },
    });
    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const scopeCheck = await enforceCompanyScope({
      session,
      resourceCompanyId: camera.worksite?.companyId ?? null,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.streamUrl === 'string') data.streamUrl = body.streamUrl.trim() || null;
    if (typeof body.location === 'string') data.location = body.location.trim() || null;
    if (typeof body.zone === 'string') data.zone = body.zone.trim() || null;
    if (body.metadata && typeof body.metadata === 'object') {
      const ALLOWED_META_KEYS = new Set(['aiEnabled', 'recording', 'overlayEnabled', 'frameRate', 'resolution']);
      const sanitizedMeta: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body.metadata as Record<string, unknown>)) {
        if (ALLOWED_META_KEYS.has(k)) sanitizedMeta[k] = v;
      }
      data.metadata = { ...(camera.metadata as object || {}), ...sanitizedMeta };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update (name, streamUrl, location, metadata)' },
        { status: 400 }
      );
    }

    const updated = await prisma.camera.update({
      where: { id: cameraId.trim() },
      data,
      select: {
        id: true,
        name: true,
        streamUrl: true,
        status: true,
        location: true,
        zone: true,
        metadata: true,
        worksiteId: true,
      },
    });

    // Write audit log for camera edit
    {
      const currentUserRecord = await prisma.user.findUnique({
        where: { email: session.user.email || '' },
        select: { id: true },
      }).catch(() => null);
      prisma.auditLog.create({
        data: {
          userId: currentUserRecord?.id || null,
          action: 'CAMERA_EDITED',
          entity: 'CAMERA',
          entityId: cameraId.trim(),
          worksiteId: updated.worksiteId || null,
          metadata: {
            entityName: updated.name,
            severity: 'INFO',
            result: 'SUCCESS',
            details: { updatedFields: Object.keys(data) },
          },
          changes: { old: {}, new: data },
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[API /cameras/[id] PATCH] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}
