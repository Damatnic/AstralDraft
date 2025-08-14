/**
 * API Test Setup
 * Base configuration and utilities for API integration tests
 */

import request from 'supertest';
import express from 'express';

// Unmock the real dependencies to ensure tests use actual logic
jest.unmock('cors');
jest.unmock('express-slow-down');
jest.unmock('express-rate-limit');
jest.unmock('../../backend/db/index');
jest.unmock('../../backend/middleware/security');
jest.unmock('../../backend/middleware/auth');

/**
 * Test helper for API requests
 */
export class ApiTestClient {
  private agent: any;
  private authToken: string | null = null;

  constructor(app: express.Application) {
    this.agent = request.agent(app);
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuth(token: string): void {
    this.authToken = token;
  }

  /**
   * Make GET request to API endpoint
   */
  async get(endpoint: string, headers: Record<string, string> = {}) {
    const req = this.agent.get(endpoint);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req.set(headers);
  }

  /**
   * Make POST request to API endpoint
   */
  async post(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    const req = this.agent.post(endpoint);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req.send(data).set({
      'Content-Type': 'application/json',
      ...headers
    });
  }

  /**
   * Make PUT request to API endpoint
   */
  async put(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    const req = this.agent.put(endpoint);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req.send(data).set({
      'Content-Type': 'application/json',
      ...headers
    });
  }

  /**
   * Make DELETE request to API endpoint
   */
  async delete(endpoint: string, headers: Record<string, string> = {}) {
    const req = this.agent.delete(endpoint);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req.set(headers);
  }

  /**
   * Authenticate user and return auth headers
   */
  async authenticateUser(username?: string, password?: string): Promise<void> {
    const loginCredentials = {
      username: username || 'testuser',
      password: password || 'TestPassword123!'
    };

    const response = await this.post('/api/auth/login', loginCredentials);
    if (response.status === 200 && response.body.token) {
      this.setAuth(response.body.token);
    } else {
      // Optionally throw an error to make authentication failures more explicit
      throw new Error(`Authentication failed with status: ${response.status}`);
    }
  }
}

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

import { initDatabase, closeDatabase, seedDatabase } from '../../backend/db';

export async function setupTestDatabase(): Promise<void> {
    await initDatabase(':memory:');
    await seedDatabase();
}

export async function cleanupTestDatabase(): Promise<void> {
    await closeDatabase();
}
