import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

// POST /api/alerts/[id]/reopen - Reopen a resolved/acknowledged alert
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alertId = params.id;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Fetch the alert
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        worksite: true,
        resolvedByUser: true,
        resolutionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permission - must be supervisor or above
    const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SAFETY_ADMIN', 'SUPERVISOR'];
    const userRole = user.role?.toUpperCase() || '';
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Permission denied. Only supervisors and above can reopen alerts.' }, { status: 403 });
    }

    // Check if alert is in a state that can be reopened
    const reopenableStatuses = ['ACKNOWLEDGED', 'RESOLVED', 'CONFIRMED', 'FALSE_POSITIVE', 'ARCHIVED'];
    if (!reopenableStatuses.includes(alert.status)) {
      return NextResponse.json({ 
        error: `Cannot reopen alert with status "${alert.status}". Alert is already active or snoozed.` 
      }, { status: 400 });
    }

    const previousStatus = alert.status;
    const previousResolvedBy = alert.resolvedByUser?.name || alert.resolvedByUser?.email || 'Unknown';
    const previousResolvedAt = alert.resolvedAt;

    // Update the alert to ACTIVE status
    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACTIVE',
        resolvedAt: null,
        resolvedBy: null,
        resolutionType: null,
        resolutionNotes: null,
        fpReason: null,
        snoozeUntil: null,
        updatedAt: new Date(),
      },
      include: {
        worksite: true,
        camera: true,
        rule: true,
      },
    });

    // Log the reopen action
    await prisma.alertResolutionLog.create({
      data: {
        alertId: alertId,
        userId: user.id,
        status: 'REOPENED',
        notes: reason || `Alert reopened. Previous status: ${previousStatus}. Previously resolved by: ${previousResolvedBy} at ${previousResolvedAt?.toISOString() || 'N/A'}.`,
        duration: null,
      },
    });

    // Also log to audit log
    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTIONS.ALERT_REOPENED,
      entity: 'ALERT',
      entityId: alertId,
      entityName: alert.title || `Alert ${alertId}`,
      worksiteId: alert.worksiteId || undefined,
      changes: {
        old: { status: previousStatus, resolvedBy: previousResolvedBy, resolvedAt: previousResolvedAt?.toISOString() },
        new: { status: 'ACTIVE' },
      },
      details: { reason },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        alert: updatedAlert,
        message: `Alert reopened successfully. Previous status was "${previousStatus}".`,
      },
    });
  } catch (error: any) {
    console.error('Error reopening alert:', error);
    return NextResponse.json(
      { error: 'Failed to reopen alert', details: error.message },
      { status: 500 }
    );
  }
}

