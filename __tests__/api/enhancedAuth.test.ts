/**
 * Enhanced Authentication API Integration Tests
 * Tests for enhanced auth endpoints with security features
 */

import request from 'supertest';
import app from '../../backend/server';
import { ApiTestClient, testData, HttpStatus, setupTestDatabase, cleanupTestDatabase } from './setup';

// Unmock the real dependencies
jest.unmock('../../services/enhancedAuthService');
jest.unmock('../../backend/middleware/securityEnhanced');

describe('Enhanced Authentication API Integration', () => {
    let client: ApiTestClient;

    beforeAll(async () => {
        await setupTestDatabase();
        client = new ApiTestClient(app);
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

  describe('POST /api/auth-enhanced/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await client.post('/api/auth-enhanced/login', {
        playerNumber: 1,
        pin: '7347',
        rememberMe: false,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'admin');

      // Check that secure cookies are set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];
      expect(cookies.some((cookie) => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some((cookie) => cookie.includes('refreshToken'))).toBe(true);
      expect(cookies.some((cookie) => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await client.post('/api/auth-enhanced/login', {
        playerNumber: 1,
        pin: 'wrong-pin',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid player number or PIN');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should handle account lockout', async () => {
      const response = await client.post('/api/auth-enhanced/login', {
        playerNumber: 1,
        pin: '7347',
      });

      expect(response.status).toBe(423); // Locked status
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'ACCOUNT_LOCKED');
      expect(response.body).toHaveProperty('lockedUntil');
    });

    it('should validate required fields', async () => {
      const testCases = [
        { playerNumber: 1 }, // Missing PIN
        { pin: '7347' }, // Missing player number
        { playerNumber: 'invalid', pin: '7347' }, // Invalid player number type
        { playerNumber: 0, pin: '7347' }, // Invalid player number range
        { playerNumber: 11, pin: '7347' }, // Invalid player number range
      ];

      for (const testCase of testCases) {
        const response = await client.post('/api/auth-enhanced/login', testCase);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
      }
    });

    it('should respect rate limiting', async () => {
      // Make 6 requests
      for (let i = 0; i < 6; i++) {
        const response = await client.post('/api/auth-enhanced/login', {
          playerNumber: 1,
          pin: 'wrong-pin',
        });

        if (i < 5) {
          // First 5 should be processed normally
          expect(response.status).not.toBe(429);
        } else {
          // 6th should be rate limited
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('code', 'RATE_LIMITED');
        }
      }
    });
  });

  describe('POST /api/auth-enhanced/refresh', () => {
    it('should refresh valid session tokens', async () => {
      const response = await client.post('/api/auth-enhanced/refresh', {}, {
        Cookie: 'refreshToken=valid-refresh-token',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('expiresAt');

      // Check that new access token cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];
      expect(cookies.some((cookie: string) => cookie.includes('accessToken'))).toBe(true);
    });

    it('should reject expired refresh tokens', async () => {
      const response = await client.post('/api/auth-enhanced/refresh', {}, {
        Cookie: 'refreshToken=expired-token',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'REFRESH_EXPIRED');

      // Check that cookies are cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];
      expect(cookies.some((cookie: string) => cookie.includes('accessToken=;'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken=;'))).toBe(true);
    });

    it('should require refresh token', async () => {
      const response = await client.post('/api/auth-enhanced/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Refresh token required');
      expect(response.body).toHaveProperty('code', 'MISSING_REFRESH_TOKEN');
    });
  });

  describe('POST /api/auth-enhanced/logout', () => {
    it('should logout successfully', async () => {
      const response = await client.post('/api/auth-enhanced/logout', {}, {
        Cookie: 'accessToken=valid-token',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Check that cookies are cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];
      expect(cookies.some((cookie: string) => cookie.includes('accessToken=;'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken=;'))).toBe(true);
    });

    it('should handle logout without token gracefully', async () => {
      const response = await client.post('/api/auth-enhanced/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/auth-enhanced/change-pin', () => {
    it('should change PIN with valid inputs', async () => {
      // First, log in to establish a session
      await client.post('/api/auth-enhanced/login', {
        playerNumber: 1,
        pin: '7347',
        rememberMe: false,
      });

      const response = await client.post('/api/auth-enhanced/change-pin', {
        currentPin: '7347',
        newPin: '9182',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'PIN changed successfully. Please log in again.');

      // Check that session cookies are cleared (security measure)
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']];
      expect(cookies.some((cookie: string) => cookie.includes('accessToken=;'))).toBe(true);
    });

    it('should reject incorrect current PIN', async () => {
      const response = await client.post('/api/auth-enhanced/change-pin', {
        currentPin: 'wrong-pin',
        newPin: '9182',
      }, {
        Cookie: 'accessToken=valid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'INVALID_CURRENT_PIN');
    });

    it('should validate new PIN security requirements', async () => {
      const response = await client.post('/api/auth-enhanced/change-pin', {
        currentPin: '7347',
        newPin: '0000',
      }, {
        Cookie: 'accessToken=valid-token',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'WEAK_NEW_PIN');
    });

    it('should require both current and new PIN', async () => {
      const testCases = [
        { currentPin: '7347' }, // Missing new PIN
        { newPin: '9182' }, // Missing current PIN
        {}, // Missing both
      ];

      for (const testCase of testCases) {
        const response = await client.post('/api/auth-enhanced/change-pin', testCase, {
          Cookie: 'accessToken=valid-token',
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Current PIN and new PIN are required');
        expect(response.body).toHaveProperty('code', 'MISSING_PINS');
      }
    });

    it('should respect PIN change rate limiting', async () => {
      // Make 4 PIN change requests
      for (let i = 0; i < 4; i++) {
        const response = await client.post('/api/auth-enhanced/change-pin', {
          currentPin: '7347',
          newPin: '9182',
        }, {
          Cookie: 'accessToken=valid-token',
        });

        if (i < 3) {
          expect(response.status).not.toBe(429);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('code', 'PIN_CHANGE_LIMITED');
        }
      }
    });
  });

  describe('GET /api/auth-enhanced/me', () => {
    it('should return current user information', async () => {
      const response = await client.get('/api/auth-enhanced/me', {
        Cookie: 'accessToken=valid-token',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).toHaveProperty('isAdmin', true);
      expect(response.body.user).toHaveProperty('playerNumber', 1);
    });

    it('should not expose sensitive information', async () => {
      const response = await client.get('/api/auth-enhanced/me', {
        Cookie: 'accessToken=valid-token',
      });

      expect(response.status).toBe(200);
      expect(response.body.user).not.toHaveProperty('pin');
      expect(response.body.user).not.toHaveProperty('pinHash');
      expect(response.body.user).not.toHaveProperty('sessionId');
      expect(response.body.user).not.toHaveProperty('accessToken');
    });
  });

  describe('GET /api/auth-enhanced/security-stats', () => {
    it('should return security statistics for admin users', async () => {
      const response = await client.get('/api/auth-enhanced/security-stats', {
        Cookie: 'accessToken=valid-admin-token',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
    });

    it('should reject non-admin users', async () => {
      const response = await client.get('/api/auth-enhanced/security-stats', {
        Cookie: 'accessToken=valid-user-token',
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Admin access required');
      expect(response.body).toHaveProperty('code', 'ADMIN_REQUIRED');
    });
  });

  describe('Security Headers', () => {
    it('should apply comprehensive security headers', async () => {
      const response = await client.post('/api/auth-enhanced/login', {
        playerNumber: 1,
        pin: '7347',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });
});
