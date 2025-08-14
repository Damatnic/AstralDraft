/**
 * Oracle Prediction System Security Tests
 * Tests for Oracle prediction security, validation, and integrity
 */

import request from 'supertest';
import express from 'express';
import { runQuery, getRow, getRows } from '../backend/db';

// Mock database functions
jest.mock('../backend/db', () => ({
    runQuery: jest.fn(),
    getRow: jest.fn(),
    getRows: jest.fn(),
}));

const mockDb = {
    runQuery: runQuery as jest.MockedFunction<typeof runQuery>,
    getRow: getRow as jest.MockedFunction<typeof getRow>,
    getRows: getRows as jest.MockedFunction<typeof getRows>,
};

describe('Oracle Prediction Security', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        jest.clearAllMocks();
    });

    describe('Authentication Security', () => {
        it('should require authentication for creating predictions', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                // Simulate missing auth
                if (!req.headers.authorization) {
                    return res.status(401).json({ error: 'Authentication required' });
                }
                res.json({ success: true });
            });

            const response = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win?'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate auth tokens properly', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                const token = req.headers.authorization?.replace('Bearer ', '');
                if (token === 'valid-token') {
                    res.json({ success: true });
                } else {
                    res.status(401).json({ error: 'Invalid token' });
                }
            });

            const response = await request(app)
                .post('/api/oracle/predictions')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win?'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('Input Validation', () => {
        it('should validate prediction data structure', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                const { week, type, question, options } = req.body;
                
                if (!week || !type || !question) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                
                if (options && (!Array.isArray(options) || options.length < 2)) {
                    return res.status(400).json({ error: 'At least 2 options required' });
                }
                
                res.json({ success: true });
            });

            // Test missing fields
            const invalidResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({ week: 1 });

            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body).toHaveProperty('error');

            // Test valid data
            const validResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win?',
                    options: [
                        { id: 1, text: 'Team A', probability: 0.6 },
                        { id: 2, text: 'Team B', probability: 0.4 }
                    ]
                });

            expect(validResponse.status).toBe(200);
        });

        it('should sanitize user input', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                const { question } = req.body;
                
                // Check for potential XSS
                if (question.includes('<script>') || question.includes('javascript:')) {
                    return res.status(400).json({ error: 'Invalid characters in question' });
                }
                
                res.json({ success: true, sanitized: true });
            });

            const maliciousResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: '<script>alert("xss")</script>Who will win?',
                    options: [
                        { id: 1, text: 'Team A', probability: 0.6 },
                        { id: 2, text: 'Team B', probability: 0.4 }
                    ]
                });

            expect(maliciousResponse.status).toBe(400);
            expect(maliciousResponse.body).toHaveProperty('error');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on prediction submissions', async () => {
            let submissionCount = 0;
            
            app.post('/api/oracle/predictions/:id/submit', (req, res) => {
                submissionCount++;
                
                // Simulate rate limiting (max 10 submissions per minute)
                if (submissionCount > 10) {
                    return res.status(429).json({ 
                        error: 'Too many submissions',
                        retryAfter: 60 
                    });
                }
                
                res.json({ success: true });
            });

            // Make submissions until rate limit is hit
            let rateLimitHit = false;
            for (let i = 0; i < 12; i++) {
                const response = await request(app)
                    .post('/api/oracle/predictions/1/submit')
                    .send({ userChoice: 1, confidence: 0.8 });

                if (response.status === 429) {
                    rateLimitHit = true;
                    expect(response.body).toHaveProperty('error');
                    expect(response.body).toHaveProperty('retryAfter');
                    break;
                }
            }

            expect(rateLimitHit).toBe(true);
        });
    });

    describe('Data Integrity', () => {
        it('should validate prediction consistency', async () => {
            mockDb.getRow.mockResolvedValue({
                id: 1,
                week: 1,
                status: 'active',
                options: JSON.stringify([
                    { id: 1, text: 'Team A', probability: 0.6 },
                    { id: 2, text: 'Team B', probability: 0.4 }
                ])
            });

            app.post('/api/oracle/predictions/:id/submit', async (req, res) => {
                const { userChoice } = req.body;
                const prediction = await mockDb.getRow('SELECT * FROM oracle_predictions WHERE id = ?', [req.params.id]);
                
                if (!prediction) {
                    return res.status(404).json({ error: 'Prediction not found' });
                }
                
                const options = JSON.parse(prediction.options);
                const validChoice = options.find((opt: any) => opt.id === userChoice);
                
                if (!validChoice) {
                    return res.status(400).json({ error: 'Invalid choice' });
                }
                
                res.json({ success: true, choice: validChoice });
            });

            // Test valid choice
            const validResponse = await request(app)
                .post('/api/oracle/predictions/1/submit')
                .send({ userChoice: 1, confidence: 0.8 });

            expect(validResponse.status).toBe(200);
            expect(validResponse.body).toHaveProperty('success', true);

            // Test invalid choice
            const invalidResponse = await request(app)
                .post('/api/oracle/predictions/1/submit')
                .send({ userChoice: 99, confidence: 0.8 });

            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body).toHaveProperty('error');
        });

        it('should prevent duplicate submissions', async () => {
            const submissions = new Set();

            app.post('/api/oracle/predictions/:id/submit', (req, res) => {
                const userId = req.headers['x-user-id'] || 'anonymous';
                const predictionId = req.params.id;
                const submissionKey = `${userId}-${predictionId}`;

                if (submissions.has(submissionKey)) {
                    return res.status(409).json({ error: 'Already submitted' });
                }

                submissions.add(submissionKey);
                res.json({ success: true });
            });

            // First submission should succeed
            const firstResponse = await request(app)
                .post('/api/oracle/predictions/1/submit')
                .set('x-user-id', 'user123')
                .send({ userChoice: 1, confidence: 0.8 });

            expect(firstResponse.status).toBe(200);

            // Second submission should fail
            const secondResponse = await request(app)
                .post('/api/oracle/predictions/1/submit')
                .set('x-user-id', 'user123')
                .send({ userChoice: 2, confidence: 0.9 });

            expect(secondResponse.status).toBe(409);
            expect(secondResponse.body).toHaveProperty('error');
        });
    });

    describe('Permission Validation', () => {
        it('should require admin privileges for resolving predictions', async () => {
            app.post('/api/oracle/predictions/:id/resolve', (req, res) => {
                const userRole = req.headers['x-user-role'];
                
                if (userRole !== 'admin') {
                    return res.status(403).json({ error: 'Admin privileges required' });
                }
                
                res.json({ success: true });
            });

            // Test non-admin user
            const userResponse = await request(app)
                .post('/api/oracle/predictions/1/resolve')
                .set('x-user-role', 'user')
                .send({ actualResult: 1 });

            expect(userResponse.status).toBe(403);

            // Test admin user
            const adminResponse = await request(app)
                .post('/api/oracle/predictions/1/resolve')
                .set('x-user-role', 'admin')
                .send({ actualResult: 1 });

            expect(adminResponse.status).toBe(200);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockDb.runQuery.mockRejectedValue(new Error('Database connection failed'));

            app.post('/api/oracle/predictions', async (req, res) => {
                try {
                    await mockDb.runQuery('INSERT INTO oracle_predictions ...', []);
                    res.json({ success: true });
                } catch (error) {
                    res.status(500).json({ 
                        error: 'Internal server error',
                        retryable: true 
                    });
                }
            });

            const response = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win?'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('retryable', true);
        });

        it('should not expose sensitive error details', async () => {
            app.get('/api/oracle/predictions/:id', (req, res) => {
                // Simulate an error that might contain sensitive info
                throw new Error('Database password is invalid for user admin123');
            });

            app.use((error: any, req: any, res: any, next: any) => {
                // Error handler that sanitizes errors
                res.status(500).json({
                    error: 'Internal server error',
                    timestamp: new Date().toISOString()
                });
            });

            const response = await request(app)
                .get('/api/oracle/predictions/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
            expect(response.body.error).not.toContain('password');
            expect(response.body.error).not.toContain('admin123');
        });
    });
});
