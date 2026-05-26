/**
 * Pattern-Based Alert Detection
 * 
 * Detects spikes, hotspots, and temporal patterns in alerts
 * Provides proactive operational insights instead of reactive noise
 */

import { prisma } from '../prisma';

export const PATTERN_DEFAULTS = {
  SPIKE_THRESHOLD: 0.4,       // 40% increase over baseline
  HOTSPOT_ALERT_COUNT: 5,     // 5+ alerts in same zone
  HOTSPOT_TIME_WINDOW: 15,    // Within 15 minutes
  PATTERN_LOOKBACK_DAYS: 7,   // Look back 7 days for patterns
};

export class PatternDetector {
  /**
   * Detect and report spike in alerts
   */
  async detectSpike(worksiteId: string): Promise<boolean> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get current day's alert count
    const todayCount = await prisma.alert.count({
      where: {
        worksiteId,
        createdAt: {
          gte: oneDayAgo
        }
      }
    });

    // Get baseline (average of past 7 days, excluding today)
    const baseline = await this.getBaselineAlertCount(worksiteId);

    if (baseline === 0) {
      return false; // No baseline to compare against
    }

    const percentageIncrease = (todayCount - baseline) / baseline;

    if (percentageIncrease >= PATTERN_DEFAULTS.SPIKE_THRESHOLD) {
      console.log(`[Pattern Detection] SPIKE DETECTED: ${Math.round(percentageIncrease * 100)}% increase (${todayCount} vs baseline ${baseline})`);
      
      await this.createPatternAlert(worksiteId, {
        type: 'SPIKE',
        severity: percentageIncrease >= 1.0 ? 'HIGH' : 'MODERATE',
        data: {
          currentCount: todayCount,
          baseline,
          percentageIncrease: Math.round(percentageIncrease * 100),
          timeWindow: '24 hours'
        }
      });

      return true;
    }

