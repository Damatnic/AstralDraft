/**
 * Secure Session Management Middleware
 * Implements httpOnly cookies, CSRF protection, and secure token handling
 */

import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import csrf from 'csrf';
import { createHash, randomBytes } from 'crypto';

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const CSRF_SECRET = process.env.CSRF_SECRET || randomBytes(32).toString('hex');

// Cookie configuration for production
const COOKIE_CONFIG = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for access token
    path: '/'
};

const REFRESH_COOKIE_CONFIG = {
    ...COOKIE_CONFIG,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh token
    name: 'refresh_token'
};

// CSRF token generator
const csrfTokens = new csrf();

// Session store configuration (using memory store for development)
// In production, use Redis or MongoDB
export const sessionConfig = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId', // Don't use default 'connect.sid'
    rolling: true, // Reset expiry on activity
});

/**
 * Set secure JWT cookies
 */
export function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    // Set access token cookie
    res.cookie('access_token', accessToken, {
        ...COOKIE_CONFIG,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set refresh token cookie with longer expiry
    res.cookie('refresh_token', refreshToken, {
        ...COOKIE_CONFIG,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/api/auth/refresh' // Restrict refresh token to refresh endpoint
    });
}

/**
 * Clear authentication cookies
 */
export function clearTokenCookies(res: Response): void {
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    
    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh'
    });
    
    res.clearCookie('csrf_token', {
        httpOnly: false, // CSRF token needs to be readable by client
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
}

/**
 * Extract token from httpOnly cookie or Authorization header
 */
export function extractToken(req: Request): string | null {
    // First check cookies
    const cookieToken = req.cookies?.access_token;
    if (cookieToken) {
        return cookieToken;
    }

    // Fall back to Authorization header for API clients
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

/**
 * Extract refresh token from cookie
 */
export function extractRefreshToken(req: Request): string | null {
    return req.cookies?.refresh_token || null;
}

/**
 * Generate CSRF token for session
 */
export function generateCSRFToken(req: Request): string {
    const secret = req.session?.csrfSecret || csrfTokens.secretSync();
    
    // Store secret in session
    if (req.session) {
        req.session.csrfSecret = secret;
    }
    
    return csrfTokens.create(secret);
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(req: Request, token: string): boolean {
    const secret = req.session?.csrfSecret;
    if (!secret) {
        return false;
    }
    
    try {
        return csrfTokens.verify(secret, token);
    } catch {
        return false;
    }
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip for certain routes (configure as needed)
    const skipRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
    if (skipRoutes.includes(req.path)) {
        return next();
    }

    // Get CSRF token from header or body
    const token = req.headers['x-csrf-token'] as string || 
                  req.body?._csrf || 
                  req.query?._csrf as string;

    if (!token || !verifyCSRFToken(req, token)) {
        res.status(403).json({
            success: false,
            error: 'Invalid CSRF token',
            code: 'CSRF_VALIDATION_FAILED'
        });
        return;
    }

    next();
}

/**
 * Set CSRF token cookie and header
 */
export function setCSRFToken(req: Request, res: Response, next: NextFunction): void {
    if (!req.session) {
        return next();
    }

    const token = generateCSRFToken(req);
    
    // Set as cookie (readable by client)
    res.cookie('csrf_token', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Also set as response header
    res.setHeader('X-CSRF-Token', token);
    
    next();
}

/**
 * Session fingerprinting for additional security
 */
export function generateSessionFingerprint(req: Request): string {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        req.ip || req.socket.remoteAddress || ''
    ];
    
    return createHash('sha256')
        .update(components.join('|'))
        .digest('hex');
}

/**
 * Verify session fingerprint
 */
export function verifySessionFingerprint(req: Request): boolean {
    if (!req.session?.fingerprint) {
        return false;
    }
    
    const currentFingerprint = generateSessionFingerprint(req);
    return req.session.fingerprint === currentFingerprint;
}

/**
 * Session security middleware
 */
export function sessionSecurity(req: Request, res: Response, next: NextFunction): void {
    if (!req.session) {
        return next();
    }

    // Set fingerprint on new session
    if (!req.session.fingerprint) {
        req.session.fingerprint = generateSessionFingerprint(req);
    } else {
        // Verify fingerprint on existing session
        if (!verifySessionFingerprint(req)) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });
            
            return res.status(401).json({
                success: false,
                error: 'Session security violation',
                code: 'SESSION_FINGERPRINT_MISMATCH'
            });
        }
    }

    // Regenerate session ID periodically (every 5 minutes)
    const now = Date.now();
    const lastRegeneration = req.session.lastRegeneration || now;
    
    if (now - lastRegeneration > 5 * 60 * 1000) {
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
            } else {
                req.session.lastRegeneration = now;
                req.session.fingerprint = generateSessionFingerprint(req);
            }
            next();
        });
    } else {
        next();
    }
}

// Extend Express session interface
declare module 'express-session' {
    interface SessionData {
        csrfSecret?: string;
        fingerprint?: string;
        lastRegeneration?: number;
        userId?: number;
        refreshTokenFamily?: string;
    }
}

export default {
    sessionConfig,
    setTokenCookies,
    clearTokenCookies,
    extractToken,
    extractRefreshToken,
    generateCSRFToken,
    verifyCSRFToken,
    csrfProtection,
    setCSRFToken,
    sessionSecurity
};