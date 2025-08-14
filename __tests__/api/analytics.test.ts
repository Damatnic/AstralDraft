/**
 * @file integration tests for the analytics API
 * @description Mocks database and server to test analytics endpoints
 */

import { setupTestDatabase, cleanupTestDatabase } from './setup';
import { ApiTestClient, HttpStatus } from './setup';
import app from '../../backend/server';

describe('Analytics API', () => {
  let client: ApiTestClient;

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
    client = new ApiTestClient(app);
    // Register and authenticate a user for each test
    await client.post('/api/auth/register', {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      displayName: 'Test User'
    });
    await client.authenticateUser('testuser', 'TestPassword123!');
  });

  describe('GET /api/analytics/accuracy', () => {
    it('should retrieve user accuracy metrics', async () => {
      const response = await client.get('/api/analytics/accuracy');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('overallAccuracy');
      expect(response.body.analytics).toHaveProperty('accuracyByGame');
    });

    it('should include performance trends', async () => {
      const response = await client.get('/api/analytics/accuracy');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.analytics).toHaveProperty('performanceTrend');
      expect(response.body.analytics.performanceTrend).toHaveProperty('weekly');
      expect(response.body.analytics.performanceTrend).toHaveProperty('monthly');
    });

    it('should support filtering by timeframe', async () => {
      const response = await client.get('/api/analytics/accuracy?timeframe=weekly');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('analytics');
    });
  });

  describe('GET /api/analytics/performance', () => {
    it('should retrieve user performance metrics', async () => {
      const response = await client.get('/api/analytics/performance');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('totalPredictions');
      expect(response.body.performance).toHaveProperty('winLossRatio');
    });

    it('should include detailed performance breakdown', async () => {
      const response = await client.get('/api/analytics/performance');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.performance).toHaveProperty('breakdown');
      expect(response.body.performance.breakdown).toHaveProperty('byConfidence');
      expect(response.body.performance.breakdown).toHaveProperty('byGameType');
    });

    it('should support performance filtering by timeframe', async () => {
      const response = await client.get('/api/analytics/performance?timeframe=monthly');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('performance');
    });
  });

  describe('GET /api/analytics/trends', () => {
    it('should retrieve prediction trends over time', async () => {
      const response = await client.get('/api/analytics/trends');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('trends');
      expect(response.body.trends).toHaveProperty('weekly');
      expect(response.body.trends).toHaveProperty('monthly');
      expect(Array.isArray(response.body.trends.weekly)).toBe(true);
    });

    it('should include improvement suggestions', async () => {
      const response = await client.get('/api/analytics/trends');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.trends).toHaveProperty('insights');
      expect(Array.isArray(response.body.trends.insights)).toBe(true);
    });

    it('should support trend analysis by category', async () => {
      const response = await client.get('/api/analytics/trends?category=confidence');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('trends');
    });
  });

  describe('GET /api/analytics/insights', () => {
    it('should retrieve personalized insights', async () => {
      const response = await client.get('/api/analytics/insights');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('insights');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });

    it('should include actionable recommendations', async () => {
      const response = await client.get('/api/analytics/insights');

      expect(response.status).toBe(HttpStatus.OK);
      if (response.body.insights.length > 0) {
        expect(response.body.insights[0]).toHaveProperty('type');
        expect(response.body.insights[0]).toHaveProperty('message');
        expect(response.body.insights[0]).toHaveProperty('priority');
      }
    });

    it('should filter insights by category', async () => {
      const response = await client.get('/api/analytics/insights?category=accuracy');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('insights');
    });
  });

  describe('POST /api/analytics/prediction-result', () => {
    it('should record prediction result successfully', async () => {
      const predictionResult = {
        predictionId: 'pred-123',
        actualHomeScore: 24,
        actualAwayScore: 17,
        isCorrect: true,
        accuracyScore: 95
      };

      const response = await client.post('/api/analytics/prediction-result', predictionResult);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('recorded', true);
    });

    it('should validate prediction result data', async () => {
      const invalidResult = {
        predictionId: 'pred-123'
        // Missing required fields
      };

      const response = await client.post('/api/analytics/prediction-result', invalidResult);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent duplicate result recording', async () => {
      const predictionResult = {
        predictionId: 'pred-duplicate-test',
        actualHomeScore: 21,
        actualAwayScore: 14,
        isCorrect: true,
        accuracyScore: 90
      };

      // First recording
      await client.post('/api/analytics/prediction-result', predictionResult);

      // Second recording (should fail)
      const response = await client.post('/api/analytics/prediction-result', predictionResult);

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject unauthenticated requests', async () => {
      const unauthenticatedClient = new ApiTestClient(app);
      const predictionResult = {
        predictionId: 'pred-123',
        actualHomeScore: 24,
        actualAwayScore: 17,
        isCorrect: true,
        accuracyScore: 95
      };

      const response = await unauthenticatedClient.post('/api/analytics/prediction-result', predictionResult);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/analytics/comparison', () => {
    it('should retrieve user comparison with Oracle', async () => {
      const response = await client.get('/api/analytics/comparison');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('userAccuracy');
      expect(response.body.comparison).toHaveProperty('oracleAccuracy');
      expect(response.body.comparison).toHaveProperty('userRank');
    });

    it('should include head-to-head statistics', async () => {
      const response = await client.get('/api/analytics/comparison');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.comparison).toHaveProperty('headToHead');
      expect(response.body.comparison.headToHead).toHaveProperty('userWins');
      expect(response.body.comparison.headToHead).toHaveProperty('oracleWins');
      expect(response.body.comparison.headToHead).toHaveProperty('ties');
    });

    it('should support comparison filtering by timeframe', async () => {
      const response = await client.get('/api/analytics/comparison?timeframe=monthly');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('comparison');
    });
  });

  describe('GET /api/analytics/badges', () => {
    it('should retrieve user achievement badges', async () => {
      const response = await client.get('/api/analytics/badges');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('badges');
      expect(Array.isArray(response.body.badges.earned)).toBe(true);
      expect(Array.isArray(response.body.badges.available)).toBe(true);
    });

    it('should include badge progress information', async () => {
      const response = await client.get('/api/analytics/badges');

      expect(response.status).toBe(HttpStatus.OK);
      if (response.body.badges.available.length > 0) {
        expect(response.body.badges.available[0]).toHaveProperty('id');
        expect(response.body.badges.available[0]).toHaveProperty('name');
        expect(response.body.badges.available[0]).toHaveProperty('progress');
      }
    });
  });

  describe('Analytics API Performance', () => {
    it('should handle concurrent analytics requests', async () => {
      const requests = [
        client.get('/api/analytics/accuracy'),
        client.get('/api/analytics/performance'),
        client.get('/api/analytics/trends'),
        client.get('/api/analytics/insights')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('success', true);
      });
    });

    it('should respond to analytics requests within reasonable time', async () => {
      const startTime = Date.now();
      const response = await client.get('/api/analytics/accuracy');
      const endTime = Date.now();

      expect(response.status).toBe(HttpStatus.OK);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Analytics API Error Handling', () => {
    it('should handle invalid date formats gracefully', async () => {
      const response = await client.get('/api/analytics/accuracy?startDate=not-a-date');

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing data gracefully', async () => {
      // This would test behavior when user has no prediction data
      const response = await client.get('/api/analytics/accuracy');

      // Should succeed even with no data
      expect([HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
      if (response.status === HttpStatus.OK) {
        expect(response.body).toHaveProperty('analytics');
      }
    });

    it('should validate analytics query parameters', async () => {
      const response = await client.get('/api/analytics/performance?timeframe=invalid');

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
