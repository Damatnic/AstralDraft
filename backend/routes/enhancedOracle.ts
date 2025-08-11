/**
 * Enhanced Oracle Predictions API Routes
 * Integrates with enhanced database schema and provides real-time functionality
 */

import express from 'express';
import { databaseService, DatabaseAuthUser } from '../services/databaseService';
import { getActivePredictions, createOraclePrediction, submitUserPrediction } from '../db/enhanced-schema';
import { runQuery, getRow, getRows } from '../db/index';

const router = express.Router();

// Custom request interface for our Oracle API
interface OracleRequest extends express.Request {
    oracleUser?: DatabaseAuthUser;
}

// Enhanced Oracle API interfaces
export interface CreateOraclePredictionRequest {
    id: string;
    week: number;
    season?: number;
    type: string;
    category?: string;
    question: string;
    description?: string;
    options: string[];
    oracleChoice: number;
    oracleConfidence: number;
    oracleReasoning: string;
    dataPoints: any[];
    difficultyLevel?: number;
    pointsMultiplier?: number;
    expiresAt: string;
    tags?: string[];
    metadata?: any;
}

export interface SubmitPredictionRequest {
    predictionId: string;
    playerNumber: number;
    choice: number;
    confidence: number;
    reasoning?: string;
}

export interface PredictionResponse {
    id: string;
    week: number;
    season: number;
    type: string;
    question: string;
    options: string[];
    oracleChoice: number;
    oracleConfidence: number;
    oracleReasoning: string;
    dataPoints: any[];
    expiresAt: string;
    participantsCount: number;
    consensusChoice?: number;
    consensusConfidence?: number;
    userSubmission?: {
        choice: number;
        confidence: number;
        reasoning?: string;
        submittedAt: string;
    };
}

/**
 * Simple authentication middleware for Oracle API
 */
async function authenticatePlayer(req: OracleRequest, res: express.Response, next: express.NextFunction) {
    const playerNumber = req.headers['x-player-number'];
    const pin = req.headers['x-player-pin'];

    console.log('🔐 Authentication attempt - Player:', playerNumber, 'PIN provided:', !!pin);

    if (!playerNumber || !pin) {
        console.log('❌ Missing authentication headers');
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'Player number and PIN must be provided'
        });
    }

    try {
        console.log('🔍 Authenticating player number:', Number(playerNumber));
        const user = await databaseService.authenticateUser(Number(playerNumber), pin as string);
        if (!user) {
            console.log('❌ Authentication failed for player:', playerNumber);
            return res.status(401).json({
                success: false,
                error: 'Authentication failed',
                message: 'Invalid player number or PIN'
            });
        }

        console.log('✅ Authentication successful for user:', user.username, 'isAdmin:', user.isAdmin);
        req.oracleUser = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication service error'
        });
    }
}

/**
 * GET /api/oracle/predictions/week/:week
 * Get active predictions for a specific week
 */
