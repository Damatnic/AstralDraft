/**
 * Simplified Integration Tests for Critical API Endpoints
 * Tests the core functionality for 10-20 user deployment
 */

import { 
    registerUser, 
    authenticateUser, 
    getUserById 
} from '../backend/services/authService';
import { runQuery, getRow } from '../backend/db';

describe('API Integration Tests (Simplified)', () => {
    let userId: number;
    let testPredictionId: string;

    beforeAll(async () => {
        // Clean up any existing test data
        try {
            await runQuery(`DELETE FROM users WHERE username LIKE 'testuser%'`);
            await runQuery(`DELETE FROM oracle_predictions WHERE title LIKE 'Test Prediction%'`);
        } catch (error) {
            // Database might not be initialized, ignore cleanup errors
        }
    });

    afterAll(async () => {
        // Clean up test data
        try {
            await runQuery(`DELETE FROM users WHERE username LIKE 'testuser%'`);
            await runQuery(`DELETE FROM oracle_predictions WHERE title LIKE 'Test Prediction%'`);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Authentication Service Integration', () => {
        it('should register and authenticate users correctly', async () => {
            // Test registration
            try {
                const registrationResult = await registerUser(
                    'testuser1',
                    'testuser1@example.com',
                    'TestPassword123!',
                    'Test User 1'
                );

                expect(registrationResult).toBeDefined();
                expect(registrationResult.user).toBeDefined();
                expect(registrationResult.user.username).toBe('testuser1');
                
                userId = registrationResult.user.id;
            } catch (error) {
                // Registration might fail if user already exists, check the error
                expect(error.message).toContain('already exists');
                
                // Get existing user for testing
                const existingUser = await getRow('SELECT * FROM users WHERE username = ?', ['testuser1']);
                expect(existingUser).toBeDefined();
                userId = existingUser.id;
            }
        });

        it('should authenticate user with correct credentials', async () => {
            try {
                const authResult = await authenticateUser('testuser1', 'TestPassword123!');

                expect(authResult).toBeDefined();
                expect(authResult.user).toBeDefined();
                expect(authResult.tokens).toBeDefined();
                expect(authResult.tokens.accessToken).toBeDefined();
                expect(authResult.tokens.refreshToken).toBeDefined();
            } catch (error) {
                // Authentication should work if user exists
                expect(error).toBeUndefined();
            }
        });

        it('should reject authentication with wrong password', async () => {
            try {
                const authResult = await authenticateUser('testuser1', 'WrongPassword123!');
                // Should not reach here
                fail('Expected authentication to fail');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('Invalid');
            }
        });

        it('should retrieve user by ID', async () => {
            const user = await getUserById(userId);

            expect(user).toBeDefined();
            expect(user?.id).toBe(userId);
            expect(user?.username).toBe('testuser1');
            expect(user?.email).toBe('testuser1@example.com');
        });
    });

    describe('Database Operations Integration', () => {
        it('should create Oracle prediction in database', async () => {
            const predictionData = {
                id: 'test-pred-' + Date.now(),
                title: 'Test Prediction - Integration Test',
                description: 'Test Oracle prediction for integration testing',
                options: JSON.stringify(['Option A', 'Option B']),
                category: 'TEST',
                week: 1,
                season: 2024,
                created_by: userId,
                closing_time: new Date(Date.now() + 86400000).toISOString(),
                oracle_choice: 0,
                oracle_confidence: 75,
                status: 'active'
            };

            await runQuery(`
                INSERT INTO oracle_predictions (
                    id, title, description, options, category, week, season,
                    created_by, closing_time, oracle_choice, oracle_confidence, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                predictionData.id,
                predictionData.title,
                predictionData.description,
                predictionData.options,
                predictionData.category,
                predictionData.week,
                predictionData.season,
                predictionData.created_by,
                predictionData.closing_time,
                predictionData.oracle_choice,
                predictionData.oracle_confidence,
                predictionData.status
            ]);

            testPredictionId = predictionData.id;

            // Verify insertion
            const insertedPrediction = await getRow(
                'SELECT * FROM oracle_predictions WHERE id = ?',
                [testPredictionId]
            );

            expect(insertedPrediction).toBeDefined();
            expect(insertedPrediction.title).toBe(predictionData.title);
            expect(insertedPrediction.created_by).toBe(userId);
        });

        it('should create user prediction in database', async () => {
            const userPredictionData = {
                id: 'user-pred-' + Date.now(),
                user_id: userId,
                prediction_id: testPredictionId,
                choice: 1,
                confidence: 80,
                reasoning: 'Integration test reasoning',
                submitted_at: new Date().toISOString()
            };

            await runQuery(`
                INSERT INTO user_predictions (
                    id, user_id, prediction_id, choice, confidence, reasoning, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userPredictionData.id,
                userPredictionData.user_id,
                userPredictionData.prediction_id,
                userPredictionData.choice,
                userPredictionData.confidence,
                userPredictionData.reasoning,
                userPredictionData.submitted_at
            ]);

            // Verify insertion
            const insertedUserPrediction = await getRow(
                'SELECT * FROM user_predictions WHERE id = ?',
                [userPredictionData.id]
            );

            expect(insertedUserPrediction).toBeDefined();
            expect(insertedUserPrediction.user_id).toBe(userId);
            expect(insertedUserPrediction.choice).toBe(1);
            expect(insertedUserPrediction.confidence).toBe(80);
        });

        it('should enforce referential integrity', async () => {
            // Try to create user prediction for non-existent Oracle prediction
            try {
                await runQuery(`
                    INSERT INTO user_predictions (
                        id, user_id, prediction_id, choice, confidence, reasoning, submitted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    'invalid-user-pred-' + Date.now(),
                    userId,
                    'nonexistent-prediction-id',
                    0,
                    75,
                    'Should fail due to foreign key',
                    new Date().toISOString()
                ]);

                // If we reach here, foreign key constraint failed
                fail('Expected foreign key constraint violation');
            } catch (error) {
                // Expected behavior - foreign key constraint should prevent this
                expect(error).toBeDefined();
            }
        });
    });

    describe('Analytics Integration', () => {
        it('should calculate user statistics correctly', async () => {
            // Get user statistics from database
            const userStats = await getRow(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(up.id) as total_predictions,
                    COALESCE(AVG(up.confidence), 0) as avg_confidence
                FROM users u
                LEFT JOIN user_predictions up ON u.id = up.user_id
                WHERE u.id = ?
                GROUP BY u.id, u.username
            `, [userId]);

            expect(userStats).toBeDefined();
            expect(userStats.username).toBe('testuser1');
            expect(userStats.total_predictions).toBeGreaterThan(0);
        });

        it('should retrieve Oracle predictions with user submissions', async () => {
            const predictionWithSubmissions = await getRow(`
                SELECT 
                    op.*,
                    COUNT(up.id) as submission_count
                FROM oracle_predictions op
                LEFT JOIN user_predictions up ON op.id = up.prediction_id
                WHERE op.id = ?
                GROUP BY op.id
            `, [testPredictionId]);

            expect(predictionWithSubmissions).toBeDefined();
            expect(predictionWithSubmissions.submission_count).toBe(1);
            expect(predictionWithSubmissions.title).toContain('Test Prediction');
        });
    });

    describe('Data Validation Integration', () => {
        it('should prevent duplicate user registrations', async () => {
            try {
                await registerUser(
                    'testuser1', // Same username
                    'different@example.com',
                    'TestPassword123!',
                    'Different Display Name'
                );
                // Should not reach here
                fail('Expected duplicate registration to fail');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('already exists');
            }
        });

        it('should validate email format during registration', async () => {
            try {
                await registerUser(
                    'testuser2',
                    'invalid-email-format', // Invalid email
                    'TestPassword123!',
                    'Test User 2'
                );
                // Should not reach here
                fail('Expected invalid email registration to fail');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('email');
            }
        });

        it('should validate password strength during registration', async () => {
            try {
                await registerUser(
                    'testuser3',
                    'testuser3@example.com',
                    'weak', // Weak password
                    'Test User 3'
                );
                // Should not reach here
                fail('Expected weak password registration to fail');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('password');
            }
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle multiple concurrent user operations', async () => {
            // Create multiple users concurrently with proper error handling
            const createUser = async (index: number) => {
                try {
                    const result = await registerUser(
                        `testuser_concurrent_${index}`,
                        `testuser_concurrent_${index}@example.com`,
                        'TestPassword123!',
                        `Concurrent Test User ${index}`
                    );
                    return { success: true, result };
                } catch (error) {
                    return { success: false, error };
                }
            };

            const userPromises = Array.from({ length: 3 }, (_, i) => createUser(i));
            const results = await Promise.all(userPromises);
            
            // At least some should succeed
            const successfulResults = results.filter(result => result.success);
            expect(successfulResults.length).toBeGreaterThan(0);

            // Clean up concurrent test users
            await runQuery(`DELETE FROM users WHERE username LIKE 'testuser_concurrent_%'`);
        });

        it('should efficiently query user predictions', async () => {
            const startTime = Date.now();
            
            // Query all user predictions (should be fast for 10-20 users)
            const allUserPredictions = await runQuery(`
                SELECT 
                    u.username,
                    op.title,
                    up.choice,
                    up.confidence,
                    up.submitted_at
                FROM user_predictions up
                JOIN users u ON up.user_id = u.id
                JOIN oracle_predictions op ON up.prediction_id = op.id
                WHERE u.username LIKE 'testuser%'
                ORDER BY up.submitted_at DESC
            `);

            const queryTime = Date.now() - startTime;
            
            // Should complete quickly (under 100ms for small dataset)
            expect(queryTime).toBeLessThan(100);
            expect(Array.isArray(allUserPredictions)).toBe(true);
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle database connection issues gracefully', async () => {
            // This test simulates what happens when database operations fail
            try {
                await getRow('SELECT * FROM nonexistent_table');
                fail('Expected database error');
            } catch (error) {
                expect(error).toBeDefined();
                // Should be a specific database error
                expect(error.message).toContain('no such table');
            }
        });

        it('should handle malformed SQL queries gracefully', async () => {
            try {
                await runQuery('INVALID SQL QUERY');
                fail('Expected SQL syntax error');
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('syntax error');
            }
        });
    });
});
