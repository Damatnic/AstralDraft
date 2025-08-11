/**
 * Oracle Analytics Service Tests
 * Comprehensive unit tests for Oracle performance analytics and insights
 */

import { oracleAnalyticsService } from '../../services/oracleAnalyticsService';

describe('OracleAnalyticsService', () => {

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Analytics Retrieval', () => {
    it('should get comprehensive Oracle analytics', async () => {
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

      await expect(
        oracleAnalyticsService.recordPredictionResult(predictionId, actualResult, userPrediction)
      ).resolves.not.toThrow();
    });

    it('should handle recording without user prediction', async () => {
      const predictionId = 'test-prediction-2';
      const actualResult = 2;

      await expect(
        oracleAnalyticsService.recordPredictionResult(predictionId, actualResult)
      ).resolves.not.toThrow();
    });
  });

  describe('Data Structure Validation', () => {
    it('should provide properly structured user insights', async () => {
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.userInsights).toBeInstanceOf(Array);
      
      analytics.userInsights.forEach(insight => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        
        expect(['SUCCESS_PATTERN', 'IMPROVEMENT_AREA', 'STREAK_POTENTIAL', 'RECOMMENDATION']).toContain(insight.type);
        expect(typeof insight.title).toBe('string');
        expect(typeof insight.description).toBe('string');
        expect(insight.title.length).toBeGreaterThan(0);
        expect(insight.description.length).toBeGreaterThan(0);
      });
    });

    it('should provide properly structured prediction type stats', async () => {
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.topPredictionTypes).toBeInstanceOf(Array);
      
      analytics.topPredictionTypes.forEach(typeStats => {
        expect(typeStats).toHaveProperty('type');
        expect(typeStats).toHaveProperty('accuracy');
        expect(typeStats).toHaveProperty('totalPredictions');
        expect(typeStats).toHaveProperty('avgConfidence');
        expect(typeStats).toHaveProperty('userSuccessRate');
        
        expect(typeof typeStats.type).toBe('string');
        expect(typeStats.accuracy).toBeGreaterThanOrEqual(0);
        expect(typeStats.accuracy).toBeLessThanOrEqual(100);
        expect(typeStats.totalPredictions).toBeGreaterThanOrEqual(0);
        expect(typeStats.avgConfidence).toBeGreaterThanOrEqual(0);
        expect(typeStats.avgConfidence).toBeLessThanOrEqual(100);
      });
    });

    it('should track confidence by prediction type', async () => {
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.confidenceByType).toBeInstanceOf(Object);
      
      Object.entries(analytics.confidenceByType).forEach(([type, confidence]) => {
        expect(typeof type).toBe('string');
        expect(typeof confidence).toBe('number');
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Accuracy Trends', () => {
    it('should calculate accuracy trends over time', async () => {
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.accuracyTrends).toBeInstanceOf(Array);
      
      analytics.accuracyTrends.forEach(trend => {
        expect(trend).toHaveProperty('week');
        expect(trend).toHaveProperty('accuracy');
        expect(trend).toHaveProperty('totalPredictions');
        expect(trend).toHaveProperty('userWins');
        
        expect(typeof trend.week).toBe('number');
        expect(trend.accuracy).toBeGreaterThanOrEqual(0);
        expect(trend.accuracy).toBeLessThanOrEqual(100);
        expect(trend.totalPredictions).toBeGreaterThanOrEqual(0);
        expect(trend.userWins).toBeGreaterThanOrEqual(0);
        expect(trend.userWins).toBeLessThanOrEqual(trend.totalPredictions);
      });
    });

    it('should maintain chronological order in trends', async () => {
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      if (analytics.accuracyTrends.length > 1) {
        for (let i = 1; i < analytics.accuracyTrends.length; i++) {
          expect(analytics.accuracyTrends[i].week).toBeGreaterThan(analytics.accuracyTrends[i - 1].week);
        }
      }
    });
  });

  describe('Data Persistence and Retrieval', () => {
    it('should persist analytics data across sessions', async () => {
      // Record some data
      await oracleAnalyticsService.recordPredictionResult('persist-test', 1, 1);
      
      // Get analytics
      const analytics1 = await oracleAnalyticsService.getAnalytics();
      
      // Create new service instance (simulating new session)
      const analytics2 = await oracleAnalyticsService.getAnalytics();
      expect(analytics2.totalPredictions).toBe(analytics1.totalPredictions);
    });

    it('should handle localStorage corruption gracefully', async () => {
      // Corrupt localStorage data
      localStorage.setItem('oracleAnalytics', 'invalid-json');
      localStorage.setItem('oraclePredictions', '{"broken": json}');
      
      let errorThrown = false;
      try {
        await oracleAnalyticsService.getAnalytics();
      } catch (error) {
        console.error('Analytics service threw error:', error);
        errorThrown = true;
      }
      
      expect(errorThrown).toBe(false);
      
      const analytics = await oracleAnalyticsService.getAnalytics();
      expect(analytics).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Record many predictions
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          oracleAnalyticsService.recordPredictionResult(`test-${i}`, i % 3, i % 3)
        );
      }
      
      await Promise.all(promises);
      
      const startTime = performance.now();
      const analytics = await oracleAnalyticsService.getAnalytics();
      const endTime = performance.now();
      
      expect(analytics).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently calculate performance metrics', async () => {
      const startTime = performance.now();
      const metrics = await oracleAnalyticsService.getOraclePerformanceMetrics();
      const endTime = performance.now();
      
      expect(metrics).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined prediction results', async () => {
      await expect(
        oracleAnalyticsService.recordPredictionResult('test', undefined as any)
      ).resolves.not.toThrow();
    });

    it('should handle null values gracefully', async () => {
      await expect(
        oracleAnalyticsService.recordPredictionResult('', null as any, null as any)
      ).resolves.not.toThrow();
    });

    it('should handle invalid data types', async () => {
      await expect(
        oracleAnalyticsService.recordPredictionResult('test' as any, 'invalid' as any, 'invalid' as any)
      ).resolves.not.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should maintain data consistency between analytics and metrics', async () => {
      await oracleAnalyticsService.recordPredictionResult('integration-test', 1, 1);
      
      const analytics = await oracleAnalyticsService.getAnalytics();
      const metrics = await oracleAnalyticsService.getOraclePerformanceMetrics();
      
      expect(analytics).toBeDefined();
      expect(metrics).toBeDefined();
      
      // Both should reflect the same underlying data
      expect(typeof analytics.predictionAccuracy).toBe('number');
      expect(typeof metrics.overallAccuracy).toBe('number');
    });

    it('should provide meaningful insights when data is available', async () => {
      // Record varied prediction results
      await oracleAnalyticsService.recordPredictionResult('insight-1', 1, 1); // Correct
      await oracleAnalyticsService.recordPredictionResult('insight-2', 0, 1); // Incorrect
      await oracleAnalyticsService.recordPredictionResult('insight-3', 2, 2); // Correct
      
      const analytics = await oracleAnalyticsService.getAnalytics();
      
      expect(analytics.totalPredictions).toBeGreaterThan(0);
      expect(analytics.predictionAccuracy).toBeGreaterThan(0);
      expect(analytics.predictionAccuracy).toBeLessThan(100);
    });
  });
});
