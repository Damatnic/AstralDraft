/**
 * Enhanced Analytics Service
 * Comprehensive analytics processing and aggregation service for the dashboard
 */

import { oracleAnalyticsService, type OracleAnalytics, type OraclePerformanceMetrics } from './oracleAnalyticsService';
import { dataPersistenceService, type AnalyticsData } from './dataPersistenceService';
import { authService } from './authService';

export interface EnhancedAnalyticsMetrics {
  accuracy: {
    overall: number;
    trend: number;
    byCategory: Record<string, number>;
    weeklyConsistency: number;
  };
  performance: {
    userWinRate: number;
    confidenceCorrelation: number;
    calibrationScore: number;
    improvementRate: number;
  };
  engagement: {
    totalPredictions: number;
    averageConfidence: number;
    mostActiveCategory: string;
    streakData: {
      current: number;
      best: number;
    };
  };
  comparative: {
    userPercentile: number;
    aboveAverage: number;
    topPerformerGap: number;
  };
}

export interface PredictiveInsight {
  id: string;
  type: 'trend' | 'optimization' | 'alert' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  actionable: boolean;
  recommendations: string[];
  data?: any;
}

export interface AnalyticsReport {
  timestamp: string;
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
  metrics: EnhancedAnalyticsMetrics;
  insights: PredictiveInsight[];
  charts: {
    id: string;
    type: string;
    title: string;
    data: any[];
    config: any;
  }[];
  summary: {
    keyFindings: string[];
    recommendedActions: string[];
    nextReviewDate: string;
  };
}

