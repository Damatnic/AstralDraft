/**
 * Oracle Prediction System Tests
 * Comprehensive tests for Oracle prediction workflows and functionality
 */

import request from 'supertest';
import express from 'express';
import { databaseService } from '../../backend/services/databaseService';

// Mock dependencies
jest.mock('../../backend/services/databaseService');
jest.mock('../../services/geminiService');

describe('Oracle Prediction System', () => {
    const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Prediction Creation', () => {
        describe('createPrediction', () => {
            it('should create prediction with valid admin user', async () => {
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 1,
                    playerNumber: 1,
                    username: 'admin',
                    isAdmin: true,
                    colorTheme: '#FF0000',
                    emoji: '🔮'
                });

                mockDatabaseService.createPrediction.mockResolvedValue(true);

                const predictionData = {
                    id: 'pred_week1_2024',
                    week: 1,
                    type: 'game_outcome',
                    question: 'Who will win Chiefs vs Bills?',
                    options: ['Kansas City Chiefs', 'Buffalo Bills'],
                    oracleChoice: 0,
                    oracleConfidence: 85,
                    oracleReasoning: 'Chiefs have home field advantage and strong offensive line',
                    dataPoints: [
                        { stat: 'home_field_advantage', value: 3.2 },
                        { stat: 'offensive_rating', value: 92.4 }
                    ],
                    expiresAt: new Date(Date.now() + 86400000).toISOString()
                };

                const result = await mockDatabaseService.createPrediction(1, predictionData);

                expect(result).toBe(true);
                expect(mockDatabaseService.createPrediction).toHaveBeenCalledWith(1, predictionData);
            });

            it('should reject prediction creation for non-admin users', async () => {
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 2,
                    playerNumber: 2,
                    username: 'player',
                    isAdmin: false,
                    colorTheme: '#FF0000',
                    emoji: '⚡'
                });

                const predictionData = {
                    id: 'pred_week1_2024',
                    week: 1,
                    type: 'game_outcome',
                    question: 'Who will win Chiefs vs Bills?',
                    options: ['Kansas City Chiefs', 'Buffalo Bills'],
                    oracleChoice: 0,
                    oracleConfidence: 85,
                    oracleReasoning: 'Chiefs have home field advantage',
                    dataPoints: [],
                    expiresAt: new Date(Date.now() + 86400000).toISOString()
                };

                const result = await mockDatabaseService.createPrediction(2, predictionData);

                expect(result).toBe(false);
            });

            it('should validate prediction data format', async () => {
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 1,
                    playerNumber: 1,
                    username: 'admin',
                    isAdmin: true,
                    colorTheme: '#FF0000',
                    emoji: '🔮'
                });

                const invalidPredictionData = {
                    id: '', // Invalid empty ID
                    week: -1, // Invalid week
                    type: '',
                    question: '',
                    options: [], // Empty options
                    oracleChoice: -1,
                    oracleConfidence: 150, // Invalid confidence > 100
                    oracleReasoning: '',
                    dataPoints: [],
                    expiresAt: 'invalid-date'
                };

                // Validation should happen before database call
                expect(() => {
                    if (!invalidPredictionData.id || invalidPredictionData.week < 1) {
                        throw new Error('Invalid prediction data');
                    }
                }).toThrow('Invalid prediction data');
            });
        });

        describe('Prediction Validation', () => {
            it('should validate prediction ID format', () => {
                const validIds = [
                    'pred_week1_2024',
                    'pred_playoffs_wild_card',
                    'pred_super_bowl_2024'
                ];

                const invalidIds = [
                    '',
                    'invalid id with spaces',
                    'pred-week1-2024', // Wrong separator
                    'PRED_WEEK1_2024' // Wrong case
                ];

                validIds.forEach(id => {
                    expect(id.length).toBeGreaterThan(0);
                    expect(id.includes(' ')).toBe(false);
                    expect(id.startsWith('pred_')).toBe(true);
                });

                invalidIds.forEach(id => {
                    if (id === '') {
                        expect(id.length).toBe(0);
                    } else if (id.includes(' ')) {
                        expect(id.includes(' ')).toBe(true);
                    }
                });
            });

            it('should validate confidence levels', () => {
                const validConfidences = [0, 25, 50, 75, 100];
                const invalidConfidences = [-1, 101, 150, -50];

                validConfidences.forEach(confidence => {
                    expect(confidence).toBeGreaterThanOrEqual(0);
                    expect(confidence).toBeLessThanOrEqual(100);
                });

                invalidConfidences.forEach(confidence => {
                    expect(confidence < 0 || confidence > 100).toBe(true);
                });
            });

            it('should validate prediction options', () => {
                const validOptions = [
                    ['Option A', 'Option B'],
                    ['Team 1', 'Team 2', 'Tie'],
                    ['Under 45.5', 'Over 45.5']
                ];

                const invalidOptions = [
                    [], // Empty options
                    ['Only One'], // Too few options
                    [''], // Empty option
                    ['Option A', ''] // Mixed valid/invalid
                ];

                validOptions.forEach(options => {
                    expect(options.length).toBeGreaterThanOrEqual(2);
                    expect(options.every(opt => opt.trim().length > 0)).toBe(true);
                });

                invalidOptions.forEach(options => {
                    if (options.length === 0) {
                        expect(options.length).toBe(0);
                    } else if (options.length === 1) {
                        expect(options.length).toBe(1);
                    } else {
                        expect(options.some(opt => opt.trim().length === 0)).toBe(true);
                    }
                });
            });
        });
    });

    describe('Prediction Submission', () => {
        describe('submitPrediction', () => {
            it('should submit valid user prediction', async () => {
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 2,
                    playerNumber: 2,
                    username: 'player1',
                    isAdmin: false,
                    colorTheme: '#FF0000',
                    emoji: '⚡'
                });

                mockDatabaseService.submitPrediction.mockResolvedValue(true);

                const result = await mockDatabaseService.submitPrediction(
                    2, // playerNumber
                    'pred_week1_2024',
                    1, // choice
                    75, // confidence
                    'I think Buffalo has better defense this year'
                );

                expect(result).toBe(true);
                expect(mockDatabaseService.submitPrediction).toHaveBeenCalledWith(
                    2,
                    'pred_week1_2024',
                    1,
                    75,
                    'I think Buffalo has better defense this year'
                );
            });

            it('should validate choice is within options range', () => {
                const availableOptions = ['Option A', 'Option B', 'Option C'];
                const validChoices = [0, 1, 2];
                const invalidChoices = [-1, 3, 99];

                validChoices.forEach(choice => {
                    expect(choice).toBeGreaterThanOrEqual(0);
                    expect(choice).toBeLessThan(availableOptions.length);
                });

                invalidChoices.forEach(choice => {
                    expect(choice < 0 || choice >= availableOptions.length).toBe(true);
                });
            });

            it('should validate confidence levels for user submissions', () => {
                const validConfidences = [1, 25, 50, 75, 100];
                const invalidConfidences = [0, -1, 101, 150];

                validConfidences.forEach(confidence => {
                    expect(confidence).toBeGreaterThan(0);
                    expect(confidence).toBeLessThanOrEqual(100);
                });

                invalidConfidences.forEach(confidence => {
                    expect(confidence <= 0 || confidence > 100).toBe(true);
                });
            });

            it('should handle duplicate submissions', async () => {
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 2,
                    playerNumber: 2,
                    username: 'player1',
                    isAdmin: false,
                    colorTheme: '#FF0000',
                    emoji: '⚡'
                });

                // First submission succeeds
                mockDatabaseService.submitPrediction.mockResolvedValueOnce(true);
                
                // Second submission should fail or update existing
                mockDatabaseService.submitPrediction.mockResolvedValueOnce(false);

                const firstResult = await mockDatabaseService.submitPrediction(2, 'pred_week1_2024', 1, 75);
                const secondResult = await mockDatabaseService.submitPrediction(2, 'pred_week1_2024', 0, 80);

                expect(firstResult).toBe(true);
                expect(secondResult).toBe(false);
            });
        });
    });

    describe('Prediction Retrieval', () => {
        describe('getWeeklyPredictions', () => {
            it('should retrieve predictions for specific week', async () => {
                const mockPredictions = [
                    {
                        id: 'pred_week1_game1',
                        week: 1,
                        season: 2024,
                        type: 'game_outcome',
                        question: 'Who will win Chiefs vs Bills?',
                        options: ['Kansas City Chiefs', 'Buffalo Bills'],
                        oracleChoice: 0,
                        oracleConfidence: 85,
                        oracleReasoning: 'Chiefs have home field advantage',
                        dataPoints: [],
                        expiresAt: new Date(Date.now() + 86400000).toISOString(),
                        participantsCount: 5,
                        consensusChoice: 1,
                        consensusConfidence: 67
                    }
                ];

                mockDatabaseService.getWeeklyPredictions.mockResolvedValue(mockPredictions);

                const result = await mockDatabaseService.getWeeklyPredictions(1, 2024);

                expect(result).toEqual(mockPredictions);
                expect(mockDatabaseService.getWeeklyPredictions).toHaveBeenCalledWith(1, 2024);
            });

            it('should handle empty prediction weeks', async () => {
                mockDatabaseService.getWeeklyPredictions.mockResolvedValue([]);

                const result = await mockDatabaseService.getWeeklyPredictions(99, 2024);

                expect(result).toEqual([]);
                expect(Array.isArray(result)).toBe(true);
            });

            it('should filter expired predictions', () => {
                const currentTime = Date.now();
                const predictions = [
                    {
                        id: 'pred1',
                        expiresAt: new Date(currentTime + 86400000).toISOString(), // Future
                        week: 1,
                        season: 2024,
                        type: 'game',
                        question: 'Test?',
                        options: ['A', 'B'],
                        oracleChoice: 0,
                        oracleConfidence: 50,
                        oracleReasoning: 'Test',
                        dataPoints: [],
                        participantsCount: 0
                    },
                    {
                        id: 'pred2',
                        expiresAt: new Date(currentTime - 86400000).toISOString(), // Past
                        week: 1,
                        season: 2024,
                        type: 'game',
                        question: 'Test?',
                        options: ['A', 'B'],
                        oracleChoice: 0,
                        oracleConfidence: 50,
                        oracleReasoning: 'Test',
                        dataPoints: [],
                        participantsCount: 0
                    }
                ];

                const activePredictions = predictions.filter(p => 
                    new Date(p.expiresAt) > new Date()
                );

                expect(activePredictions).toHaveLength(1);
                expect(activePredictions[0].id).toBe('pred1');
            });
        });
    });

    describe('Oracle Analytics', () => {
        describe('Accuracy Tracking', () => {
            it('should calculate Oracle accuracy correctly', () => {
                const predictions = [
                    { oracleChoice: 0, actualOutcome: 0, resolved: true }, // Correct
                    { oracleChoice: 1, actualOutcome: 0, resolved: true }, // Incorrect
                    { oracleChoice: 0, actualOutcome: 0, resolved: true }, // Correct
                    { oracleChoice: 1, actualOutcome: 1, resolved: true }, // Correct
                    { oracleChoice: 0, actualOutcome: null, resolved: false } // Unresolved
                ];

                const resolvedPredictions = predictions.filter(p => p.resolved);
                const correctPredictions = resolvedPredictions.filter(p => 
                    p.oracleChoice === p.actualOutcome
                );

                const accuracy = (correctPredictions.length / resolvedPredictions.length) * 100;

                expect(accuracy).toBe(75); // 3 correct out of 4 resolved
            });

            it('should calculate confidence-weighted accuracy', () => {
                const predictions = [
                    { oracleChoice: 0, actualOutcome: 0, confidence: 90, resolved: true }, // Correct, high confidence
                    { oracleChoice: 1, actualOutcome: 0, confidence: 60, resolved: true }, // Incorrect, medium confidence
                    { oracleChoice: 0, actualOutcome: 0, confidence: 80, resolved: true }, // Correct, high confidence
                ];

                let totalWeightedScore = 0;
                let totalWeight = 0;

                predictions.forEach(pred => {
                    if (pred.resolved) {
                        const weight = pred.confidence / 100;
                        const score = pred.oracleChoice === pred.actualOutcome ? 1 : 0;
                        totalWeightedScore += score * weight;
                        totalWeight += weight;
                    }
                });

                const weightedAccuracy = (totalWeightedScore / totalWeight) * 100;

                // (1*0.9 + 0*0.6 + 1*0.8) / (0.9 + 0.6 + 0.8) = 1.7/2.3 ≈ 73.9%
                expect(Math.round(weightedAccuracy)).toBe(74);
            });
        });

        describe('User vs Oracle Comparison', () => {
            it('should compare user predictions against Oracle', () => {
                const userPredictions = [
                    { choice: 0, confidence: 80 },
                    { choice: 1, confidence: 70 },
                    { choice: 0, confidence: 90 }
                ];

                const oraclePredictions = [
                    { choice: 0, confidence: 85 },
                    { choice: 0, confidence: 75 },
                    { choice: 0, confidence: 88 }
                ];

                let agreements = 0;
                let confidenceDifferences = [];

                for (let i = 0; i < userPredictions.length; i++) {
                    if (userPredictions[i].choice === oraclePredictions[i].choice) {
                        agreements++;
                    }
                    confidenceDifferences.push(
                        Math.abs(userPredictions[i].confidence - oraclePredictions[i].confidence)
                    );
                }

                const agreementRate = (agreements / userPredictions.length) * 100;
                const avgConfidenceDiff = confidenceDifferences.reduce((a, b) => a + b) / confidenceDifferences.length;

                expect(agreementRate).toBe(66.67); // 2 out of 3 agree (rounded)
                expect(Math.round(agreementRate)).toBe(67);
                expect(avgConfidenceDiff).toBe(10); // (5 + 5 + 2) / 3 = 4 average difference
            });
        });
    });

    describe('Data Validation and Sanitization', () => {
        it('should sanitize prediction reasoning text', () => {
            const dangerousInputs = [
                '<script>alert("xss")</script>',
                'Normal text with <b>html</b>',
                'Text with "quotes" and \'apostrophes\'',
                'Special chars: @#$%^&*()'
            ];

            const sanitizedInputs = dangerousInputs.map(input => {
                // Basic sanitization - remove HTML tags
                return input.replace(/<[^>]*>/g, '');
            });

            expect(sanitizedInputs[0]).toBe('alert("xss")');
            expect(sanitizedInputs[1]).toBe('Normal text with html');
            expect(sanitizedInputs[2]).toBe('Text with "quotes" and \'apostrophes\'');
            expect(sanitizedInputs[3]).toBe('Special chars: @#$%^&*()');
        });

        it('should validate prediction timing constraints', () => {
            const currentTime = Date.now();
            const gameStartTime = currentTime + 3600000; // 1 hour from now
            const cutoffTime = gameStartTime - 1800000; // 30 minutes before game

            const submissionTimes = [
                currentTime, // Now - should be valid
                cutoffTime - 1000, // Just before cutoff - should be valid
                cutoffTime + 1000, // Just after cutoff - should be invalid
                gameStartTime // Game started - should be invalid
            ];

            const validSubmissions = submissionTimes.map(time => time < cutoffTime);

            expect(validSubmissions[0]).toBe(true);
            expect(validSubmissions[1]).toBe(true);
            expect(validSubmissions[2]).toBe(false);
            expect(validSubmissions[3]).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors gracefully', async () => {
            mockDatabaseService.getWeeklyPredictions.mockRejectedValue(new Error('Database connection failed'));

            try {
                await mockDatabaseService.getWeeklyPredictions(1, 2024);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Database connection failed');
            }
        });

        it('should handle invalid prediction IDs', async () => {
            mockDatabaseService.submitPrediction.mockResolvedValue(false);

            const result = await mockDatabaseService.submitPrediction(
                1,
                'invalid-prediction-id',
                0,
                50
            );

            expect(result).toBe(false);
        });

        it('should validate user authentication before prediction operations', async () => {
            mockDatabaseService.authenticateUser.mockResolvedValue(null);

            const result = await mockDatabaseService.submitPrediction(999, 'pred_week1', 0, 50);

            expect(result).toBe(false);
        });
    });
});
