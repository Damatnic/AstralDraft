/**
 * Authentication API Integration Tests
 * Comprehensive tests for user authentication endpoints
 */

import app from '../../backend/server';
import { ApiTestClient, testData, HttpStatus, setupTestDatabase, cleanupTestDatabase } from './setup';
import { productionSportsDataService } from '../../services/productionSportsDataService';

describe('Authentication API', () => {
  let client: ApiTestClient;

  beforeAll(async () => {
    await setupTestDatabase();
    client = new ApiTestClient(app);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    productionSportsDataService.cleanup();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully authenticate with valid PIN', async () => {
      const response = await client.post('/api/auth/login', {
        pin: testData.validUser.pin
      });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
    });
  });
});
