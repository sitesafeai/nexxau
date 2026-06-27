import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// GET /api/alerts/[id] - Get a single alert with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: alertId } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        worksite: {
          select: {
            id: true,
            name: true,
            worksiteName: true,
            location: true,
          }
        },
        rule: {
          select: {
            id: true,
            name: true,
            description: true,
            severity: true,
            condition: true,
          }
        },
        camera: {
          select: {
            id: true,
            name: true,
            location: true,
            streamUrl: true,
            hlsUrl: true,
          }
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        resolutionLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        // Include FP review so the dashboard dispute form can get the review ID
        fpReview: {
          select: {
            id: true,
            status: true,
            superAdminNote: true,
            reviewedAt: true,
            disputes: {
              select: { id: true, status: true, reason: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Check if this is a repeated alert (same rule, same camera, within 24 hours)
    let isRepeatedAlert = false;
    let previousAlertCount = 0;

    if (alert.ruleId && alert.cameraId) {
      const previousAlerts = await prisma.alert.count({
        where: {
          ruleId: alert.ruleId,
          cameraId: alert.cameraId,
          id: { not: alertId },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      isRepeatedAlert = previousAlerts > 0;
      previousAlertCount = previousAlerts;
    }

    // Calculate time since alert
    const timeSinceAlert = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 1000);

    return NextResponse.json({
      success: true,
      data: {
        ...alert,
        isRepeatedAlert,
        previousAlertCount,
        timeSinceAlert,
        timeSinceAlertFormatted: formatDuration(timeSinceAlert),
      }
    });

  } catch (error: any) {
    console.error('Error fetching alert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/alerts/[id] - Update an alert
export async function PATCH(
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

    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: body
    });

    return NextResponse.json({
      success: true,
      data: updatedAlert
    });

  } catch (error: any) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert', details: error.message },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}
