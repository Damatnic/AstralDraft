/**
 * Oracle API Input Validation Tests
 * Comprehensive tests for all Oracle validation middleware
 */

import request from 'supertest';
import express, { Request, Response } from 'express';
import {
    validateCreatePrediction,
    validateSubmitPrediction,
    validateResolvePrediction,
    validateProductionQuery,
    validateAnalyticsReport,
    sanitizeInput
} from '../backend/middleware/oracleValidation';

const app = express();
app.use(express.json());

// Test routes for validation middleware
app.post('/test-create-prediction', validateCreatePrediction, (req: Request, res: Response) => {
    res.json({ success: true, data: req.body });
});

app.post('/test-submit-prediction/:id', validateSubmitPrediction, (req: Request, res: Response) => {
    res.json({ success: true, data: req.body, params: req.params });
});

app.post('/test-resolve-prediction/:id', validateResolvePrediction, (req: Request, res: Response) => {
    res.json({ success: true, data: req.body, params: req.params });
});

app.get('/test-production-query', validateProductionQuery, (req: Request, res: Response) => {
    res.json({ success: true, query: req.query });
});

app.post('/test-analytics-report', validateAnalyticsReport, (req: Request, res: Response) => {
    res.json({ success: true, data: req.body });
});

app.post('/test-sanitize', sanitizeInput, (req: Request, res: Response) => {
    res.json({ success: true, data: req.body });
});

