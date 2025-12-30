import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { Cache, CacheKeys } from '@/app/lib/cache';
import {
  calculateSafetyScore,
  getConfig,
  getGrade,
  type ViolationData
} from '@/app/lib/safety-score-service';

/**
 * POST /api/safety-score/calculate
 * 
 * EXPLICIT calculation endpoint - the ONLY way to calculate safety scores.
 * 
 * Body: {
 *   worksiteId: string; (required)
 *   date?: string; // ISO date, defaults to today
 *   forceRecalculate?: boolean; // If true, delete existing and recalculate
 * }
 * 
 * Rules:
 * - If score exists AND forceRecalculate !== true: return existing score
 * - If forceRecalculate === true: delete existing record and recalculate
 * - All calculations run inside database transactions for atomicity
 * - Returns meaningful errors if any step fails
 * 
 * Permissions:
 * - Only ADMIN or SAFETY_MANAGER can force recalculation
 * - Regular users can only calculate if score doesn't exist
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { worksiteId, date: dateStr, forceRecalculate = false } = body;
    
    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }
    
    // Check permissions for force recalculation
    // Only ADMIN or SAFETY_MANAGER can force recalculation
    if (forceRecalculate) {
      const userRole = normalizeRole(session.user.role);
      const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SAFETY_MANAGER', 'ADMIN'];
      
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions. Only ADMIN or SAFETY_MANAGER can force recalculation.',
            userRole
          },
          { status: 403 }
        );
      }
      console.log(`[SafetyScore] Force recalculation authorized for worksite ${worksiteId} by ${userRole}`);
    }
    
    // Transaction wrapper for atomic operations
    // All database operations run inside transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      
      // Parse date and normalize to midnight UTC
      const date = dateStr ? new Date(dateStr) : new Date();
      date.setHours(0, 0, 0, 0);
      
      // Check if score already exists
      const existing = await tx.safetyScore.findUnique({
        where: {
          worksiteId_date: { worksiteId, date }
        }
      });
      
      // If score exists and forceRecalculate is false, return existing
      if (existing && !forceRecalculate) {
        return NextResponse.json({
          success: true,
          data: {
            score: existing.safetyScore,
            grade: existing.grade,
            alreadyCalculated: true
          },
          message: 'Score already exists. Use forceRecalculate=true to recalculate.'
        });
      }
      
      // If forceRecalculate is true, delete existing record
      if (existing && forceRecalculate) {
        await tx.safetyScore.delete({
          where: {
            worksiteId_date: { worksiteId, date }
          }
        });
        console.log(`[SafetyScore] Deleted existing score for recalculation: ${worksiteId} ${date.toISOString()}`);
      }
    
      // Get worksite for timezone
      // Note: Worksite.timezone field may not exist yet - using UTC as default
      // All timestamps are stored in UTC, but 24h violation windows are calculated
      // in worksite-local timezone for accurate daily boundaries
      const worksite = await tx.worksite.findUnique({
        where: { id: worksiteId },
        select: { 
          // timezone: true, // Uncomment when Worksite.timezone field is added
        }
      });
      
      // Get timezone (default to UTC if not set)
      // TODO: When Worksite.timezone is available, use: const timezone = worksite?.timezone || 'UTC';
      const timezone = 'UTC'; // Default until Worksite.timezone is implemented
      
      // Get configuration
      // Note: getConfig reads from SafetyScoreConfig table
      // This is safe outside transaction as it's read-only and idempotent
      const config = await getConfig(worksiteId);
      
      // ============================================
      // GATHER VIOLATION DATA (with timezone handling)
      // ============================================
      
      // Timezone Rule: All safety scores and 24h violation windows are calculated
      // in worksite-local timezone. Timestamps are stored in UTC but day boundaries
      // are converted to worksite timezone for accurate daily aggregation.
      //
      // Current implementation: Uses UTC boundaries (date at midnight UTC)
      // Future: Convert date to worksite timezone, then convert boundaries back to UTC
      // Example: If worksite is in "America/New_York", day starts at 00:00 EST/EDT
      // which is 05:00 UTC (EST) or 04:00 UTC (EDT)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get safety violations (24h window in worksite-local time, stored as UTC)
      const safetyViolations = await tx.safetyViolation.findMany({
      where: {
        worksiteId,
        detectedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        severity: true,
        violationType: true,
        detectedAt: true,
        location: true
      }
    });
    
      // Get custom rule violations/alerts
      const customRuleViolations = await tx.customRuleViolation.findMany({
      where: {
        worksiteId,
        detectedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        rule: true
      }
    });
    
      // Get custom alerts
      const customAlerts = await tx.alert.findMany({
      where: {
        worksiteId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        rule: {
          isNot: null // Has a custom rule
        }
      },
      include: {
        rule: true
      }
    });
    
    // ============================================
    // FORMAT VIOLATION DATA
    // ============================================
    
    const violations: ViolationData = {
      major: safetyViolations
        .filter(v => v.severity === 'major' || v.severity === 'critical' || v.severity === 'high')
        .map(v => ({
          timestamp: v.detectedAt,
          type: v.violationType
        })),
      
      minor: safetyViolations
        .filter(v => v.severity === 'minor' || v.severity === 'medium' || v.severity === 'low')
        .map(v => ({
          timestamp: v.detectedAt,
          type: v.violationType
        })),
      
      customAlerts: [
        ...customRuleViolations.map(v => ({
          type: v.rule?.name || v.violationType,
          name: v.rule?.name || v.violationType,
          weight: v.severity === 'critical' ? 2.0 
                  : v.severity === 'high' ? 1.5
                  : v.severity === 'medium' ? 1.0
                  : 0.5,
          timestamp: v.detectedAt,
          location: v.location ? parseLocation(v.location) : undefined
        })),
        ...customAlerts.map(a => ({
          type: a.rule?.name || a.title,
          name: a.rule?.name || a.title,
          weight: (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY') ? 2.0
                  : a.severity === 'WARNING' ? 1.5
                  : a.severity === 'INFO' ? 1.0
                  : 0.5,
          timestamp: a.createdAt,
          location: undefined // Alerts don't have location yet
        }))
      ]
    };
    
      // ============================================
      // GET TOTAL DETECTIONS (explicit check, no hand-waving)
      // ============================================
      
      // Check if Detection data exists for this worksite/date
      const actualDetections = await tx.detection.findMany({
        where: {
          camera: {
            worksiteId
          },
          timestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: {
          id: true
        }
      });
      
      let totalDetections: number;
      let detectionsSource: 'ACTUAL' | 'ESTIMATED';
      let estimationPenaltyApplied = false;
      
      if (actualDetections.length > 0) {
        // Use actual detection count
        totalDetections = actualDetections.length;
        detectionsSource = 'ACTUAL';
      } else {
        // No actual detections - estimate with penalty
        const activeCameras = await tx.camera.count({
          where: {
            worksiteId,
            status: 'active'
          }
        });
        
        // Estimate: 1 detection per camera per minute over 8 hours
        totalDetections = Math.max(100, activeCameras * 60 * 8);
        detectionsSource = 'ESTIMATED';
        estimationPenaltyApplied = true;
        console.warn(`[SafetyScore] No actual detections found for ${worksiteId} on ${date.toISOString()}, using estimation`);
      }
    
    // ============================================
    // CALCULATE BASE COMPLIANCE & COVERAGE
    // ============================================
    
      // Base compliance (simplified - should be enhanced with actual PPE detection data)
      // Clamp base compliance: C ∈ [0.5, 1.0]
      const totalViolations = violations.major.length + violations.minor.length;
      const rawBaseCompliance = 1 - (totalViolations / 100);
      const baseCompliance = Math.min(1.0, Math.max(0.5, rawBaseCompliance));
    
      // Coverage factor (based on camera count vs site size)
      const totalCameras = await tx.camera.count({ where: { worksiteId } });
      // Clamp coverage factor: F_cov ∈ [0.7, 1.0]
      const rawCoverageFactor = 0.5 + (totalCameras / 20);
      const coverageFactor = Math.min(1.0, Math.max(0.7, rawCoverageFactor));
    
    // ============================================
    // CALCULATE SAFETY SCORE
    // ============================================
    
      // Calculate safety score with explicit detection source info
      const result = await calculateSafetyScore(
        worksiteId,
        date,
        violations,
        totalDetections,
        baseCompliance,
        coverageFactor,
        config,
        {
          detectionsSource,
          estimationPenaltyApplied
        }
      );
      
      // ============================================
      // STORE IN DATABASE (within transaction)
      // ============================================
      
      const savedScore = await tx.safetyScore.create({
        data: {
          worksiteId,
          date,
          totalDetections,
          majorViolations: result.breakdown.components.majorViolations.count,
          minorViolations: result.breakdown.components.minorViolations.count,
          customAlerts: result.breakdown.components.customAlerts,
          baseCompliance: result.breakdown.baseCompliance,
          coverageFactor: result.breakdown.coverageFactor,
          violationPenalty: result.breakdown.violationPenalty,
          majorPenalty: result.breakdown.components.majorViolations.penalty,
          minorPenalty: result.breakdown.components.minorViolations.penalty,
          customAlertPenalty: result.breakdown.components.customAlerts.reduce(
            (sum, a) => sum + a.penalty, 0
          ),
          scalingFactor: result.breakdown.scalingFactor,
          consecutiveSafeDays: result.breakdown.bonus.consecutiveSafeDays,
          safetyBonus: result.breakdown.bonus.bonusAmount,
          safetyScore: result.score,
          grade: result.grade,
          yesterdayScore: result.trend?.yesterday,
          weekAvgScore: result.trend?.weekAvg,
          monthAvgScore: result.trend?.monthAvg,
          calculationVersion: 1
          // Note: Detection source metadata is included in result.breakdown
          // and returned to client, but not stored in SafetyScore table
          // (individual fields are stored instead for queryability)
        }
      });
      
      // Format response data
      const responseData = {
        ...result,
        id: savedScore.id,
        breakdown: {
          ...result.breakdown,
          detectionsSource,
          estimationPenaltyApplied
        }
      };
      
      // Update cache immediately for instant next GET request
      // This ensures Overview tab loads instantly after calculation
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const cacheKey = CacheKeys.safetyScore(worksiteId, dateKey);
      await Cache.set(cacheKey, {
        score: result.score,
        grade: result.grade,
        breakdown: responseData.breakdown,
        trend: result.trend,
        calculatedAt: savedScore.calculatedAt,
        insufficientData: result.insufficientData
      }, { ttl: 60 * 5 }); // 5 min TTL
      
      // Also invalidate safety score metrics cache for this worksite
      await Cache.delete(CacheKeys.safetyScoreMetrics(worksiteId));
      
      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Safety score calculated successfully'
      });
    }, {
      // Transaction timeout: 30 seconds
      timeout: 30000,
      isolationLevel: 'ReadCommitted'
    }).catch((error: any) => {
      // Transaction failed - rollback automatically handled by Prisma
      console.error('[SafetyScore] Transaction failed, rolled back:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to calculate safety score', 
          details: error.message,
          message: 'Calculation was rolled back due to error. No partial data was saved.'
        },
        { status: 500 }
      );
    });
  } catch (error: any) {
    // Catch errors outside transaction (e.g., JSON parsing)
    console.error('Error in safety score calculation endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate safety score', details: error.message },
      { status: 500 }
    );
  }
}

// Helper to parse location JSON
function parseLocation(location: any): { lat: number; lng: number } | undefined {
  try {
    if (typeof location === 'string') {
      const parsed = JSON.parse(location);
      if (parsed.lat && parsed.lng) {
        return { lat: parsed.lat, lng: parsed.lng };
      }
    } else if (location?.lat && location?.lng) {
      return { lat: location.lat, lng: location.lng };
    }
  } catch (e) {
    // Invalid location format
  }
  return undefined;
}

