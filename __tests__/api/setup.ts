/**
 * API Test Setup
 * Base configuration and utilities for API integration tests
 */

import request from 'supertest';
import express from 'express';
import { initDatabase } from '../../backend/db/index';

// Mock all dependencies before imports
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

// Mock database for testing
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

// Mock security middleware to avoid rate limiting in tests
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

/**
 * Test helper for API requests
 */
export class ApiTestClient {
  private app: express.Application;

  constructor(app: express.Application) {
    this.app = app;
  }

  /**
   * Make GET request to API endpoint
   */
  async get(endpoint: string, headers: Record<string, string> = {}) {
    return request(this.app)
      .get(endpoint)
      .set(headers);
  }

  /**
   * Make POST request to API endpoint
   */
  async post(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    return request(this.app)
      .post(endpoint)
      .send(data)
      .set({
        'Content-Type': 'application/json',
        ...headers
      });
  }

  /**
   * Make PUT request to API endpoint
   */
  async put(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    return request(this.app)
      .put(endpoint)
      .send(data)
      .set({
        'Content-Type': 'application/json',
        ...headers
      });
  }

  /**
   * Make DELETE request to API endpoint
   */
  async delete(endpoint: string, headers: Record<string, string> = {}) {
    return request(this.app)
      .delete(endpoint)
      .set(headers);
  }

  /**
   * Authenticate user and return auth headers
   */
  async authenticateUser(pin: string = '1234'): Promise<Record<string, string>> {
    const response = await this.post('/api/auth/login', { pin });
    
    if (response.status === 200 && response.body.token) {
      return {
        'Authorization': `Bearer ${response.body.token}`
      };
    }
    
    return {};
  }
}

/**
 * Setup test database state
 */
export const setupTestDatabase = async () => {
  await initDatabase();
};

/**
 * Clean up test database state
 */
export const cleanupTestDatabase = async () => {
  // Mock cleanup - in real implementation would reset database state
  jest.clearAllMocks();
};

/**
 * Common test data
 */
export const testData = {
  validUser: {
    pin: '1234',
    expectedUserId: 'demo-user-1'
  },
  validPrediction: {
    gameId: 'game-123',
    homeScore: 24,
    awayScore: 17,
    confidence: 85,
    reasoning: 'Strong offensive line matchup favors home team'
  },
  validLeague: {
    id: 'league-123',
    name: 'Test League',
    settings: {
      scoringType: 'standard',
      teamCount: 12
    }
  }
};

/**
 * HTTP status codes for testing
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};
