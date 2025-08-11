/**
 * Authentication Routes Unit Tests
 * Direct testing of authentication route handlers
 */

import request from 'supertest';
import express from 'express';

// Mock database functions
const mockGetRow = jest.fn();
const mockGetRows = jest.fn();
const mockRunQuery = jest.fn();

jest.mock('../../backend/db/index', () => ({
  getRow: mockGetRow,
  getRows: mockGetRows,
  runQuery: mockRunQuery
}));

// Mock auth service
const mockAuthService = {
  authenticateUser: jest.fn(),
  registerUser: jest.fn(),
  refreshAccessToken: jest.fn(),
  logoutUser: jest.fn(),
  logoutUserFromAllDevices: jest.fn(),
  updateUserProfile: jest.fn(),
  changeUserPassword: jest.fn(),
  cleanupExpiredSessions: jest.fn()
};

jest.mock('../../backend/services/authService', () => mockAuthService);

// Mock middleware
const mockAuthMiddleware = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'demo-user-1', username: 'TestUser' };
    next();
  }),
  rateLimitAuth: jest.fn((req: any, res: any, next: any) => next()),
  recordFailedAuth: jest.fn(),
  clearAuthAttempts: jest.fn(),
  validateAuthRequest: jest.fn((req: any, res: any, next: any) => next()),
  sanitizeUser: jest.fn((user: any) => user)
};

jest.mock('../../backend/middleware/auth', () => mockAuthMiddleware);

// Mock security middleware
jest.mock('../../backend/middleware/security', () => ({
  authValidation: {
    login: jest.fn((req: any, res: any, next: any) => next()),
    register: jest.fn((req: any, res: any, next: any) => next())
  },
  handleValidationErrors: jest.fn((req: any, res: any, next: any) => next())
}));

describe('Authentication Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Import auth routes after all mocks are set up
    const authRoutes = require('../../backend/routes/auth').default;
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate with valid credentials', async () => {
      mockAuthService.authenticateUser.mockResolvedValue({
        success: true,
        user: { id: 'user-1', username: 'testuser' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(mockAuthService.authenticateUser).toHaveBeenCalledWith('testuser', 'password123');
    });

    it('should reject invalid credentials', async () => {
      mockAuthService.authenticateUser.mockResolvedValue({
        success: false,
        message: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        user: { id: 'user-2', username: 'newuser' },
        accessToken: 'mock-access-token'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'newuser', 
          password: 'password123',
          email: 'test@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(mockAuthService.registerUser).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      mockAuthService.logoutUser.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      mockAuthService.refreshAccessToken.mockResolvedValue({
        success: true,
        accessToken: 'new-access-token'
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });
  });
});
