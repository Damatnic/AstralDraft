/**
 * Oracle Predictions API Routes
 * REST endpoints for Oracle predictions, challenges, and AI-powered analytics
 * Now integrated with production sports data APIs
 */

import express from 'express';
import { runQuery, getRow, getRows } from '../db/index';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth';
import {
    predictionValidation,
    handleValidationErrors
} from '../middleware/security';

// Import production Oracle service
import { productionOraclePredictionService } from '../../services/productionOraclePredictionService';

const router = express.Router();

// Types for Oracle API
interface CreatePredictionRequest {
    week: number;
    type: string;
    question: string;
    options: Array<{
        id: number;
        text: string;
        probability: number;
        supportingData: string[];
    }>;
    oracleChoice: number;
    confidence: number;
    reasoning: string;
    dataPoints: string[];
    season?: number;
}

interface SubmitUserPredictionRequest {
    predictionId: string;
    userChoice: number;
    confidence: number;
    reasoning?: string;
}

interface ResolvePredictionRequest {
    predictionId: string;
    actualResult: number;
}

/**
 * GET /api/oracle/predictions/production
 * Get Oracle predictions using production sports data (real NFL API integration)
 */
router.get('/predictions/production', optionalAuth, async (req, res) => {
    try {
        const { week = 1, season = 2024 } = req.query;
        const weekNum = Number(week);
        const seasonNum = Number(season);
        
        console.log(`🔮 Fetching production Oracle predictions for Week ${weekNum}, ${seasonNum}`);
        
        // Get real predictions from production service
        const predictions = await productionOraclePredictionService.getPredictionsForWeek(
            weekNum, 
            seasonNum
        );
        
        // Get Oracle accuracy stats
        const oracleStats = productionOraclePredictionService.getOracleAccuracy(
            weekNum, 
            seasonNum
        );
        
        // Get leaderboard data
        const leaderboard = productionOraclePredictionService.getWeeklyLeaderboard(
            weekNum, 
            seasonNum
        );
        
        console.log(`✅ Retrieved ${predictions.length} production predictions`);
        
        res.json({
            success: true,
            data: {
                predictions: predictions.map(p => ({
                    id: p.id,
                    week: p.week,
                    season: p.season,
                    type: p.type,
                    question: p.question,
                    options: p.options,
                    oracleChoice: p.oracleChoice,
                    confidence: p.confidence,
                    reasoning: p.reasoning,
                    dataPoints: p.dataPoints,
                    deadline: p.deadline,
                    status: p.status,
                    timestamp: p.timestamp,
                    resolution: p.resolution,
                    gameId: p.gameId,
                    playerId: p.playerId
                })),
                meta: {
                    week: weekNum,
                    season: seasonNum,
                    totalPredictions: predictions.length,
                    openPredictions: predictions.filter(p => p.status === 'open').length,
                    resolvedPredictions: predictions.filter(p => p.status === 'resolved').length,
                    oracleAccuracy: oracleStats.accuracy,
                    oracleConfidenceAccuracy: oracleStats.confidenceAccuracy,
                    leaderboard: leaderboard.slice(0, 10) // Top 10 users
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch production Oracle predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle predictions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/production/:id/submit
 * Submit user prediction using production service (real data integration)
 */
router.post('/predictions/production/:id/submit', 
    authenticateToken,
    async (req, res) => {
        try {
            const { id: predictionId } = req.params;
            const { userChoice, confidence } = req.body as SubmitUserPredictionRequest;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }
            
            console.log(`📝 Submitting production prediction: User ${userId}, Prediction ${predictionId}`);
            
            // Submit to production service
            const result = await productionOraclePredictionService.submitUserPrediction(
                predictionId,
                String(userId),
                userChoice,
                confidence
            );
            
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to submit prediction'
                });
            }
            
            console.log(`✅ Successfully submitted production prediction for user ${userId}`);
            
            res.json({
                success: true,
                data: {
                    predictionId,
                    userChoice,
                    userConfidence: confidence,
                    submittedAt: new Date().toISOString(),
                    prediction: result.prediction
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to submit production prediction:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit prediction',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * POST /api/oracle/predictions/production/generate
 * Generate new Oracle predictions using production sports data
 */
router.post('/predictions/production/generate',
    requireAdmin,
    async (req, res) => {
        try {
            const { week, season = 2024 } = req.body;
            
            if (!week) {
                return res.status(400).json({
                    success: false,
                    error: 'Week parameter is required'
                });
            }
            
            console.log(`🎯 Generating production Oracle predictions for Week ${week}, ${season}`);
            
            // Generate predictions using production service
            const predictions = await productionOraclePredictionService.generateWeeklyPredictions(
                Number(week), 
                Number(season)
            );
            
            console.log(`✅ Generated ${predictions.length} production predictions`);
            
            res.json({
                success: true,
                data: {
                    predictions,
                    meta: {
                        week: Number(week),
                        season: Number(season),
                        generatedAt: new Date().toISOString(),
                        totalGenerated: predictions.length
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to generate production predictions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate predictions',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * POST /api/oracle/predictions/production/resolve
 * Resolve predictions using real game results
 */
router.post('/predictions/production/resolve',
    requireAdmin,
    async (req, res) => {
        try {
            const { week, season = 2024 } = req.body;
            
            if (!week) {
                return res.status(400).json({
                    success: false,
                    error: 'Week parameter is required'
                });
            }
            
            console.log(`🎯 Resolving production Oracle predictions for Week ${week}, ${season}`);
            
            // Resolve predictions using production service
            const resolvedCount = await productionOraclePredictionService.resolvePredictions(
                Number(week), 
                Number(season)
            );
            
            console.log(`✅ Resolved ${resolvedCount} production predictions`);
            
            res.json({
                success: true,
                data: {
                    resolvedCount,
                    week: Number(week),
                    season: Number(season),
                    resolvedAt: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to resolve production predictions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to resolve predictions',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * GET /api/oracle/predictions (legacy route with fallback to production)
 * Get Oracle predictions with optional filtering
 */
router.get('/predictions', optionalAuth, async (req, res) => {
    try {
        const { 
            week, 
            type, 
            season = 2024, 
            resolved, 
            limit = 50, 
            offset = 0 
        } = req.query;

        let sql = `
            SELECT 
                p.*,
                COUNT(up.id) as user_prediction_count,
                AVG(up.confidence) as avg_user_confidence
            FROM oracle_predictions p
            LEFT JOIN user_predictions up ON p.id = up.prediction_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (week) {
            sql += ' AND p.week = ?';
            params.push(Number(week));
        }

        if (type) {
            sql += ' AND p.type = ?';
            params.push(type);
        }

        if (season) {
            sql += ' AND p.season = ?';
            params.push(Number(season));
        }

        if (resolved !== undefined) {
            sql += ' AND p.is_resolved = ?';
            params.push(resolved === 'true' ? 1 : 0);
        }

        sql += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const predictions = await getRows(sql, params);
        
        // Parse JSON fields
        const formattedPredictions = predictions.map(p => ({
            ...p,
            options: JSON.parse(p.options),
            data_points: JSON.parse(p.data_points),
            is_resolved: Boolean(p.is_resolved)
        }));

        res.json({
            success: true,
            data: formattedPredictions,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                total: formattedPredictions.length
            }
        });
    } catch (error) {
        console.error('Error fetching Oracle predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle predictions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/predictions/:id
 * Get a specific Oracle prediction with user interactions
 */
router.get('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get prediction details
        const prediction = await getRow(`
            SELECT * FROM oracle_predictions WHERE id = ?
        `, [id]);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found'
            });
        }

        // Get user predictions for this Oracle prediction
        const userPredictions = await getRows(`
            SELECT 
                up.*,
                u.username,
                u.display_name
            FROM user_predictions up
            LEFT JOIN users u ON up.user_id = u.id
            WHERE up.prediction_id = ?
            ORDER BY up.created_at DESC
        `, [id]);

        // Calculate statistics
        const stats = {
            total_participants: userPredictions.length,
            oracle_accuracy: prediction.is_resolved && prediction.oracle_choice === prediction.actual_result ? 100 : 0,
            user_accuracy: prediction.is_resolved ? 
                (userPredictions.filter(up => up.user_choice === prediction.actual_result).length / userPredictions.length * 100) || 0 : 0,
            average_user_confidence: userPredictions.length > 0 ? 
                userPredictions.reduce((sum, up) => sum + up.confidence, 0) / userPredictions.length : 0,
            choice_distribution: {}
        };

        // Calculate choice distribution
        const choiceGroups = userPredictions.reduce((acc, up) => {
            acc[up.user_choice] = (acc[up.user_choice] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        Object.keys(choiceGroups).forEach(choice => {
            const choiceNum = Number(choice);
            (stats.choice_distribution as any)[choiceNum] = {
                count: choiceGroups[choiceNum],
                percentage: (choiceGroups[choiceNum] / userPredictions.length * 100)
            };
        });

        res.json({
            success: true,
            data: {
                ...prediction,
                options: JSON.parse(prediction.options),
                data_points: JSON.parse(prediction.data_points),
                is_resolved: Boolean(prediction.is_resolved),
                user_predictions: userPredictions,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Error fetching Oracle prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions
 * Create a new Oracle prediction (Admin only)
 */
router.post('/predictions', 
    predictionValidation.create,
    handleValidationErrors,
    requireAdmin, 
    async (req, res) => {
    try {
        const predictionData: CreatePredictionRequest = req.body;

        // Validate required fields
        const required = ['week', 'type', 'question', 'options', 'oracleChoice', 'confidence', 'reasoning', 'dataPoints'];
        for (const field of required) {
            if (!(predictionData as any)[field]) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field',
                    field
                });
            }
        }

        // Generate unique ID
        const predictionId = `${predictionData.type.toLowerCase()}-${predictionData.week}-${Date.now()}`;

        // Insert into database
        await runQuery(`
            INSERT INTO oracle_predictions (
                id, week, type, question, options, oracle_choice, 
                confidence, reasoning, data_points, season
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            predictionId,
            predictionData.week,
            predictionData.type,
            predictionData.question,
            JSON.stringify(predictionData.options),
            predictionData.oracleChoice,
            predictionData.confidence,
            predictionData.reasoning,
            JSON.stringify(predictionData.dataPoints),
            predictionData.season || 2024
        ]);

        // Return created prediction
        const createdPrediction = await getRow(`
            SELECT * FROM oracle_predictions WHERE id = ?
        `, [predictionId]);

        res.status(201).json({
            success: true,
            data: {
                ...createdPrediction,
                options: JSON.parse(createdPrediction.options),
                data_points: JSON.parse(createdPrediction.data_points),
                is_resolved: Boolean(createdPrediction.is_resolved)
            },
            message: 'Oracle prediction created successfully'
        });
    } catch (error) {
        console.error('Error creating Oracle prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Oracle prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/:id/submit
 * Submit a user prediction against an Oracle prediction
 */
router.post('/predictions/:id/submit', 
    predictionValidation.submit,
    handleValidationErrors,
    authenticateToken, 
    async (req, res) => {
    try {
        const { id: predictionId } = req.params;
        const submissionData: SubmitUserPredictionRequest = req.body;

        // Get user ID from authenticated token
        const userId = req.user!.id;

        // Validate Oracle prediction exists and isn't resolved
        const oraclePrediction = await getRow(`
            SELECT * FROM oracle_predictions WHERE id = ? AND is_resolved = 0
        `, [predictionId]);

        if (!oraclePrediction) {
            return res.status(404).json({
                success: false,
                error: 'Oracle prediction not found or already resolved'
            });
        }

        // Check if user already submitted a prediction
        const existingPrediction = await getRow(`
            SELECT * FROM user_predictions WHERE user_id = ? AND prediction_id = ?
        `, [userId, predictionId]);

        if (existingPrediction) {
            return res.status(400).json({
                success: false,
                error: 'User has already submitted a prediction for this Oracle challenge'
            });
        }

        // Validate submission data
        if (submissionData.userChoice < 0 || submissionData.confidence < 0 || submissionData.confidence > 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission data'
            });
        }

        // Insert user prediction
        const result = await runQuery(`
            INSERT INTO user_predictions (
                user_id, prediction_id, user_choice, confidence, reasoning
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            userId,
            predictionId,
            submissionData.userChoice,
            submissionData.confidence,
            submissionData.reasoning || null
        ]);

        res.status(201).json({
            success: true,
            data: {
                id: result.lastID,
                user_id: userId,
                prediction_id: predictionId,
                user_choice: submissionData.userChoice,
                confidence: submissionData.confidence,
                reasoning: submissionData.reasoning
            },
            message: 'User prediction submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting user prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit user prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/:id/resolve
 * Resolve an Oracle prediction with actual results (Admin only)
 */
router.post('/predictions/:id/resolve', requireAdmin, async (req, res) => {
    try {
        const { id: predictionId } = req.params;
        const resolveData: ResolvePredictionRequest = req.body;

        // Validate Oracle prediction exists and isn't already resolved
        const oraclePrediction = await getRow(`
            SELECT * FROM oracle_predictions WHERE id = ? AND is_resolved = 0
        `, [predictionId]);

        if (!oraclePrediction) {
            return res.status(404).json({
                success: false,
                error: 'Oracle prediction not found or already resolved'
            });
        }

        // Update Oracle prediction with result
        await runQuery(`
            UPDATE oracle_predictions 
            SET actual_result = ?, is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [resolveData.actualResult, predictionId]);

        // Calculate points for user predictions
        const userPredictions = await getRows(`
            SELECT * FROM user_predictions WHERE prediction_id = ?
        `, [predictionId]);

        for (const userPred of userPredictions) {
            let points = 0;

            // Award points based on accuracy
            if (userPred.user_choice === resolveData.actualResult) {
                points += 10; // Base points for correct prediction
                
                // Bonus points for confidence
                points += Math.floor(userPred.confidence / 10);
                
                // Extra bonus if user beat Oracle
                if (oraclePrediction.oracle_choice !== resolveData.actualResult) {
                    points += 15; // Beat the Oracle bonus
                }
            }

            // Update user prediction with points
            await runQuery(`
                UPDATE user_predictions 
                SET points_earned = ?
                WHERE id = ?
            `, [points, userPred.id]);
        }

        // Get updated prediction with results
        const resolvedPrediction = await getRow(`
            SELECT * FROM oracle_predictions WHERE id = ?
        `, [predictionId]);

        res.json({
            success: true,
            data: {
                ...resolvedPrediction,
                options: JSON.parse(resolvedPrediction.options),
                data_points: JSON.parse(resolvedPrediction.data_points),
                is_resolved: Boolean(resolvedPrediction.is_resolved)
            },
            message: 'Oracle prediction resolved successfully'
        });
    } catch (error) {
        console.error('Error resolving Oracle prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve Oracle prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/leaderboard
 * Get Oracle challenge leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { 
            week, 
            season = 2024, 
            timeframe = 'all',
            limit = 20 
        } = req.query;

        let sql = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                COUNT(up.id) as total_predictions,
                SUM(up.points_earned) as total_points,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN op.oracle_choice != op.actual_result AND up.user_choice = op.actual_result THEN 1 ELSE 0 END) as oracle_beats,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                ROUND(
                    (SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(up.id)), 2
                ) as accuracy_rate
            FROM users u
            INNER JOIN user_predictions up ON u.id = up.user_id
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE op.is_resolved = 1
        `;
        const params: any[] = [];

        if (week) {
            sql += ' AND op.week = ?';
            params.push(Number(week));
        }

        if (season) {
            sql += ' AND op.season = ?';
            params.push(Number(season));
        }

        // Add timeframe filtering
        if (timeframe === 'week') {
            sql += ' AND op.created_at >= datetime("now", "-7 days")';
        } else if (timeframe === 'month') {
            sql += ' AND op.created_at >= datetime("now", "-30 days")';
        }

        sql += `
            GROUP BY u.id, u.username, u.display_name
            HAVING total_predictions > 0
            ORDER BY total_points DESC, accuracy_rate DESC
            LIMIT ?
        `;
        params.push(Number(limit));

        const leaderboard = await getRows(sql, params);

        res.json({
            success: true,
            data: leaderboard,
            meta: {
                timeframe,
                week: week ? Number(week) : null,
                season: Number(season),
                total_players: leaderboard.length
            }
        });
    } catch (error) {
        console.error('Error fetching Oracle leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle leaderboard',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/stats
 * Get Oracle prediction statistics and performance metrics
 */
router.get('/stats', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Get overall Oracle performance
        const oracleStats = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as resolved_predictions,
                SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as oracle_correct,
                AVG(confidence) as avg_oracle_confidence,
                COUNT(DISTINCT week) as weeks_active,
                COUNT(DISTINCT type) as prediction_types
            FROM oracle_predictions 
            WHERE season = ?
        `, [Number(season)]);

        // Get prediction type breakdown
        const typeBreakdown = await getRows(`
            SELECT 
                type,
                COUNT(*) as count,
                SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as correct,
                AVG(confidence) as avg_confidence
            FROM oracle_predictions 
            WHERE season = ? AND is_resolved = 1
            GROUP BY type
            ORDER BY count DESC
        `, [Number(season)]);

        // Get user participation stats
        const participationStats = await getRow(`
            SELECT 
                COUNT(DISTINCT up.user_id) as total_users,
                COUNT(*) as total_user_predictions,
                AVG(up.confidence) as avg_user_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as user_correct
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE op.season = ? AND op.is_resolved = 1
        `, [Number(season)]);

        // Calculate accuracy rates
        const oracleAccuracy = oracleStats.resolved_predictions > 0 ? 
            (oracleStats.oracle_correct / oracleStats.resolved_predictions * 100) : 0;
        
        const userAccuracy = participationStats.total_user_predictions > 0 ? 
            (participationStats.user_correct / participationStats.total_user_predictions * 100) : 0;

        res.json({
            success: true,
            data: {
                oracle_performance: {
                    ...oracleStats,
                    accuracy_rate: Math.round(oracleAccuracy * 100) / 100
                },
                user_performance: {
                    ...participationStats,
                    accuracy_rate: Math.round(userAccuracy * 100) / 100
                },
                type_breakdown: typeBreakdown.map(tb => ({
                    ...tb,
                    accuracy_rate: tb.count > 0 ? Math.round((tb.correct / tb.count * 100) * 100) / 100 : 0
                })),
                season: Number(season)
            }
        });
    } catch (error) {
        console.error('Error fetching Oracle stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Advanced Analytics Routes
 * GET /api/oracle/analytics/performance - Oracle performance metrics
 * GET /api/oracle/analytics/users - User performance metrics  
 * GET /api/oracle/analytics/comparative - Comparative analysis
 * GET /api/oracle/analytics/insights - AI-powered insights
 * POST /api/oracle/analytics/report - Generate comprehensive report
 */

/**
 * GET /api/oracle/analytics/performance
 * Get detailed Oracle performance metrics with trends
 */
router.get('/analytics/performance', async (req, res) => {
    try {
        const { season = 2024, timeframe = 'season', weeks = 18 } = req.query;

        // Oracle overall performance
        const oracleOverall = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                AVG(oracle_confidence) as avg_confidence,
                SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as correct_predictions,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy_rate
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
        `, [Number(season)]);

        // Weekly accuracy breakdown
        const weeklyAccuracy = await getRows(`
            SELECT 
                week,
                COUNT(*) as predictions,
                SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as correct,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY week
            ORDER BY week ASC
        `, [Number(season)]);

        // Type-based accuracy analysis
        const typeAccuracy = await getRows(`
            SELECT 
                type,
                COUNT(*) as volume,
                SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) as correct,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy,
                AVG(oracle_confidence) as avg_confidence
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY type
            ORDER BY accuracy DESC
        `, [Number(season)]);

        // Confidence calibration analysis
        const confidenceCalibration = await getRows(`
            SELECT 
                CASE 
                    WHEN oracle_confidence >= 90 THEN '90-100%'
                    WHEN oracle_confidence >= 80 THEN '80-89%'
                    WHEN oracle_confidence >= 70 THEN '70-79%'
                    WHEN oracle_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END as range,
                AVG(oracle_confidence) as predicted,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as actual,
                COUNT(*) as volume
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY 
                CASE 
                    WHEN oracle_confidence >= 90 THEN '90-100%'
                    WHEN oracle_confidence >= 80 THEN '80-89%'
                    WHEN oracle_confidence >= 70 THEN '70-79%'
                    WHEN oracle_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END
            ORDER BY AVG(oracle_confidence) DESC
        `, [Number(season)]);

        res.json({
            success: true,
            data: {
                overallAccuracy: oracleOverall.accuracy_rate || 0,
                totalPredictions: oracleOverall.total_predictions || 0,
                averageConfidence: oracleOverall.avg_confidence || 0,
                weeklyAccuracy: weeklyAccuracy.map(w => ({
                    week: w.week,
                    accuracy: w.accuracy || 0,
                    predictions: w.predictions || 0
                })),
                typeAccuracy: typeAccuracy.reduce((acc, type) => {
                    acc[type.type] = {
                        accuracy: type.accuracy || 0,
                        volume: type.volume || 0,
                        avgConfidence: type.avg_confidence || 0
                    };
                    return acc;
                }, {}),
                confidenceCalibration: confidenceCalibration.map(cal => ({
                    range: cal.range,
                    predicted: cal.predicted || 0,
                    actual: cal.actual || 0,
                    volume: cal.volume || 0
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching Oracle performance analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle performance analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/analytics/users
 * Get comprehensive user performance metrics
 */
router.get('/analytics/users', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Overall user performance statistics
        const userOverall = await getRow(`
            SELECT 
                COUNT(DISTINCT eup.user_id) as total_users,
                COUNT(*) as total_predictions,
                AVG(eup.user_confidence) as avg_confidence,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy_rate,
                (SUM(CASE WHEN eup.beats_oracle = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as beat_oracle_rate
            FROM enhanced_user_predictions eup
            INNER JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eop.season = ? AND eop.is_resolved = 1
        `, [Number(season)]);

        // Top performers analysis
        const topPerformers = await getRows(`
            SELECT 
                sau.player_number,
                CONCAT('Player ', sau.player_number) as user,
                COUNT(*) as total_predictions,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy,
                SUM(CASE WHEN eup.beats_oracle = 1 THEN 1 ELSE 0 END) as oracle_beats,
                AVG(eup.user_confidence) as avg_confidence
            FROM enhanced_user_predictions eup
            INNER JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            INNER JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eup.user_id, sau.player_number
            HAVING COUNT(*) >= 3
            ORDER BY accuracy DESC
            LIMIT 10
        `, [Number(season)]);

        res.json({
            success: true,
            data: {
                averageAccuracy: userOverall.accuracy_rate || 0,
                beatOracleRate: userOverall.beat_oracle_rate || 0,
                totalUsers: userOverall.total_users || 0,
                totalPredictions: userOverall.total_predictions || 0,
                averageConfidence: userOverall.avg_confidence || 0,
                topPerformers: topPerformers.map(performer => ({
                    user: performer.user,
                    accuracy: performer.accuracy || 0,
                    oracleBeats: performer.oracle_beats || 0,
                    totalPredictions: performer.total_predictions || 0,
                    avgConfidence: performer.avg_confidence || 0
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/analytics/comparative
 * Get comparative analysis between Oracle and users
 */
router.get('/analytics/comparative', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Weekly comparison of Oracle vs Users
        const weeklyComparison = await getRows(`
            SELECT 
                eop.week,
                (SUM(CASE WHEN eop.oracle_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT eop.id)) as oracle_accuracy,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(eup.id)) as user_accuracy,
                AVG(eop.oracle_confidence) as oracle_confidence,
                AVG(eup.user_confidence) as user_confidence
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eop.week
            ORDER BY eop.week ASC
        `, [Number(season)]);

        // Type-based comparison
        const typeComparison = await getRows(`
            SELECT 
                eop.type,
                (SUM(CASE WHEN eop.oracle_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT eop.id)) as oracle_accuracy,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(eup.id)) as user_accuracy,
                AVG(eop.difficulty_level) as difficulty
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eop.type
            ORDER BY oracle_accuracy DESC
        `, [Number(season)]);

        res.json({
            success: true,
            data: {
                weeklyComparison: weeklyComparison.map(week => ({
                    week: week.week,
                    oracleAccuracy: week.oracle_accuracy || 0,
                    userAccuracy: week.user_accuracy || 0,
                    oracleConfidence: week.oracle_confidence || 0,
                    userConfidence: week.user_confidence || 0
                })),
                typeComparison: typeComparison.map(type => ({
                    type: type.type,
                    oracleAccuracy: type.oracle_accuracy || 0,
                    userAccuracy: type.user_accuracy || 0,
                    difficulty: type.difficulty || 5
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching comparative analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comparative analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/analytics/insights
 * Get AI-powered insights and recommendations
 */
router.get('/analytics/insights', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Get recent performance trends
        const recentTrends = await getRows(`
            SELECT 
                week,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1 AND week >= (
                SELECT MAX(week) - 3 FROM enhanced_oracle_predictions WHERE season = ?
            )
            GROUP BY week
            ORDER BY week DESC
        `, [Number(season), Number(season)]);

        // Identify strengths and weaknesses
        const strengths = await getRow(`
            SELECT type, 
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY type
            ORDER BY accuracy DESC
            LIMIT 1
        `, [Number(season)]);

        const weaknesses = await getRow(`
            SELECT type, 
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY type
            ORDER BY accuracy ASC
            LIMIT 1
        `, [Number(season)]);

        // Calculate trend direction
        let trendDirection = 'stable';
        if (recentTrends.length >= 2) {
            trendDirection = recentTrends[0].accuracy > recentTrends[recentTrends.length - 1].accuracy ? 'improving' : 'declining';
        }

        // Generate insights
        const insights = [
            `Oracle is currently ${trendDirection} with recent accuracy trends`,
            `Strongest performance in ${strengths?.type || 'various'} predictions (${Math.round(strengths?.accuracy || 0)}% accuracy)`,
            `Opportunity for improvement in ${weaknesses?.type || 'various'} predictions (${Math.round(weaknesses?.accuracy || 0)}% accuracy)`
        ];

        res.json({
            success: true,
            data: {
                insights,
                trends: {
                    direction: trendDirection,
                    recent: recentTrends
                },
                recommendations: [
                    "Focus on improving low-performing prediction types",
                    "Maintain confidence calibration through regular review",
                    "Consider external factors affecting prediction accuracy"
                ]
            }
        });

    } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate insights',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/analytics/report
 * Generate comprehensive analytics report
 */
router.post('/analytics/report', async (req, res) => {
    try {
        const { season = 2024, format = 'json', includeCharts = false } = req.body;

        // Aggregate all analytics data
        const reportData = {
            metadata: {
                season: Number(season),
                generatedAt: new Date().toISOString(),
                format
            },
            summary: {},
            performance: {},
            users: {},
            comparative: {},
            insights: []
        };

        // Get summary data
        const summary = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as oracle_accuracy,
                AVG(oracle_confidence) as avg_confidence
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
        `, [Number(season)]);

        reportData.summary = {
            totalPredictions: summary.total_predictions || 0,
            oracleAccuracy: summary.oracle_accuracy || 0,
            averageConfidence: summary.avg_confidence || 0
        };

        res.json({
            success: true,
            data: reportData,
            message: 'Comprehensive analytics report generated successfully'
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/leaderboard/global
 * Get global Oracle leaderboard with comprehensive user rankings
 */
router.get('/leaderboard/global', async (req, res) => {
    try {
        const { 
            season = 2024, 
            timeframe = 'all_time',
            limit = 50,
            offset = 0 
        } = req.query;

        let timeCondition = '';
        const params: any[] = [Number(season)];

        // Add timeframe filtering
        if (timeframe === 'week') {
            timeCondition = 'AND op.created_at >= datetime("now", "-7 days")';
        } else if (timeframe === 'month') {
            timeCondition = 'AND op.created_at >= datetime("now", "-30 days")';
        } else if (timeframe === 'season') {
            timeCondition = 'AND op.season = ?';
            params.push(Number(season));
        }

        // Get comprehensive user rankings
        const leaderboard = await getRows(`
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(up.id) as total_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                ROUND(
                    (SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) * 100.0) / 
                    NULLIF(COUNT(up.id), 0), 2
                ) as accuracy_rate,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE 
                    WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result 
                    THEN 1 ELSE 0 
                END) as oracle_beats,
                SUM(CASE 
                    WHEN up.user_choice = op.actual_result THEN 
                        CASE WHEN up.confidence >= 90 THEN 100
                             WHEN up.confidence >= 80 THEN 75
                             WHEN up.confidence >= 70 THEN 50
                             ELSE 25
                        END
                    ELSE 0
                END) as total_points,
                MAX(streak.current_streak) as best_streak,
                COUNT(DISTINCT op.week) as weeks_participated
            FROM users u
            INNER JOIN user_predictions up ON u.id = up.user_id
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            LEFT JOIN (
                SELECT 
                    user_id,
                    MAX(streak_count) as current_streak
                FROM (
                    SELECT 
                        user_id,
                        SUM(CASE WHEN user_choice = actual_result THEN 1 ELSE 0 END) 
                        OVER (PARTITION BY user_id ORDER BY created_at ROWS UNBOUNDED PRECEDING) as streak_count
                    FROM user_predictions up2
                    INNER JOIN oracle_predictions op2 ON up2.prediction_id = op2.id
                    WHERE op2.is_resolved = 1 ${timeCondition}
                ) streak_calc
                GROUP BY user_id
            ) streak ON u.id = streak.user_id
            WHERE op.is_resolved = 1 AND op.season = ? ${timeCondition}
            GROUP BY u.id, u.username, u.display_name, u.avatar_url
            HAVING total_predictions >= 5
            ORDER BY total_points DESC, accuracy_rate DESC, total_predictions DESC
            LIMIT ? OFFSET ?
        `, [...params, Number(limit), Number(offset)]);

        // Calculate rankings and additional stats
        const formattedLeaderboard = leaderboard.map((user, index) => ({
            rank: Number(offset) + index + 1,
            userId: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            stats: {
                totalPredictions: user.total_predictions,
                correctPredictions: user.correct_predictions,
                accuracyRate: user.accuracy_rate,
                avgConfidence: Math.round(user.avg_confidence || 0),
                oracleBeats: user.oracle_beats,
                totalPoints: user.total_points,
                bestStreak: user.best_streak || 0,
                weeksParticipated: user.weeks_participated
            },
            badges: calculateUserBadges(user),
            tier: calculateUserTier(user.accuracy_rate, user.total_predictions)
        }));

        // Get overall leaderboard stats
        const totalUsers = await getRow(`
            SELECT COUNT(DISTINCT u.id) as total_users
            FROM users u
            INNER JOIN user_predictions up ON u.id = up.user_id
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE op.is_resolved = 1 AND op.season = ? ${timeCondition}
            GROUP BY u.id
            HAVING COUNT(up.id) >= 5
        `, params);

        res.json({
            success: true,
            data: {
                leaderboard: formattedLeaderboard,
                meta: {
                    totalUsers: totalUsers?.total_users || 0,
                    season: Number(season),
                    timeframe,
                    limit: Number(limit),
                    offset: Number(offset),
                    generatedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch global leaderboard',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Helper function to calculate user badges based on performance
 */
function calculateUserBadges(user: any): string[] {
    const badges: string[] = [];
    
    if (user.accuracy_rate >= 90) badges.push('Oracle Master');
    if (user.accuracy_rate >= 80) badges.push('Expert Predictor');
    if (user.oracle_beats >= 10) badges.push('Oracle Challenger');
    if (user.total_predictions >= 100) badges.push('Dedicated Player');
    if (user.best_streak >= 10) badges.push('Streak Master');
    if (user.weeks_participated >= 10) badges.push('Season Veteran');
    
    return badges;
}

/**
 * Helper function to calculate user tier
 */
function calculateUserTier(accuracy: number, predictions: number): string {
    if (predictions < 10) return 'Rookie';
    if (accuracy >= 85) return 'Legendary';
    if (accuracy >= 75) return 'Platinum';
    if (accuracy >= 65) return 'Gold';
    if (accuracy >= 55) return 'Silver';
    return 'Bronze';
}

export default router;
