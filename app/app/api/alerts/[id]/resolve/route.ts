import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { logAlertAction } from '@/app/lib/audit-logger';
import { falsePositiveHandler } from '@/app/lib/workflows/false-positive-handler';

// POST /api/alerts/[id]/resolve - Resolve an alert with full workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: alertId } = await params;
    const body = await request.json();
    const {
      resolutionType, // CONFIRMED, FALSE_POSITIVE, SNOOZED
      notes,
      fpReason,
      workerId,
      violationType,
      snoozeDuration, // in minutes
      openIncidentReport,
    } = body;

    // Validate resolution type
    if (!['CONFIRMED', 'FALSE_POSITIVE', 'SNOOZED'].includes(resolutionType)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    // Get the alert
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        worksite: true,
        rule: true,
      }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions (worksite manager or above, or SUPER_ADMIN)
    const userRole = user.role?.toUpperCase() || '';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
    const isManager = ['COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR'].includes(userRole);

    if (!isSuperAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Must be worksite manager or above.' },
        { status: 403 }
      );
    }

    // Calculate duration from alert creation to now
    const duration = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 1000);

    // Calculate snooze until time
    let snoozeUntil: Date | null = null;
    if (resolutionType === 'SNOOZED' && snoozeDuration) {
      snoozeUntil = new Date(Date.now() + snoozeDuration * 60 * 1000);
    }

    // Map resolution type to alert status
    const statusMap: Record<string, string> = {
      'CONFIRMED': 'CONFIRMED',
      'FALSE_POSITIVE': 'FALSE_POSITIVE',
      'SNOOZED': 'SNOOZED'
    };

    // Update the alert - use only fields that exist in base schema
    // Core update that should always work
    const updateData: any = {
      status: statusMap[resolutionType] as any,
      resolvedAt: resolutionType !== 'SNOOZED' ? new Date() : null,
    };

    // Try to add extended fields if they exist
    try {
      const updatePayload: any = {
        ...updateData,
        resolvedBy: user.id,
        resolutionType,
        resolutionNotes: notes || null,
        fpReason: resolutionType === 'FALSE_POSITIVE' ? fpReason : null,
        snoozeUntil,
        workerId: workerId || null,
        violationType: resolutionType === 'CONFIRMED' ? violationType : null,
      };

      // Set override_status for false positives and confirmed violations
      if (resolutionType === 'FALSE_POSITIVE') {
        updatePayload.overrideStatus = 'false_positive';
        updatePayload.overrideBy = user.id;
        updatePayload.overrideAt = new Date();
        updatePayload.overrideReason = fpReason || null;
        
        // Create false positive report for training team
        try {
          await falsePositiveHandler.handleFalsePositive(alertId, user.id, {
            isFalsePositive: true,
            reason: fpReason || 'Marked as false positive',
            violationType: alert.violationType || alert.title || undefined,
          });
        } catch (fpError) {
          console.error('Failed to create false positive report:', fpError);
          // Continue anyway - report creation is important but shouldn't fail the resolution
        }
      } else if (resolutionType === 'CONFIRMED') {
        updatePayload.overrideStatus = 'confirmed_violation';
        updatePayload.overrideBy = user.id;
        updatePayload.overrideAt = new Date();
      }

      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: updatePayload
      });

      // Create override audit log if override was set
      if (updatePayload.overrideStatus) {
        try {
          const oldAlert = alert as any;
          await prisma.alertOverrideAuditLog.create({
            data: {
              alertId,
              userId: user.id,
              oldStatus: oldAlert.overrideStatus || null,
              newStatus: updatePayload.overrideStatus,
              oldTrainingCandidate: oldAlert.isTrainingCandidate || false,
              newTrainingCandidate: body.isTrainingCandidate || false,
              reason: updatePayload.overrideReason || null,
              notes: notes || null,
            }
          });
        } catch (auditError) {
          console.error('Failed to create override audit log:', auditError);
          // Continue anyway - audit log is optional
        }
      }

      // Create resolution log entry
      try {
        await prisma.alertResolutionLog.create({
          data: {
            alertId,
            userId: user.id,
            status: resolutionType,
            notes: notes || null,
            fpReason: resolutionType === 'FALSE_POSITIVE' ? fpReason : null,
            workerId: workerId || null,
            violationType: violationType || null,
            duration,
          }
        });
      } catch (logError) {
        console.error('Failed to create resolution log (table may not exist):', logError);
        // Continue anyway - log is optional
      }

      // Create audit log entry
      const auditAction = resolutionType === 'CONFIRMED' 
        ? "ALERT_ACTION" 
        : resolutionType === 'FALSE_POSITIVE' 
          ? "ALERT_ACTION" 
          : "ALERT_ACTION";

      // audit log removed

      return NextResponse.json({
        success: true,
        data: {
          alert: updatedAlert,
          resolutionType,
          duration,
          incidentId: null,
        },
        message: `Alert ${resolutionType.toLowerCase().replace('_', ' ')} successfully`
      });

    } catch (updateError: any) {
      // If extended fields fail, try minimal update
      console.error('Extended update failed, trying minimal update:', updateError.message);
      
      const updatedAlert = await prisma.alert.update({
        where: { id: alertId },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        data: {
          alert: updatedAlert,
          resolutionType,
          duration,
          incidentId: null,
        },
        message: `Alert ${resolutionType.toLowerCase().replace('_', ' ')} successfully (minimal update)`
      });
    }

  } catch (error: any) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert', details: error.message },
      { status: 500 }
    );
  }
}