router.get('/predictions/week/:week', async (req, res) => {
    try {
        const week = Number(req.params.week);
        const season = Number(req.query.season) || 2024;
        const playerNumber = req.headers['x-player-number'];

        if (!week || week < 1 || week > 18) {
            return res.status(400).json({
                success: false,
                error: 'Invalid week parameter'
            });
        }

        const predictions = await databaseService.getWeeklyPredictions(week, season);
        
        // If player is authenticated, include their submissions
        let enhancedPredictions = predictions;
        if (playerNumber) {
            enhancedPredictions = await Promise.all(predictions.map(async (prediction) => {
                try {
                    const userSubmission = await getRow(`
                        SELECT user_choice, user_confidence, reasoning, submitted_at
                        FROM enhanced_user_predictions eup
                        JOIN simple_auth_users sau ON eup.user_id = sau.id
                        WHERE sau.player_number = ? AND eup.prediction_id = ?
                    `, [Number(playerNumber), prediction.id]);

                    return {
                        ...prediction,
                        userSubmission: userSubmission ? {
                            choice: userSubmission.user_choice,
                            confidence: userSubmission.user_confidence,
                            reasoning: userSubmission.reasoning,
                            submittedAt: userSubmission.submitted_at
                        } : undefined
                    };
                } catch (error) {
                    console.error('Error fetching user submission:', error);
                    return prediction;
                }
            }));
        }

        res.json({
            success: true,
            data: enhancedPredictions,
            week,
            season,
            count: enhancedPredictions.length
        });

    } catch (error) {
        console.error('Error fetching weekly predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch predictions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/predictions/:id
 * Get detailed information about a specific prediction
 */
router.get('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const playerNumber = req.headers['x-player-number'];

        // Get prediction details
        const prediction = await getRow(`
            SELECT * FROM enhanced_oracle_predictions WHERE id = ?
        `, [id]);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found'
            });
        }

        // Parse JSON fields
        const formattedPrediction = {
            ...prediction,
            options: JSON.parse(prediction.options),
            data_points: JSON.parse(prediction.data_points),
            tags: JSON.parse(prediction.tags || '[]'),
            metadata: JSON.parse(prediction.metadata || '{}')
        };

        // Get user submission if player is authenticated
        let userSubmission = null;
        if (playerNumber) {
            const submission = await getRow(`
                SELECT eup.*, sau.username
                FROM enhanced_user_predictions eup
                JOIN simple_auth_users sau ON eup.user_id = sau.id
                WHERE sau.player_number = ? AND eup.prediction_id = ?
            `, [Number(playerNumber), id]);

            if (submission) {
                userSubmission = {
                    choice: submission.user_choice,
                    confidence: submission.user_confidence,
                    reasoning: submission.reasoning,
                    pointsEarned: submission.points_earned,
                    submittedAt: submission.submitted_at
                };
            }
        }

        // Get submission statistics
        const stats = await getRow(`
            SELECT 
                COUNT(*) as total_submissions,
                AVG(user_confidence) as avg_confidence,
                COUNT(DISTINCT user_id) as unique_users
            FROM enhanced_user_predictions
            WHERE prediction_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...formattedPrediction,
                userSubmission,
                statistics: {
                    totalSubmissions: stats.total_submissions,
                    averageConfidence: Math.round(stats.avg_confidence || 0),
                    uniqueUsers: stats.unique_users
                }
            }
        });

    } catch (error) {
        console.error('Error fetching prediction details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch prediction details',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/:id/submit
 * Submit a user prediction
 */
router.post('/predictions/:id/submit', authenticatePlayer, async (req: OracleRequest, res) => {
    try {
        const { id: predictionId } = req.params;
        const { choice, confidence, reasoning }: {
            choice: number;
            confidence: number;
            reasoning?: string;
        } = req.body;
        
        const user = req.oracleUser!;

        // Validate input
        if (typeof choice !== 'number' || typeof confidence !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                message: 'Choice and confidence must be numbers'
            });
        }

        if (confidence < 0 || confidence > 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid confidence',
                message: 'Confidence must be between 0 and 100'
            });
        }

        // Check if prediction exists and is still active
        const prediction = await getRow(`
            SELECT * FROM enhanced_oracle_predictions 
            WHERE id = ? AND is_resolved = 0 AND expires_at > datetime('now')
        `, [predictionId]);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found or expired'
            });
        }

        // Validate choice against available options
        const options = JSON.parse(prediction.options);
        if (choice < 0 || choice >= options.length) {
            return res.status(400).json({
                success: false,
                error: 'Invalid choice',
                message: `Choice must be between 0 and ${options.length - 1}`
            });
        }

        // Submit prediction using database service
        const success = await databaseService.submitPrediction(
            user.playerNumber,
            predictionId,
            choice,
            confidence,
            reasoning
        );

        if (!success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to submit prediction'
            });
        }

        // Get updated prediction stats
        const updatedPrediction = await getRow(`
            SELECT participants_count, total_submissions
            FROM enhanced_oracle_predictions
            WHERE id = ?
        `, [predictionId]);

        // Broadcast real-time update (we'll implement WebSocket broadcasting later)
        // broadcastPredictionUpdate(predictionId, 'USER_SUBMISSION', { userId: user.id, choice, confidence });

        res.json({
            success: true,
            message: 'Prediction submitted successfully',
            data: {
                predictionId,
                choice,
                confidence,
                reasoning,
                submittedAt: new Date().toISOString(),
                participantsCount: updatedPrediction.participants_count,
                totalSubmissions: updatedPrediction.total_submissions
            }
        });

    } catch (error) {
        console.error('Error submitting prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions
 * Create a new Oracle prediction (Admin only)
 */
router.post('/predictions', authenticatePlayer, async (req: OracleRequest, res) => {
    try {
        const user = req.oracleUser!;
        
        console.log('🔍 Create prediction request from user:', user.username, 'isAdmin:', user.isAdmin);
        
        if (!user.isAdmin) {
            console.log('❌ Access denied: User is not admin');
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const predictionData: CreateOraclePredictionRequest = req.body;
        console.log('📝 Prediction data received:', JSON.stringify(predictionData, null, 2));

        // Validate required fields
        const requiredFields = [
            { key: 'id', value: predictionData.id },
            { key: 'week', value: predictionData.week },
            { key: 'type', value: predictionData.type },
            { key: 'question', value: predictionData.question },
            { key: 'options', value: predictionData.options },
            { key: 'oracleChoice', value: predictionData.oracleChoice },
            { key: 'oracleConfidence', value: predictionData.oracleConfidence },
            { key: 'oracleReasoning', value: predictionData.oracleReasoning },
            { key: 'dataPoints', value: predictionData.dataPoints },
            { key: 'expiresAt', value: predictionData.expiresAt }
        ];
        
        for (const field of requiredFields) {
            if (field.value === undefined || field.value === null) {
                console.log(`❌ Missing required field: ${field.key}, value:`, field.value);
                return res.status(400).json({
                    success: false,
                    error: `Missing required field: ${field.key}`
                });
            }
        }

        console.log('✅ All required fields present, creating prediction...');

        // Create prediction using database service
        const success = await databaseService.createPrediction(user.playerNumber, predictionData);

        if (!success) {
            console.log('❌ Database service failed to create prediction');
            return res.status(500).json({
                success: false,
                error: 'Failed to create prediction'
            });
        }

        console.log('✅ Prediction created successfully');

        res.status(201).json({
            success: true,
            message: 'Oracle prediction created successfully',
            data: {
                id: predictionData.id,
                week: predictionData.week,
                question: predictionData.question
            }
        });

    } catch (error) {
        console.error('Error creating Oracle prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/user/:playerNumber/stats
 * Get user prediction statistics
 */
router.get('/user/:playerNumber/stats', async (req, res) => {
    try {
        const playerNumber = Number(req.params.playerNumber);
        const season = Number(req.query.season) || 2024;
        const week = req.query.week ? Number(req.query.week) : null;

        // Get user statistics
        let sql = `
            SELECT 
                total_predictions,
                correct_predictions,
                accuracy_percentage,
                total_points,
                current_streak,
                best_streak,
                oracle_beats,
                average_confidence
            FROM user_statistics us
            JOIN simple_auth_users sau ON us.user_id = sau.id
            WHERE sau.player_number = ? AND us.season = ?
        `;
        const params = [playerNumber, season];

        if (week) {
            sql += ' AND us.week = ?';
            params.push(week);
        } else {
            sql += ' ORDER BY us.week DESC LIMIT 1';
        }

        const stats = await getRow(sql, params);

        if (!stats) {
            return res.json({
                success: true,
                data: {
                    totalPredictions: 0,
                    correctPredictions: 0,
                    accuracy: 0,
                    totalPoints: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    oracleBeats: 0,
                    averageConfidence: 0
                }
            });
        }

        res.json({
            success: true,
            data: {
                totalPredictions: stats.total_predictions,
                correctPredictions: stats.correct_predictions,
                accuracy: Math.round(stats.accuracy_percentage * 100) / 100,
                totalPoints: stats.total_points,
                currentStreak: stats.current_streak,
                bestStreak: stats.best_streak,
                oracleBeats: stats.oracle_beats,
                averageConfidence: Math.round(stats.average_confidence * 100) / 100
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/leaderboard
 * Get current leaderboard rankings
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const season = Number(req.query.season) || 2024;
        const week = req.query.week ? Number(req.query.week) : null;
        const limit = Math.min(Number(req.query.limit) || 10, 50);

        let sql = `
            SELECT 
                sau.player_number,
                sau.username,
                sau.emoji,
                sau.color_theme,
                lr.rank_overall,
                lr.rank_weekly,
                lr.points_total,
                lr.points_weekly,
                lr.accuracy_overall,
                lr.accuracy_weekly,
                lr.streak_current
            FROM leaderboard_rankings lr
            JOIN simple_auth_users sau ON lr.user_id = sau.id
            WHERE lr.season = ?
        `;
        const params = [season];

        if (week) {
            sql += ' AND lr.week = ? ORDER BY lr.rank_weekly ASC';
            params.push(week);
        } else {
            sql += ' ORDER BY lr.rank_overall ASC';
        }

        sql += ' LIMIT ?';
        params.push(limit);

        const rankings = await getRows(sql, params);

        res.json({
            success: true,
            data: rankings.map(r => ({
                playerNumber: r.player_number,
                username: r.username,
                emoji: r.emoji,
                colorTheme: r.color_theme,
                rank: week ? r.rank_weekly : r.rank_overall,
                points: week ? r.points_weekly : r.points_total,
                accuracy: week ? r.accuracy_weekly : r.accuracy_overall,
                currentStreak: r.streak_current
            })),
            season,
            week: week || 'overall',
            limit
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/analytics/performance/:playerNumber
 * Get detailed performance analytics for a specific user
 */
router.get('/analytics/performance/:playerNumber', async (req, res) => {
    try {
        const playerNumber = Number(req.params.playerNumber);
        const season = Number(req.query.season) || 2024;
        const weeks = Number(req.query.weeks) || 10; // Last N weeks

        // Get user's prediction history with details
        const predictionHistory = await getRows(`
            SELECT 
                eop.id,
                eop.week,
                eop.question,
                eop.type,
                eop.oracle_choice,
                eop.oracle_confidence,
                eup.user_choice,
                eup.user_confidence,
                eup.points_earned,
                eup.submitted_at,
                eop.is_resolved,
                eop.actual_result,
                CASE 
                    WHEN eop.is_resolved = 1 AND eup.user_choice = eop.actual_result THEN 1 
                    ELSE 0 
                END as is_correct
            FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE sau.player_number = ? AND eop.season = ?
            ORDER BY eop.week DESC, eup.submitted_at DESC
            LIMIT ?
        `, [playerNumber, season, weeks * 5]); // Assume max 5 predictions per week

        // Calculate weekly performance trends
        const weeklyStats = await getRows(`
            SELECT 
                us.week,
                us.total_predictions,
                us.correct_predictions,
                us.accuracy_percentage,
                us.total_points,
                us.current_streak,
                us.oracle_beats
            FROM user_statistics us
            JOIN simple_auth_users sau ON us.user_id = sau.id
            WHERE sau.player_number = ? AND us.season = ?
            ORDER BY us.week DESC
            LIMIT ?
        `, [playerNumber, season, weeks]);

        // Get prediction type breakdown
        const typeBreakdown = await getRows(`
            SELECT 
                eop.type,
                COUNT(*) as total_predictions,
                SUM(CASE WHEN eop.is_resolved = 1 AND eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                AVG(eup.user_confidence) as avg_confidence,
                SUM(eup.points_earned) as total_points
            FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE sau.player_number = ? AND eop.season = ?
            GROUP BY eop.type
        `, [playerNumber, season]);

        // Get confidence vs accuracy analysis
        const confidenceAnalysis = await getRows(`
            SELECT 
                CASE 
                    WHEN eup.user_confidence <= 60 THEN 'Low (≤60%)'
                    WHEN eup.user_confidence <= 80 THEN 'Medium (61-80%)'
                    ELSE 'High (>80%)'
                END as confidence_range,
                COUNT(*) as total_predictions,
                SUM(CASE WHEN eop.is_resolved = 1 AND eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                AVG(eup.user_confidence) as avg_confidence
            FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE sau.player_number = ? AND eop.season = ?
            GROUP BY confidence_range
        `, [playerNumber, season]);

        res.json({
            success: true,
            data: {
                predictionHistory: predictionHistory.map(p => ({
                    id: p.id,
                    week: p.week,
                    question: p.question,
                    type: p.type,
                    userChoice: p.user_choice,
                    oracleChoice: p.oracle_choice,
                    userConfidence: p.user_confidence,
                    oracleConfidence: p.oracle_confidence,
                    pointsEarned: p.points_earned || 0,
                    submittedAt: p.submitted_at,
                    isResolved: Boolean(p.is_resolved),
                    actualResult: p.actual_result,
                    isCorrect: Boolean(p.is_correct)
                })),
                weeklyTrends: weeklyStats.map(w => ({
                    week: w.week,
                    totalPredictions: w.total_predictions,
                    correctPredictions: w.correct_predictions,
                    accuracy: w.accuracy_percentage,
                    totalPoints: w.total_points,
                    currentStreak: w.current_streak,
                    oracleBeats: w.oracle_beats
                })),
                typeBreakdown: typeBreakdown.map(t => ({
                    type: t.type,
                    totalPredictions: t.total_predictions,
                    correctPredictions: t.correct_predictions,
                    accuracy: t.total_predictions > 0 ? (t.correct_predictions / t.total_predictions) * 100 : 0,
                    avgConfidence: Math.round(t.avg_confidence || 0),
                    totalPoints: t.total_points || 0
                })),
                confidenceAnalysis: confidenceAnalysis.map(c => ({
                    confidenceRange: c.confidence_range,
                    totalPredictions: c.total_predictions,
                    correctPredictions: c.correct_predictions,
                    accuracy: c.total_predictions > 0 ? (c.correct_predictions / c.total_predictions) * 100 : 0,
                    avgConfidence: Math.round(c.avg_confidence || 0)
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching performance analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/analytics/global
 * Get global analytics and trends across all users
 */
router.get('/analytics/global', async (req, res) => {
    try {
        const season = Number(req.query.season) || 2024;
        const weeks = Number(req.query.weeks) || 10;

        // Overall system stats
        const globalStats = await getRow(`
            SELECT 
                COUNT(DISTINCT sau.id) as total_users,
                COUNT(DISTINCT eop.id) as total_predictions,
                COUNT(DISTINCT eup.id) as total_submissions,
                AVG(eup.user_confidence) as avg_user_confidence,
                AVG(eop.oracle_confidence) as avg_oracle_confidence
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            LEFT JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE eop.season = ?
        `, [season]);

        // Weekly participation trends
        const weeklyParticipation = await getRows(`
            SELECT 
                eop.week,
                COUNT(DISTINCT eop.id) as predictions_created,
                COUNT(DISTINCT eup.id) as total_submissions,
                COUNT(DISTINCT eup.user_id) as active_users,
                AVG(eup.user_confidence) as avg_confidence
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ?
            GROUP BY eop.week
            ORDER BY eop.week DESC
            LIMIT ?
        `, [season, weeks]);

        // Prediction type popularity
        const typePopularity = await getRows(`
            SELECT 
                eop.type,
                COUNT(DISTINCT eop.id) as total_predictions,
                COUNT(DISTINCT eup.id) as total_submissions,
                AVG(eup.user_confidence) as avg_user_confidence,
                COUNT(DISTINCT eup.user_id) as unique_participants
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ?
            GROUP BY eop.type
            ORDER BY total_submissions DESC
        `, [season]);

        // User vs Oracle accuracy comparison
        const accuracyComparison = await getRow(`
            SELECT 
                COUNT(CASE WHEN eop.is_resolved = 1 AND eup.user_choice = eop.actual_result THEN 1 END) as user_correct,
                COUNT(CASE WHEN eop.is_resolved = 1 AND eop.oracle_choice = eop.actual_result THEN 1 END) as oracle_correct,
                COUNT(CASE WHEN eop.is_resolved = 1 THEN 1 END) as total_resolved
            FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eop.season = ?
        `, [season]);

        const userAccuracy = accuracyComparison.total_resolved > 0 ? 
            (accuracyComparison.user_correct / accuracyComparison.total_resolved) * 100 : 0;
        const oracleAccuracy = accuracyComparison.total_resolved > 0 ? 
            (accuracyComparison.oracle_correct / accuracyComparison.total_resolved) * 100 : 0;

        res.json({
            success: true,
            data: {
                globalStats: {
                    totalUsers: globalStats.total_users || 0,
                    totalPredictions: globalStats.total_predictions || 0,
                    totalSubmissions: globalStats.total_submissions || 0,
                    avgUserConfidence: Math.round(globalStats.avg_user_confidence || 0),
                    avgOracleConfidence: Math.round(globalStats.avg_oracle_confidence || 0),
                    userAccuracy: Math.round(userAccuracy * 100) / 100,
                    oracleAccuracy: Math.round(oracleAccuracy * 100) / 100
                },
                weeklyParticipation: weeklyParticipation.map(w => ({
                    week: w.week,
                    predictionsCreated: w.predictions_created || 0,
                    totalSubmissions: w.total_submissions || 0,
                    activeUsers: w.active_users || 0,
                    avgConfidence: Math.round(w.avg_confidence || 0)
                })),
                typePopularity: typePopularity.map(t => ({
                    type: t.type,
                    totalPredictions: t.total_predictions || 0,
                    totalSubmissions: t.total_submissions || 0,
                    avgUserConfidence: Math.round(t.avg_user_confidence || 0),
                    uniqueParticipants: t.unique_participants || 0
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching global analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch global analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
