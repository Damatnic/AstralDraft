/**
 * Authentication Middleware
 * JWT token verification and user authentication for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById, JWTPayload } from '../services/authService';
import { extractToken } from './sessionManager';

// Define a user type for clarity
interface AuthenticatedUser {
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
}

// Extend Express Request interface to include optional user and tokenPayload
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
            tokenPayload?: JWTPayload;
        }
    }
}

// Create a more specific request type for authenticated routes
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
    tokenPayload: JWTPayload;
}

/**
 * Middleware to authenticate JWT tokens from cookies or headers
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract token from cookie or Authorization header
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
            return;
        }

        // Verify token
        const payload = verifyToken(token);
        
        if (payload.type !== 'access') {
            res.status(401).json({
                success: false,
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
            return;
        }

        // Get user data
        const user = await getUserById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found or inactive',
                code: 'USER_NOT_FOUND'
            });
            return;
        }

        // Attach user and token data to request
        req.user = user;
        req.tokenPayload = payload;

        // We can now safely cast the request to our authenticated type
        next();
    } catch (error) {
        let errorCode = 'TOKEN_INVALID';
        let errorMessage = 'Invalid or expired token';

        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                errorCode = 'TOKEN_EXPIRED';
                errorMessage = 'Token has expired';
            } else if (error.message.includes('Invalid')) {
                errorMessage = 'Invalid token';
            }
        }

        res.status(401).json({
            success: false,
            error: errorMessage,
            code: errorCode
        });
    }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Extract token from cookie or Authorization header
        const token = extractToken(req);

        if (token) {
            const payload = verifyToken(token);
            
            if (payload.type === 'access') {
                const user = await getUserById(payload.userId);
                if (user) {
                    req.user = user;
                    req.tokenPayload = payload;
                }
            }
        }

        next();
    } catch (error) {
        // Log error for debugging but continue without authentication
        console.debug('Optional auth failed:', error instanceof Error ? error.message : 'Unknown error');
        next();
    }
}

/**
 * Middleware to check if user has admin privileges
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
        return;
    }

    // Check if user has admin role (you might want to add a role field to users table)
    // For now, we'll check if it's a specific admin user
    if (req.user.username !== 'admin' && req.user.id !== 1) {
        res.status(403).json({
            success: false,
            error: 'Admin privileges required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }

    next();
}

/**
 * Middleware to extract user ID from token (for convenience)
 */
export function getCurrentUserId(req: Request): number | null {
    return req.user?.id || null;
}

/**
 * Rate limiting middleware for authentication endpoints
 */
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_AUTH_ATTEMPTS = 5;
const AUTH_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const attempts = authAttempts.get(clientIp);
    
    if (attempts) {
        // Reset if lockout period has passed
        if (now - attempts.lastAttempt > AUTH_LOCKOUT_DURATION) {
            authAttempts.delete(clientIp);
        } else if (attempts.count >= MAX_AUTH_ATTEMPTS) {
            res.status(429).json({
                success: false,
                error: 'Too many authentication attempts. Please try again later.',
                code: 'RATE_LIMITED',
                retryAfter: Math.ceil((AUTH_LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 1000)
            });
            return;
        }
    }
    
    next();
}

/**
 * Record failed authentication attempt
 */
export function recordFailedAuth(req: Request): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const attempts = authAttempts.get(clientIp);
    
    if (attempts) {
        attempts.count++;
        attempts.lastAttempt = now;
    } else {
        authAttempts.set(clientIp, { count: 1, lastAttempt: now });
    }
}

/**
 * Clear authentication attempts for successful login
 */
export function clearAuthAttempts(req: Request): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    authAttempts.delete(clientIp);
}

/**
 * Middleware to validate request body for common auth operations
 */
export function validateAuthRequest(requiredFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
                code: 'MISSING_FIELDS',
                missingFields
            });
            return;
        }
        
        next();
    };
}

/**
 * Sanitize user data for API responses
 */
export function sanitizeUser(user: any) {
    const { password_hash, is_active, ...sanitized } = user;
    return sanitized;
}
