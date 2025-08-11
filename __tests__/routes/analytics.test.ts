/**
 * Analytics Routes Unit Tests
 * Direct testing of analytics route handlers
 */

import request from 'supertest';
import express from 'express';

// Mock analytics service
const mockAnalyticsService = {
  getAnalytics: jest.fn().mockResolvedValue({
    accuracyMetrics: { overall: 0.78, byCategory: { points: 0.82 } },
    performanceMetrics: { totalPredictions: 150, successRate: 0.78 },
    trends: { weekly: 0.05, monthly: 0.12 }
  }),
  getOraclePerformanceMetrics: jest.fn().mockResolvedValue({
    accuracy: 0.85,
    confidence: 0.80,
    totalPredictions: 200
  }),
  recordPredictionResult: jest.fn().mockResolvedValue({ success: true }),
  getTrends: jest.fn().mockResolvedValue({
    daily: [0.75, 0.78, 0.82],
    weekly: [0.77, 0.80, 0.85],
    monthly: [0.76, 0.79, 0.83]
  }),
  getInsights: jest.fn().mockResolvedValue({
    topPerformers: ['Player A', 'Player B'],
    improvementAreas: ['consistency', 'matchup analysis'],
    recommendations: ['Focus on defensive matchups']
  }),
  getBadges: jest.fn().mockResolvedValue([
    { id: 'accuracy-master', name: 'Accuracy Master', earned: true },
    { id: 'streak-king', name: 'Streak King', earned: false }
  ]),
  getComparison: jest.fn().mockResolvedValue({
    userAccuracy: 0.78,
    avgAccuracy: 0.72,
    ranking: 15,
    totalUsers: 100
  })
};

// Mock database
jest.mock('../../backend/db/index', () => ({
  db: {
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => [])
    })),
    close: jest.fn()
  }
}));

// Mock services
jest.mock('../../services/oracleAnalyticsService', () => mockAnalyticsService);

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'demo-user-1', username: 'TestUser' };
  next();
};

jest.mock('../../backend/middleware/security', () => ({
  authenticateToken: mockAuthMiddleware
}));

describe('Analytics Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Import and use analytics routes after mocking
    const analyticsRoutes = require('../../backend/routes/analytics').default;
    app.use('/api/analytics', analyticsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/overview', () => {
    it('should retrieve analytics overview', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('accuracyMetrics');
      expect(response.body.analytics).toHaveProperty('performanceMetrics');
      expect(mockAnalyticsService.getAnalytics).toHaveBeenCalledWith('demo-user-1');
    });
  });

  describe('GET /api/analytics/performance', () => {
    it('should retrieve performance metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/performance')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');
      expect(mockAnalyticsService.getOraclePerformanceMetrics).toHaveBeenCalled();
    });
  });

  describe('POST /api/analytics/predictions', () => {
    it('should record prediction result', async () => {
      const predictionResult = {
        predictionId: 'pred-123',
        actualResult: true,
        confidence: 0.85
      };

      const response = await request(app)
        .post('/api/analytics/predictions')
        .set('Authorization', 'Bearer mock-token')
        .send(predictionResult);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(mockAnalyticsService.recordPredictionResult).toHaveBeenCalledWith(
        predictionResult,
        'demo-user-1'
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/analytics/predictions')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/analytics/trends', () => {
    it('should retrieve accuracy trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .set('Authorization', 'Bearer mock-token')
        .query({ period: 'weekly' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('trends');
      expect(mockAnalyticsService.getTrends).toHaveBeenCalledWith('weekly');
    });

    it('should default to daily trends', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.getTrends).toHaveBeenCalledWith('daily');
    });
  });

  describe('GET /api/analytics/insights', () => {
    it('should retrieve personalized insights', async () => {
      const response = await request(app)
        .get('/api/analytics/insights')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('insights');
      expect(mockAnalyticsService.getInsights).toHaveBeenCalledWith('demo-user-1');
    });
  });

  describe('GET /api/analytics/badges', () => {
    it('should retrieve achievement badges', async () => {
      const response = await request(app)
        .get('/api/analytics/badges')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('badges');
      expect(mockAnalyticsService.getBadges).toHaveBeenCalledWith('demo-user-1');
    });
  });

  describe('GET /api/analytics/comparison', () => {
    it('should retrieve comparison data', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('comparison');
      expect(mockAnalyticsService.getComparison).toHaveBeenCalledWith('demo-user-1');
    });
  });
});
