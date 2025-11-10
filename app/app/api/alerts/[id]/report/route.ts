import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * GET /api/alerts/[id]/report
 * Generate and download alert report
 */
export async function GET(
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

    // Get alert with all related data
    const alert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: {
        worksite: {
          include: {
            company: true
          }
        },
        rule: true,
        responses: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    const metadata = alert.metadata as any;
    const acknowledgment = metadata?.acknowledgment;

    // Generate report data
    const reportData = {
      reportGenerated: new Date().toISOString(),
      generatedBy: {
        name: session.user.name,
        email: session.user.email
      },
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        location: alert.location,
        createdAt: alert.createdAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString() || null
      },
      worksite: {
        name: alert.worksite?.name || 'Unknown',
        location: alert.worksite?.location || 'Unknown',
        company: alert.worksite?.company?.name || 'Unknown'
      },
      rule: alert.rule ? {
        name: alert.rule.name,
        category: alert.rule.category,
        description: alert.rule.description
      } : null,
      detection: metadata?.detectionData ? {
        confidence: metadata.detectionData.confidence,
        objects: metadata.detectionData.objects,
        cameraId: metadata.cameraId,
        cameraName: metadata.cameraName
      } : null,
      acknowledgment: acknowledgment ? {
        acknowledgedAt: acknowledgment.acknowledgedAt,
        acknowledgedBy: acknowledgment.acknowledgedBy,
        note: acknowledgment.note,
        actionTaken: acknowledgment.actionTaken,
        severityAssessment: acknowledgment.severityAssessment,
        requiresFollowUp: acknowledgment.requiresFollowUp,
        followUpDate: acknowledgment.followUpDate
      } : null,
      responses: alert.responses.map(response => ({
        type: response.response,
        note: response.note,
        createdAt: response.createdAt.toISOString(),
        user: response.user
      })),
      timeline: [
        {
          event: 'Alert Created',
          timestamp: alert.createdAt.toISOString(),
          details: `Alert triggered at ${alert.location}`
        },
        ...(alert.responses.map(response => ({
          event: response.response,
          timestamp: response.createdAt.toISOString(),
          user: response.user.name,
          details: response.note || ''
        }))),
        ...(alert.resolvedAt ? [{
          event: 'Alert Resolved',
          timestamp: alert.resolvedAt.toISOString(),
          details: 'Alert marked as resolved'
        }] : [])
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      videoClip: metadata?.videoClipUrl ? {
        url: metadata.videoClipUrl,
        duration: metadata.videoClipDuration || 20
      } : null
    };

    // Log report generation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DOWNLOAD_ALERT_REPORT',
        entity: 'Alert',
        entityId: params.id,
        changes: {
          reportType: 'pdf',
          alertTitle: alert.title
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      report: reportData
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}

