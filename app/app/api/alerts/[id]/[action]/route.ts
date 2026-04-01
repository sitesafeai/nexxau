import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/alerts/[id]/[action] - Perform state transition on alert
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const body = await request.json();

    // Validate alert exists
    const existingAlert = await prisma.alert.findUnique({
      where: { id },
      include: {
        rule: true,
        worksite: true
      }
    });

    if (!existingAlert) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Alert not found' 
        }, 
        { status: 404 }
      );
    }

    let updatedAlert;
    let message = '';

    switch (action) {
      case 'acknowledge':
        // ACTIVE → ACKNOWLEDGED
        if (existingAlert.status !== 'ACTIVE') {
          return NextResponse.json(
            { 
              success: false,
              error: `Cannot acknowledge alert with status ${existingAlert.status}. Only ACTIVE alerts can be acknowledged.` 
            }, 
            { status: 400 }
          );
        }

        updatedAlert = await prisma.$transaction(async (tx) => {
          // Update alert status
          const alert = await tx.alert.update({
            where: { id },
            data: {
              status: 'ACKNOWLEDGED',
              metadata: {
                ...(existingAlert.metadata as any || {}),
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: body.userId || 'system',
                acknowledgedNote: body.note || null
              }
            },
            include: {
              rule: true,
              worksite: true
            }
          });

          // Create alert response record
          if (body.userId) {
            await tx.alertResponse.create({
              data: {
                alertId: id,
                userId: body.userId,
                response: 'ACKNOWLEDGED',
                notes: body.note || body.notes || null,
                createdAt: new Date()
              }
            });
          }

          return alert;
        });

        message = 'Alert acknowledged successfully';
        break;

      case 'resolve':
        // ACKNOWLEDGED → RESOLVED or ACTIVE → RESOLVED
        if (!['ACTIVE', 'ACKNOWLEDGED'].includes(existingAlert.status)) {
          return NextResponse.json(
            { 
              success: false,
              error: `Cannot resolve alert with status ${existingAlert.status}. Only ACTIVE or ACKNOWLEDGED alerts can be resolved.` 
            }, 
            { status: 400 }
          );
        }

        updatedAlert = await prisma.$transaction(async (tx) => {
          // Update alert status
          const alert = await tx.alert.update({
            where: { id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              metadata: {
                ...(existingAlert.metadata as any || {}),
                resolvedBy: body.userId || 'system',
                resolvedNote: body.note || null,
                resolution: body.resolution || null,
                resolutionTime: Date.now() - new Date(existingAlert.createdAt).getTime()
              }
            },
            include: {
              rule: true,
              worksite: true
            }
          });

          // Create alert response record
          if (body.userId) {
            await tx.alertResponse.create({
              data: {
                alertId: id,
                userId: body.userId,
                response: 'RESOLVED',
                notes: body.note || body.notes || null,
                createdAt: new Date()
              }
            });
          }

          return alert;
        });

        message = 'Alert resolved successfully';
        break;

      case 'escalate':
        // ANY → ESCALATED
        if (existingAlert.status === 'RESOLVED') {
          return NextResponse.json(
            { 
              success: false,
              error: 'Cannot escalate a resolved alert' 
            }, 
            { status: 400 }
          );
        }

        updatedAlert = await prisma.$transaction(async (tx) => {
          // Update alert status
          const alert = await tx.alert.update({
            where: { id },
            data: {
              status: 'ESCALATED',
              severity: body.newSeverity || existingAlert.severity,
              metadata: {
                ...(existingAlert.metadata as any || {}),
                escalatedAt: new Date().toISOString(),
                escalatedBy: body.userId || 'system',
                escalatedNote: body.note || null,
                previousSeverity: existingAlert.severity,
                escalationReason: body.reason || null
              }
            },
            include: {
              rule: true,
              worksite: true
            }
          });

          // Create alert response record
          if (body.userId) {
            await tx.alertResponse.create({
              data: {
                alertId: id,
                userId: body.userId,
                response: 'ESCALATED',
                notes: body.note || body.notes || null,
                createdAt: new Date()
              }
            });
          }

          return alert;
        });

        message = 'Alert escalated successfully';
        break;

      case 'reopen':
        // RESOLVED → ACTIVE
        if (existingAlert.status !== 'RESOLVED') {
          return NextResponse.json(
            { 
              success: false,
              error: 'Only resolved alerts can be reopened' 
            }, 
            { status: 400 }
          );
        }

        updatedAlert = await prisma.$transaction(async (tx) => {
          // Update alert status
          const alert = await tx.alert.update({
            where: { id },
            data: {
              status: 'ACTIVE',
              resolvedAt: null,
              metadata: {
                ...(existingAlert.metadata as any || {}),
                reopenedAt: new Date().toISOString(),
                reopenedBy: body.userId || 'system',
                reopenedNote: body.note || null,
                reopenedReason: body.reason || null
              }
            },
            include: {
              rule: true,
              worksite: true
            }
          });

          // Create alert response record
          if (body.userId) {
            await tx.alertResponse.create({
              data: {
                alertId: id,
                userId: body.userId,
                response: 'REOPENED',
                notes: body.note || body.notes || null,
                createdAt: new Date()
              }
            });
          }

          return alert;
        });

        message = 'Alert reopened successfully';
        break;

      default:
        return NextResponse.json(
          { 
            success: false,
            error: `Invalid action: ${action}. Valid actions are: acknowledge, resolve, escalate, reopen` 
          }, 
          { status: 400 }
        );
    }

    // Format response
    const formattedAlert = {
      id: updatedAlert.id,
      title: updatedAlert.title,
      description: updatedAlert.description,
      severity: updatedAlert.severity,
      status: updatedAlert.status,
      source: updatedAlert.source,
      location: updatedAlert.location,
      metadata: updatedAlert.metadata,
      createdAt: updatedAlert.createdAt.toISOString(),
      updatedAt: updatedAlert.updatedAt.toISOString(),
      resolvedAt: updatedAlert.resolvedAt?.toISOString() || null,
      rule: updatedAlert.rule ? {
        id: updatedAlert.rule.id,
        name: updatedAlert.rule.name,
        category: updatedAlert.rule.category
      } : null,
      worksite: updatedAlert.worksite ? {
        id: updatedAlert.worksite.id,
        name: updatedAlert.worksite.name,
        worksiteName: updatedAlert.worksite.worksiteName
      } : null
    };

    return NextResponse.json({
      success: true,
      data: formattedAlert,
      message
    });

  } catch (error) {
    const { action } = await params;
    console.error(`Failed to ${action} alert:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to ${action} alert`,
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

