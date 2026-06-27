/**
 * Safety Score Calculation Service
 *
 * Bidirectional weighted formula (v2):
 *
 *   Net penalty = ( Σ violation_weights - Σ positive_weights ) / S
 *   Net penalty clamped to [-maxBoostFromPositives, maxPenalty]
 *
 *   Score = 100 × C × F_cov × (1 - net_penalty) × (1 + consecutive_bonus)
 *
 * Violation severity weights (neg):  HIGH=1.5  MEDIUM=1.0  LOW=0.3
 * Positive compliance weights (pos): HIGH=0.6  MEDIUM=0.4  LOW=0.12
 *
 * Ratio: ~2.5× positives at the same severity cancel one violation.
 * Example: 10 HIGH violations → net_penalty rises by 1.5 units each;
 *          25 HIGH positives  → net_penalty falls  by 0.6 units each.
 *          Net = 0 → score unchanged.  This is insurer-explainable.
 *
 * Positive net_penalty (violations dominate) → score falls.
 * Negative net_penalty (compliances dominate) → score rises (capped at +15%).
 */

import { prisma } from '@/app/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface SafetyScoreConfig {
  // ── Negative violation weights (severity-tiered) ────────────────────────
  // Insurer interpretation: HIGH = serious risk exposure, LOW = minor risk.
  negWeightHigh: number;          // per HIGH/critical violation   (default 1.5)
  negWeightMedium: number;        // per MEDIUM violation          (default 1.0)
  negWeightLow: number;           // per LOW/minor violation       (default 0.3)

  // ── Positive compliance weights (severity-tiered) ───────────────────────
  // negWeight / posWeight ≈ 2.5  →  need ~2.5 positives to offset 1 negative
  // at the same severity level.  Keeps violations as the dominant signal while
  // rewarding documented compliance improvement for actuarial reports.
  posWeightHigh: number;          // per HIGH-confidence compliant obs  (default 0.6)
  posWeightMedium: number;        // per MEDIUM                         (default 0.4)
  posWeightLow: number;           // per LOW                            (default 0.12)

  // ── Legacy / custom alert weights ──────────────────────────────────────
  gamma: number;                  // Custom alert global multiplier
  alertWeightMin: number;
  alertWeightMax: number;
  defaultAlertWeight: number;

  // ── Net-penalty clamps ──────────────────────────────────────────────────
  maxPenalty: number;             // Max downward effect  (default 0.50 = −50%)
  maxBoostFromPositives: number;  // Max upward  effect   (default 0.15 = +15%)
  perTypeAlertCap: number;

  // ── Time decay ──────────────────────────────────────────────────────────
  lambda: number;                 // Exponential decay rate per day

  // ── Deduplication ───────────────────────────────────────────────────────
  timeWindowSeconds: number;
  spatialThresholdMeters: number;

  // ── Consecutive-safe-day bonus ──────────────────────────────────────────
  safeDayBonusRate: number;
  maxBonus: number;
  safeDayThreshold: number;

  // ── Data requirements ───────────────────────────────────────────────────
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

/**
 * Positive compliance observations — PPE worn, safe behaviours detected.
 * Severity mirrors AlertSeverity (HIGH = very confident / high-risk zone covered).
 */
export interface PositiveDetectionData {
  high:   Array<{ timestamp: Date; type: string }>;  // e.g. hard-hat on in mandatory zone
  medium: Array<{ timestamp: Date; type: string }>;  // e.g. vest worn
  low:    Array<{ timestamp: Date; type: string }>;  // e.g. general PPE observed
}