    return false;
  }

  /**
   * Detect hotspots (high alert concentration in specific zones)
   */
  async detectHotspots(worksiteId: string): Promise<any[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - PATTERN_DEFAULTS.HOTSPOT_TIME_WINDOW * 60 * 1000);

    // Get recent alerts grouped by location
    const alerts = await prisma.alert.findMany({
      where: {
        worksiteId,
        createdAt: {
          gte: windowStart
        },
        location: {
          not: null
        }
      },
      select: {
        id: true,
        location: true,
        severity: true,
        createdAt: true
      }
    });

    // Group by location
    const locationMap = new Map<string, any[]>();
    alerts.forEach(alert => {
      if (!alert.location) return;
      if (!locationMap.has(alert.location)) {
        locationMap.set(alert.location, []);
      }
      locationMap.get(alert.location)!.push(alert);
    });

    // Find hotspots
    const hotspots: any[] = [];
    locationMap.forEach((alerts, location) => {
      if (alerts.length >= PATTERN_DEFAULTS.HOTSPOT_ALERT_COUNT) {
        const severityCounts: any = {};
        alerts.forEach(a => {
          severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
        });

        const hotspot = {
          zone: location,
          alertCount: alerts.length,
          timeWindow: PATTERN_DEFAULTS.HOTSPOT_TIME_WINDOW,
          severity: this.getHotspotSeverity(alerts),
          severityBreakdown: severityCounts,
          firstAlert: alerts[0].createdAt,
          lastAlert: alerts[alerts.length - 1].createdAt
        };

        hotspots.push(hotspot);

        console.log(`[Pattern Detection] HOTSPOT DETECTED: ${location} - ${alerts.length} alerts`);

        // Create pattern alert
        this.createPatternAlert(worksiteId, {
          type: 'HOTSPOT',
          severity: hotspot.severity,
          data: hotspot
        });
      }
    });

    return hotspots;
  }

  /**
   * Detect time-of-day patterns
   */
  async detectTimePatterns(worksiteId: string): Promise<any> {
    const sevenDaysAgo = new Date(Date.now() - PATTERN_DEFAULTS.PATTERN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const alerts = await prisma.alert.findMany({
      where: {
        worksiteId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true,
        severity: true
      }
    });

    // Group by hour
    const hourlyBreakdown: { [hour: number]: number } = {};
    alerts.forEach(alert => {
      const hour = new Date(alert.createdAt).getHours();
      hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
    });

    // Find peak hours (>20% above daily average)
    const avgPerHour = alerts.length / 24;
    const peakHours: any[] = [];

    Object.entries(hourlyBreakdown).forEach(([hour, count]) => {
      if (count > avgPerHour * 1.2) {
        peakHours.push({
          hour: parseInt(hour),
          count,
          percentAboveAverage: Math.round(((count - avgPerHour) / avgPerHour) * 100)
        });
      }
    });

    if (peakHours.length > 0) {
      console.log(`[Pattern Detection] TIME PATTERNS DETECTED:`, peakHours);
    }

    return {
      hourlyBreakdown,
      peakHours,
      recommendation: peakHours.length > 0 
        ? `Consider additional safety briefings before ${peakHours[0].hour}:00` 
        : null
    };
  }

  /**
   * Get baseline alert count for worksite
   */
  private async getBaselineAlertCount(worksiteId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const metrics = await prisma.worksiteMetrics.findMany({
      where: {
        worksiteId,
        date: {
          gte: sevenDaysAgo,
          lt: oneDayAgo // Exclude today
        }
      },
      select: {
        totalAlerts: true
      }
    });

    if (metrics.length === 0) return 0;

    const avgPerDay = metrics.reduce((sum, m) => sum + m.totalAlerts, 0) / metrics.length;
    return Math.ceil(avgPerDay);
  }

  /**
   * Determine hotspot severity based on alerts
   */
  private getHotspotSeverity(alerts: any[]): 'MODERATE' | 'HIGH' | 'CRITICAL' {
    const criticalCount = alerts.filter(a => a.severity === 'HIGH').length;
    const highCount = alerts.filter(a => a.severity === 'MEDIUM' || a.severity === 'HIGH').length;

    if (criticalCount > 0) return 'CRITICAL';
    if (highCount >= alerts.length * 0.5) return 'HIGH';
    return 'MODERATE';
  }

  /**
   * Increase severity for future alerts in hotspot zone
   */
  async increaseZoneSeverity(worksiteId: string, zone: string): Promise<void> {
    // Mark zone as hotspot in worksite metadata
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { metadata: true }
    });

    const metadata = (worksite?.metadata as any) || {};
    const hotspots = metadata.hotspots || [];
    
    if (!hotspots.find((h: any) => h.zone === zone)) {
      hotspots.push({
        zone,
        severityBoost: 1, // Increase severity by 1 level
        detectedAt: new Date().toISOString()
      });

      await prisma.worksite.update({
        where: { id: worksiteId },
        data: {
          metadata: {
            ...metadata,
            hotspots
          } as any
        }
      });

      console.log(`[Pattern Detection] Zone ${zone} marked as hotspot - future violations will be escalated`);
    }
  }

  /**
   * Create a pattern-based alert
   */
  private async createPatternAlert(worksiteId: string, pattern: any): Promise<void> {
    const { type, severity, data } = pattern;

    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { name: true }
    });

    let title = '';
    let description = '';

    if (type === 'SPIKE') {
      title = `Alert Spike Detected`;
      description = `${data.percentageIncrease}% increase in alerts (${data.currentCount} vs baseline ${data.baseline}) over the past ${data.timeWindow}`;
    } else     if (type === 'HOTSPOT') {
      title = `Alert Hotspot: ${data.zone}`;
      description = `${data.alertCount} alerts detected in "${data.zone}" within ${data.timeWindow} minutes. Severity breakdown: ${JSON.stringify(data.severityBreakdown)}`;
      
      // Increase severity for future alerts in this zone
      await this.increaseZoneSeverity(worksiteId, data.zone);
    }

    // Create alert
    await prisma.alert.create({
      data: {
        title,
        description,
        severity: severity as any,
        status: 'ACTIVE',
        source: 'pattern_detection',
        location: type === 'HOTSPOT' ? data.zone : null,
        worksiteId,
        metadata: {
          patternType: type,
          patternData: data,
          autoGenerated: true
        } as any
      }
    });

    console.log(`[Pattern Detection] Created ${type} alert for worksite ${worksiteId}`);
  }

  /**
   * Run all pattern detections for a worksite
   */
  async analyzeWorksite(worksiteId: string): Promise<void> {
    console.log(`[Pattern Detection] Analyzing worksite: ${worksiteId}`);

    await Promise.all([
      this.detectSpike(worksiteId),
      this.detectHotspots(worksiteId),
      this.detectTimePatterns(worksiteId)
    ]);
  }
}

export const patternDetector = new PatternDetector();

