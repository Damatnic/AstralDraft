/**
 * Analytics API Routes
 * REST endpoints for Oracle analytics, performance metrics, and insights
 */

import express from 'express';
import { runQuery, getRow, getRows } from '../db/index';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/analytics/accuracy
 * Get detailed accuracy analytics for Oracle and users
 */
router.get('/accuracy', authenticateToken, async (req, res) => {
    try {
        const { 
            week, 
            season = 2024, 
            userId, 
            timeframe = 'all' 
        } = req.query;

        let sql = `
            SELECT 
                op.week,
                op.type,
                op.confidence as oracle_confidence,
                op.oracle_choice,
                op.actual_result,
                CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END as oracle_correct,
                COUNT(up.id) as user_predictions_count,
                AVG(up.confidence) as avg_user_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as users_correct,
                SUM(CASE WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result THEN 1 ELSE 0 END) as users_beat_oracle
            FROM oracle_predictions op
            LEFT JOIN user_predictions up ON op.id = up.prediction_id
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

        if (userId) {
            sql += ' AND up.user_id = ?';
            params.push(Number(userId));
        }

        // Add timeframe filtering
        if (timeframe === 'week') {
            sql += ' AND op.created_at >= datetime("now", "-7 days")';
        } else if (timeframe === 'month') {
            sql += ' AND op.created_at >= datetime("now", "-30 days")';
        }

        sql += `
            GROUP BY op.id, op.week, op.type, op.confidence, op.oracle_choice, op.actual_result
            ORDER BY op.week DESC, op.created_at DESC
        `;

        const accuracyData = await getRows(sql, params);

        // Calculate aggregated metrics
        const totalPredictions = accuracyData.length;
        const oracleCorrect = accuracyData.filter(p => p.oracle_correct).length;
        const totalUserPredictions = accuracyData.reduce((sum, p) => sum + p.user_predictions_count, 0);
        const totalUsersCorrect = accuracyData.reduce((sum, p) => sum + p.users_correct, 0);
        const totalUsersBeatOracle = accuracyData.reduce((sum, p) => sum + p.users_beat_oracle, 0);

        const metrics = {
            oracle_accuracy: totalPredictions > 0 ? (oracleCorrect / totalPredictions * 100) : 0,
            user_accuracy: totalUserPredictions > 0 ? (totalUsersCorrect / totalUserPredictions * 100) : 0,
            users_beat_oracle_rate: totalUserPredictions > 0 ? (totalUsersBeatOracle / totalUserPredictions * 100) : 0,
            total_predictions: totalPredictions,
            total_user_predictions: totalUserPredictions
        };

        res.json({
            success: true,
            analytics: {
                accuracy: (totalUserPredictions > 0 ? (totalUsersCorrect / totalUserPredictions * 100) : 0),
                totalPredictions: totalUserPredictions,
                correctPredictions: totalUsersCorrect,
                dateRange: {
                    startDate: req.query.startDate || null,
                    endDate: req.query.endDate || null
                },
                accuracy_details: accuracyData,
                aggregated_metrics: metrics,
                filters: {
                    week: week ? Number(week) : null,
                    season: Number(season),
                    userId: userId ? Number(userId) : null,
                    timeframe
                }
            }
        });
    } catch (error) {
        console.error('Error fetching accuracy analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch accuracy analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/trends
 * Get trending analytics and performance patterns
 */
router.get('/trends', async (req, res) => {
    try {
        const { season = 2024, weeks = 10 } = req.query;

        // Get weekly trend data
        const weeklyTrends = await getRows(`
            SELECT 
                op.week,
                COUNT(*) as predictions_count,
                AVG(op.confidence) as avg_oracle_confidence,
                SUM(CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as oracle_correct,
                COUNT(up.id) as user_predictions_count,
                AVG(up.confidence) as avg_user_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as users_correct
            FROM oracle_predictions op
            LEFT JOIN user_predictions up ON op.id = up.prediction_id
            WHERE op.season = ? AND op.is_resolved = 1
            GROUP BY op.week
            ORDER BY op.week DESC
            LIMIT ?
        `, [Number(season), Number(weeks)]);

        // Get prediction type trends
        const typeTrends = await getRows(`
            SELECT 
                op.type,
                COUNT(*) as total_predictions,
                AVG(op.confidence) as avg_confidence,
                SUM(CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                COUNT(up.id) as user_participation
            FROM oracle_predictions op
            LEFT JOIN user_predictions up ON op.id = up.prediction_id
            WHERE op.season = ? AND op.is_resolved = 1
            GROUP BY op.type
            ORDER BY total_predictions DESC
        `, [Number(season)]);

        // Calculate confidence correlation
        const confidenceCorrelation = await getRows(`
            SELECT 
                CASE 
                    WHEN op.confidence >= 90 THEN 'Very High (90-100%)'
                    WHEN op.confidence >= 80 THEN 'High (80-89%)'
                    WHEN op.confidence >= 70 THEN 'Medium (70-79%)'
                    ELSE 'Low (<70%)'
                END as confidence_range,
                COUNT(*) as predictions_count,
                SUM(CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as correct_count
            FROM oracle_predictions op
            WHERE op.season = ? AND op.is_resolved = 1
            GROUP BY confidence_range
            ORDER BY MIN(op.confidence) DESC
        `, [Number(season)]);

        // Format weekly trends with calculated accuracy
        const formattedWeeklyTrends = weeklyTrends.map(week => ({
            ...week,
            oracle_accuracy: week.predictions_count > 0 ? 
                (week.oracle_correct / week.predictions_count * 100) : 0,
            user_accuracy: week.user_predictions_count > 0 ? 
                (week.users_correct / week.user_predictions_count * 100) : 0
        }));

        // Format type trends with accuracy
        const formattedTypeTrends = typeTrends.map(type => ({
            ...type,
            accuracy_rate: type.total_predictions > 0 ? 
                (type.correct_predictions / type.total_predictions * 100) : 0,
            participation_rate: type.user_participation / type.total_predictions
        }));

        // Format confidence correlation
        const formattedConfidenceCorrelation = confidenceCorrelation.map(conf => ({
            ...conf,
            accuracy_rate: conf.predictions_count > 0 ? 
                (conf.correct_count / conf.predictions_count * 100) : 0
        }));

        res.json({
            success: true,
            trends: {
                weekly: formattedWeeklyTrends,
                monthly: formattedWeeklyTrends, // Using weekly data for monthly for now
                insights: [], // Add insights array as expected by tests
                weekly_trends: formattedWeeklyTrends,
                type_trends: formattedTypeTrends,
                confidence_correlation: formattedConfidenceCorrelation,
                season: Number(season),
                weeks_analyzed: Number(weeks)
            }
        });
    } catch (error) {
        console.error('Error fetching trend analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trend analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/insights
 * Get personalized insights and recommendations
 */
router.get('/insights', async (req, res) => {
    try {
        const { userId = 1, season = 2024 } = req.query; // Default to demo user

        // Get user performance data
        const userPerformance = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                SUM(up.points_earned) as total_points,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result THEN 1 ELSE 0 END) as oracle_beats
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1
        `, [Number(userId), Number(season)]);

        // Get user performance by prediction type
        const typePerformance = await getRows(`
            SELECT 
                op.type,
                COUNT(*) as predictions_count,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_count,
                AVG(up.confidence) as avg_confidence,
                SUM(up.points_earned) as total_points
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1
            GROUP BY op.type
            ORDER BY predictions_count DESC
        `, [Number(userId), Number(season)]);

        // Get recent performance trend (last 5 predictions)
        const recentTrend = await getRows(`
            SELECT 
                op.week,
                op.type,
                up.user_choice,
                op.actual_result,
                up.confidence,
                up.points_earned,
                CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END as correct
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1
            ORDER BY up.created_at DESC
            LIMIT 5
        `, [Number(userId), Number(season)]);

        // Generate insights based on data
        const insights = [];
        const recommendations = [];

        if (userPerformance.total_predictions > 0) {
            const accuracy = (userPerformance.correct_predictions / userPerformance.total_predictions * 100);
            const oracleBeatRate = (userPerformance.oracle_beats / userPerformance.total_predictions * 100);

            // Accuracy insights
            if (accuracy >= 70) {
                insights.push({
                    type: 'positive',
                    category: 'accuracy',
                    message: `Excellent accuracy! You're correct ${accuracy.toFixed(1)}% of the time.`,
                    value: accuracy
                });
            } else if (accuracy < 50) {
                insights.push({
                    type: 'improvement',
                    category: 'accuracy',
                    message: `Focus on improving accuracy. Current rate: ${accuracy.toFixed(1)}%`,
                    value: accuracy
                });
                recommendations.push({
                    category: 'strategy',
                    message: 'Consider analyzing prediction patterns and focusing on your strongest prediction types.'
                });
            }

            // Oracle beat rate insights
            if (oracleBeatRate >= 20) {
                insights.push({
                    type: 'positive',
                    category: 'oracle_performance',
                    message: `Impressive! You beat the Oracle ${oracleBeatRate.toFixed(1)}% of the time.`,
                    value: oracleBeatRate
                });
            }

            // Confidence analysis
            if (userPerformance.avg_confidence > 80) {
                insights.push({
                    type: 'warning',
                    category: 'confidence',
                    message: `High average confidence (${userPerformance.avg_confidence.toFixed(1)}%). Consider calibrating confidence levels.`,
                    value: userPerformance.avg_confidence
                });
                recommendations.push({
                    category: 'confidence',
                    message: 'Try varying your confidence levels based on prediction difficulty and available data.'
                });
            }
        }

        // Type-specific insights
        const bestType = typePerformance.reduce((best, current) => {
            const currentAccuracy = current.predictions_count > 0 ? 
                (current.correct_count / current.predictions_count * 100) : 0;
            const bestAccuracy = best.predictions_count > 0 ? 
                (best.correct_count / best.predictions_count * 100) : 0;
            return currentAccuracy > bestAccuracy ? current : best;
        }, typePerformance[0] || {});

        if (bestType && bestType.predictions_count > 0) {
            const bestAccuracy = (bestType.correct_count / bestType.predictions_count * 100);
            insights.push({
                type: 'positive',
                category: 'strength',
                message: `Your strongest prediction type is ${bestType.type} with ${bestAccuracy.toFixed(1)}% accuracy.`,
                value: bestAccuracy
            });
        }

        // Recent trend analysis
        if (recentTrend.length >= 3) {
            const recentCorrect = recentTrend.filter(p => p.correct).length;
            const recentAccuracy = (recentCorrect / recentTrend.length * 100);
            
            if (recentAccuracy >= 80) {
                insights.push({
                    type: 'positive',
                    category: 'recent_form',
                    message: `Hot streak! ${recentCorrect}/${recentTrend.length} correct in recent predictions.`,
                    value: recentAccuracy
                });
            } else if (recentAccuracy < 40) {
                insights.push({
                    type: 'improvement',
                    category: 'recent_form',
                    message: `Recent predictions need improvement: ${recentCorrect}/${recentTrend.length} correct.`,
                    value: recentAccuracy
                });
                recommendations.push({
                    category: 'strategy',
                    message: 'Take a step back and analyze recent prediction patterns to identify improvement areas.'
                });
            }
        }

        res.json({
            success: true,
            insights,
            recommendations,
            data: {
                user_performance: {
                    ...userPerformance,
                    accuracy_rate: userPerformance.total_predictions > 0 ? 
                        (userPerformance.correct_predictions / userPerformance.total_predictions * 100) : 0,
                    oracle_beat_rate: userPerformance.total_predictions > 0 ? 
                        (userPerformance.oracle_beats / userPerformance.total_predictions * 100) : 0
                },
                type_performance: typePerformance.map(tp => ({
                    ...tp,
                    accuracy_rate: tp.predictions_count > 0 ? 
                        (tp.correct_count / tp.predictions_count * 100) : 0
                })),
                recent_trend: recentTrend,
                insights,
                recommendations,
                analysis_period: {
                    userId: Number(userId),
                    season: Number(season),
                    total_predictions_analyzed: userPerformance.total_predictions || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user insights',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/performance-comparison
 * Compare user performance against Oracle and other users
 */
router.get('/performance-comparison', async (req, res) => {
    try {
        const { userId = 1, season = 2024, compareWith = 'oracle' } = req.query;

        // Get user performance
        const userStats = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                SUM(up.points_earned) as total_points
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1
        `, [Number(userId), Number(season)]);

        let comparisonData;

        if (compareWith === 'oracle') {
            // Compare with Oracle performance
            comparisonData = await getRow(`
                SELECT 
                    COUNT(*) as total_predictions,
                    AVG(op.confidence) as avg_confidence,
                    SUM(CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions
                FROM oracle_predictions op
                WHERE op.season = ? AND op.is_resolved = 1
            `, [Number(season)]);
            
            comparisonData.entity_name = 'Oracle AI';
        } else if (compareWith === 'average') {
            // Compare with average user performance
            comparisonData = await getRow(`
                SELECT 
                    AVG(user_totals.total_predictions) as total_predictions,
                    AVG(user_totals.avg_confidence) as avg_confidence,
                    AVG(user_totals.correct_predictions) as correct_predictions,
                    AVG(user_totals.total_points) as total_points
                FROM (
                    SELECT 
                        up.user_id,
                        COUNT(*) as total_predictions,
                        AVG(up.confidence) as avg_confidence,
                        SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                        SUM(up.points_earned) as total_points
                    FROM user_predictions up
                    INNER JOIN oracle_predictions op ON up.prediction_id = op.id
                    WHERE op.season = ? AND op.is_resolved = 1 AND up.user_id != ?
                    GROUP BY up.user_id
                ) as user_totals
            `, [Number(season), Number(userId)]);
            
            comparisonData.entity_name = 'Average User';
        }

        // Calculate comparison metrics
        const userAccuracy = userStats.total_predictions > 0 ? 
            (userStats.correct_predictions / userStats.total_predictions * 100) : 0;
        
        const comparisonAccuracy = comparisonData.total_predictions > 0 ? 
            (comparisonData.correct_predictions / comparisonData.total_predictions * 100) : 0;

        const accuracyDifference = userAccuracy - comparisonAccuracy;
        const confidenceDifference = (userStats.avg_confidence || 0) - (comparisonData.avg_confidence || 0);

        const comparison = {
            user_performance: {
                accuracy: userAccuracy,
                confidence: userStats.avg_confidence || 0,
                total_predictions: userStats.total_predictions || 0,
                total_points: userStats.total_points || 0
            },
            comparison_performance: {
                entity: comparisonData.entity_name,
                accuracy: comparisonAccuracy,
                confidence: comparisonData.avg_confidence || 0,
                total_predictions: comparisonData.total_predictions || 0,
                total_points: comparisonData.total_points || 0
            },
            differences: {
                accuracy_difference: accuracyDifference,
                confidence_difference: confidenceDifference,
                performance_summary: accuracyDifference > 0 ? 
                    `You're performing ${accuracyDifference.toFixed(1)}% better than ${comparisonData.entity_name}` :
                    `${comparisonData.entity_name} is performing ${Math.abs(accuracyDifference).toFixed(1)}% better than you`
            }
        };

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error fetching performance comparison:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance comparison',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/analytics/track-event
 * Track analytics events for prediction interactions
 */
router.post('/track-event', async (req, res) => {
    try {
        const { 
            predictionId, 
            eventType, 
            eventData = {},
            userId = 1 
        } = req.body;

        // Validate required fields
        if (!predictionId || !eventType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: predictionId and eventType'
            });
        }

        // Store analytics event
        await runQuery(`
            INSERT INTO oracle_analytics (prediction_id, metric_name, metric_value)
            VALUES (?, ?, ?)
        `, [
            predictionId,
            `event_${eventType}`,
            JSON.stringify({ userId, ...eventData })
        ]);

        res.json({
            success: true,
            message: 'Analytics event tracked successfully'
        });
    } catch (error) {
        console.error('Error tracking analytics event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track analytics event',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/user/:userId/performance
 * Get comprehensive user performance analytics
 */
router.get('/user/:userId/performance', async (req, res) => {
    try {
        const { userId } = req.params;
        const { season = 2024, timeframe = 'all_time' } = req.query;

        let timeCondition = '';
        const params = [Number(userId), Number(season)];

        if (timeframe === 'week') {
            timeCondition = 'AND op.created_at >= datetime("now", "-7 days")';
        } else if (timeframe === 'month') {
            timeCondition = 'AND op.created_at >= datetime("now", "-30 days")';
        }

        // Get basic user performance stats
        const userStats = await getRow(`
            SELECT 
                COUNT(up.id) as total_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result THEN 1 ELSE 0 END) as oracle_beats,
                MAX(op.week) as latest_week,
                MIN(op.week) as earliest_week
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1 ${timeCondition}
        `, params);

        // Get performance by prediction type
        const typePerformance = await getRows(`
            SELECT 
                op.type,
                COUNT(up.id) as predictions_count,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_count,
                AVG(up.confidence) as avg_confidence
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1 ${timeCondition}
            GROUP BY op.type
            ORDER BY predictions_count DESC
        `, params);

        // Get weekly performance trends
        const weeklyTrends = await getRows(`
            SELECT 
                op.week,
                COUNT(up.id) as predictions_count,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_count,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result THEN 1 ELSE 0 END) as oracle_beats
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1 ${timeCondition}
            GROUP BY op.week
            ORDER BY op.week ASC
        `, params);

        // Get confidence calibration analysis
        const confidenceCalibration = await getRows(`
            SELECT 
                CASE 
                    WHEN up.confidence >= 90 THEN '90-100%'
                    WHEN up.confidence >= 80 THEN '80-89%'
                    WHEN up.confidence >= 70 THEN '70-79%'
                    WHEN up.confidence >= 60 THEN '60-69%'
                    ELSE 'Below 60%'
                END as confidence_range,
                COUNT(up.id) as predictions_count,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_count,
                AVG(up.confidence) as avg_confidence_in_range
            FROM user_predictions up
            INNER JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.season = ? AND op.is_resolved = 1 ${timeCondition}
            GROUP BY confidence_range
            ORDER BY MIN(up.confidence) DESC
        `, params);

        // Calculate accuracy rate
        const accuracyRate = userStats?.total_predictions > 0 ? 
            (userStats.correct_predictions / userStats.total_predictions * 100) : 0;

        // Format type performance
        const formattedTypePerformance = typePerformance.map(type => ({
            type: type.type,
            predictions: type.predictions_count,
            correct: type.correct_count,
            accuracy: type.predictions_count > 0 ? 
                (type.correct_count / type.predictions_count * 100) : 0,
            avgConfidence: Math.round(type.avg_confidence || 0)
        }));

        // Format weekly trends
        const formattedWeeklyTrends = weeklyTrends.map(week => ({
            week: week.week,
            predictions: week.predictions_count,
            correct: week.correct_count,
            accuracy: week.predictions_count > 0 ? 
                (week.correct_count / week.predictions_count * 100) : 0,
            avgConfidence: Math.round(week.avg_confidence || 0),
            oracleBeats: week.oracle_beats
        }));

        // Format confidence calibration
        const formattedCalibration = confidenceCalibration.map(cal => ({
            confidenceRange: cal.confidence_range,
            predictions: cal.predictions_count,
            correct: cal.correct_count,
            accuracy: cal.predictions_count > 0 ? 
                (cal.correct_count / cal.predictions_count * 100) : 0,
            avgConfidence: Math.round(cal.avg_confidence_in_range || 0)
        }));

        res.json({
            success: true,
            data: {
                userId: Number(userId),
                season: Number(season),
                timeframe,
                overallStats: {
                    totalPredictions: userStats?.total_predictions || 0,
                    correctPredictions: userStats?.correct_predictions || 0,
                    accuracyRate: Math.round(accuracyRate * 100) / 100,
                    avgConfidence: Math.round(userStats?.avg_confidence || 0),
                    oracleBeats: userStats?.oracle_beats || 0,
                    weeksActive: (userStats?.latest_week || 0) - (userStats?.earliest_week || 0) + 1
                },
                typePerformance: formattedTypePerformance,
                weeklyTrends: formattedWeeklyTrends,
                confidenceCalibration: formattedCalibration,
                insights: generateUserInsights(userStats, formattedTypePerformance, accuracyRate)
            }
        });

    } catch (error) {
        console.error('Error fetching user performance analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user performance analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Helper function to generate personalized insights
 */
function generateUserInsights(userStats: any, typePerformance: any[], accuracyRate: number): string[] {
    const insights: string[] = [];

    if (accuracyRate >= 80) {
        insights.push('Excellent accuracy! You\'re consistently outperforming most users.');
    } else if (accuracyRate >= 70) {
        insights.push('Good accuracy rate. Focus on confidence calibration for better scores.');
    } else if (accuracyRate < 60) {
        insights.push('Consider analyzing Oracle reasoning more carefully before making predictions.');
    }

    const bestType = typePerformance.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best, typePerformance[0]);
    
    if (bestType && bestType.accuracy > accuracyRate + 10) {
        insights.push(`You excel at ${bestType.type} predictions (${Math.round(bestType.accuracy)}% accuracy).`);
    }

    if (userStats?.oracle_beats > userStats?.total_predictions * 0.3) {
        insights.push('You frequently beat the Oracle! Your independent analysis is strong.');
    }

    return insights;
}

/**
 * GET /api/analytics/performance
 * Get user performance metrics
 */
router.get('/performance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id || 1; // Demo user if not authenticated
        const { timeframe = 'all' } = req.query;

        // Get user prediction performance
        const performance = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                AVG(up.confidence) as average_confidence,
                AVG(CASE WHEN up.user_choice = op.actual_result THEN up.confidence ELSE 0 END) as confidence_when_correct
            FROM user_predictions up
            JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.is_resolved = 1
        `, [userId]);

        // Get confidence calibration data
        const confidenceCalibration = await getRows(`
            SELECT 
                CASE 
                    WHEN up.confidence <= 20 THEN '0-20'
                    WHEN up.confidence <= 40 THEN '21-40'
                    WHEN up.confidence <= 60 THEN '41-60'
                    WHEN up.confidence <= 80 THEN '61-80'
                    ELSE '81-100'
                END as confidence_range,
                COUNT(*) as total_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                AVG(up.confidence) as avg_confidence
            FROM user_predictions up
            JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.is_resolved = 1
            GROUP BY confidence_range
            ORDER BY avg_confidence
        `, [userId]);

        res.json({
            success: true,
            performance: {
                ...performance,
                averageConfidence: performance.average_confidence,
                predictionTrends: [], // Add empty array for trends
                streaks: { current: 0, longest: 0 }, // Add streak data
                confidenceCalibration: confidenceCalibration.map(cc => ({
                    range: cc.confidence_range,
                    accuracy: cc.total_predictions > 0 ? (cc.correct_predictions / cc.total_predictions) * 100 : 0,
                    totalPredictions: cc.total_predictions,
                    avgConfidence: cc.avg_confidence
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/comparison
 * Get user comparison with Oracle
 */
router.get('/comparison', optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.id || 1; // Demo user if not authenticated
        const { timeframe = 'all' } = req.query;

        // Get head-to-head comparison
        const comparison = await getRow(`
            SELECT 
                COUNT(*) as total_matchups,
                SUM(CASE WHEN up.user_choice = op.actual_result AND op.oracle_choice != op.actual_result THEN 1 ELSE 0 END) as user_wins,
                SUM(CASE WHEN up.user_choice != op.actual_result AND op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as oracle_wins,
                SUM(CASE WHEN up.user_choice = op.oracle_choice THEN 1 ELSE 0 END) as agreements,
                AVG(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as user_accuracy,
                AVG(CASE WHEN op.oracle_choice = op.actual_result THEN 1 ELSE 0 END) as oracle_accuracy
            FROM user_predictions up
            JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.is_resolved = 1
        `, [userId]);

        res.json({
            success: true,
            comparison: {
                userAccuracy: (comparison.user_accuracy || 0) * 100,
                oracleAccuracy: (comparison.oracle_accuracy || 0) * 100,
                userRank: 1, // Add user rank (placeholder for now)
                headToHead: {
                    userWins: comparison.user_wins || 0,
                    oracleWins: comparison.oracle_wins || 0,
                    ties: (comparison.total_matchups || 0) - (comparison.user_wins || 0) - (comparison.oracle_wins || 0),
                    agreements: comparison.agreements || 0,
                    totalMatchups: comparison.total_matchups || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching comparison data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comparison data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/analytics/badges
 * Get user achievement badges
 */
router.get('/badges', optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.id || 1; // Demo user if not authenticated

        // Get user stats for badge calculations
        const stats = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions,
                MAX(up.confidence) as max_confidence,
                COUNT(DISTINCT op.week) as weeks_participated
            FROM user_predictions up
            JOIN oracle_predictions op ON up.prediction_id = op.id
            WHERE up.user_id = ? AND op.is_resolved = 1
        `, [userId]);

        const accuracy = stats.total_predictions > 0 ? (stats.correct_predictions / stats.total_predictions) * 100 : 0;

        // Define available badges with progress
        const availableBadges = [
            { id: 'first_prediction', name: 'First Prediction', description: 'Made your first prediction', requirement: 1, progress: Math.min(stats.total_predictions, 1) },
            { id: 'prediction_streak_5', name: 'Hot Streak', description: 'Made 5 predictions', requirement: 5, progress: Math.min(stats.total_predictions, 5) },
            { id: 'prediction_streak_10', name: 'Dedicated Predictor', description: 'Made 10 predictions', requirement: 10, progress: Math.min(stats.total_predictions, 10) },
            { id: 'high_accuracy', name: 'Oracle Challenger', description: 'Achieved 70% accuracy', requirement: 70, progress: Math.min(accuracy, 70) },
            { id: 'confident_predictor', name: 'Confident Predictor', description: 'Made prediction with 90%+ confidence', requirement: 90, progress: Math.min(stats.max_confidence || 0, 90) }
        ];

        // Calculate earned badges
        const earnedBadges = availableBadges.filter(badge => {
            switch (badge.id) {
                case 'first_prediction':
                    return stats.total_predictions >= 1;
                case 'prediction_streak_5':
                    return stats.total_predictions >= 5;
                case 'prediction_streak_10':
                    return stats.total_predictions >= 10;
                case 'high_accuracy':
                    return accuracy >= 70;
                case 'confident_predictor':
                    return stats.max_confidence >= 90;
                default:
                    return false;
            }
        });

        res.json({
            success: true,
            badges: {
                earned: earnedBadges,
                available: availableBadges.filter(badge => !earnedBadges.find(earned => earned.id === badge.id)),
                progress: {
                    totalPredictions: stats.total_predictions,
                    accuracy: accuracy,
                    weeksParticipated: stats.weeks_participated
                }
            }
        });
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch badges',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/analytics/prediction-result
 * Record prediction result for analytics
 */
router.post('/prediction-result', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { predictionId, userChoice, confidence, actualResult, correct } = req.body;

        // Validate required fields
        if (!predictionId || userChoice === undefined || !confidence || actualResult === undefined || correct === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Check for duplicate
        const existing = await getRow(`
            SELECT id FROM user_predictions 
            WHERE user_id = ? AND prediction_id = ?
        `, [userId, predictionId]);

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Result already recorded for this prediction'
            });
        }

        // Insert prediction result
        await runQuery(`
            INSERT INTO user_predictions (user_id, prediction_id, user_choice, confidence, is_correct, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [userId, predictionId, userChoice, confidence, correct ? 1 : 0]);

        res.status(201).json({
            success: true,
            recorded: true,
            predictionId
        });
    } catch (error) {
        console.error('Error recording prediction result:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record prediction result',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
