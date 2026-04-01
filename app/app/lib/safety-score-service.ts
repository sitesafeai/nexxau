/**
 * Safety Score Calculation Service
 * 
 * Implements the comprehensive safety scoring formula with:
 * - Base compliance (C)
 * - Coverage factor (F_cov)
 * - Violation penalties (major, minor, custom alerts)
 * - Time-weighted decay
 * - Consecutive safe day bonuses
 * - Alert deduplication
 * - Configurable parameters
 */

import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface SafetyScoreConfig {
  // Violation weights
  alpha: number;              // Major violations weight
  beta: number;               // Minor violations weight
  gamma: number;              // Custom alerts weight
  
  // Alert weight bounds
  alertWeightMin: number;
  alertWeightMax: number;
  defaultAlertWeight: number;
  
  // Penalty caps
  maxPenalty: number;         // Max penalty (e.g., 0.5 = 50%)
  perTypeAlertCap: number;    // Max alerts of same type counted
  
  // Time decay
  lambda: number;             // Decay rate (e.g., 0.1 = 10% per day)
  
  // Deduplication
  timeWindowSeconds: number;
  spatialThresholdMeters: number;
  
  // Bonuses
  safeDayBonusRate: number;   // Bonus per consecutive safe day
  maxBonus: number;           // Max bonus cap
  safeDayThreshold: number;   // Days needed to start earning bonus
  
  // Data requirements
  minDetections: number;
}

export interface ViolationData {
  major: Array<{ timestamp: Date; type: string }>;
  minor: Array<{ timestamp: Date; type: string }>;
  customAlerts: Array<{
    type: string;
    name: string;
    weight: number;
    timestamp: Date;
    location?: { lat: number; lng: number };
  }>;
}

