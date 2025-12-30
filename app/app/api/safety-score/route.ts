import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Cache, CacheKeys } from '@/app/lib/cache';

/**
 * GET /api/safety-score?worksiteId=xxx&date=2025-10-27
 * 
 * READ-ONLY endpoint to fetch existing safety score with caching.
 * 
 * Rules:
 * - Returns 200 with data if score exists (from cache or DB)
 * - Returns 404 if score does not exist
 * - NEVER triggers calculation (no side effects)
 * - Uses short-term cache (5 min TTL) for instant Overview tab loads
 * - Use POST /api/safety-score/calculate to compute new scores
 * 
 * This follows HTTP semantics: GET requests must be idempotent and have no side effects.
 * 
 * Cache Strategy:
 * - Cache key: safetyScore:{worksiteId}:{date}
 * - TTL: 5 minutes (300 seconds)
 * - Cache is invalidated when score is recalculated via POST /calculate
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
    // Note: Date boundaries are in UTC. For worksite-local timezone handling,
    // see POST /api/safety-score/calculate which converts to worksite timezone
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0); // Normalize to midnight UTC
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check cache first for instant response
    const cacheKey = CacheKeys.safetyScore(worksiteId, dateKey);
    const cached = await Cache.get(cacheKey);
    
    if (cached) {
      // Return cached score immediately (instant Overview load)
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      });
    }
    
    // Cache miss: fetch from database
    const existingScore = await prisma.safetyScore.findUnique({
      where: {
        worksiteId_date: { worksiteId, date }
      }
    });
    
    if (!existingScore) {
      // Return 404 if score doesn't exist (don't calculate)
      return NextResponse.json(
        {
          success: false,
          error: 'Score not found. Use POST /api/safety-score/calculate to compute.'
        },
        { status: 404 }
      );
    }
    
    // Format response data
    const responseData = {
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
    };
    
    // Store in cache for next request (5 min TTL)
    await Cache.set(cacheKey, responseData, { ttl: 60 * 5 });
    
    // Return response (from database, now cached for next request)
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    console.error('Error fetching safety score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch safety score', details: error.message },
      { status: 500 }
    );
  }
}

