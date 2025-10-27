import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { calculateSafetyScore, getConfig } from '@/app/lib/safety-score-service';

/**
 * GET /api/safety-score?worksiteId=xxx&date=2025-10-27
 * Get safety score for a specific worksite and date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const dateStr = searchParams.get('date');
    
    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }
    
    // Default to today if no date provided
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0); // Normalize to midnight
    
    // Try to get existing score
    const existingScore = await prisma.safetyScore.findUnique({
      where: {
        worksiteId_date: { worksiteId, date }
      }
    });
    
    if (existingScore) {
      return NextResponse.json({
        success: true,
        data: {
          score: existingScore.safetyScore,
          grade: existingScore.grade,
          breakdown: {
            baseCompliance: existingScore.baseCompliance,
            coverageFactor: existingScore.coverageFactor,
            violationPenalty: existingScore.violationPenalty,
            components: {
              majorViolations: {
                count: existingScore.majorViolations,
                penalty: existingScore.majorPenalty
              },
              minorViolations: {
                count: existingScore.minorViolations,
                penalty: existingScore.minorPenalty
              },
              customAlerts: existingScore.customAlerts || []
            },
            scalingFactor: existingScore.scalingFactor,
            bonus: {
              consecutiveSafeDays: existingScore.consecutiveSafeDays,
              bonusAmount: existingScore.safetyBonus
            }
          },
          trend: {
            yesterday: existingScore.yesterdayScore,
            weekAvg: existingScore.weekAvgScore,
            monthAvg: existingScore.monthAvgScore
          },
          calculatedAt: existingScore.calculatedAt,
          insufficientData: existingScore.totalDetections < 100
        }
      });
    }
    
    // If no existing score, trigger calculation
    return NextResponse.json(
      {
        success: false,
        error: 'Score not found. Use POST /api/safety-score/calculate to compute.'
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error fetching safety score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch safety score', details: error.message },
      { status: 500 }
    );
  }
}

