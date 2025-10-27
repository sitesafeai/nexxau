'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface SafetyScoreData {
  score: number;
  grade: string;
  breakdown: {
    baseCompliance: number;
    coverageFactor: number;
    violationPenalty: number;
    components: {
      majorViolations: { count: number; penalty: number };
      minorViolations: { count: number; penalty: number };
      customAlerts: Array<{ type: string; count: number; weight: number; penalty: number }>;
    };
    scalingFactor: number;
    bonus: {
      consecutiveSafeDays: number;
      bonusAmount: number;
    };
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

interface SafetyScoreCardProps {
  data: SafetyScoreData;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function SafetyScoreCard({ data, loading = false, onRefresh }: SafetyScoreCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#10b981'; // Green
    if (grade.startsWith('B')) return '#f59e0b'; // Orange
    if (grade.startsWith('C')) return '#ef4444'; // Red
    return '#991b1b'; // Dark red
  };

  const getGradeEmoji = (grade: string) => {
    if (grade === 'A+') return '🏆';
    if (grade === 'A') return '⭐';
    if (grade.startsWith('A')) return '✅';
    if (grade.startsWith('B')) return '👍';
    if (grade.startsWith('C')) return '⚠️';
    return '🚨';
  };

  const getTrendIcon = () => {
    if (!data.trend?.change7d) return null;
    const change = parseFloat(data.trend.change7d);
    return change >= 0 ? (
      <TrendingUp className="h-5 w-5 text-green-400" />
    ) : (
      <TrendingDown className="h-5 w-5 text-red-400" />
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 animate-pulse">
        <div className="h-32 bg-gray-700 rounded-xl mb-4"></div>
        <div className="h-48 bg-gray-700 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Safety Score</h2>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Main Score Display */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 mb-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div 
                className="text-6xl font-bold"
                style={{ color: getGradeColor(data.grade) }}
              >
                {data.score.toFixed(1)}
              </div>
              <div>
                <div 
                  className="text-4xl font-bold"
                  style={{ color: getGradeColor(data.grade) }}
                >
                  {data.grade} {getGradeEmoji(data.grade)}
                </div>
                {data.trend && (
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon()}
                    <span className="text-gray-300 text-sm">
                      {data.trend.change7d} vs last week
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {data.insufficientData && (
              <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Limited detection data - score may not be fully accurate</span>
              </div>
            )}
          </div>

          {/* Consecutive Safe Days */}
          {data.breakdown.bonus.consecutiveSafeDays > 0 && (
            <div className="text-center bg-green-600/20 rounded-xl p-4 border border-green-500/30">
              <div className="text-3xl font-bold text-green-400">
                {data.breakdown.bonus.consecutiveSafeDays}
              </div>
              <div className="text-sm text-gray-300">
                Safe Days Streak
              </div>
              {data.breakdown.bonus.bonusAmount > 0 && (
                <div className="text-xs text-green-400 mt-1">
                  +{(data.breakdown.bonus.bonusAmount * 100).toFixed(1)}% bonus
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Compliance</div>
          <div className="text-2xl font-bold text-green-400">
            {(data.breakdown.baseCompliance * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Coverage</div>
          <div className="text-2xl font-bold text-blue-400">
            {(data.breakdown.coverageFactor * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Penalty</div>
          <div className="text-2xl font-bold text-red-400">
            {(data.breakdown.violationPenalty * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Violations Summary */}
      <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          Violations & Alerts
        </h3>
        <div className="space-y-2">
          {/* Major Violations */}
          {data.breakdown.components.majorViolations.count > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Major Violations</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">
                  {data.breakdown.components.majorViolations.count}
                </span>
                <span className="text-red-400 text-sm">
                  -{data.breakdown.components.majorViolations.penalty.toFixed(1)} pts
                </span>
              </div>
            </div>
          )}

          {/* Minor Violations */}
          {data.breakdown.components.minorViolations.count > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">Minor Violations</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">
                  {data.breakdown.components.minorViolations.count}
                </span>
                <span className="text-yellow-400 text-sm">
                  -{data.breakdown.components.minorViolations.penalty.toFixed(1)} pts
                </span>
              </div>
            </div>
          )}

          {/* Custom Alerts */}
          {data.breakdown.components.customAlerts.map((alert, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-300">{alert.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">
                  {alert.count}
                </span>
                <span className="text-purple-400 text-sm">
                  -{alert.penalty.toFixed(1)} pts
                </span>
              </div>
            </div>
          ))}

          {/* No violations */}
          {data.breakdown.components.majorViolations.count === 0 &&
           data.breakdown.components.minorViolations.count === 0 &&
           data.breakdown.components.customAlerts.length === 0 && (
            <div className="flex items-center gap-2 text-green-400 py-2">
              <CheckCircle className="h-5 w-5" />
              <span>No violations detected today!</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-blue-600/10 rounded-xl p-4 border border-blue-500/30 mb-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trend Comparison */}
      {data.trend && (
        <div className="grid grid-cols-3 gap-4">
          {data.trend.yesterday !== undefined && (
            <div className="bg-gray-800/30 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Yesterday</div>
              <div className="text-lg font-bold text-white">
                {data.trend.yesterday.toFixed(1)}
              </div>
            </div>
          )}
          {data.trend.weekAvg !== undefined && (
            <div className="bg-gray-800/30 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">7-Day Avg</div>
              <div className="text-lg font-bold text-white">
                {data.trend.weekAvg.toFixed(1)}
              </div>
            </div>
          )}
          {data.trend.monthAvg !== undefined && (
            <div className="bg-gray-800/30 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">30-Day Avg</div>
              <div className="text-lg font-bold text-white">
                {data.trend.monthAvg.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-4 w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showDetails ? 'Hide' : 'View'} Detailed Breakdown →
      </button>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="mt-4 bg-gray-800/50 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Base Compliance (C):</span>
            <span className="text-white font-mono">{data.breakdown.baseCompliance.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Coverage Factor (F_cov):</span>
            <span className="text-white font-mono">{data.breakdown.coverageFactor.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Violation Penalty (P):</span>
            <span className="text-white font-mono">{data.breakdown.violationPenalty.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Scaling Factor (S):</span>
            <span className="text-white font-mono">{data.breakdown.scalingFactor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Safety Bonus:</span>
            <span className="text-green-400 font-mono">
              +{(data.breakdown.bonus.bonusAmount * 100).toFixed(2)}%
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-gray-700">
            <div className="flex justify-between font-semibold">
              <span className="text-gray-300">Formula:</span>
              <span className="text-white font-mono">
                100 × C × F_cov × (1 - P) × (1 + bonus)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

