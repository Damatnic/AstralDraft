/**
 * Enhanced Authentication Routes
 * Secure API endpoints for authentication with advanced security features
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import EnhancedAuthService from '../../services/enhancedAuthService';
import { applySecurityEnhanced, validateSecureSession } from '../middleware/securityEnhanced';

const router = express.Router();

// Apply enhanced security middleware to all auth routes
router.use(applySecurityEnhanced);

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        error: 'Too many authentication attempts',
        code: 'RATE_LIMITED',
        retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip + ':' + (req.body.playerNumber || 'unknown');
    }
});

// Strict rate limiting for PIN changes
const pinChangeRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 PIN changes per hour
    message: {
        error: 'Too many PIN change attempts',
        code: 'PIN_CHANGE_LIMITED'
    }
});

/**
 * POST /auth/login
 * Secure login with enhanced security checks
 */
router.post('/login', authRateLimit, async (req, res) => {
    try {
        const { playerNumber, pin, rememberMe } = req.body;

        if (!playerNumber || !pin) {
            return res.status(400).json({
                success: false,
                error: 'Player number and PIN are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Parse player number
        const playerNum = parseInt(playerNumber);
        if (isNaN(playerNum) || playerNum < 1 || playerNum > 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid player number (must be 1-10)',
                code: 'INVALID_PLAYER_NUMBER'
            });
        }

        // Attempt secure login
        const result = await EnhancedAuthService.secureLogin({
            playerNumber: playerNum,
            pin,
            rememberMe: Boolean(rememberMe),
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
        });

        if (result.success && result.session) {
            // Set secure HTTP-only cookies
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                maxAge: result.session.expiresAt - Date.now()
            };

            res.cookie('accessToken', result.session.accessToken, cookieOptions);
            res.cookie('refreshToken', result.session.refreshToken, {
                ...cookieOptions,
                maxAge: result.session.refreshExpiresAt - Date.now()
            });

            // Return session info (without tokens for security)
            res.json({
                success: true,
                user: result.session.user,
                expiresAt: result.session.expiresAt
            });
        } else {
            // Return error with appropriate status code
            const statusCode = result.code === 'ACCOUNT_LOCKED' ? 423 : 401;
            res.status(statusCode).json({
                success: false,
                error: result.error,
                code: result.code,
                lockedUntil: result.lockedUntil
            });
        }

    } catch (error) {
        console.error('Login route error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication service error',
            code: 'SERVICE_ERROR'
        });
    }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }

        const result = await EnhancedAuthService.refreshSession(refreshToken);

        if (result.success && result.session) {
            // Update access token cookie
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                maxAge: result.session.expiresAt - Date.now()
            };

            res.cookie('accessToken', result.session.accessToken, cookieOptions);

            res.json({
                success: true,
                expiresAt: result.session.expiresAt
            });
        } else {
            // Clear invalid cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            res.status(401).json({
                success: false,
                error: result.error,
                code: result.code
            });
        }

    } catch (error) {
        console.error('Refresh route error:', error);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            code: 'REFRESH_ERROR'
        });
    }
});

/**
 * POST /auth/logout
 * Secure logout with session cleanup
 */
router.post('/logout', validateSecureSession, async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (accessToken) {
            await EnhancedAuthService.secureLogout(accessToken);
        }

        // Clear authentication cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({ success: true });

    } catch (error) {
        console.error('Logout route error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
});

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', validateSecureSession, async (req, res) => {
    try {
        const user = (req as any).user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        await EnhancedAuthService.logoutAllDevices(user.id);

        // Clear current session cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.json({ success: true });

    } catch (error) {
        console.error('Logout all route error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout all failed',
            code: 'LOGOUT_ALL_ERROR'
        });
    }
});

/**
 * POST /auth/change-pin
 * Change user PIN with security validation
 */
router.post('/change-pin', pinChangeRateLimit, validateSecureSession, async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        const user = (req as any).user;

        if (!currentPin || !newPin) {
            return res.status(400).json({
                success: false,
                error: 'Current PIN and new PIN are required',
                code: 'MISSING_PINS'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        const result = await EnhancedAuthService.changePin(
            user.id,
            currentPin,
            newPin,
            req.get('User-Agent'),
            req.ip
        );

        if (result.success) {
            // Clear all cookies since sessions are invalidated
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            res.json({
                success: true,
                message: 'PIN changed successfully. Please log in again.'
            });
        } else {
            const statusCode = result.code === 'INVALID_CURRENT_PIN' ? 401 : 400;
            res.status(statusCode).json({
                success: false,
                error: result.error,
                code: result.code
            });
        }

    } catch (error) {
        console.error('Change PIN route error:', error);
        res.status(500).json({
            success: false,
            error: 'PIN change failed',
            code: 'PIN_CHANGE_ERROR'
        });
    }
});

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', validateSecureSession, async (req, res) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                playerNumber: user.playerNumber,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                colorTheme: user.colorTheme,
                emoji: user.emoji,
                isAdmin: user.isAdmin,
                lastLoginAt: user.lastLoginAt
            }
        });

    } catch (error) {
        console.error('Get user route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information',
            code: 'USER_INFO_ERROR'
        });
    }
});

/**
 * GET /auth/security-stats
 * Get security statistics (admin only)
 */
router.get('/security-stats', validateSecureSession, async (req, res) => {
    try {
        const user = (req as any).user;

        if (!user?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                code: 'ADMIN_REQUIRED'
            });
        }

        const stats = await EnhancedAuthService.getSecurityStats();

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Security stats route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get security statistics',
            code: 'STATS_ERROR'
        });
    }
});

export default router;
