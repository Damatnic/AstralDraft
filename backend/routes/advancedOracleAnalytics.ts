/**
 * Advanced Oracle Analytics API Routes
 * Comprehensive reporting and performance tracking endpoints
 */

import express from 'express';
import { getRows, getRow } from '../db/index';

const router = express.Router();

/**
 * GET /api/oracle/analytics/performance
 * Get detailed Oracle performance metrics with trends
 */
router.get('/performance', async (req, res) => {
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

        // Prediction trends over time
        const predictionTrends = await getRows(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as volume,
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy,
                AVG(oracle_confidence) as avg_confidence
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
            GROUP BY DATE(created_at)
            ORDER BY date ASC
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
                })),
                predictionTrends: predictionTrends.map(trend => ({
                    date: trend.date,
                    accuracy: trend.accuracy || 0,
                    volume: trend.volume || 0,
                    avgConfidence: trend.avg_confidence || 0
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
router.get('/users', async (req, res) => {
    try {
        const { season = 2024, timeframe = 'season' } = req.query;

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

        // User participation trends by week
        const participationTrends = await getRows(`
            SELECT 
                eop.week,
                COUNT(DISTINCT eup.user_id) as users,
                COUNT(*) as predictions,
                AVG(eup.user_confidence) as avg_confidence
            FROM enhanced_user_predictions eup
            INNER JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eop.week
            ORDER BY eop.week ASC
        `, [Number(season)]);

        // User confidence distribution
        const confidenceDistribution = await getRows(`
            SELECT 
                CASE 
                    WHEN eup.user_confidence >= 90 THEN '90-100%'
                    WHEN eup.user_confidence >= 80 THEN '80-89%'
                    WHEN eup.user_confidence >= 70 THEN '70-79%'
                    WHEN eup.user_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END as range,
                COUNT(*) as count,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy
            FROM enhanced_user_predictions eup
            INNER JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY 
                CASE 
                    WHEN eup.user_confidence >= 90 THEN '90-100%'
                    WHEN eup.user_confidence >= 80 THEN '80-89%'
                    WHEN eup.user_confidence >= 70 THEN '70-79%'
                    WHEN eup.user_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END
            ORDER BY AVG(eup.user_confidence) DESC
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
            HAVING COUNT(*) >= 5
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
                participationTrends: participationTrends.map(trend => ({
                    week: trend.week,
                    users: trend.users,
                    predictions: trend.predictions,
                    avgConfidence: trend.avg_confidence || 0
                })),
                confidenceDistribution: confidenceDistribution.map(dist => ({
                    range: dist.range,
                    count: dist.count,
                    accuracy: dist.accuracy || 0
                })),
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
router.get('/comparative', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Weekly comparison of Oracle vs Users
        const weeklyComparison = await getRows(`
            SELECT 
                eop.week,
                (SUM(CASE WHEN eop.oracle_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT eop.id)) as oracle_accuracy,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(eup.id)) as user_accuracy,
                AVG(eop.oracle_confidence) as oracle_confidence,
                AVG(eup.user_confidence) as user_confidence,
                COUNT(DISTINCT eop.id) as oracle_predictions,
                COUNT(eup.id) as user_predictions
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
                AVG(eop.difficulty_level) as difficulty,
                COUNT(DISTINCT eop.id) as oracle_predictions,
                COUNT(eup.id) as user_predictions
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eop.type
            ORDER BY oracle_accuracy DESC
        `, [Number(season)]);

        // Confidence range comparison
        const confidenceComparison = await getRows(`
            SELECT 
                CASE 
                    WHEN eop.oracle_confidence >= 80 THEN '80-100%'
                    WHEN eop.oracle_confidence >= 70 THEN '70-79%'
                    WHEN eop.oracle_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END as confidence_range,
                (SUM(CASE WHEN eop.oracle_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT eop.id)) as oracle_accuracy,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result AND eup.user_confidence >= 
                    CASE 
                        WHEN eop.oracle_confidence >= 80 THEN 80
                        WHEN eop.oracle_confidence >= 70 THEN 70
                        WHEN eop.oracle_confidence >= 60 THEN 60
                        ELSE 50
                    END
                THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(CASE WHEN eup.user_confidence >= 
                    CASE 
                        WHEN eop.oracle_confidence >= 80 THEN 80
                        WHEN eop.oracle_confidence >= 70 THEN 70
                        WHEN eop.oracle_confidence >= 60 THEN 60
                        ELSE 50
                    END
                THEN 1 END), 0)) as user_accuracy,
                COUNT(DISTINCT eop.id) as oracle_volume,
                COUNT(CASE WHEN eup.user_confidence >= 
                    CASE 
                        WHEN eop.oracle_confidence >= 80 THEN 80
                        WHEN eop.oracle_confidence >= 70 THEN 70
                        WHEN eop.oracle_confidence >= 60 THEN 60
                        ELSE 50
                    END
                THEN 1 END) as user_volume
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY 
                CASE 
                    WHEN eop.oracle_confidence >= 80 THEN '80-100%'
                    WHEN eop.oracle_confidence >= 70 THEN '70-79%'
                    WHEN eop.oracle_confidence >= 60 THEN '60-69%'
                    ELSE '50-59%'
                END
            ORDER BY AVG(eop.oracle_confidence) DESC
        `, [Number(season)]);

        res.json({
            success: true,
            data: {
                weeklyComparison: weeklyComparison.map(week => ({
                    week: week.week,
                    oracleAccuracy: week.oracle_accuracy || 0,
                    userAccuracy: week.user_accuracy || 0,
                    oracleConfidence: week.oracle_confidence || 0,
                    userConfidence: week.user_confidence || 0,
                    oraclePredictions: week.oracle_predictions || 0,
                    userPredictions: week.user_predictions || 0
                })),
                typeComparison: typeComparison.map(type => ({
                    type: type.type,
                    oracleAccuracy: type.oracle_accuracy || 0,
                    userAccuracy: type.user_accuracy || 0,
                    difficulty: type.difficulty || 5
                })),
                confidenceComparison: confidenceComparison.map(conf => ({
                    confidenceRange: conf.confidence_range,
                    oracleAccuracy: conf.oracle_accuracy || 0,
                    userAccuracy: conf.user_accuracy || 0,
                    oracleVolume: conf.oracle_volume || 0,
                    userVolume: conf.user_volume || 0
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
router.get('/insights', async (req, res) => {
    try {
        const { season = 2024 } = req.query;

        // Generate performance insights
        const insights = [];
        const recommendations = [];

        // Oracle performance analysis
        const oraclePerformance = await getRow(`
            SELECT 
                (SUM(CASE WHEN oracle_choice = actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy,
                AVG(oracle_confidence) as avg_confidence,
                COUNT(*) as total_predictions
            FROM enhanced_oracle_predictions
            WHERE season = ? AND is_resolved = 1
        `, [Number(season)]);

        // User performance analysis
        const userPerformance = await getRow(`
            SELECT 
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as accuracy,
                AVG(eup.user_confidence) as avg_confidence,
                (SUM(CASE WHEN eup.beats_oracle = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as beat_oracle_rate
            FROM enhanced_user_predictions eup
            INNER JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eop.season = ? AND eop.is_resolved = 1
        `, [Number(season)]);

        // Generate insights based on performance data
        if (oraclePerformance && userPerformance) {
            const performanceGap = oraclePerformance.accuracy - userPerformance.accuracy;
            let impactLevel = 'low';
            if (performanceGap > 15) impactLevel = 'high';
            else if (performanceGap > 10) impactLevel = 'medium';
            
            insights.push({
                type: 'performance_gap',
                title: 'Oracle vs User Performance',
                description: `Oracle maintains a ${performanceGap.toFixed(1)}% accuracy advantage over users`,
                impact: impactLevel,
                trend: 'stable'
            });

            if (userPerformance.beat_oracle_rate > 30) {
                insights.push({
                    type: 'user_improvement',
                    title: 'Strong User Performance',
                    description: `Users are beating Oracle ${userPerformance.beat_oracle_rate.toFixed(1)}% of the time`,
                    impact: 'positive',
                    trend: 'improving'
                });
            }

            // Confidence analysis
            const oracleConfidenceGap = Math.abs(oraclePerformance.avg_confidence - oraclePerformance.accuracy);
            const userConfidenceGap = Math.abs(userPerformance.avg_confidence - userPerformance.accuracy);

            if (userConfidenceGap > oracleConfidenceGap + 10) {
                insights.push({
                    type: 'confidence_calibration',
                    title: 'User Overconfidence',
                    description: 'Users show poor confidence calibration compared to Oracle',
                    impact: 'medium',
                    trend: 'declining'
                });

                recommendations.push({
                    category: 'confidence',
                    title: 'Improve Confidence Calibration',
                    description: 'Users should better align confidence levels with actual accuracy'
                });
            }
        }

        // Type-specific insights
        const typePerformance = await getRows(`
            SELECT 
                eop.type,
                (SUM(CASE WHEN eop.oracle_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT eop.id)) as oracle_accuracy,
                (SUM(CASE WHEN eup.user_choice = eop.actual_result THEN 1 ELSE 0 END) * 100.0 / COUNT(eup.id)) as user_accuracy
            FROM enhanced_oracle_predictions eop
            LEFT JOIN enhanced_user_predictions eup ON eop.id = eup.prediction_id
            WHERE eop.season = ? AND eop.is_resolved = 1
            GROUP BY eop.type
        `, [Number(season)]);

        const problemType = typePerformance.find(type => (type.oracle_accuracy - type.user_accuracy) > 20);
        if (problemType) {
            insights.push({
                type: 'prediction_type',
                title: `${problemType.type} Challenge`,
                description: `Users struggle most with ${problemType.type} predictions`,
                impact: 'high',
                trend: 'stable'
            });

            recommendations.push({
                category: 'strategy',
                title: `Focus on ${problemType.type}`,
                description: `Provide additional guidance for ${problemType.type} predictions`
            });
        }

        res.json({
            success: true,
            data: {
                insights,
                recommendations,
                analysisDate: new Date().toISOString(),
                season: Number(season)
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
router.post('/report', async (req, res) => {
    try {
        const { 
            season = 2024, 
            format = 'json',
            includeCharts = true,
            includeInsights = true 
        } = req.body;

        // Aggregate all analytics data
        const [performance, users, comparative] = await Promise.all([
            // Get Oracle performance data
            fetch(`${req.protocol}://${req.get('host')}/api/oracle/analytics/performance?season=${season}`),
            // Get user analytics data  
            fetch(`${req.protocol}://${req.get('host')}/api/oracle/analytics/users?season=${season}`),
            // Get comparative data
            fetch(`${req.protocol}://${req.get('host')}/api/oracle/analytics/comparative?season=${season}`)
        ]);

        const performanceData = await performance.json();
        const usersData = await users.json();
        const comparativeData = await comparative.json();

        // Generate comprehensive report
        const report: any = {
            metadata: {
                generatedAt: new Date().toISOString(),
                season: Number(season),
                format,
                version: '1.0'
            },
            summary: {
                oracleAccuracy: performanceData.data.overallAccuracy,
                userAccuracy: usersData.data.averageAccuracy,
                performanceGap: performanceData.data.overallAccuracy - usersData.data.averageAccuracy,
                totalPredictions: performanceData.data.totalPredictions,
                totalUsers: usersData.data.totalUsers,
                beatOracleRate: usersData.data.beatOracleRate
            },
            performance: performanceData.data,
            users: usersData.data,
            comparative: comparativeData.data
        };

        if (includeInsights) {
            const insightsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/oracle/analytics/insights?season=${season}`);
            const insightsData = await insightsResponse.json();
            report.insights = insightsData.data;
        }

        res.json({
            success: true,
            data: report,
            downloadUrl: `/api/oracle/analytics/download-report?id=${Date.now()}`
        });

    } catch (error) {
        console.error('Error generating analytics report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate analytics report',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
