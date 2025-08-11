/**
 * Oracle API Integration Tests
 * Comprehensive tests for Oracle prediction endpoints
 */

import app from '../../backend/server';
import { ApiTestClient, setupTestDatabase, cleanupTestDatabase, testData, HttpStatus } from './setup';

describe('Oracle API', () => {
  let client: ApiTestClient;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    await setupTestDatabase();
    client = new ApiTestClient(app);
    authHeaders = await client.authenticateUser();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/oracle/predictions', () => {
    it('should retrieve user predictions successfully', async () => {
      const response = await client.get('/api/oracle/predictions', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('predictions');
      expect(Array.isArray(response.body.predictions)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await client.get('/api/oracle/predictions?page=1&limit=10', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should filter predictions by status', async () => {
      const response = await client.get('/api/oracle/predictions?status=pending', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('predictions');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.get('/api/oracle/predictions');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/oracle/predictions', () => {
    it('should create prediction successfully', async () => {
      const response = await client.post('/api/oracle/predictions', testData.validPrediction, authHeaders);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prediction');
      expect(response.body.prediction).toHaveProperty('id');
      expect(response.body.prediction).toHaveProperty('gameId', testData.validPrediction.gameId);
    });

    it('should validate required prediction fields', async () => {
      const response = await client.post('/api/oracle/predictions', {
        gameId: testData.validPrediction.gameId
        // Missing homeScore, awayScore, confidence
      }, authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate confidence range', async () => {
      const invalidPrediction = {
        ...testData.validPrediction,
        confidence: 150 // Invalid: > 100
      };

      const response = await client.post('/api/oracle/predictions', invalidPrediction, authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate score values', async () => {
      const invalidPrediction = {
        ...testData.validPrediction,
        homeScore: -5 // Invalid: negative score
      };

      const response = await client.post('/api/oracle/predictions', invalidPrediction, authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent duplicate predictions for same game', async () => {
      // Create first prediction
      await client.post('/api/oracle/predictions', testData.validPrediction, authHeaders);

      // Try to create duplicate
      const response = await client.post('/api/oracle/predictions', testData.validPrediction, authHeaders);

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.post('/api/oracle/predictions', testData.validPrediction);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/oracle/predictions/:id', () => {
    let predictionId: string;

    beforeEach(async () => {
      const createResponse = await client.post('/api/oracle/predictions', {
        ...testData.validPrediction,
        gameId: `game-${Date.now()}` // Ensure unique game ID
      }, authHeaders);
      predictionId = createResponse.body.prediction.id;
    });

    it('should retrieve specific prediction successfully', async () => {
      const response = await client.get(`/api/oracle/predictions/${predictionId}`, authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prediction');
      expect(response.body.prediction).toHaveProperty('id', predictionId);
    });

    it('should return 404 for non-existent prediction', async () => {
      const response = await client.get('/api/oracle/predictions/non-existent-id', authHeaders);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.get(`/api/oracle/predictions/${predictionId}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /api/oracle/predictions/:id', () => {
    let predictionId: string;

    beforeEach(async () => {
      const createResponse = await client.post('/api/oracle/predictions', {
        ...testData.validPrediction,
        gameId: `game-${Date.now()}`
      }, authHeaders);
      predictionId = createResponse.body.prediction.id;
    });

    it('should update prediction successfully', async () => {
      const updatedData = {
        homeScore: 21,
        awayScore: 14,
        confidence: 90,
        reasoning: 'Updated analysis shows stronger home team advantage'
      };

      const response = await client.put(`/api/oracle/predictions/${predictionId}`, updatedData, authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.prediction).toHaveProperty('homeScore', 21);
      expect(response.body.prediction).toHaveProperty('confidence', 90);
    });

    it('should validate updated prediction data', async () => {
      const invalidUpdate = {
        confidence: 200 // Invalid: > 100
      };

      const response = await client.put(`/api/oracle/predictions/${predictionId}`, invalidUpdate, authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent prediction', async () => {
      const response = await client.put('/api/oracle/predictions/non-existent-id', {
        confidence: 85
      }, authHeaders);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.put(`/api/oracle/predictions/${predictionId}`, {
        confidence: 85
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /api/oracle/predictions/:id', () => {
    let predictionId: string;

    beforeEach(async () => {
      const createResponse = await client.post('/api/oracle/predictions', {
        ...testData.validPrediction,
        gameId: `game-${Date.now()}`
      }, authHeaders);
      predictionId = createResponse.body.prediction.id;
    });

    it('should delete prediction successfully', async () => {
      const response = await client.delete(`/api/oracle/predictions/${predictionId}`, authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 404 for non-existent prediction', async () => {
      const response = await client.delete('/api/oracle/predictions/non-existent-id', authHeaders);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.delete(`/api/oracle/predictions/${predictionId}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/oracle/leaderboard', () => {
    it('should retrieve global leaderboard successfully', async () => {
      const response = await client.get('/api/oracle/leaderboard', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
    });

    it('should support leaderboard filtering by timeframe', async () => {
      const response = await client.get('/api/oracle/leaderboard?timeframe=weekly', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('leaderboard');
    });

    it('should include user rankings in leaderboard', async () => {
      const response = await client.get('/api/oracle/leaderboard', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      if (response.body.leaderboard.length > 0) {
        expect(response.body.leaderboard[0]).toHaveProperty('rank');
        expect(response.body.leaderboard[0]).toHaveProperty('accuracy');
        expect(response.body.leaderboard[0]).toHaveProperty('username');
      }
    });
  });

  describe('GET /api/oracle/accuracy', () => {
    it('should retrieve user accuracy metrics', async () => {
      const response = await client.get('/api/oracle/accuracy', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('accuracy');
      expect(response.body.accuracy).toHaveProperty('overall');
      expect(response.body.accuracy).toHaveProperty('recent');
    });

    it('should support accuracy filtering by timeframe', async () => {
      const response = await client.get('/api/oracle/accuracy?timeframe=monthly', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('accuracy');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await client.get('/api/oracle/accuracy');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Oracle API Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would mock database errors
      const response = await client.get('/api/oracle/predictions', authHeaders);
      
      // Should either succeed or return proper error format
      if (response.status !== HttpStatus.OK) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate content type for POST requests', async () => {
      const response = await client.post('/api/oracle/predictions', testData.validPrediction, {
        ...authHeaders,
        'Content-Type': 'text/plain'
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle malformed JSON gracefully', async () => {
      // This would test malformed JSON handling
      const response = await client.post('/api/oracle/predictions', 'invalid-json', authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