describe('Oracle API Validation Middleware', () => {
    
    describe('validateCreatePrediction', () => {
        it('should accept valid prediction data', async () => {
            const validPrediction = {
                week: 5,
                season: 2024,
                type: 'GAME_OUTCOME',
                question: 'Who will win the Chiefs vs. Patriots game?',
                options: [
                    { id: 0, text: 'Kansas City Chiefs', probability: 0.65, supportingData: ['Recent form', 'Home advantage'] },
                    { id: 1, text: 'New England Patriots', probability: 0.35, supportingData: ['Strong defense', 'Playoff experience'] }
                ],
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Chiefs have been dominant at home this season with strong offensive performance.',
                dataPoints: ['Chiefs 8-2 at home', 'Patriots 3-7 on road', 'Head-to-head history favors Chiefs']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(validPrediction)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid week', async () => {
            const invalidPrediction = {
                week: 25, // Invalid - exceeds max of 18
                type: 'GAME_OUTCOME',
                question: 'Valid question here',
                options: [
                    { id: 0, text: 'Option 1', probability: 0.5, supportingData: [] },
                    { id: 1, text: 'Option 2', probability: 0.5, supportingData: [] }
                ],
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Valid reasoning here',
                dataPoints: ['Valid data point']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(invalidPrediction)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
        });

        it('should reject probabilities that don\'t sum to 1', async () => {
            const invalidPrediction = {
                week: 5,
                type: 'GAME_OUTCOME',
                question: 'Valid question here',
                options: [
                    { id: 0, text: 'Option 1', probability: 0.3, supportingData: [] },
                    { id: 1, text: 'Option 2', probability: 0.4, supportingData: [] } // Sum = 0.7, not 1.0
                ],
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Valid reasoning here',
                dataPoints: ['Valid data point']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(invalidPrediction)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    message: expect.stringContaining('probabilities must sum to approximately 1.0')
                })
            );
        });
    });

    describe('validateSubmitPrediction', () => {
        it('should accept valid submission', async () => {
            const validSubmission = {
                userChoice: 1,
                confidence: 85,
                reasoning: 'I believe the Patriots have a strong chance based on their recent performance.'
            };

            const response = await request(app)
                .post('/test-submit-prediction/123e4567-e89b-12d3-a456-426614174000')
                .send(validSubmission)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid UUID', async () => {
            const validSubmission = {
                userChoice: 1,
                confidence: 85
            };

            const response = await request(app)
                .post('/test-submit-prediction/invalid-uuid')
                .send(validSubmission)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should reject confidence out of range', async () => {
            const invalidSubmission = {
                userChoice: 1,
                confidence: 150 // Invalid - exceeds max of 100
            };

            const response = await request(app)
                .post('/test-submit-prediction/123e4567-e89b-12d3-a456-426614174000')
                .send(invalidSubmission)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('validateProductionQuery', () => {
        it('should accept valid query parameters', async () => {
            const response = await request(app)
                .get('/test-production-query')
                .query({
                    week: 5,
                    season: 2024,
                    type: 'GAME_OUTCOME',
                    status: 'open',
                    limit: 20
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid week', async () => {
            const response = await request(app)
                .get('/test-production-query')
                .query({ week: 25 })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('validateAnalyticsReport', () => {
        it('should accept valid analytics request', async () => {
            const validRequest = {
                startDate: '2024-01-01T00:00:00.000Z',
                endDate: '2024-06-30T23:59:59.999Z', // 6 months, well under 365 days
                metrics: ['accuracy', 'confidence', 'volume'],
                groupBy: 'week',
                filters: {
                    type: 'GAME_OUTCOME',
                    minConfidence: 70
                }
            };

            const response = await request(app)
                .post('/test-analytics-report')
                .send(validRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should reject invalid date range', async () => {
            const invalidRequest = {
                startDate: '2024-12-31T23:59:59.999Z',
                endDate: '2024-01-01T00:00:00.000Z', // End before start
                metrics: ['accuracy']
            };

            const response = await request(app)
                .post('/test-analytics-report')
                .send(invalidRequest)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should reject date range exceeding 365 days', async () => {
            const invalidRequest = {
                startDate: '2023-01-01T00:00:00.000Z',
                endDate: '2025-01-01T00:00:00.000Z', // More than 365 days
                metrics: ['accuracy']
            };

            const response = await request(app)
                .post('/test-analytics-report')
                .send(invalidRequest)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('sanitizeInput', () => {
        it('should remove script tags from input', async () => {
            const maliciousInput = {
                question: 'Who will win? <script>alert("xss")</script>',
                reasoning: 'My analysis <script>malicious()</script> suggests...',
                dataPoints: ['<script>evil()</script>Normal data point']
            };

            const response = await request(app)
                .post('/test-sanitize')
                .send(maliciousInput)
                .expect(200);

            expect(response.body.data.question).not.toContain('<script>');
            expect(response.body.data.reasoning).not.toContain('<script>');
            expect(response.body.data.dataPoints[0]).not.toContain('<script>');
        });

        it('should remove HTML tags from input', async () => {
            const htmlInput = {
                question: 'Who will win? <div>Some content</div>',
                reasoning: 'My <b>bold</b> analysis suggests...'
            };

            const response = await request(app)
                .post('/test-sanitize')
                .send(htmlInput)
                .expect(200);

            expect(response.body.data.question).not.toContain('<div>');
            expect(response.body.data.reasoning).not.toContain('<b>');
        });

        it('should handle nested objects and arrays', async () => {
            const nestedInput = {
                options: [
                    { text: '<script>bad()</script>Option 1', supportingData: ['<div>Data</div>'] },
                    { text: 'Option 2 <b>bold</b>', supportingData: ['Normal data'] }
                ],
                metadata: {
                    notes: '<script>alert("xss")</script>Some notes',
                    tags: ['<div>tag1</div>', 'tag2']
                }
            };

            const response = await request(app)
                .post('/test-sanitize')
                .send(nestedInput)
                .expect(200);

            expect(response.body.data.options[0].text).not.toContain('<script>');
            expect(response.body.data.options[0].supportingData[0]).not.toContain('<div>');
            expect(response.body.data.metadata.notes).not.toContain('<script>');
            expect(response.body.data.metadata.tags[0]).not.toContain('<div>');
        });
    });

    describe('Error Response Format', () => {
        it('should return consistent error format', async () => {
            const invalidData = {
                week: 'not-a-number',
                confidence: 'invalid'
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(invalidData)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        field: expect.any(String),
                        message: expect.any(String)
                    })
                ]),
                timestamp: expect.any(String)
            });
        });
    });

    describe('Field-specific Validation', () => {
        it('should validate prediction types', async () => {
            const invalidType = {
                week: 5,
                type: 'INVALID_TYPE',
                question: 'Valid question',
                options: [
                    { id: 0, text: 'Option 1', probability: 0.5, supportingData: [] },
                    { id: 1, text: 'Option 2', probability: 0.5, supportingData: [] }
                ],
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Valid reasoning',
                dataPoints: ['Valid data']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(invalidType)
                .expect(400);

            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    field: 'type',
                    message: expect.stringContaining('valid prediction type')
                })
            );
        });

        it('should validate question length', async () => {
            const shortQuestion = {
                week: 5,
                type: 'GAME_OUTCOME',
                question: 'Too short', // Less than 10 characters
                options: [
                    { id: 0, text: 'Option 1', probability: 0.5, supportingData: [] },
                    { id: 1, text: 'Option 2', probability: 0.5, supportingData: [] }
                ],
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Valid reasoning here',
                dataPoints: ['Valid data']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(shortQuestion)
                .expect(400);

            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    field: 'question',
                    message: expect.stringContaining('between 10 and 500 characters')
                })
            );
        });

        it('should validate options array bounds', async () => {
            const tooFewOptions = {
                week: 5,
                type: 'GAME_OUTCOME',
                question: 'Valid question here',
                options: [
                    { id: 0, text: 'Only option', probability: 1.0, supportingData: [] }
                ], // Only 1 option, need at least 2
                oracleChoice: 0,
                confidence: 75,
                reasoning: 'Valid reasoning',
                dataPoints: ['Valid data']
            };

            const response = await request(app)
                .post('/test-create-prediction')
                .send(tooFewOptions)
                .expect(400);

            expect(response.body.details).toContainEqual(
                expect.objectContaining({
                    field: 'options',
                    message: expect.stringContaining('2-10 items')
                })
            );
        });
    });
});