class EnhancedAnalyticsService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(timeRangeDays: number = 30): Promise<AnalyticsReport> {
    const cacheKey = `analytics_report_${timeRangeDays}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeRangeDays * 24 * 60 * 60 * 1000));

      // Gather base analytics data
      const [oracleAnalytics, performanceMetrics, historicalData] = await Promise.all([
        oracleAnalyticsService.getAnalytics(),
        oracleAnalyticsService.getOraclePerformanceMetrics(),
        this.getHistoricalAnalytics(currentUser.id, startDate, endDate)
      ]);

      // Generate enhanced metrics
      const enhancedMetrics = await this.calculateEnhancedMetrics(
        oracleAnalytics,
        performanceMetrics,
        historicalData
      );

      // Generate predictive insights
      const insights = await this.generatePredictiveInsights(
        enhancedMetrics,
        historicalData
      );

      // Generate chart configurations
      const charts = this.generateChartConfigurations(
        oracleAnalytics,
        performanceMetrics,
        historicalData
      );

      // Generate summary
      const summary = this.generateAnalyticsSummary(enhancedMetrics, insights);

      const report: AnalyticsReport = {
        timestamp: new Date().toISOString(),
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: timeRangeDays
        },
        metrics: enhancedMetrics,
        insights,
        charts,
        summary
      };

      this.setCache(cacheKey, report);
      return report;

    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      throw error;
    }
  }

  /**
   * Calculate enhanced analytics metrics
   */
  private async calculateEnhancedMetrics(
    oracleAnalytics: OracleAnalytics,
    performanceMetrics: OraclePerformanceMetrics,
    historicalData: AnalyticsData[]
  ): Promise<EnhancedAnalyticsMetrics> {
    // Calculate accuracy metrics
    const accuracyTrend = this.calculateTrend(
      oracleAnalytics.accuracyTrends.map(t => t.accuracy)
    );

    const weeklyConsistency = this.calculateConsistency(
      Object.values(performanceMetrics.weeklyAccuracy)
    );

    // Calculate performance metrics
    const improvementRate = this.calculateImprovementRate(historicalData);

    // Calculate engagement metrics
    const streakData = this.calculateStreakData(oracleAnalytics.accuracyTrends);
    const mostActiveCategory = this.findMostActiveCategory(oracleAnalytics.topPredictionTypes);

    // Calculate comparative metrics (simulated for MVP)
    const comparative = this.calculateComparativeMetrics(performanceMetrics);

    return {
      accuracy: {
        overall: oracleAnalytics.predictionAccuracy,
        trend: accuracyTrend,
        byCategory: performanceMetrics.typeAccuracy,
        weeklyConsistency
      },
      performance: {
        userWinRate: oracleAnalytics.userWinRate,
        confidenceCorrelation: performanceMetrics.confidenceCorrelation,
        calibrationScore: performanceMetrics.calibrationScore,
        improvementRate
      },
      engagement: {
        totalPredictions: oracleAnalytics.totalPredictions,
        averageConfidence: this.calculateAverageConfidence(oracleAnalytics.confidenceByType),
        mostActiveCategory,
        streakData
      },
      comparative
    };
  }

  /**
   * Generate predictive insights based on analytics data
   */
  private async generatePredictiveInsights(
    metrics: EnhancedAnalyticsMetrics,
    historicalData: AnalyticsData[]
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    // Accuracy trend insight
    if (Math.abs(metrics.accuracy.trend) > 0.02) {
      insights.push({
        id: 'accuracy_trend',
        type: 'trend',
        title: metrics.accuracy.trend > 0 ? 'Improving Accuracy Trend' : 'Declining Accuracy Trend',
        description: `Your prediction accuracy has ${metrics.accuracy.trend > 0 ? 'improved' : 'declined'} by ${(Math.abs(metrics.accuracy.trend) * 100).toFixed(1)}% recently.`,
        confidence: 85,
        impact: Math.abs(metrics.accuracy.trend) > 0.05 ? 'high' : 'medium',
        timeframe: '2-3 weeks',
        actionable: true,
        recommendations: metrics.accuracy.trend > 0 
          ? ['Continue current strategy', 'Consider increasing prediction volume']
          : ['Review prediction methodology', 'Focus on high-confidence categories'],
        data: { trend: metrics.accuracy.trend }
      });
    }

    // Performance optimization insight
    const bestCategory = Object.entries(metrics.accuracy.byCategory)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (bestCategory && bestCategory[1] > metrics.accuracy.overall + 0.1) {
      insights.push({
        id: 'category_specialization',
        type: 'optimization',
        title: 'Category Specialization Opportunity',
        description: `You perform ${((bestCategory[1] - metrics.accuracy.overall) * 100).toFixed(1)}% better in ${bestCategory[0]} predictions.`,
        confidence: 90,
        impact: 'high',
        timeframe: 'immediate',
        actionable: true,
        recommendations: [
          `Focus more on ${bestCategory[0]} predictions`,
          'Consider specializing in this category',
          'Reduce exposure to underperforming categories'
        ],
        data: { category: bestCategory[0], advantage: bestCategory[1] - metrics.accuracy.overall }
      });
    }

    // Confidence calibration insight
    if (metrics.performance.confidenceCorrelation < 0.6) {
      insights.push({
        id: 'confidence_calibration',
        type: 'alert',
        title: 'Confidence Calibration Needs Improvement',
        description: 'Your confidence levels don\'t strongly correlate with actual outcomes.',
        confidence: 80,
        impact: 'medium',
        timeframe: '1-2 weeks',
        actionable: true,
        recommendations: [
          'Be more conservative with high-confidence predictions',
          'Review factors that influence your confidence',
          'Use data-driven confidence assessment'
        ],
        data: { correlation: metrics.performance.confidenceCorrelation }
      });
    }

    // Engagement opportunity
    if (metrics.engagement.totalPredictions < 50 && metrics.accuracy.overall > 0.65) {
      insights.push({
        id: 'volume_opportunity',
        type: 'opportunity',
        title: 'Volume Increase Opportunity',
        description: 'Your accuracy is strong - consider making more predictions to maximize impact.',
        confidence: 75,
        impact: 'medium',
        timeframe: 'ongoing',
        actionable: true,
        recommendations: [
          'Gradually increase prediction volume',
          'Maintain quality while scaling quantity',
          'Set weekly prediction targets'
        ],
        data: { currentVolume: metrics.engagement.totalPredictions, suggestedIncrease: 20 }
      });
    }

    // Consistency insight
    if (metrics.accuracy.weeklyConsistency < 70) {
      insights.push({
        id: 'consistency_improvement',
        type: 'alert',
        title: 'Consistency Improvement Needed',
        description: 'Your week-to-week performance varies significantly.',
        confidence: 85,
        impact: 'medium',
        timeframe: '2-4 weeks',
        actionable: true,
        recommendations: [
          'Establish a regular prediction routine',
          'Document successful prediction strategies',
          'Review weekly performance patterns'
        ],
        data: { consistency: metrics.accuracy.weeklyConsistency }
      });
    }

    return insights;
  }

  /**
   * Generate chart configurations for visualization
   */
  private generateChartConfigurations(
    oracleAnalytics: OracleAnalytics,
    performanceMetrics: OraclePerformanceMetrics,
    historicalData: AnalyticsData[]
  ): AnalyticsReport['charts'] {
    const charts: AnalyticsReport['charts'] = [];

    // Accuracy trends over time
    if (oracleAnalytics.accuracyTrends.length > 0) {
      charts.push({
        id: 'accuracy_trends',
        type: 'line',
        title: 'Accuracy Trends Over Time',
        data: oracleAnalytics.accuracyTrends.map(trend => ({
          week: `Week ${trend.week}`,
          accuracy: (trend.accuracy * 100).toFixed(1),
          predictions: trend.totalPredictions
        })),
        config: {
          xAxisKey: 'week',
          yAxisKey: 'accuracy',
          color: '#10B981'
        }
      });
    }

    // Performance by category
    if (oracleAnalytics.topPredictionTypes.length > 0) {
      charts.push({
        id: 'category_performance',
        type: 'radar',
        title: 'Performance by Category',
        data: oracleAnalytics.topPredictionTypes.map(type => ({
          category: type.type,
          accuracy: type.accuracy * 100,
          volume: type.totalPredictions
        })),
        config: {
          angleKey: 'category',
          radiusKey: 'accuracy',
          color: '#3B82F6'
        }
      });
    }

    // Weekly performance distribution
    const weeklyData = Object.entries(performanceMetrics.weeklyAccuracy).map(([week, accuracy]) => ({
      week: `W${week}`,
      accuracy: (accuracy * 100).toFixed(1),
      benchmark: (performanceMetrics.overallAccuracy * 100).toFixed(1)
    }));

    if (weeklyData.length > 0) {
      charts.push({
        id: 'weekly_distribution',
        type: 'bar',
        title: 'Weekly Performance Distribution',
        data: weeklyData,
        config: {
          xAxisKey: 'week',
          yAxisKey: 'accuracy',
          colorKey: 'color'
        }
      });
    }

    return charts;
  }

  /**
   * Generate analytics summary
   */
  private generateAnalyticsSummary(
    metrics: EnhancedAnalyticsMetrics,
    insights: PredictiveInsight[]
  ): AnalyticsReport['summary'] {
    const keyFindings: string[] = [];
    const recommendedActions: string[] = [];

    // Analyze overall performance
    if (metrics.accuracy.overall > 0.7) {
      keyFindings.push(`Strong overall accuracy of ${(metrics.accuracy.overall * 100).toFixed(1)}%`);
    } else if (metrics.accuracy.overall < 0.5) {
      keyFindings.push(`Accuracy below average at ${(metrics.accuracy.overall * 100).toFixed(1)}%`);
      recommendedActions.push('Focus on improving prediction methodology');
    }

    // Analyze trends
    if (Math.abs(metrics.accuracy.trend) > 0.03) {
      keyFindings.push(`${metrics.accuracy.trend > 0 ? 'Positive' : 'Negative'} accuracy trend detected`);
      if (metrics.accuracy.trend < 0) {
        recommendedActions.push('Review recent prediction patterns for improvement opportunities');
      }
    }

    // Analyze consistency
    if (metrics.accuracy.weeklyConsistency < 70) {
      keyFindings.push('Inconsistent week-to-week performance');
      recommendedActions.push('Develop more systematic prediction approach');
    }

    // Add top insights
    const highImpactInsights = insights.filter(i => i.impact === 'high' && i.actionable);
    highImpactInsights.forEach(insight => {
      if (insight.recommendations.length > 0) {
        recommendedActions.push(insight.recommendations[0]);
      }
    });

    // Calculate next review date (1 week from now)
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 7);

    return {
      keyFindings: keyFindings.slice(0, 5), // Top 5 findings
      recommendedActions: [...new Set(recommendedActions)].slice(0, 5), // Top 5 unique actions
      nextReviewDate: nextReviewDate.toISOString()
    };
  }

  /**
   * Helper methods
   */
  private async getHistoricalAnalytics(userId: number, startDate: Date, endDate: Date): Promise<AnalyticsData[]> {
    try {
      const service = await dataPersistenceService;
      const allAnalytics = await service.getAnalyticsData(userId);
      
      return allAnalytics.filter(data => {
        const dataDate = new Date(data.createdAt);
        return dataDate >= startDate && dataDate <= endDate;
      });
    } catch (error) {
      console.warn('Failed to get historical analytics:', error);
      return [];
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-3).reduce((sum, val) => sum + val, 0) / Math.min(3, values.length);
    const earlier = values.slice(0, 3).reduce((sum, val) => sum + val, 0) / Math.min(3, values.length);
    
    return recent - earlier;
  }

  private calculateConsistency(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (higher is better, 0-100)
    return Math.max(0, 100 - (standardDeviation * 100));
  }

  private calculateImprovementRate(historicalData: AnalyticsData[]): number {
    if (historicalData.length < 2) return 0;
    
    // Sort by date
    const sortedData = [...historicalData].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const recent = sortedData.slice(-5); // Last 5 data points
    const earlier = sortedData.slice(0, 5); // First 5 data points
    
    if (recent.length === 0 || earlier.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, data) => sum + (data.data.accuracy || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, data) => sum + (data.data.accuracy || 0), 0) / earlier.length;
    
    return recentAvg - earlierAvg;
  }

  private calculateStreakData(accuracyTrends: any[]): { current: number; best: number } {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const threshold = 0.6; // 60% accuracy threshold for "good" performance
    
    for (let i = accuracyTrends.length - 1; i >= 0; i--) {
      if (accuracyTrends[i].accuracy >= threshold) {
        tempStreak++;
        if (i === accuracyTrends.length - 1) {
          currentStreak = tempStreak;
        }
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    
    bestStreak = Math.max(bestStreak, tempStreak);
    
    return { current: currentStreak, best: bestStreak };
  }

  private findMostActiveCategory(predictionTypes: any[]): string {
    if (predictionTypes.length === 0) return 'N/A';
    
    return predictionTypes.reduce((prev, current) => 
      current.totalPredictions > prev.totalPredictions ? current : prev,
      predictionTypes[0]
    ).type;
  }

  private calculateAverageConfidence(confidenceByType: Record<string, number>): number {
    const values = Object.values(confidenceByType);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateComparativeMetrics(performanceMetrics: OraclePerformanceMetrics): EnhancedAnalyticsMetrics['comparative'] {
    // Simulated comparative data (in production, this would come from aggregated user data)
    const avgAccuracy = 0.65;
    const topPercentileAccuracy = 0.85;
    
    const userPercentile = this.calculatePercentile(
      performanceMetrics.overallAccuracy,
      avgAccuracy,
      topPercentileAccuracy
    );
    
    return {
      userPercentile,
      aboveAverage: (performanceMetrics.overallAccuracy - avgAccuracy) * 100,
      topPerformerGap: (topPercentileAccuracy - performanceMetrics.overallAccuracy) * 100
    };
  }

  private calculatePercentile(userValue: number, average: number, topPercentile: number): number {
    if (userValue >= topPercentile) return 95;
    if (userValue <= average * 0.5) return 5;
    
    const normalizedValue = (userValue - (average * 0.5)) / (topPercentile - (average * 0.5));
    return Math.round(normalizedValue * 90 + 5);
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const report = await this.generateAnalyticsReport();
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      // Convert to CSV format
      const csvLines: string[] = [];
      csvLines.push('Metric,Value,Category');
      
      // Add metrics data
      csvLines.push(`Overall Accuracy,${report.metrics.accuracy.overall},Accuracy`);
      csvLines.push(`User Win Rate,${report.metrics.performance.userWinRate},Performance`);
      csvLines.push(`Total Predictions,${report.metrics.engagement.totalPredictions},Engagement`);
      csvLines.push(`Confidence Correlation,${report.metrics.performance.confidenceCorrelation},Performance`);
      csvLines.push(`Weekly Consistency,${report.metrics.accuracy.weeklyConsistency},Accuracy`);
      
      return csvLines.join('\n');
    }
  }
}

export const enhancedAnalyticsService = new EnhancedAnalyticsService();
export default enhancedAnalyticsService;
