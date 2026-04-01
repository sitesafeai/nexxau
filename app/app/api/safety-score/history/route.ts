import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/safety-score/history?worksiteId=xxx&days=30
 * Get historical safety scores for charting and trend analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const daysStr = searchParams.get('days') || '30';
    const days = parseInt(daysStr, 10);
    
    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }
    
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Fetch scores
    const scores = await prisma.safetyScore.findMany({
      where: {
        worksiteId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      },
      select: {
        id: true,
        date: true,
        safetyScore: true,
        grade: true,
        majorViolations: true,
        minorViolations: true,
        totalDetections: true,
        consecutiveSafeDays: true,
        calculatedAt: true
      }
    });
    
    // Calculate statistics
    const stats = {
      avgScore: scores.length > 0
        ? scores.reduce((sum, s) => sum + s.safetyScore, 0) / scores.length
        : 0,
      maxScore: scores.length > 0
        ? Math.max(...scores.map(s => s.safetyScore))
        : 0,
      minScore: scores.length > 0
        ? Math.min(...scores.map(s => s.safetyScore))
        : 0,
      totalViolations: scores.reduce(
        (sum, s) => sum + s.majorViolations + s.minorViolations,
        0
      ),
      maxConsecutiveSafeDays: scores.length > 0
        ? Math.max(...scores.map(s => s.consecutiveSafeDays))
        : 0,
      daysWithData: scores.length,
      daysRequested: days
    };
    
    return NextResponse.json({
      success: true,
      data: {
        scores,
        stats,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching safety score history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    );
  }
}

