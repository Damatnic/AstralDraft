/**
 * Production Authentication Middleware
 * JWT token verification and user authentication for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRow } from '../db/index';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'astral-draft-super-secret-key-change-in-production';

// Extended Request interface with user data
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    is_active: boolean;
    subscription?: string;
    isAdmin?: boolean;
  };
}

// JWT Payload interface
interface JWTPayload {
  id: number;
  username: string;
  email: string;
  display_name: string;
  subscription?: string;
  isAdmin?: boolean;
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      });
      return;
    }

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
      return;
    }

    // Verify user exists and is active
    const user = await getRow(`
      SELECT id, email, username, display_name, avatar_url, created_at, subscription, is_admin, is_active
      FROM users 
      WHERE id = ? AND is_active = TRUE
    `, [decoded.id]);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
      return;
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      is_active: user.is_active,
      subscription: user.subscription,
      isAdmin: user.is_admin
    };

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to require admin privileges
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'You must be an administrator to access this resource'
    });
    return;
  }

  next();
};

/**
 * Middleware to require specific subscription level
 */
export const requireSubscription = (minLevel: 'free' | 'premium' | 'oracle_pro') => {
  const subscriptionLevels = { free: 0, premium: 1, oracle_pro: 2 };

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    const userLevel = subscriptionLevels[req.user.subscription as keyof typeof subscriptionLevels];
    const requiredLevel = subscriptionLevels[minLevel];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: 'Subscription upgrade required',
        message: `This feature requires ${minLevel} subscription or higher`,
        requiredSubscription: minLevel,
        currentSubscription: req.user.subscription
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // No token provided, continue without user data
      next();
      return;
    }

    // Try to verify token, but don't fail if invalid
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      const user = await getRow(`
        SELECT id, email, username, display_name, avatar_url, created_at, subscription, is_admin, is_active
        FROM users 
        WHERE id = ? AND is_active = TRUE
      `, [decoded.id]);

      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          is_active: user.is_active,
          subscription: user.subscription,
          isAdmin: user.is_admin
        };
      }
    } catch (jwtError) {
      // Invalid token, continue without user data
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without user data on error
    next();
  }
};

/**
 * Rate limiting for authentication endpoints
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitAuth = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!authAttempts.has(key)) {
      authAttempts.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    const record = authAttempts.get(key)!;
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      next();
      return;
    }

    if (record.count >= maxAttempts) {
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        message: 'Please wait before trying again',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    record.count++;
    next();
  };
};

export default {
  authenticateToken,
  requireAdmin,
  requireSubscription,
  optionalAuth,
  rateLimitAuth
};
