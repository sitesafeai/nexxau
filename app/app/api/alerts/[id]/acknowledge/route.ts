import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * POST /api/alerts/[id]/acknowledge
 * Multi-step alert acknowledgment with audit trail
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      note,
      actionTaken,
      severity,
      requiresFollowUp,
      followUpDate,
      notifyOthers,
      notificationList
    } = body;

    // Get existing alert
    const existingAlert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: {
        worksite: true
      }
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (existingAlert.status === 'ACKNOWLEDGED' || existingAlert.status === 'RESOLVED') {
      return NextResponse.json(
        { error: 'Alert has already been acknowledged or resolved' },
        { status: 400 }
      );
    }

    // Perform multi-step acknowledgment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Update alert status
      const updatedAlert = await tx.alert.update({
        where: { id: params.id },
        data: {
          status: 'ACKNOWLEDGED',
          metadata: {
            ...(existingAlert.metadata as any || {}),
            acknowledgment: {
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email
              },
              note: note || null,
              actionTaken: actionTaken || null,
              severityAssessment: severity || existingAlert.severity,
              requiresFollowUp: requiresFollowUp || false,
              followUpDate: followUpDate || null,
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          }
        },
        include: {
          worksite: true,
          rule: true
        }
      });

      // Step 2: Create acknowledgment log in AlertResponse table
      await tx.alertResponse.create({
        data: {
          alertId: params.id,
          userId: session.user.id,
          response: 'ACKNOWLEDGED',
          note: note || null,
          metadata: {
            actionTaken,
            severityAssessment: severity,
            requiresFollowUp,
            followUpDate
          },
          createdAt: new Date()
        }
      });

      // Step 3: Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ACKNOWLEDGE_ALERT',
          entity: 'Alert',
          entityId: params.id,
          changes: {
            from: { status: existingAlert.status },
            to: { status: 'ACKNOWLEDGED' },
            note,
            actionTaken,
            requiresFollowUp
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date()
        }
      });

      // Step 4: If follow-up is required, create a follow-up task/notification
      if (requiresFollowUp && followUpDate) {
        await tx.notification.create({
          data: {
            userId: session.user.id,
            title: `Follow-up Required: ${updatedAlert.title}`,
            message: `Follow-up needed for alert at ${updatedAlert.location}. ${note || ''}`,
            type: 'ALERT',
            priority: 'HIGH',
            metadata: {
              alertId: params.id,
              followUpDate,
              originalAlert: {
                title: updatedAlert.title,
                location: updatedAlert.location,
                severity: updatedAlert.severity
              }
            }
          }
        });
      }

      // Step 5: Notify other users if requested
      if (notifyOthers && notificationList && notificationList.length > 0) {
        for (const userId of notificationList) {
          await tx.notification.create({
            data: {
              userId,
              title: `Alert Acknowledged: ${updatedAlert.title}`,
              message: `${session.user.name} acknowledged an alert at ${updatedAlert.location}. ${note || ''}`,
              type: 'ALERT',
              priority: 'NORMAL',
              metadata: {
                alertId: params.id,
                acknowledgedBy: session.user.name,
                actionTaken
              }
            }
          });
        }
      }

      return updatedAlert;
    });

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert: result,
      acknowledgment: {
        acknowledgedBy: session.user.name,
        acknowledgedAt: new Date().toISOString(),
        requiresFollowUp
      }
    });

  } catch (error: any) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert', details: error.message },
      { status: 500 }
    );
  }
}

