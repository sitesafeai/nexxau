import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  calculateSafetyScore,
  getConfig,
  getGrade,
  type ViolationData
} from '@/app/lib/safety-score-service';

/**
 * POST /api/safety-score/calculate
 * Calculate and store safety score for a worksite and date
 * 
 * Body: {
 *   worksiteId: string;
 *   date?: string; // ISO date, defaults to today
 *   forceRecalculate?: boolean; // Recalculate even if exists
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { worksiteId, date: dateStr, forceRecalculate = false } = body;
    
    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }
    
    // Parse date
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    
    // Check if score already exists
    if (!forceRecalculate) {
      const existing = await prisma.safetyScore.findUnique({
        where: {
          worksiteId_date: { worksiteId, date }
        }
      });
      
      if (existing) {
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
    }
    
    // Get configuration
    const config = await getConfig(worksiteId);
    
    // ============================================
    // GATHER VIOLATION DATA
    // ============================================
    
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get safety violations
    const safetyViolations = await prisma.safetyViolation.findMany({
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
    const customRuleViolations = await prisma.customRuleViolation.findMany({
      where: {
        worksiteId,
        triggeredAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        rule: true
      }
    });
    
    // Get custom alerts
    const customAlerts = await prisma.alert.findMany({
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
          timestamp: v.triggeredAt,
          location: v.location ? parseLocation(v.location) : undefined
        })),
        ...customAlerts.map(a => ({
          type: a.rule?.name || a.title,
          name: a.rule?.name || a.title,
          weight: a.severity === 'critical' ? 2.0
                  : a.severity === 'high' ? 1.5
                  : a.severity === 'medium' ? 1.0
                  : 0.5,
          timestamp: a.createdAt,
          location: undefined // Alerts don't have location yet
        }))
      ]
    };
    
    // ============================================
    // GET TOTAL DETECTIONS (from cameras/AI)
    // ============================================
    
    // For now, use a reasonable estimate based on camera activity
    // In production, this should come from your AI detection logs
    const activeCameras = await prisma.camera.count({
      where: {
        worksiteId,
        status: 'online'
      }
    });
    
    // Estimate: 1 detection per camera per minute over 8 hours
    const totalDetections = Math.max(100, activeCameras * 60 * 8);
    
    // ============================================
    // CALCULATE BASE COMPLIANCE & COVERAGE
    // ============================================
    
    // Base compliance (simplified - should be enhanced with actual PPE detection data)
    const totalViolations = violations.major.length + violations.minor.length;
    const baseCompliance = Math.max(0.5, 1 - (totalViolations / 100));
    
    // Coverage factor (based on camera count vs site size)
    const totalCameras = await prisma.camera.count({ where: { worksiteId } });
    const coverageFactor = Math.min(1.0, 0.5 + (totalCameras / 20)); // Assumes 10 cameras = good coverage
    
    // ============================================
    // CALCULATE SAFETY SCORE
    // ============================================
    
    const result = await calculateSafetyScore(
      worksiteId,
      date,
      violations,
      totalDetections,
      baseCompliance,
      coverageFactor,
      config
    );
    
    // ============================================
    // STORE IN DATABASE
    // ============================================
    
    const savedScore = await prisma.safetyScore.upsert({
      where: {
        worksiteId_date: { worksiteId, date }
      },
      create: {
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
      },
      update: {
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
        calculatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: savedScore.id
      },
      message: 'Safety score calculated successfully'
    });
    
  } catch (error: any) {
    console.error('Error calculating safety score:', error);
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

