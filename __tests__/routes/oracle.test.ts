/**
 * Oracle Routes Unit Tests
 * Direct testing of oracle prediction route handlers
 */

import request from 'supertest';
import express from 'express';

// Mock services
const mockOracleService = {
  generatePrediction: jest.fn().mockResolvedValue({
    id: 'pred-123',
    prediction: 'Player X will score 15+ points',
    confidence: 0.85,
    reasoning: 'Strong matchup analysis'
  }),
  getPrediction: jest.fn().mockResolvedValue({
    id: 'pred-123',
    prediction: 'Player X will score 15+ points',
    confidence: 0.85
  }),
  updatePrediction: jest.fn().mockResolvedValue({
    id: 'pred-123',
    prediction: 'Updated prediction',
    confidence: 0.90
  }),
  deletePrediction: jest.fn().mockResolvedValue({ success: true }),
  getAccuracyMetrics: jest.fn().mockResolvedValue({
    overall: 0.78,
    recent: 0.82,
    totalPredictions: 150
  }),
  getLeaderboard: jest.fn().mockResolvedValue([
    { user: 'TestUser', accuracy: 0.85, predictions: 100 }
  ])
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
jest.mock('../../services/oracleAdvancedAnalyticsService', () => mockOracleService);

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'demo-user-1', username: 'TestUser' };
  next();
};

jest.mock('../../backend/middleware/security', () => ({
  authenticateToken: mockAuthMiddleware
}));

describe('Oracle Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Import and use oracle routes after mocking
    const oracleRoutes = require('../../backend/routes/oracle').default;
    app.use('/api/oracle', oracleRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/oracle/predictions', () => {
    it('should create a new prediction', async () => {
      const predictionData = {
        playerId: 'player-123',
        predictionType: 'points',
        parameters: { threshold: 15 }
      };

      const response = await request(app)
        .post('/api/oracle/predictions')
        .set('Authorization', 'Bearer mock-token')
        .send(predictionData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prediction');
      expect(mockOracleService.generatePrediction).toHaveBeenCalledWith(
        predictionData,
        'demo-user-1'
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/oracle/predictions')
        .set('Authorization', 'Bearer mock-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/oracle/predictions/:id', () => {
    it('should retrieve a specific prediction', async () => {
      const response = await request(app)
        .get('/api/oracle/predictions/pred-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prediction');
      expect(mockOracleService.getPrediction).toHaveBeenCalledWith('pred-123');
    });

    it('should handle non-existent prediction', async () => {
      mockOracleService.getPrediction.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/oracle/predictions/nonexistent')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/oracle/predictions/:id', () => {
    it('should update a prediction', async () => {
      const updateData = {
        prediction: 'Updated prediction text',
        confidence: 0.90
      };

      const response = await request(app)
        .put('/api/oracle/predictions/pred-123')
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(mockOracleService.updatePrediction).toHaveBeenCalledWith(
        'pred-123',
        updateData
      );
    });
  });

  describe('DELETE /api/oracle/predictions/:id', () => {
    it('should delete a prediction', async () => {
      const response = await request(app)
        .delete('/api/oracle/predictions/pred-123')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(mockOracleService.deletePrediction).toHaveBeenCalledWith('pred-123');
    });
  });

  describe('GET /api/oracle/leaderboard', () => {
    it('should retrieve prediction leaderboard', async () => {
      const response = await request(app)
        .get('/api/oracle/leaderboard')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('leaderboard');
      expect(mockOracleService.getLeaderboard).toHaveBeenCalled();
    });
  });

  describe('GET /api/oracle/metrics', () => {
    it('should retrieve accuracy metrics', async () => {
      const response = await request(app)
        .get('/api/oracle/metrics')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metrics');
      expect(mockOracleService.getAccuracyMetrics).toHaveBeenCalled();
    });
  });
});
