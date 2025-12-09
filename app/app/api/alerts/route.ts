import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { createAlertSchema, alertQuerySchema } from '@/app/lib/validation/alerts';
import { validateBody, validateQuery } from '@/app/lib/validation/common';
import { AlertSeverity } from '@prisma/client';

// Map severity values to AlertSeverity enum
function mapSeverityToEnum(severity: string): AlertSeverity {
  const upper = severity.toUpperCase();
  if (upper === 'LOW' || upper === 'INFO') return 'INFO';
  if (upper === 'MEDIUM' || upper === 'WARNING') return 'WARNING';
  if (upper === 'HIGH' || upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'EMERGENCY') return 'EMERGENCY';
  return 'INFO'; // Default
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = validateQuery(alertQuerySchema, searchParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { limit, offset, worksiteId, cameraId, severity, status, source, startDate, endDate } = validation.data;

    const where: any = {};

    if (worksiteId) where.worksiteId = worksiteId;
    if (cameraId) where.metadata = { path: ['cameraId'], equals: cameraId };
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (source) where.source = source;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        rule: {
          select: { name: true }
        },
        worksite: {
          select: { name: true }
        }
      }
    });

    const total = await prisma.alert.count({ where });

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch alerts',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateBody(createAlertSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    
    const alert = await prisma.alert.create({
      data: {
        title: data.title,
        description: data.description || '', // Description is required in schema, use empty string as default
        severity: mapSeverityToEnum(data.severity), // Map severity values to enum
        status: 'ACTIVE',
        source: data.source || 'MANUAL',
        location: data.location || null,
        metadata: data.metadata || {},
        ruleId: data.ruleId || null,
        worksiteId: data.worksiteId || null,
        violationType: data.violationType || null,
        detectionSnapshot: data.detectionSnapshot || null,
        detectionVideo: data.detectionVideo || null,
        detectionData: data.detectionData || undefined, // JSON fields use undefined instead of null
      }
    });

    // Trigger workflow automation ONLY for AI-detected alerts (not manual ones)
    const isAIDetected = alert.source === 'camera' || alert.source === 'ai' || alert.source === 'detection' || alert.detectionData;
    
    if (alert.worksiteId && isAIDetected) {
      console.log('[Alert API] AI-detected alert - triggering workflow automation');
      // Import dynamically to avoid circular dependencies
      import('@/app/lib/workflows/alert-processor').then(({ alertProcessor }) => {
        alertProcessor.processNewAlert(alert.id).catch(error => {
          console.error('[Alert API] Workflow processing failed:', error);
        });
      }).catch(error => {
        console.error('[Alert API] Failed to load workflow processor:', error);
      });
    } else {
      console.log('[Alert API] Manual alert - skipping workflow automation');
    }

    return NextResponse.json({
      success: true,
      data: alert,
      message: 'Alert created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create alert:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create alert',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
