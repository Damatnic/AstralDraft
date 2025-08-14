/**
 * Oracle Analytics Service Tests
 * Comprehensive unit tests for Oracle performance analytics and insights
 */

import { oracleAnalyticsService } from '../../services/oracleAnalyticsService';

describe('OracleAnalyticsService', () => {
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock global fetch to avoid real network calls
    mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
  });

  afterEach(() => {
    // Restore fetch mock
    mockFetch.mockRestore();
  });

  describe('Analytics Retrieval', () => {
    it('should get comprehensive Oracle analytics', async () => {
      const mockAnalytics = {
        predictionAccuracy: 80.5,
        userWinRate: 60.2,
        totalPredictions: 100,
        totalUserChallenges: 50,
        confidenceByType: { 'TypeA': 75 },
        accuracyTrends: [{ week: 1, accuracy: 80, totalPredictions: 10, userWins: 6 }],
        topPredictionTypes: [{ type: 'TypeA', accuracy: 85, totalPredictions: 20, avgConfidence: 80, userSuccessRate: 70 }],
        userInsights: [{ type: 'SUCCESS_PATTERN', title: 'Good job!', description: 'You are good.' }],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalytics),
      } as Response);

      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics).toHaveProperty('predictionAccuracy');
      expect(analytics).toHaveProperty('userWinRate');
      expect(analytics).toHaveProperty('totalPredictions');
      expect(analytics).toHaveProperty('totalUserChallenges');
      expect(analytics).toHaveProperty('confidenceByType');
      expect(analytics).toHaveProperty('accuracyTrends');
      expect(analytics).toHaveProperty('topPredictionTypes');
      expect(analytics).toHaveProperty('userInsights');
      
      expect(typeof analytics.predictionAccuracy).toBe('number');
      expect(typeof analytics.userWinRate).toBe('number');
      expect(typeof analytics.totalPredictions).toBe('number');
      expect(typeof analytics.totalUserChallenges).toBe('number');
      
      expect(analytics.predictionAccuracy).toBeGreaterThanOrEqual(0);
      expect(analytics.predictionAccuracy).toBeLessThanOrEqual(100);
      expect(analytics.userWinRate).toBeGreaterThanOrEqual(0);
      expect(analytics.userWinRate).toBeLessThanOrEqual(100);
    });

    it('should handle empty analytics data gracefully', async () => {
      const mockEmptyAnalytics = {
        predictionAccuracy: 0,
        userWinRate: 0,
        totalPredictions: 0,
        totalUserChallenges: 0,
        confidenceByType: {},
        accuracyTrends: [],
        topPredictionTypes: [],
        userInsights: [],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEmptyAnalytics),
      } as Response);
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.totalPredictions).toBe(0);
      expect(analytics.totalUserChallenges).toBe(0);
      expect(analytics.accuracyTrends).toEqual([]);
      expect(analytics.topPredictionTypes).toEqual([]);
      expect(analytics.userInsights).toEqual([]);
    });
  });

  describe('Performance Metrics', () => {
    it('should get Oracle performance metrics', async () => {
      const mockMetrics = {
        overallAccuracy: 75,
        weeklyAccuracy: { 'week1': 80 },
        typeAccuracy: { 'typeA': 70 },
        confidenceCorrelation: 0.8,
        calibrationScore: 0.9,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);
      const metrics = await oracleAnalyticsService.getOraclePerformanceMetrics();
      
      expect(metrics).toHaveProperty('overallAccuracy');
      expect(metrics).toHaveProperty('weeklyAccuracy');
      expect(metrics).toHaveProperty('typeAccuracy');
      expect(metrics).toHaveProperty('confidenceCorrelation');
      expect(metrics).toHaveProperty('calibrationScore');
      
      expect(typeof metrics.overallAccuracy).toBe('number');
      expect(typeof metrics.confidenceCorrelation).toBe('number');
      expect(typeof metrics.calibrationScore).toBe('number');
      
      expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.overallAccuracy).toBeLessThanOrEqual(100);
      expect(metrics.confidenceCorrelation).toBeGreaterThanOrEqual(-1);
      expect(metrics.confidenceCorrelation).toBeLessThanOrEqual(1);
    });

    it('should handle missing performance data', async () => {
      const mockEmptyMetrics = {
        overallAccuracy: 0,
        weeklyAccuracy: {},
        typeAccuracy: {},
        confidenceCorrelation: 0,
        calibrationScore: 0,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEmptyMetrics),
      } as Response);
      const metrics = await oracleAnalyticsService.getOraclePerformanceMetrics();
      
      expect(metrics.overallAccuracy).toBe(0);
      expect(Object.keys(metrics.weeklyAccuracy)).toHaveLength(0);
      expect(Object.keys(metrics.typeAccuracy)).toHaveLength(0);
    });
  });

  describe('Prediction Recording', () => {
    it('should record prediction results correctly', async () => {
      const predictionId = 'test-prediction-1';
      const actualResult = 1;
      const userPrediction = 0;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await expect(
        oracleAnalyticsService.recordPredictionResult(predictionId, actualResult, userPrediction)
      ).resolves.not.toThrow();
    });
  });
});