export interface SafetyScoreResult {
  score: number; // Always between 0 and 100 (clamped)
  grade: string;
  breakdown: {
    baseCompliance: number;    // C ∈ [0.5, 1.0]
    coverageFactor: number;    // F_cov ∈ [0.7, 1.0]
    netPenalty: number;        // Clamped net = violations − positives, ∈ [-0.15, 0.50]
    /** @deprecated Use netPenalty. Kept for backwards-compat with stored breakdowns. */
    violationPenalty: number;
    components: {
      majorViolations:  { count: number; penalty: number };
      minorViolations:  { count: number; penalty: number };
      customAlerts:     Array<{ type: string; count: number; weight: number; penalty: number }>;
      // Positive compliance contributions (negative = score boost)
      positiveHigh:   { count: number; boost: number };
      positiveMedium: { count: number; boost: number };
      positiveLow:    { count: number; boost: number };
      totalPositiveBoost: number; // sum of all positive boosts (score units before clamping)
    };
    scalingFactor: number;
    bonus: { consecutiveSafeDays: number; bonusAmount: number }; // bonus ∈ [0, 0.15]
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
  // Negative severity weights
  negWeightHigh:   1.50,
  negWeightMedium: 1.00,
  negWeightLow:    0.30,

  // Positive severity weights (~2.5× fewer positives needed vs negatives at same tier)
  posWeightHigh:   0.60,
  posWeightMedium: 0.40,
  posWeightLow:    0.12,

  // Custom alert settings
  gamma: 1.0,
  alertWeightMin: 0.1,
  alertWeightMax: 2.0,
  defaultAlertWeight: 0.5,

  // Clamps
  maxPenalty:           0.50,   // Max score can drop: 50%
  maxBoostFromPositives: 0.15,  // Max score can rise from compliances: 15%
  perTypeAlertCap: 50,

  // Time decay
  lambda: 0.1,

  // Deduplication
  timeWindowSeconds: 300,
  spatialThresholdMeters: 10,

  // Consecutive-safe-day bonus
  safeDayBonusRate: 0.01,
  maxBonus: 0.10,
  safeDayThreshold: 7,

  // Data requirements
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
  const recs: string[] = [];
  const { components, bonus, netPenalty } = breakdown;

  // Major violations — always surface these immediately
  if (components.majorViolations.count > 0) {
    recs.push(
      `🚨 ${components.majorViolations.count} major violation${
        components.majorViolations.count > 1 ? 's' : ''
      } detected — immediate corrective action required`
    );
  }

  // Minor violations
  if (components.minorViolations.count > 5) {
    recs.push(
      `⚠️ ${components.minorViolations.count} minor violations — review and address recurring patterns`
    );
  }

  // Custom alerts
  const topAlert = [...components.customAlerts].sort((a, b) => b.count - a.count)[0];
  if (topAlert && topAlert.count > 3) {
    recs.push(`🎯 Focus area: ${topAlert.type} — ${topAlert.count} incidents detected`);
  }

  // Positive compliance signal
  const totalPositives =
    components.positiveHigh.count + components.positiveMedium.count + components.positiveLow.count;
  if (totalPositives > 0 && netPenalty < 0) {
    recs.push(
      `✅ ${totalPositives} compliant observations recorded — positive safety behaviour is boosting your score`
    );
  } else if (totalPositives > 0) {
    recs.push(
      `📈 ${totalPositives} compliant observations recorded — keep documenting PPE compliance to improve your score`
    );
  }

  // Streak bonus
  if (bonus.consecutiveSafeDays >= config.safeDayThreshold) {
    recs.push(
      `🏅 ${bonus.consecutiveSafeDays}-day compliance streak! Consistent performance earns an actuarial bonus.`
    );
  }

  // Data quality warning
  if (totalDetections < config.minDetections) {
    recs.push(
      `📊 Limited detection data (${totalDetections}/${config.minDetections}). Check that cameras are operational.`
    );
  }

  // Perfect day
  if (components.majorViolations.count === 0 && components.minorViolations.count === 0) {
    recs.push('🌟 Zero violations detected today — excellent safety performance!');
  }

  return recs;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate comprehensive safety score (v2 — bidirectional weighted formula).
 *
 * Formula:
 *   neg = Σ(negWeight[sev] × time_decay(violation))  over all violations + custom alerts
 *   pos = Σ(posWeight[sev] × time_decay(detection))  over all positive compliance events
 *   net = (neg - pos) / S          where S = max(1, totalDetections / 100)
 *   net clamped to [-maxBoostFromPositives, maxPenalty]
 *   Score = 100 × C × F_cov × (1 - net) × (1 + bonus) × (1 - estimationPenalty)
 *   Final score clamped to [0, 100]
 *
 * Insurer interpretation:
 *   - Negative net  → lots of compliances, score rises   (capped at +15%)
 *   - Positive net  → violations dominate, score falls   (capped at −50%)
 *   - ~2.5 HIGH positives cancel 1 HIGH violation
 *
 * @param worksiteId      - Worksite identifier
 * @param date            - Date for calculation
 * @param violations      - Violation data (major, minor, custom alerts)
 * @param positives       - Positive compliance detections (optional, defaults to empty)
 * @param totalDetections - Total detection count (actual or estimated)
 * @param baseCompliance  - Base compliance factor C, clamped to [0.5, 1.0]
 * @param coverageFactor  - Coverage factor F_cov, clamped to [0.7, 1.0]
 * @param config          - Optional config override
 * @param detectionMetadata - Optional metadata about detection source
 */
export async function calculateSafetyScore(
  worksiteId: string,
  date: Date,
  violations: ViolationData,
  positives: PositiveDetectionData = { high: [], medium: [], low: [] },
  totalDetections: number,
  baseCompliance: number = 0.90,
  coverageFactor: number = 0.95,
  config?: Partial<SafetyScoreConfig>,
  detectionMetadata?: {
    detectionsSource: 'ACTUAL' | 'ESTIMATED';
    estimationPenaltyApplied: boolean;
  }
): Promise<SafetyScoreResult> {
  const cfg: SafetyScoreConfig = { ...DEFAULT_SAFETY_CONFIG, ...config };

  // ── 1. Clamp inputs ──────────────────────────────────────────────────────
  const C     = Math.min(1.0, Math.max(0.5, baseCompliance));
  const F_cov = Math.min(1.0, Math.max(0.7, coverageFactor));
  const insufficientData = totalDetections < cfg.minDetections;

  // ── 2. Time-weighted violations ──────────────────────────────────────────
  // major = HIGH/critical violations, minor = MEDIUM/LOW violations
  const V_maj_weighted = applyTimeDecay(violations.major, date, cfg.lambda);
  const V_min_weighted = applyTimeDecay(violations.minor, date, cfg.lambda);

  // Use severity-specific neg weights instead of legacy alpha/beta
  // (alpha/beta left in config for backwards-compat with DB-stored configs)
  const negMajor = cfg.negWeightHigh   * V_maj_weighted;
  const negMinor = cfg.negWeightLow    * V_min_weighted;  // minor → LOW weight

  // ── 3. Custom alerts with deduplication ─────────────────────────────────
  const alertsByType = violations.customAlerts.reduce((acc, alert) => {
    (acc[alert.type] ??= []).push(alert);
    return acc;
  }, {} as Record<string, typeof violations.customAlerts>);

  const customAlertDetails: Array<{ type: string; count: number; weight: number; penalty: number }> = [];
  let A_score = 0;

  for (const [type, alerts] of Object.entries(alertsByType)) {
    const avgWeight    = alerts.reduce((s, a) => s + a.weight, 0) / alerts.length;
    const clampedWeight = Math.max(cfg.alertWeightMin, Math.min(cfg.alertWeightMax, avgWeight));
    const deduped      = deduplicateAlerts(alerts, cfg.timeWindowSeconds, cfg.spatialThresholdMeters);
    const cappedCount  = Math.min(deduped, cfg.perTypeAlertCap);
    const penalty      = clampedWeight * cappedCount;
    A_score           += penalty;
    customAlertDetails.push({ type: alerts[0].name || type, count: cappedCount, weight: clampedWeight, penalty });
  }

  // ── 4. Time-weighted positive detections ─────────────────────────────────
  const P_hi_weighted  = applyTimeDecay(positives.high,   date, cfg.lambda);
  const P_med_weighted = applyTimeDecay(positives.medium, date, cfg.lambda);
  const P_low_weighted = applyTimeDecay(positives.low,    date, cfg.lambda);

  const posHiBoost  = cfg.posWeightHigh   * P_hi_weighted;
  const posMedBoost = cfg.posWeightMedium * P_med_weighted;
  const posLowBoost = cfg.posWeightLow    * P_low_weighted;
  const totalPosBoost = posHiBoost + posMedBoost + posLowBoost;

  // ── 5. Scaling factor (normalise by detection volume) ────────────────────
  const S = Math.max(1, totalDetections / 100);

  // ── 6. Net penalty — negative means positives dominate (score boost) ─────
  const negTotal = negMajor + negMinor + cfg.gamma * A_score;
  const rawNet   = (negTotal - totalPosBoost) / S;

  // Clamp: negative end = score boost cap, positive end = penalty cap
  const netPenalty = Math.min(
    cfg.maxPenalty,
    Math.max(-cfg.maxBoostFromPositives, rawNet)
  );

  // ── 7. Estimation penalty (less reliable data = slight haircut) ──────────
  const estimationPenalty = detectionMetadata?.estimationPenaltyApplied ? 0.10 : 0;

  // ── 8. Base score ────────────────────────────────────────────────────────
  // (1 - netPenalty) > 1 when negatives < positives → score rises
  let safetyScore = 100 * C * F_cov * (1 - netPenalty) * (1 - estimationPenalty);

  // ── 9. Consecutive safe-day bonus ────────────────────────────────────────
  const consecutiveSafeDays = await getConsecutiveSafeDays(worksiteId, date);
  let bonusAmount = 0;
  if (consecutiveSafeDays >= cfg.safeDayThreshold) {
    bonusAmount = Math.min(0.15, Math.max(0,
      Math.min(cfg.maxBonus, consecutiveSafeDays * cfg.safeDayBonusRate)
    ));
    safetyScore = safetyScore * (1 + bonusAmount);
  }

  // ── 10. Final clamp ──────────────────────────────────────────────────────
  const finalScore = Math.min(100, Math.max(0, safetyScore));
  const { grade }  = getGrade(finalScore);

  // ── 11. Breakdown ────────────────────────────────────────────────────────
  const breakdown: SafetyScoreResult['breakdown'] = {
    baseCompliance: C,
    coverageFactor: F_cov,
    netPenalty,
    violationPenalty: netPenalty, // backwards compat alias
    components: {
      majorViolations:  { count: Math.round(V_maj_weighted), penalty: negMajor },
      minorViolations:  { count: Math.round(V_min_weighted), penalty: negMinor },
      customAlerts:     customAlertDetails,
      positiveHigh:     { count: Math.round(P_hi_weighted),  boost: posHiBoost  },
      positiveMedium:   { count: Math.round(P_med_weighted), boost: posMedBoost },
      positiveLow:      { count: Math.round(P_low_weighted), boost: posLowBoost },
      totalPositiveBoost,
    },
    scalingFactor: S,
    bonus: { consecutiveSafeDays, bonusAmount },
    ...(detectionMetadata && {
      detectionsSource: detectionMetadata.detectionsSource,
      estimationPenaltyApplied: detectionMetadata.estimationPenaltyApplied,
      estimationPenalty,
    }),
  };

  // ── 12. Recommendations ──────────────────────────────────────────────────
  const recommendations = generateRecommendations(breakdown, totalDetections, cfg);

  // ── 13. Trends ───────────────────────────────────────────────────────────
  const trend = await calculateTrends(worksiteId, date);

  return {
    score: Math.round(finalScore * 100) / 100,
    grade,
    breakdown,
    trend,
    recommendations,
    insufficientData,
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
      // Map legacy alpha/beta DB fields to new severity weights.
      // New columns (negWeightHigh etc.) don't exist in DB yet — use defaults.
      return {
        ...DEFAULT_SAFETY_CONFIG,
        gamma:               config.gamma,
        alertWeightMin:      config.alertWeightMin,
        alertWeightMax:      config.alertWeightMax,
        defaultAlertWeight:  config.defaultAlertWeight,
        maxPenalty:          config.maxPenalty,
        perTypeAlertCap:     config.perTypeAlertCap,
        lambda:              config.lambda,
        timeWindowSeconds:   config.timeWindowSeconds,
        spatialThresholdMeters: config.spatialThresholdMeters,
        safeDayBonusRate:    config.safeDayBonusRate,
        maxBonus:            config.maxBonus,
        safeDayThreshold:    config.safeDayThreshold,
        minDetections:       config.minDetections,
      };
    }
  }

  // Try global config
  const globalConfig = await prisma.safetyScoreConfig.findFirst({
    where: { isGlobal: true }
  });

  if (globalConfig) {
    return {
      ...DEFAULT_SAFETY_CONFIG,
      gamma:               globalConfig.gamma,
      alertWeightMin:      globalConfig.alertWeightMin,
      alertWeightMax:      globalConfig.alertWeightMax,
      defaultAlertWeight:  globalConfig.defaultAlertWeight,
      maxPenalty:          globalConfig.maxPenalty,
      perTypeAlertCap:     globalConfig.perTypeAlertCap,
      lambda:              globalConfig.lambda,
      timeWindowSeconds:   globalConfig.timeWindowSeconds,
      spatialThresholdMeters: globalConfig.spatialThresholdMeters,
      safeDayBonusRate:    globalConfig.safeDayBonusRate,
      maxBonus:            globalConfig.maxBonus,
      safeDayThreshold:    globalConfig.safeDayThreshold,
      minDetections:       globalConfig.minDetections,
    };
  }

  // Return defaults
  return DEFAULT_SAFETY_CONFIG;
}

