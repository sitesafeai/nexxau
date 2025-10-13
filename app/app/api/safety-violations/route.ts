import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { safetyViolationDetector } from '../../lib/safety-violation-detector';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const severity = searchParams.get('severity');
    const violationType = searchParams.get('violationType');
    const resolved = searchParams.get('resolved');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }
    
    if (severity) {
      where.severity = severity;
    }
    
    if (violationType) {
      where.violationType = violationType;
    }
    
    if (resolved !== null && resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const [violations, total] = await Promise.all([
      prisma.safetyViolation.findMany({
        where,
        include: {
          worksite: {
            select: {
              name: true,
              worksiteName: true
            }
          },
          camera: {
            select: {
              name: true,
              location: true
            }
          }
        },
        orderBy: {
          detectedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.safetyViolation.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: violations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch safety violations:', error);
    return NextResponse.json({ error: 'Failed to fetch safety violations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      violationType,
      severity,
      confidence,
      location,
      description,
      cameraId,
      worksiteId,
      metadata
    } = body;

    // Validate required fields
    if (!violationType || !severity || !location || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: violationType, severity, location, description' 
      }, { status: 400 });
    }

    // Create violation detection object
    const detection = {
      violationType,
      severity,
      confidence: confidence || 85,
      location,
      description,
      cameraId,
      worksiteId,
      detectedAt: new Date(),
      metadata
    };

    // Process the violation detection
    const processed = await safetyViolationDetector.processViolationDetection(detection);

    if (processed) {
      return NextResponse.json({
        success: true,
        message: 'Safety violation processed successfully',
        data: detection
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Safety violation was not processed (may be in cooldown or below threshold)',
        data: detection
      });
    }

  } catch (error) {
    console.error('Failed to create safety violation:', error);
    return NextResponse.json({ error: 'Failed to create safety violation' }, { status: 500 });
  }
}
