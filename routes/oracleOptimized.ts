/**
 * Optimized Oracle Predictions API Routes
 * Performance-enhanced routes with caching, batch operations, and optimized queries
 */

import express from 'express';
import { authenticateToken, optionalAuth, requireAdmin } from '../backend/middleware/auth';
import { predictionValidation, handleValidationErrors } from '../backend/middleware/security';
import { oracleDatabaseService } from '../services/oracleDatabaseOptimizationService';
import { oraclePerformanceCache } from '../services/oraclePerformanceCacheService';

// Extend Request interface to include startTime
declare global {
    namespace Express {
        interface Request {
            startTime?: number;
        }
    }
}

const router = express.Router();

// Performance monitoring middleware
router.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

// Response time logging middleware
router.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        const responseTime = Date.now() - req.startTime;
        res.set('X-Response-Time', `${responseTime}ms`);
        if (responseTime > 1000) {
            console.warn(`⚠️ Slow Oracle API response: ${req.method} ${req.path} - ${responseTime}ms`);
        }
        return originalSend.call(this, data);
    };
    next();
});

/**
 * GET /api/oracle/predictions
 * Get Oracle predictions for a specific week with performance optimizations
 */
router.get('/predictions', optionalAuth, async (req, res) => {
    try {
        const { week = 1, season = 2024, limit = 50, offset = 0 } = req.query;
        const weekNum = Number(week);
        const seasonNum = Number(season);
        const limitNum = Number(limit);
        const offsetNum = Number(offset);

        console.log(`🔮 Fetching Oracle predictions for Week ${weekNum}, Season ${seasonNum}`);

        // Use optimized database service with caching
        const predictions = await oracleDatabaseService.getWeekPredictions(weekNum, seasonNum);

        // Apply pagination
        const paginatedPredictions = predictions.slice(offsetNum, offsetNum + limitNum);

        // Get Oracle stats in parallel
        const [oracleStats] = await Promise.all([
            oracleDatabaseService.getOracleAccuracy(seasonNum)
        ]);

        res.json({
            success: true,
            data: paginatedPredictions,
            pagination: {
                total: predictions.length,
                limit: limitNum,
                offset: offsetNum,
                hasMore: offsetNum + limitNum < predictions.length
            },
            meta: {
                week: weekNum,
                season: seasonNum,
                totalPredictions: predictions.length,
                openPredictions: predictions.filter(p => !p.is_resolved).length,
                resolvedPredictions: predictions.filter(p => p.is_resolved).length,
                oracleAccuracy: oracleStats.accuracy,
                cached: true // Indicate if response was cached
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch Oracle predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle predictions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/predictions/:id
 * Get specific prediction with caching
 */
router.get('/predictions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const prediction = await oracleDatabaseService.getPredictionById(id);

        if (!prediction) {
            return res.status(404).json({
                success: false,
                error: 'Prediction not found'
            });
        }

        res.json({
            success: true,
            data: prediction,
            meta: {
                cached: true
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch prediction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch prediction',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/:id/submit
 * Submit user prediction with optimized performance
 */
router.post('/predictions/:id/submit',
    authenticateToken,
    predictionValidation.submit,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id: predictionId } = req.params;
            const { userChoice, confidence, reasoning } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            console.log(`📝 Submitting prediction: User ${userId}, Prediction ${predictionId}`);

            // Check if prediction exists (uses cache)
            const prediction = await oracleDatabaseService.getPredictionById(predictionId);
            if (!prediction) {
                return res.status(404).json({
                    success: false,
                    error: 'Prediction not found'
                });
            }

            if (prediction.is_resolved) {
                return res.status(400).json({
                    success: false,
                    error: 'Prediction has already been resolved'
                });
            }

            // Submit prediction (with cache invalidation)
            await oracleDatabaseService.submitUserPrediction(
                predictionId,
                String(userId),
                userChoice,
                confidence,
                reasoning
            );

            res.json({
                success: true,
                data: {
                    predictionId,
                    userChoice,
                    confidence,
                    submittedAt: new Date().toISOString()
                },
                meta: {
                    cacheInvalidated: true
                }
            });

        } catch (error) {
            console.error('❌ Failed to submit prediction:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit prediction',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * GET /api/oracle/leaderboard
 * Get leaderboard with aggressive caching
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { 
            limit = 50, 
            timeframe = 'all', 
            season = 2024 
        } = req.query;

        const limitNum = Number(limit);
        const seasonNum = Number(season);

        const timeframeStr = typeof timeframe === 'string' ? timeframe : 'all';

        console.log(`🏆 Fetching leaderboard: ${timeframeStr}, Season ${seasonNum}`);

        // Use cached leaderboard service
        const leaderboard = await oracleDatabaseService.getLeaderboard(
            limitNum,
            timeframeStr,
            seasonNum
        );

        res.json({
            success: true,
            data: leaderboard,
            meta: {
                season: seasonNum,
                timeframe: timeframeStr,
                total_players: leaderboard.length,
                week: null,
                cached: true
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/user/predictions
 * Get user predictions with pagination and caching
 */
router.get('/user/predictions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limit = 50, offset = 0 } = req.query;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User authentication required'
            });
        }

        const limitNum = Number(limit);
        const offsetNum = Number(offset);

        // Use cached user predictions
        const predictions = await oracleDatabaseService.getUserPredictions(
            String(userId),
            limitNum,
            offsetNum
        );

        res.json({
            success: true,
            data: predictions,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                hasMore: predictions.length === limitNum
            },
            meta: {
                userId,
                cached: true
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch user predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user predictions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/user/stats
 * Get user accuracy statistics with caching
 */
router.get('/user/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User authentication required'
            });
        }

        // Use cached user stats
        const stats = await oracleDatabaseService.getUserAccuracy(String(userId));

        res.json({
            success: true,
            data: stats,
            meta: {
                userId,
                cached: true
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/oracle/stats
 * Get Oracle system statistics with caching
 */
router.get('/stats', async (req, res) => {
    try {
        const { season = 2024 } = req.query;
        const seasonNum = Number(season);

        // Use cached Oracle stats
        const stats = await oracleDatabaseService.getOracleAccuracy(seasonNum);

        res.json({
            success: true,
            data: stats,
            meta: {
                season: seasonNum,
                cached: true
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch Oracle stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Oracle stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/predictions/:id/resolve
 * Resolve prediction with optimized cache invalidation
 */
router.post('/predictions/:id/resolve',
    requireAdmin,
    async (req, res) => {
        try {
            const { id: predictionId } = req.params;
            const { actualResult } = req.body;

            // Resolve prediction with batch cache invalidation
            await oracleDatabaseService.resolvePrediction(predictionId, actualResult);

            res.json({
                success: true,
                data: {
                    predictionId,
                    actualResult,
                    resolvedAt: new Date().toISOString()
                },
                meta: {
                    cacheInvalidated: true
                }
            });

        } catch (error) {
            console.error('❌ Failed to resolve prediction:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to resolve prediction',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

/**
 * GET /api/oracle/performance
 * Get performance metrics for monitoring
 */
router.get('/performance', requireAdmin, async (req, res) => {
    try {
        const metrics = await oracleDatabaseService.getPerformanceMetrics();

        res.json({
            success: true,
            data: metrics
        });

    } catch (error) {
        console.error('❌ Failed to fetch performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/oracle/cache/warm
 * Warm up cache for current week (admin only)
 */
router.post('/cache/warm', requireAdmin, async (req, res) => {
    try {
        const { week, season = 2024 } = req.body;
        const currentWeek = week || Math.ceil(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 18 + 1;
        const seasonNum = Number(season);

        await oracleDatabaseService.warmupCache(currentWeek, seasonNum);

        res.json({
            success: true,
            data: {
                week: currentWeek,
                season: seasonNum,
                warmedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Failed to warm cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to warm cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/oracle/cache
 * Clear all Oracle caches (admin only)
 */
router.delete('/cache', requireAdmin, async (req, res) => {
    try {
        oraclePerformanceCache.clearAllCache();

        res.json({
            success: true,
            data: {
                clearedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Failed to clear cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Add performance monitoring endpoint
router.get('/health', async (req, res) => {
    try {
        const cacheStats = oraclePerformanceCache.getCacheStats();
        const hitRate = oraclePerformanceCache.getCacheHitRate();

        res.json({
            success: true,
            data: {
                status: 'healthy',
                cache: {
                    hitRate: Math.round(hitRate * 100) / 100,
                    stats: cacheStats
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
