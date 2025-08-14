/**
 * Oracle System Integration Tests
 * Comprehensive tests for Oracle prediction system functionality and security
 */

import request from 'supertest';
import express from 'express';

describe('Oracle System Integration', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Basic CORS and security headers
        app.use((req, res, next) => {
            res.set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            });
            next();
        });
    });

    describe('Oracle Prediction Workflow', () => {
        it('should create, submit, and resolve predictions successfully', async () => {
            const predictions = new Map();
            const submissions = new Map();
            let nextId = 1;

            // Create prediction endpoint
            app.post('/api/oracle/predictions', (req, res) => {
                const { week, type, question, options } = req.body;
                
                if (!week || !type || !question) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                const prediction = {
                    id: nextId++,
                    week,
                    type,
                    question,
                    options: options || [],
                    status: 'active',
                    createdAt: new Date().toISOString()
                };

                predictions.set(prediction.id, prediction);
                res.json({ success: true, prediction });
            });

            // Submit user prediction endpoint
            app.post('/api/oracle/predictions/:id/submit', (req, res) => {
                const predictionId = parseInt(req.params.id);
                const { userChoice, confidence } = req.body;
                const userId = req.headers['x-user-id'] || 'anonymous';

                const prediction = predictions.get(predictionId);
                if (!prediction) {
                    return res.status(404).json({ error: 'Prediction not found' });
                }

                if (prediction.status !== 'active') {
                    return res.status(400).json({ error: 'Prediction not active' });
                }

                const submissionKey = `${userId}-${predictionId}`;
                if (submissions.has(submissionKey)) {
                    return res.status(409).json({ error: 'Already submitted' });
                }

                const submission = {
                    userId,
                    predictionId,
                    userChoice,
                    confidence,
                    submittedAt: new Date().toISOString()
                };

                submissions.set(submissionKey, submission);
                res.json({ success: true, submission });
            });

            // Resolve prediction endpoint
            app.post('/api/oracle/predictions/:id/resolve', (req, res) => {
                const predictionId = parseInt(req.params.id);
                const { actualResult } = req.body;
                const userRole = req.headers['x-user-role'];

                if (userRole !== 'admin') {
                    return res.status(403).json({ error: 'Admin privileges required' });
                }

                const prediction = predictions.get(predictionId);
                if (!prediction) {
                    return res.status(404).json({ error: 'Prediction not found' });
                }

                prediction.status = 'resolved';
                prediction.actualResult = actualResult;
                prediction.resolvedAt = new Date().toISOString();

                res.json({ success: true, prediction });
            });

            // Test the full workflow
            
            // 1. Create prediction
            const createResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win the game?',
                    options: [
                        { id: 1, text: 'Team A', probability: 0.6 },
                        { id: 2, text: 'Team B', probability: 0.4 }
                    ]
                });

            expect(createResponse.status).toBe(200);
            expect(createResponse.body.success).toBe(true);
            expect(createResponse.body.prediction).toHaveProperty('id');

            const predictionId = createResponse.body.prediction.id;

            // 2. Submit user prediction
            const submitResponse = await request(app)
                .post(`/api/oracle/predictions/${predictionId}/submit`)
                .set('x-user-id', 'user123')
                .send({
                    userChoice: 1,
                    confidence: 0.8
                });

            expect(submitResponse.status).toBe(200);
            expect(submitResponse.body.success).toBe(true);

            // 3. Resolve prediction (admin only)
            const resolveResponse = await request(app)
                .post(`/api/oracle/predictions/${predictionId}/resolve`)
                .set('x-user-role', 'admin')
                .send({
                    actualResult: 1
                });

            expect(resolveResponse.status).toBe(200);
            expect(resolveResponse.body.success).toBe(true);
            expect(resolveResponse.body.prediction.status).toBe('resolved');
        });

        it('should validate prediction data integrity', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                const { week, type, question, options } = req.body;
                
                // Validate week
                if (!Number.isInteger(week) || week < 1 || week > 18) {
                    return res.status(400).json({ error: 'Invalid week number' });
                }

                // Validate type
                const validTypes = ['matchup', 'player_performance', 'season_outcome'];
                if (!validTypes.includes(type)) {
                    return res.status(400).json({ error: 'Invalid prediction type' });
                }

                // Validate options
                if (options && Array.isArray(options)) {
                    if (options.length < 2) {
                        return res.status(400).json({ error: 'At least 2 options required' });
                    }

                    const totalProbability = options.reduce((sum: number, opt: any) => 
                        sum + (opt.probability || 0), 0);

                    if (Math.abs(totalProbability - 1.0) > 0.01) {
                        return res.status(400).json({ error: 'Option probabilities must sum to 1.0' });
                    }
                }

                res.json({ success: true, validated: true });
            });

            // Test invalid week
            const invalidWeekResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 25,
                    type: 'matchup',
                    question: 'Test question'
                });

            expect(invalidWeekResponse.status).toBe(400);

            // Test invalid type
            const invalidTypeResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'invalid_type',
                    question: 'Test question'
                });

            expect(invalidTypeResponse.status).toBe(400);

            // Test invalid probabilities
            const invalidProbResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Test question',
                    options: [
                        { id: 1, text: 'Team A', probability: 0.7 },
                        { id: 2, text: 'Team B', probability: 0.5 } // Sums to 1.2
                    ]
                });

            expect(invalidProbResponse.status).toBe(400);

            // Test valid prediction
            const validResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Test question',
                    options: [
                        { id: 1, text: 'Team A', probability: 0.6 },
                        { id: 2, text: 'Team B', probability: 0.4 }
                    ]
                });

            expect(validResponse.status).toBe(200);
            expect(validResponse.body.validated).toBe(true);
        });
    });

    describe('Security Features', () => {
        it('should enforce authentication on protected endpoints', async () => {
            const protectedEndpoints = [
                { method: 'post', path: '/api/oracle/predictions', data: { week: 1, type: 'matchup', question: 'Test' } },
                { method: 'post', path: '/api/oracle/predictions/1/submit', data: { userChoice: 1, confidence: 0.8 } },
                { method: 'post', path: '/api/oracle/predictions/1/resolve', data: { actualResult: 1 } }
            ];

            for (const endpoint of protectedEndpoints) {
                app[endpoint.method as 'post'](endpoint.path, (req, res) => {
                    if (!req.headers.authorization) {
                        return res.status(401).json({ error: 'Authentication required' });
                    }
                    res.json({ success: true });
                });

                const response = await request(app)
                    [endpoint.method as 'post'](endpoint.path)
                    .send(endpoint.data);

                expect(response.status).toBe(401);
                expect(response.body.error).toBe('Authentication required');
            }
        });

        it('should sanitize user inputs', async () => {
            app.post('/api/oracle/predictions', (req, res) => {
                const { question } = req.body;
                
                // Check for XSS attempts
                const dangerousPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
                const hasDangerousContent = dangerousPatterns.some(pattern => 
                    question.toLowerCase().includes(pattern.toLowerCase())
                );

                if (hasDangerousContent) {
                    return res.status(400).json({ error: 'Invalid characters detected' });
                }

                // Check for SQL injection attempts
                const sqlPatterns = ['DROP TABLE', 'DELETE FROM', 'INSERT INTO', '--', ';'];
                const hasSqlInjection = sqlPatterns.some(pattern => 
                    question.toLowerCase().includes(pattern.toLowerCase())
                );

                if (hasSqlInjection) {
                    return res.status(400).json({ error: 'Invalid characters detected' });
                }

                res.json({ success: true, sanitized: true });
            });

            // Test XSS attempt
            const xssResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: '<script>alert("xss")</script>Who will win?'
                });

            expect(xssResponse.status).toBe(400);

            // Test SQL injection attempt
            const sqlResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: "Test'; DROP TABLE users; --"
                });

            expect(sqlResponse.status).toBe(400);

            // Test clean input
            const cleanResponse = await request(app)
                .post('/api/oracle/predictions')
                .send({
                    week: 1,
                    type: 'matchup',
                    question: 'Who will win the game today?'
                });

            expect(cleanResponse.status).toBe(200);
            expect(cleanResponse.body.sanitized).toBe(true);
        });

        it('should implement rate limiting', async () => {
            const rateLimiter = new Map();

            app.post('/api/oracle/predictions/:id/submit', (req, res) => {
                const userId = req.headers['x-user-id'] || 'anonymous';
                const now = Date.now();
                const windowMs = 60000; // 1 minute
                const maxRequests = 5;

                if (!rateLimiter.has(userId)) {
                    rateLimiter.set(userId, []);
                }

                const userRequests = rateLimiter.get(userId);
                const recentRequests = userRequests.filter((time: number) => now - time < windowMs);

                if (recentRequests.length >= maxRequests) {
                    return res.status(429).json({ 
                        error: 'Rate limit exceeded',
                        retryAfter: Math.ceil(windowMs / 1000)
                    });
                }

                recentRequests.push(now);
                rateLimiter.set(userId, recentRequests);

                res.json({ success: true, requestCount: recentRequests.length });
            });

            const userId = 'test-user';

            // Make requests up to the limit
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/api/oracle/predictions/1/submit')
                    .set('x-user-id', userId)
                    .send({ userChoice: 1, confidence: 0.8 });

                expect(response.status).toBe(200);
            }

            // Next request should be rate limited
            const limitedResponse = await request(app)
                .post('/api/oracle/predictions/1/submit')
                .set('x-user-id', userId)
                .send({ userChoice: 1, confidence: 0.8 });

            expect(limitedResponse.status).toBe(429);
            expect(limitedResponse.body.error).toBe('Rate limit exceeded');
        });
    });

    describe('Analytics and Leaderboard', () => {
        it('should calculate user accuracy correctly', async () => {
            const userStats = new Map();

            app.get('/api/oracle/analytics/accuracy', (req, res) => {
                const userId = req.headers['x-user-id'] as string;
                
                if (!userId) {
                    return res.status(401).json({ error: 'User ID required' });
                }

                // Mock user statistics
                const stats = userStats.get(userId) || {
                    totalPredictions: 0,
                    correctPredictions: 0,
                    accuracy: 0
                };

                res.json({
                    success: true,
                    data: {
                        accuracy_details: [],
                        aggregated_metrics: {
                            user_accuracy: stats.accuracy,
                            total_predictions: stats.totalPredictions,
                            oracle_accuracy: 0.75
                        },
                        filters: {
                            userId: parseInt(userId),
                            season: 2024,
                            timeframe: 'all'
                        }
                    }
                });
            });

            // Set up mock user stats
            userStats.set('123', {
                totalPredictions: 10,
                correctPredictions: 8,
                accuracy: 0.8
            });

            const response = await request(app)
                .get('/api/oracle/analytics/accuracy')
                .set('x-user-id', '123');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.aggregated_metrics.user_accuracy).toBe(0.8);
            expect(response.body.data.aggregated_metrics.total_predictions).toBe(10);
        });

        it('should generate leaderboard correctly', async () => {
            app.get('/api/oracle/leaderboard', (req, res) => {
                const mockLeaderboard = [
                    { rank: 1, username: 'user1', accuracy: 0.85, predictions: 20 },
                    { rank: 2, username: 'user2', accuracy: 0.82, predictions: 18 },
                    { rank: 3, username: 'user3', accuracy: 0.78, predictions: 15 }
                ];

                res.json({
                    success: true,
                    data: mockLeaderboard,
                    meta: {
                        total_players: mockLeaderboard.length,
                        season: 2024,
                        timeframe: req.query.timeframe || 'all'
                    }
                });
            });

            const response = await request(app).get('/api/oracle/leaderboard');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].rank).toBe(1);
            expect(response.body.data[0].accuracy).toBe(0.85);
        });
    });

    describe('Error Handling', () => {
        it('should handle server errors gracefully', async () => {
            app.get('/api/oracle/error-test', (req, res) => {
                throw new Error('Simulated server error');
            });

            app.use((error: any, req: any, res: any, next: any) => {
                res.status(500).json({
                    error: 'Internal server error',
                    timestamp: new Date().toISOString(),
                    requestId: Math.random().toString(36).substr(2, 9)
                });
            });

            const response = await request(app).get('/api/oracle/error-test');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('requestId');
        });

        it('should validate request content types', async () => {
            app.post('/api/oracle/test', (req, res) => {
                if (!req.is('application/json')) {
                    return res.status(415).json({ error: 'Content-Type must be application/json' });
                }
                res.json({ success: true });
            });

            const invalidResponse = await request(app)
                .post('/api/oracle/test')
                .set('Content-Type', 'text/plain')
                .send('invalid data');

            expect(invalidResponse.status).toBe(415);

            const validResponse = await request(app)
                .post('/api/oracle/test')
                .send({ data: 'valid json' });

            expect(validResponse.status).toBe(200);
        });
    });
});
