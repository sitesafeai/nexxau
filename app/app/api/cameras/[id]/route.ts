import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { stopHlsStream } from '@/app/lib/streaming/hlsManager';
import * as path from 'path';
import * as fs from 'fs';

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
    // PART D: STOP STREAM FIRST (CRITICAL - must happen before DB deletion)
    // ============================================================
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 1: Stopping stream process...`);
    
    try {
      // Wait for stream to fully stop (FFmpeg process must exit completely)
      const streamStopped = await stopHlsStream(trimmedCameraId);
      if (streamStopped) {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Stream process stopped for camera ${trimmedCameraId}`);
        // Give filesystem a moment to release file locks
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`[API /cameras/[id] DELETE] [${requestId}] ℹ️ No active stream found for camera ${trimmedCameraId}`);
      }
    } catch (streamError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error stopping stream (continuing with deletion):`, {
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
    // PART F: DELETE RELATED RECORDS (CASCADE)
    // ============================================================
    // Delete all related records that might block camera deletion
    // Detection model doesn't have onDelete: Cascade, so we must delete manually
    
    try {
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 3: Deleting related database records...`);
      
      // Delete Detection records (no cascade, must delete manually)
      const detectionsResult = await Promise.race([
        prisma.detection.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete detections timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${detectionsResult.count} detection records`);

      // Delete Alert records (has SetNull, but delete for cleanliness)
      const alertsResult = await Promise.race([
        prisma.alert.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete alerts timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${alertsResult.count} alert records`);

      // Delete SafetyViolation records (has SetNull, but delete for cleanliness)
      const violationsResult = await Promise.race([
        prisma.safetyViolation.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete violations timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${violationsResult.count} safety violation records`);

      // Delete CustomRule records (has SetNull, but delete for cleanliness)
      const customRulesResult = await Promise.race([
        prisma.customRule.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete custom rules timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${customRulesResult.count} custom rule records`);

      // Delete CustomRuleTrigger records
      const triggersResult = await Promise.race([
        prisma.customRuleTrigger.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete triggers timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${triggersResult.count} custom rule trigger records`);

      // Delete CustomRuleViolation records
      const ruleViolationsResult = await Promise.race([
        prisma.customRuleViolation.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete rule violations timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${ruleViolationsResult.count} custom rule violation records`);

      // Delete SMSNotification records (has SetNull, but delete for cleanliness)
      const smsResult = await Promise.race([
        prisma.sMSNotification.deleteMany({
          where: { cameraId: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete SMS notifications timeout after 15s')), 15000)
        )
      ]) as any;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted ${smsResult.count} SMS notification records`);

      // Note: TrainingImage, CameraHealth, FalsePositiveReport, TruePositiveReport have onDelete: Cascade
      // so they will be deleted automatically when camera is deleted

    } catch (relatedDeleteError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error deleting related records:`, {
        name: relatedDeleteError.name,
        message: relatedDeleteError.message,
        code: relatedDeleteError.code,
        stack: relatedDeleteError.stack
      });
      return NextResponse.json(
        {
          error: 'Failed to delete related records',
          code: 'RELATED_DELETE_ERROR',
          message: relatedDeleteError.message || 'Database error while deleting related records'
        },
        { status: relatedDeleteError.message?.includes('timeout') ? 504 : 500 }
      );
    }

    // ============================================================
    // PART G: DELETE CAMERA RECORD (FINAL STEP)
    // ============================================================
    console.log(`[API /cameras/[id] DELETE] [${requestId}] Step 4: Deleting camera record...`);
    
    try {
      const deleteStart = Date.now();
      const deleteResult = await Promise.race([
        prisma.camera.delete({
          where: { id: trimmedCameraId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Delete camera timeout after 15s')), 15000)
        )
      ]) as any;
      const deleteDuration = Date.now() - deleteStart;
      
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Camera deleted successfully (${deleteDuration}ms)`);
      console.log(`[API /cameras/[id] DELETE] [${requestId}] Deleted camera:`, {
        id: deleteResult.id,
        name: deleteResult.name,
        worksiteId: deleteResult.worksiteId
      });
      
      const totalDuration = Date.now() - startTime;
      console.log(`[API /cameras/[id] DELETE] [${requestId}] ✅ Total deletion completed in ${totalDuration}ms`);

      // Return 204 No Content (as per REST best practices for DELETE)
      return new NextResponse(null, { status: 204 });

    } catch (deleteError: any) {
      console.error(`[API /cameras/[id] DELETE] [${requestId}] ❌ Error deleting camera record:`, {
        name: deleteError.name,
        message: deleteError.message,
        code: deleteError.code,
        meta: deleteError.meta,
        stack: deleteError.stack
      });
      
      // Return the REAL error message, not a generic one
      return NextResponse.json(
        {
          error: 'Failed to delete camera',
          code: deleteError.code || 'DELETE_ERROR',
          message: deleteError.message || 'Unknown database error',
          details: deleteError.meta || undefined
        },
        { status: deleteError.message?.includes('timeout') ? 504 : 500 }
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

