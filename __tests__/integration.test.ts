/**
 * Integration Tests for Critical API Endpoints
 * Tests the complete user journeys and API functionality for 10-20 user deployment
 */

import request from 'supertest';
import app from '../backend/server';
import { runQuery } from '../backend/db';

describe('API Integration Tests', () => {
    let authToken: string;
    let userId: number;
    let predictionId: string;

    beforeAll(async () => {
        // Clean up any existing test data
        await runQuery(`
            DELETE FROM users WHERE username LIKE 'testuser%';
        `);
        await runQuery(`
            DELETE FROM oracle_predictions WHERE title LIKE 'Test Prediction%';
        `);
        await runQuery(`
            DELETE FROM user_predictions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'testuser%');
        `);
    });

    afterAll(async () => {
        // Clean up test data
        await runQuery(`
            DELETE FROM users WHERE username LIKE 'testuser%';
        `);
        await runQuery(`
            DELETE FROM oracle_predictions WHERE title LIKE 'Test Prediction%';
        `);
        await runQuery(`
            DELETE FROM user_predictions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'testuser%');
        `);
    });

    describe('Authentication Flow', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser1',
                    email: 'testuser1@example.com',
                    password: 'TestPassword123!',
                    displayName: 'Test User 1'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user.username).toBe('testuser1');
            
            userId = response.body.user.id;
        });

        it('should not allow duplicate user registration', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser1',
                    email: 'testuser1@example.com',
                    password: 'TestPassword123!',
                    displayName: 'Test User 1'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    login: 'testuser1',
                    password: 'TestPassword123!'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body).toHaveProperty('user');
            
            authToken = response.body.accessToken;
        });

        it('should reject invalid login credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    login: 'testuser1',
                    password: 'WrongPassword123!'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should access protected routes with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', userId);
            expect(response.body).toHaveProperty('username', 'testuser1');
        });

        it('should reject access to protected routes without token', async () => {
            const response = await request(app)
                .get('/api/auth/profile');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Oracle Prediction Flow', () => {
        it('should create a new Oracle prediction (admin only)', async () => {
            // First, make user admin for testing
            await runQuery(`UPDATE users SET role = 'admin' WHERE id = ?`, [userId]);

            const response = await request(app)
                .post('/api/oracle/predictions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Prediction - Week 1 Chiefs vs Bills',
                    description: 'Who will win the season opener?',
                    options: ['Kansas City Chiefs', 'Buffalo Bills'],
                    category: 'NFL',
                    week: 1,
                    season: 2024,
                    closingTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
                    oracleChoice: 1,
                    oracleConfidence: 75
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Oracle prediction created successfully');
            expect(response.body).toHaveProperty('prediction');
            expect(response.body.prediction).toHaveProperty('id');
            
            predictionId = response.body.prediction.id;
        });

        it('should get all active Oracle predictions', async () => {
            const response = await request(app)
                .get('/api/oracle/predictions');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('predictions');
            expect(Array.isArray(response.body.predictions)).toBe(true);
            expect(response.body.predictions.length).toBeGreaterThan(0);
            
            const testPrediction = response.body.predictions.find(
                (p: any) => p.title.includes('Test Prediction')
            );
            expect(testPrediction).toBeDefined();
        });

        it('should get specific Oracle prediction by ID', async () => {
            const response = await request(app)
                .get(`/api/oracle/predictions/${predictionId}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', predictionId);
            expect(response.body).toHaveProperty('title');
            expect(response.body).toHaveProperty('options');
        });

        it('should submit user prediction for Oracle challenge', async () => {
            const response = await request(app)
                .post(`/api/oracle/predictions/${predictionId}/predict`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    choice: 0, // Kansas City Chiefs
                    confidence: 80,
                    reasoning: 'Chiefs have home field advantage and strong offense'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Prediction submitted successfully');
            expect(response.body).toHaveProperty('userPrediction');
        });

        it('should not allow duplicate predictions from same user', async () => {
            const response = await request(app)
                .post(`/api/oracle/predictions/${predictionId}/predict`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    choice: 1, // Buffalo Bills
                    confidence: 70,
                    reasoning: 'Changed my mind about Bills defense'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should get user predictions', async () => {
            const response = await request(app)
                .get('/api/oracle/my-predictions')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('predictions');
            expect(Array.isArray(response.body.predictions)).toBe(true);
            expect(response.body.predictions.length).toBeGreaterThan(0);
        });
    });

    describe('Analytics Endpoints', () => {
        it('should get user statistics', async () => {
            const response = await request(app)
                .get('/api/analytics/user-stats')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalPredictions');
            expect(response.body).toHaveProperty('correctPredictions');
            expect(response.body).toHaveProperty('accuracy');
            expect(response.body).toHaveProperty('totalPoints');
            expect(response.body).toHaveProperty('rank');
        });

        it('should get leaderboard', async () => {
            const response = await request(app)
                .get('/api/analytics/leaderboard');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('leaderboard');
            expect(Array.isArray(response.body.leaderboard)).toBe(true);
        });

        it('should get prediction accuracy by category', async () => {
            const response = await request(app)
                .get('/api/analytics/accuracy-by-category')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('categories');
            expect(typeof response.body.categories).toBe('object');
        });

        it('should get performance trends', async () => {
            const response = await request(app)
                .get('/api/analytics/performance-trends')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ timeframe: '30d' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('trends');
            expect(Array.isArray(response.body.trends)).toBe(true);
        });
    });

    describe('Admin Functionality', () => {
        it('should resolve Oracle prediction (admin only)', async () => {
            const response = await request(app)
                .put(`/api/oracle/predictions/${predictionId}/resolve`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    correctAnswer: 0, // Kansas City Chiefs won
                    actualResult: 'Kansas City Chiefs won 31-17'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Oracle prediction resolved successfully');
        });

        it('should get admin analytics', async () => {
            const response = await request(app)
                .get('/api/analytics/admin/overview')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalUsers');
            expect(response.body).toHaveProperty('totalPredictions');
            expect(response.body).toHaveProperty('activePredictions');
            expect(response.body).toHaveProperty('oracleAccuracy');
        });

        it('should get user management data', async () => {
            const response = await request(app)
                .get('/api/analytics/admin/users')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent prediction ID', async () => {
            const response = await request(app)
                .get('/api/oracle/predictions/nonexistent-id');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle invalid JSON in request body', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser2'
                    // Missing email, password, displayName
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle expired or invalid tokens', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Rate Limiting', () => {
        it('should handle rate limiting for registration attempts', async () => {
            // Make multiple rapid registration attempts
            const promises = Array.from({ length: 10 }, (_, i) =>
                request(app)
                    .post('/api/auth/register')
                    .send({
                        username: `testuser${i + 10}`,
                        email: `testuser${i + 10}@example.com`,
                        password: 'TestPassword123!',
                        displayName: `Test User ${i + 10}`
                    })
            );

            const responses = await Promise.all(promises);
            
            // At least one should be rate limited
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    describe('Data Validation', () => {
        it('should validate email format during registration', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser99',
                    email: 'invalid-email',
                    password: 'TestPassword123!',
                    displayName: 'Test User 99'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate password strength during registration', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser99',
                    email: 'testuser99@example.com',
                    password: 'weak',
                    displayName: 'Test User 99'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate prediction choice is within valid range', async () => {
            const response = await request(app)
                .post(`/api/oracle/predictions/${predictionId}/predict`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    choice: 999, // Invalid choice
                    confidence: 80,
                    reasoning: 'Invalid choice test'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Database Integrity', () => {
        it('should maintain referential integrity', async () => {
            // Try to create a prediction for non-existent Oracle prediction
            const response = await request(app)
                .post('/api/oracle/predictions/nonexistent-id/predict')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    choice: 0,
                    confidence: 80,
                    reasoning: 'Test integrity'
                });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle concurrent user operations gracefully', async () => {
            // Simulate concurrent prediction submissions
            const promises = Array.from({ length: 5 }, () =>
                request(app)
                    .get('/api/oracle/my-predictions')
                    .set('Authorization', `Bearer ${authToken}`)
            );

            const responses = await Promise.all(promises);
            
            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });
});
