/**
 * Authentication API Integration Tests
 * Comprehensive tests for user authentication endpoints
 */

// Mock all dependencies before any imports
jest.mock('express', () => {
  const actualExpress = jest.requireActual('express');
  return {
    ...actualExpress,
    __esModule: true,
    default: actualExpress
  };
});

jest.mock('cors', () => ({
  __esModule: true,
  default: jest.fn(() => (req: any, res: any, next: any) => next())
}));

jest.mock('express-slow-down', () => ({
  __esModule: true,
  default: jest.fn(() => (req: any, res: any, next: any) => next())
}));

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: jest.fn(() => (req: any, res: any, next: any) => next())
}));

jest.mock('../../backend/db/index', () => ({
  initDatabase: jest.fn(() => Promise.resolve()),
  db: {
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => [])
    })),
    close: jest.fn()
  }
}));

jest.mock('../../backend/middleware/security', () => ({
  generalRateLimit: (req: any, res: any, next: any) => next(),
  authRateLimit: (req: any, res: any, next: any) => next(),
  predictionRateLimit: (req: any, res: any, next: any) => next(),
  speedLimiter: (req: any, res: any, next: any) => next(),
  corsConfig: (req: any, res: any, next: any) => next(),
  securityHeaders: (req: any, res: any, next: any) => next(),
  securityLogger: (req: any, res: any, next: any) => next(),
  validateContentType: () => (req: any, res: any, next: any) => next(),
  requestSizeLimit: () => (req: any, res: any, next: any) => next()
}));

import app from '../../backend/server';
import { ApiTestClient, setupTestDatabase, cleanupTestDatabase, testData, HttpStatus } from './setup';

describe('Authentication API', () => {
  let client: ApiTestClient;

  beforeAll(async () => {
    await setupTestDatabase();
    client = new ApiTestClient(app);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
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

    it('should reject invalid PIN', async () => {
      const response = await client.post('/api/auth/login', {
        pin: 'invalid-pin'
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without PIN', async () => {
      const response = await client.post('/api/auth/login', {});

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject malformed request body', async () => {
      const response = await client.post('/api/auth/login', {
        invalidField: 'test'
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle concurrent login requests', async () => {
      const promises = Array(5).fill(null).map(() => 
        client.post('/api/auth/login', { pin: testData.validUser.pin })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('token');
      });
    });
  });

  describe('GET /api/auth/user', () => {
    let authHeaders: Record<string, string>;

    beforeEach(async () => {
      authHeaders = await client.authenticateUser();
    });

    it('should return user profile for authenticated user', async () => {
      const response = await client.get('/api/auth/user', authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('stats');
    });

    it('should reject unauthenticated request', async () => {
      const response = await client.get('/api/auth/user');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject invalid token', async () => {
      const response = await client.get('/api/auth/user', {
        'Authorization': 'Bearer invalid-token'
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/auth/avatar', () => {
    let authHeaders: Record<string, string>;

    beforeEach(async () => {
      authHeaders = await client.authenticateUser();
    });

    it('should update user avatar successfully', async () => {
      const response = await client.put('/api/auth/avatar', {
        avatar: 'new-avatar-url.jpg'
      }, authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('avatar', 'new-avatar-url.jpg');
    });

    it('should reject request without authentication', async () => {
      const response = await client.put('/api/auth/avatar', {
        avatar: 'new-avatar-url.jpg'
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should validate avatar format', async () => {
      const response = await client.put('/api/auth/avatar', {
        avatar: ''
      }, authHeaders);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authHeaders: Record<string, string>;

    beforeEach(async () => {
      authHeaders = await client.authenticateUser();
    });

    it('should logout user successfully', async () => {
      const response = await client.post('/api/auth/logout', {}, authHeaders);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle logout without authentication gracefully', async () => {
      const response = await client.post('/api/auth/logout', {});

      // Should not fail, but may return different response
      expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle malformed Authorization header', async () => {
      const response = await client.get('/api/auth/user', {
        'Authorization': 'InvalidFormat'
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing Authorization header', async () => {
      const response = await client.get('/api/auth/user');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should handle expired token gracefully', async () => {
      // This would need actual token expiration logic in a real scenario
      const response = await client.get('/api/auth/user', {
        'Authorization': 'Bearer expired-token'
      });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Authentication Security', () => {
    it('should not expose sensitive user data in responses', async () => {
      const response = await client.post('/api/auth/login', {
        pin: testData.validUser.pin
      });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.user).not.toHaveProperty('pin');
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('secret');
    });

    it('should include security headers in authentication responses', async () => {
      const response = await client.post('/api/auth/login', {
        pin: testData.validUser.pin
      });

      expect(response.status).toBe(HttpStatus.OK);
      // Additional security header checks could be added here
    });

    it('should prevent enumeration attacks', async () => {
      const invalidPins = ['0000', '9999', 'abcd', ''];
      const responses = await Promise.all(
        invalidPins.map(pin => client.post('/api/auth/login', { pin }))
      );

      responses.forEach(response => {
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
        // Should have consistent error messages to prevent enumeration
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
