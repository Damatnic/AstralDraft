/**
 * Authentication API Routes
 * REST endpoints for user authentication and profile management
 */

import express from 'express';
import { getRow, getRows, runQuery } from '../db/index';
import { 
    authenticateUser, 
    registerUser, 
    refreshAccessToken, 
    logoutUser,
    logoutUserFromAllDevices,
    updateUserProfile,
    changeUserPassword,
    cleanupExpiredSessions,
    AuthResult 
} from '../services/authService';
import { 
    authenticateToken, 
    rateLimitAuth, 
    recordFailedAuth, 
    clearAuthAttempts,
    validateAuthRequest,
    sanitizeUser 
} from '../middleware/auth';
import {
    authValidation,
    handleValidationErrors
} from '../middleware/security';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return session tokens
 */
router.post('/login', 
    authValidation.login,
    handleValidationErrors,
    rateLimitAuth,
    async (req: express.Request, res: express.Response) => {
    try {
        const { username, password } = req.body;

        const authResult: AuthResult = await authenticateUser(username, password);
        
        // Clear any previous failed auth attempts
        clearAuthAttempts(req);

        res.json({
            success: true,
            data: {
                user: authResult.user,
                tokens: authResult.tokens
            },
            message: 'Login successful'
        });
    } catch (error) {
        // Record failed authentication attempt
        recordFailedAuth(req);
        
        res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: error instanceof Error ? error.message : 'Authentication failed'
        });
    }
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', 
    authValidation.register,
    handleValidationErrors,
    rateLimitAuth,
    async (req: express.Request, res: express.Response) => {
    try {
        const { username, email, password, displayName } = req.body;

        const authResult: AuthResult = await registerUser(username, email, password, displayName);

        res.status(201).json({
            success: true,
            data: {
                user: authResult.user,
                tokens: authResult.tokens
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        let statusCode = 400;
        if (error instanceof Error && error.message.includes('already exists')) {
            statusCode = 409;
        }

        res.status(statusCode).json({
            success: false,
            error: 'Registration failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: express.Request, res: express.Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const tokens = await refreshAccessToken(refreshToken);

        res.json({
            success: true,
            data: { tokens },
            message: 'Tokens refreshed successfully'
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token',
            message: error instanceof Error ? error.message : 'Token refresh failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 */
router.post('/logout', async (req: express.Request, res: express.Response) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await logoutUser(refreshToken);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/auth/logout-all
 * Logout user from all devices
 */
router.post('/logout-all', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        await logoutUserFromAllDevices(req.user.id);

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/auth/profile
 * Get user profile information with stats
 */
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Get user stats
        const userStats = await getRow(`
            SELECT 
                COUNT(DISTINCT lm.league_id) as leagues_joined,
                COUNT(DISTINCT up.id) as total_predictions,
                SUM(up.points_earned) as total_points,
                AVG(up.confidence) as avg_confidence,
                SUM(CASE WHEN op.oracle_choice != op.actual_result AND up.user_choice = op.actual_result THEN 1 ELSE 0 END) as oracle_beats,
                SUM(CASE WHEN up.user_choice = op.actual_result THEN 1 ELSE 0 END) as correct_predictions
            FROM users u
            LEFT JOIN league_memberships lm ON u.id = lm.user_id AND lm.is_active = 1
            LEFT JOIN user_predictions up ON u.id = up.user_id
            LEFT JOIN oracle_predictions op ON up.prediction_id = op.id AND op.is_resolved = 1
            WHERE u.id = ?
            GROUP BY u.id
        `, [req.user.id]);

        const profileData = {
            ...req.user,
            stats: {
                leagues_joined: userStats?.leagues_joined || 0,
                total_predictions: userStats?.total_predictions || 0,
                total_points: userStats?.total_points || 0,
                avg_confidence: userStats?.avg_confidence ? Math.round(userStats.avg_confidence * 100) / 100 : 0,
                oracle_beats: userStats?.oracle_beats || 0,
                correct_predictions: userStats?.correct_predictions || 0,
                accuracy_rate: userStats?.total_predictions > 0 ? 
                    Math.round((userStats.correct_predictions / userStats.total_predictions) * 10000) / 100 : 0
            }
        };

        res.json({
            success: true,
            data: { user: profileData }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile information
 */
router.put('/profile', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { displayName, avatarUrl, email } = req.body;
        
        const updates: any = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
        if (email !== undefined) updates.email = email;

        const updatedUser = await updateUserProfile(req.user.id, updates);

        res.json({
            success: true,
            data: { user: updatedUser },
            message: 'Profile updated successfully'
        });
    } catch (error) {
        let statusCode = 400;
        if (error instanceof Error && error.message.includes('already exists')) {
            statusCode = 409;
        }

        res.status(statusCode).json({
            success: false,
            error: 'Failed to update profile',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
router.put('/password', 
    authenticateToken, 
    validateAuthRequest(['currentPassword', 'newPassword']),
    async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { currentPassword, newPassword } = req.body;

        await changeUserPassword(req.user.id, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully. You have been logged out from all devices for security.'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: 'Failed to change password',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/auth/verify
 * Verify if current token is valid
 */
router.get('/verify', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        res.json({
            success: true,
            data: { 
                user: sanitizeUser(req.user),
                tokenValid: true
            },
            message: 'Token is valid'
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Token verification failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/auth/profile/avatar
 * Update user avatar URL
 */
router.put('/profile/avatar', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { avatarUrl } = req.body;

        if (!avatarUrl || typeof avatarUrl !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Valid avatar URL is required'
            });
        }

        await updateUserProfile(req.user.id, { avatarUrl });

        res.json({
            success: true,
            data: { avatarUrl },
            message: 'Avatar updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update avatar',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/auth/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const sessions = await getRows(`
            SELECT 
                id, 
                device_info, 
                ip_address, 
                last_activity, 
                created_at,
                CASE WHEN expires_at > datetime('now') THEN 1 ELSE 0 END as is_active
            FROM user_sessions 
            WHERE user_id = ? 
            ORDER BY last_activity DESC
        `, [req.user.id]);

        res.json({
            success: true,
            data: sessions.map(session => ({
                id: session.id,
                deviceInfo: session.device_info,
                ipAddress: session.ip_address,
                lastActivity: session.last_activity,
                createdAt: session.created_at,
                isActive: Boolean(session.is_active)
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req: express.Request, res: express.Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const { sessionId } = req.params;

        await runQuery(`
            DELETE FROM user_sessions 
            WHERE id = ? AND user_id = ?
        `, [sessionId, req.user.id]);

        res.json({
            success: true,
            message: 'Session revoked successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to revoke session',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Cleanup expired sessions periodically (run every hour)
if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
        try {
            await cleanupExpiredSessions();
        } catch (error) {
            console.error('Session cleanup failed:', error);
        }
    }, 60 * 60 * 1000); // 1 hour
}

export default router;