export interface SafetyScoreResult {
  score: number; // Always between 0 and 100 (clamped)
  grade: string;
  breakdown: {
    baseCompliance: number; // C ∈ [0.5, 1.0]
    coverageFactor: number; // F_cov ∈ [0.7, 1.0]
    violationPenalty: number; // P ∈ [0, 0.9]
    components: {
      majorViolations: { count: number; penalty: number };
      minorViolations: { count: number; penalty: number };
      customAlerts: Array<{ type: string; count: number; weight: number; penalty: number }>;
    };
    scalingFactor: number;
    bonus: { consecutiveSafeDays: number; bonusAmount: number }; // bonus ∈ [0, 0.15]
    // Detection source metadata (if available)
    detectionsSource?: 'ACTUAL' | 'ESTIMATED';
    estimationPenaltyApplied?: boolean;
    estimationPenalty?: number;
  };
  trend?: {
    yesterday?: number;
    weekAvg?: number;
    monthAvg?: number;
    change7d?: string;
  };
  recommendations: string[];
  insufficientData: boolean;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_SAFETY_CONFIG: SafetyScoreConfig = {
  alpha: 1.0,
  beta: 0.25,
  gamma: 1.0,
  alertWeightMin: 0.1,
  alertWeightMax: 2.0,
  defaultAlertWeight: 0.5,
  maxPenalty: 0.5,
  perTypeAlertCap: 50,
  lambda: 0.1,
  timeWindowSeconds: 300,
  spatialThresholdMeters: 10,
  safeDayBonusRate: 0.01,
  maxBonus: 0.10,
  safeDayThreshold: 7,
  minDetections: 100
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate time-weighted value with exponential decay
 */
function applyTimeDecay(
  items: Array<{ timestamp: Date }>,
  referenceDate: Date,
  lambda: number
): number {
  return items.reduce((sum, item) => {
    const daysAgo = Math.max(0, 
      (referenceDate.getTime() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weight = Math.exp(-lambda * daysAgo);
    return sum + weight;
  }, 0);
}

/**
 * Deduplicate alerts by time and space
 */
function deduplicateAlerts(
  alerts: Array<{
    timestamp: Date;
    location?: { lat: number; lng: number };
  }>,
  timeWindowSeconds: number,
  spatialThresholdMeters: number
): number {
  if (alerts.length === 0) return 0;
  
  // Sort by timestamp
  const sorted = [...alerts].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  const deduplicated: typeof sorted = [];
  
  for (const alert of sorted) {
    // Check if this alert is a duplicate
    const isDuplicate = deduplicated.some(existing => {
      // Time check
      const timeDiff = Math.abs(
        alert.timestamp.getTime() - existing.timestamp.getTime()
      ) / 1000;
      
      if (timeDiff > timeWindowSeconds) return false;
      
      // Spatial check (if locations provided)
      if (alert.location && existing.location) {
        const distance = haversineDistance(
          alert.location.lat,
          alert.location.lng,
          existing.location.lat,
          existing.location.lng
        );
        return distance < spatialThresholdMeters;
      }
      
      // If no location, just use time
      return true;
    });
    
    if (!isDuplicate) {
      deduplicated.push(alert);
    }
  }
  
  return deduplicated.length;
}

/**
 * Haversine distance between two lat/lng points in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate grade from score
 */
export function getGrade(score: number): {
  grade: string;
  color: string;
  emoji: string;
} {
  if (score >= 95) return { grade: 'A+', color: '#10b981', emoji: '🏆' };
  if (score >= 90) return { grade: 'A', color: '#22c55e', emoji: '⭐' };
  if (score >= 85) return { grade: 'A-', color: '#84cc16', emoji: '✅' };
  if (score >= 80) return { grade: 'B+', color: '#eab308', emoji: '👍' };
  if (score >= 75) return { grade: 'B', color: '#f59e0b', emoji: '🟡' };
  if (score >= 70) return { grade: 'B-', color: '#f97316', emoji: '⚠️' };
  if (score >= 65) return { grade: 'C+', color: '#ef4444', emoji: '📉' };
  if (score >= 60) return { grade: 'C', color: '#dc2626', emoji: '🔴' };
  return { grade: 'F', color: '#991b1b', emoji: '🚨' };
}

/**
 * Generate recommendations based on score breakdown
 */
function generateRecommendations(
  breakdown: SafetyScoreResult['breakdown'],
  totalDetections: number,
  config: SafetyScoreConfig
): string[] {
  const recommendations: string[] = [];
  
  const { components, bonus } = breakdown;
  
  // Major violations
  if (components.majorViolations.count > 0) {
    recommendations.push(
      `🚨 ${components.majorViolations.count} major violation${
        components.majorViolations.count > 1 ? 's' : ''
      } detected - immediate action required`
    );
  }
  
  // Minor violations
  if (components.minorViolations.count > 5) {
    recommendations.push(
      `⚠️ ${components.minorViolations.count} minor violations - review and address patterns`
    );
  }
  
  // Custom alerts
  const topAlert = components.customAlerts.sort((a, b) => b.count - a.count)[0];
  if (topAlert && topAlert.count > 3) {
    recommendations.push(
      `🎯 Focus on ${topAlert.type}: ${topAlert.count} incidents detected`
    );
  }
  
  // Consecutive safe days
  if (bonus.consecutiveSafeDays >= config.safeDayThreshold) {
    recommendations.push(
      `✅ ${bonus.consecutiveSafeDays}-day streak of improved compliance! Keep it up!`
    );
  }
  
  // Insufficient data
  if (totalDetections < config.minDetections) {
    recommendations.push(
      `📊 Limited detection data (${totalDetections}/${config.minDetections}). Ensure cameras are operational.`
    );
  }
  
  // Good performance
  if (components.majorViolations.count === 0 && components.minorViolations.count === 0) {
    recommendations.push('🌟 Excellent safety performance - zero violations today!');
  }
  
  return recommendations;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate comprehensive safety score
 * 
 * @param worksiteId - Worksite identifier
 * @param date - Date for calculation
 * @param violations - Violation data (major, minor, custom alerts)
 * @param totalDetections - Total detection count (actual or estimated)
 * @param baseCompliance - Base compliance factor C (will be clamped to [0.5, 1.0])
 * @param coverageFactor - Coverage factor F_cov (will be clamped to [0.7, 1.0])
 * @param config - Optional config override
 * @param detectionMetadata - Optional metadata about detection source
 * 
 * @returns SafetyScoreResult with clamped score [0, 100]
 * 
 * Safety Guarantees:
 * - All input variables are clamped before calculation
 * - Final score is always between 0 and 100
 * - Formula: Score = 100 × C × F_cov × (1 - P) × (1 + bonus)
 * - Clamps: C ∈ [0.5, 1.0], F_cov ∈ [0.7, 1.0], P ∈ [0, 0.9], bonus ∈ [0, 0.15]
 */
export async function calculateSafetyScore(
  worksiteId: string,
  date: Date,
  violations: ViolationData,
  totalDetections: number,
  baseCompliance: number = 0.90,
  coverageFactor: number = 0.95,
  config?: Partial<SafetyScoreConfig>,
  detectionMetadata?: {
    detectionsSource: 'ACTUAL' | 'ESTIMATED';
    estimationPenaltyApplied: boolean;
  }
): Promise<SafetyScoreResult> {
  // Merge with defaults
  const cfg: SafetyScoreConfig = { ...DEFAULT_SAFETY_CONFIG, ...config };
  
  // ============================================
  // CLAMP INPUT VARIABLES (Safety Requirement)
  // ============================================
  
  // Clamp base compliance: C ∈ [0.5, 1.0]
  const C = Math.min(1.0, Math.max(0.5, baseCompliance));
  
  // Clamp coverage factor: F_cov ∈ [0.7, 1.0]
  const F_cov = Math.min(1.0, Math.max(0.7, coverageFactor));
  
  // Check for insufficient data
  const insufficientData = totalDetections < cfg.minDetections;
  
  // ============================================
  // 1. TIME-WEIGHTED VIOLATIONS
  // ============================================
  
  const V_maj_weighted = applyTimeDecay(violations.major, date, cfg.lambda);
  const V_min_weighted = applyTimeDecay(violations.minor, date, cfg.lambda);
  
  // ============================================
  // 2. CUSTOM ALERTS with DEDUPLICATION
  // ============================================
  
  // Group alerts by type
  const alertsByType = violations.customAlerts.reduce((acc, alert) => {
    if (!acc[alert.type]) {
      acc[alert.type] = [];
    }
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, typeof violations.customAlerts>);
  
  // Deduplicate and weight each type
  const customAlertDetails: Array<{ type: string; count: number; weight: number; penalty: number }> = [];
  let A_score = 0;
  
  for (const [type, alerts] of Object.entries(alertsByType)) {
    // Get average weight for this type
    const avgWeight = alerts.reduce((sum, a) => sum + a.weight, 0) / alerts.length;
    
    // Clamp weight
    const clampedWeight = Math.max(
      cfg.alertWeightMin,
      Math.min(cfg.alertWeightMax, avgWeight)
    );
    
    // Deduplicate
    const deduplicatedCount = deduplicateAlerts(
      alerts,
      cfg.timeWindowSeconds,
      cfg.spatialThresholdMeters
    );
    
    // Apply per-type cap
    const cappedCount = Math.min(deduplicatedCount, cfg.perTypeAlertCap);
    
    const penalty = clampedWeight * cappedCount;
    A_score += penalty;
    
    customAlertDetails.push({
      type: alerts[0].name || type,
      count: cappedCount,
      weight: clampedWeight,
      penalty
    });
  }
  
  // ============================================
  // 3. COMBINED PENALTY NUMERATOR
  // ============================================
  
  const N =
    cfg.alpha * V_maj_weighted +
    cfg.beta * V_min_weighted +
    cfg.gamma * A_score;
  
  // ============================================
  // 4. SCALING FACTOR
  // ============================================
  // Normalize penalty by detection volume
  // More detections = more reliable penalty calculation
  
  const S = Math.max(1, totalDetections / 100);
  
  // ============================================
  // 5. CAPPED PENALTY (with clamp)
  // ============================================
  // Clamp penalty: P ∈ [0, 0.9] (max 90% penalty)
  // This prevents a single bad day from completely zeroing the score
  // The clamp ensures: 0 ≤ P ≤ 0.9 (never more than 90% penalty)
  
  const rawPenalty = N / S;
  const P = Math.min(0.9, Math.max(0, Math.min(cfg.maxPenalty, rawPenalty)));
  
  // ============================================
  // 6. BASE SCORE (using clamped values)
  // ============================================
  // Formula: Score = 100 × C × F_cov × (1 - P) × (1 - estimationPenalty)
  // All inputs are clamped: C ∈ [0.5, 1.0], F_cov ∈ [0.7, 1.0], P ∈ [0, 0.9]
  // This ensures the score calculation is deterministic and bounded
  
  // Apply estimation penalty if detections were estimated
  // This penalty exists because estimated data is less reliable than actual detections
  // Penalty: 10% reduction when using estimated detection counts
  let estimationPenalty = 0;
  if (detectionMetadata?.estimationPenaltyApplied) {
    estimationPenalty = 0.10; // 10% penalty for estimated data
  }
  
  // Calculate base score with clamped inputs
  // Using clamped C and F_cov ensures score is always in valid range
  let safetyScore = 100 * C * F_cov * (1 - P) * (1 - estimationPenalty);
  
  // ============================================
  // 7. CONSECUTIVE SAFE DAYS BONUS (with clamp)
  // ============================================
  // Reward sites with consistent safety performance
  // Clamp bonus: bonus ∈ [0, 0.15] (max 15% bonus)
  // This prevents bonus from exceeding reasonable bounds
  
  // Get consecutive safe days from previous scores
  const consecutiveSafeDays = await getConsecutiveSafeDays(worksiteId, date);
  
  let bonusAmount = 0;
  if (consecutiveSafeDays >= cfg.safeDayThreshold) {
    const rawBonus = Math.min(
      cfg.maxBonus,
      consecutiveSafeDays * cfg.safeDayBonusRate
    );
    // Clamp bonus to [0, 0.15] to prevent excessive bonuses
    bonusAmount = Math.min(0.15, Math.max(0, rawBonus));
    safetyScore = safetyScore * (1 + bonusAmount);
  }
  
  // ============================================
  // 8. FINAL CLAMP: Score ∈ [0, 100]
  // ============================================
  // Final safety clamp: ensure score is always between 0 and 100
  // This is a critical safety measure - no matter what inputs or edge cases,
  // the score will NEVER exceed [0, 100] bounds
  // Why this exists: Prevents mathematical errors, overflow, or invalid scores
  const rawScore = safetyScore;
  const finalScore = Math.min(100, Math.max(0, rawScore));
  
  // ============================================
  // 9. GRADE (using final clamped score)
  // ============================================
  
  const { grade } = getGrade(finalScore);
  
  // ============================================
  // 10. BREAKDOWN (with detection source info)
  // ============================================
  
  const breakdown = {
    baseCompliance: C, // Use clamped value
    coverageFactor: F_cov, // Use clamped value
    violationPenalty: P, // Use clamped value
    components: {
      majorViolations: {
        count: Math.round(V_maj_weighted),
        penalty: cfg.alpha * V_maj_weighted
      },
      minorViolations: {
        count: Math.round(V_min_weighted),
        penalty: cfg.beta * V_min_weighted
      },
      customAlerts: customAlertDetails
    },
    scalingFactor: S,
    bonus: {
      consecutiveSafeDays,
      bonusAmount
    }
  };
  
  // ============================================
  // 11. RECOMMENDATIONS
  // ============================================
  
  const recommendations = generateRecommendations(
    breakdown,
    totalDetections,
    cfg
  );
  
  // ============================================
  // 12. TRENDS
  // ============================================
  
  const trend = await calculateTrends(worksiteId, date);
  
  return {
    score: Math.round(finalScore * 100) / 100, // Use final clamped score
    grade,
    breakdown: {
      ...breakdown,
      // Include detection source metadata in breakdown
      ...(detectionMetadata && {
        detectionsSource: detectionMetadata.detectionsSource,
        estimationPenaltyApplied: detectionMetadata.estimationPenaltyApplied,
        estimationPenalty: estimationPenalty
      })
    },
    trend,
    recommendations,
    insufficientData
  };
}

// ============================================
// DATABASE HELPERS
// ============================================

/**
 * Get consecutive safe days (days without major violations)
 */
async function getConsecutiveSafeDays(
  worksiteId: string,
  currentDate: Date
): Promise<number> {
  const scores = await prisma.safetyScore.findMany({
    where: { worksiteId },
    orderBy: { date: 'desc' },
    take: 30,
    select: { date: true, majorViolations: true }
  });
  
  let consecutiveDays = 0;
  for (const score of scores) {
    if (score.date >= currentDate) continue;
    if (score.majorViolations === 0) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
}

/**
 * Calculate score trends
 */
async function calculateTrends(
  worksiteId: string,
  currentDate: Date
): Promise<SafetyScoreResult['trend']> {
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekAgo = new Date(currentDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(currentDate);
  monthAgo.setDate(monthAgo.getDate() - 30);
  
  const [yesterdayScore, weekScores, monthScores] = await Promise.all([
    prisma.safetyScore.findUnique({
      where: {
        worksiteId_date: { worksiteId, date: yesterday }
      },
      select: { safetyScore: true }
    }),
    prisma.safetyScore.findMany({
      where: {
        worksiteId,
        date: { gte: weekAgo, lt: currentDate }
      },
      select: { safetyScore: true }
    }),
    prisma.safetyScore.findMany({
      where: {
        worksiteId,
        date: { gte: monthAgo, lt: currentDate }
      },
      select: { safetyScore: true }
    })
  ]);
  
  const weekAvg =
    weekScores.length > 0
      ? weekScores.reduce((sum, s) => sum + s.safetyScore, 0) / weekScores.length
      : undefined;
  
  const monthAvg =
    monthScores.length > 0
      ? monthScores.reduce((sum, s) => sum + s.safetyScore, 0) / monthScores.length
      : undefined;
  
  return {
    yesterday: yesterdayScore?.safetyScore,
    weekAvg: weekAvg ? Math.round(weekAvg * 100) / 100 : undefined,
    monthAvg: monthAvg ? Math.round(monthAvg * 100) / 100 : undefined,
    change7d:
      weekAvg !== undefined
        ? `${weekAvg > 0 ? '+' : ''}${((weekAvg / 100) * 100).toFixed(1)}%`
        : undefined
  };
}

/**
 * Get or create config for a worksite
 */
export async function getConfig(
  worksiteId?: string
): Promise<SafetyScoreConfig> {
  // Try to get site-specific config
  if (worksiteId) {
    const config = await prisma.safetyScoreConfig.findUnique({
      where: { worksiteId }
    });
    
    if (config) {
      return {
        alpha: config.alpha,
        beta: config.beta,
        gamma: config.gamma,
        alertWeightMin: config.alertWeightMin,
        alertWeightMax: config.alertWeightMax,
        defaultAlertWeight: config.defaultAlertWeight,
        maxPenalty: config.maxPenalty,
        perTypeAlertCap: config.perTypeAlertCap,
        lambda: config.lambda,
        timeWindowSeconds: config.timeWindowSeconds,
        spatialThresholdMeters: config.spatialThresholdMeters,
        safeDayBonusRate: config.safeDayBonusRate,
        maxBonus: config.maxBonus,
        safeDayThreshold: config.safeDayThreshold,
        minDetections: config.minDetections
      };
    }
  }
  
  // Try global config
  const globalConfig = await prisma.safetyScoreConfig.findFirst({
    where: { isGlobal: true }
  });
  
  if (globalConfig) {
    return {
      alpha: globalConfig.alpha,
      beta: globalConfig.beta,
      gamma: globalConfig.gamma,
      alertWeightMin: globalConfig.alertWeightMin,
      alertWeightMax: globalConfig.alertWeightMax,
      defaultAlertWeight: globalConfig.defaultAlertWeight,
      maxPenalty: globalConfig.maxPenalty,
      perTypeAlertCap: globalConfig.perTypeAlertCap,
      lambda: globalConfig.lambda,
      timeWindowSeconds: globalConfig.timeWindowSeconds,
      spatialThresholdMeters: globalConfig.spatialThresholdMeters,
      safeDayBonusRate: globalConfig.safeDayBonusRate,
      maxBonus: globalConfig.maxBonus,
      safeDayThreshold: globalConfig.safeDayThreshold,
      minDetections: globalConfig.minDetections
    };
  }
  
  // Return defaults
  return DEFAULT_SAFETY_CONFIG;
}

