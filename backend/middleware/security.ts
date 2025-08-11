/**
 * Security Middleware for Astral Draft MVP
 * Optimized for 10-20 concurrent users
 */
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Rate limiting for different endpoint types
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Store rate limit info in memory (fine for 10-20 users)
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health' || req.path === '/api/health';
        }
    });
};

// General API rate limiting (100 requests per 15 minutes per IP)
export const generalRateLimit = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many requests from this IP, please try again later.'
);

// Auth rate limiting (5 login attempts per 15 minutes per IP)
export const authRateLimit = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per window
    'Too many authentication attempts, please try again later.'
);

// Prediction submission rate limiting (30 predictions per hour per IP)
export const predictionRateLimit = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    30, // 30 predictions per hour
    'Too many prediction submissions, please try again later.'
);

// Speed limiting for high-frequency requests
export const speedLimiter = slowDown({
    windowMs: 1 * 60 * 1000, // 1 minute
    delayAfter: 10, // Allow 10 requests per minute without delay
    delayMs: 500, // Add 500ms delay per request after limit
    maxDelayMs: 5000, // Maximum delay of 5 seconds
});

// CORS configuration for production
export const corsConfig = cors({
    origin: (origin, callback) => {
        // Allow requests from localhost for development
        const allowedOrigins = [
            'http://localhost:5173', // Vite dev server
            'http://localhost:3000', // Alternative dev port
            'https://astral-draft.netlify.app', // Production domain
            // Add your production domains here
        ];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
    ],
    maxAge: 86400 // 24 hours
});

// Security headers with Helmet
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "wss:", "ws:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for development compatibility
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Input validation schemas
export const authValidation = {
    register: [
        body('username')
            .isLength({ min: 3, max: 30 })
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Username must be 3-30 characters, alphanumeric with underscores/hyphens only')
            .escape(),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8, max: 128 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must be 8+ characters with uppercase, lowercase, number, and special character'),
        body('display_name')
            .optional()
            .isLength({ min: 1, max: 50 })
            .trim()
            .escape()
            .withMessage('Display name must be 1-50 characters')
    ],
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 1 })
            .withMessage('Password is required')
    ]
};

export const predictionValidation = {
    create: [
        body('id')
            .isLength({ min: 1, max: 100 })
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Prediction ID must be alphanumeric with underscores/hyphens')
            .escape(),
        body('title')
            .isLength({ min: 5, max: 200 })
            .trim()
            .escape()
            .withMessage('Title must be 5-200 characters'),
        body('description')
            .isLength({ min: 10, max: 1000 })
            .trim()
            .escape()
            .withMessage('Description must be 10-1000 characters'),
        body('options')
            .isArray({ min: 2, max: 10 })
            .withMessage('Must provide 2-10 options'),
        body('options.*')
            .isLength({ min: 1, max: 100 })
            .trim()
            .escape()
            .withMessage('Each option must be 1-100 characters'),
        body('category')
            .isIn(['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'Tennis', 'Golf', 'Other'])
            .withMessage('Invalid category'),
        body('week')
            .optional()
            .isInt({ min: 1, max: 17 })
            .withMessage('Week must be 1-17'),
        body('season')
            .optional()
            .isInt({ min: 2020, max: 2030 })
            .withMessage('Season must be 2020-2030'),
        body('closing_time')
            .isISO8601()
            .custom((value) => {
                const closingTime = new Date(value);
                const now = new Date();
                if (closingTime <= now) {
                    throw new Error('Closing time must be in the future');
                }
                return true;
            }),
        body('oracle_choice')
            .isInt({ min: 0, max: 9 })
            .withMessage('Oracle choice must be 0-9'),
        body('oracle_confidence')
            .isInt({ min: 1, max: 100 })
            .withMessage('Oracle confidence must be 1-100')
    ],
    submit: [
        param('predictionId')
            .isLength({ min: 1, max: 100 })
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Invalid prediction ID')
            .escape(),
        body('choice')
            .isInt({ min: 0, max: 9 })
            .withMessage('Choice must be 0-9'),
        body('confidence')
            .isInt({ min: 1, max: 100 })
            .withMessage('Confidence must be 1-100'),
        body('reasoning')
            .optional()
            .isLength({ max: 500 })
            .trim()
            .escape()
            .withMessage('Reasoning must be under 500 characters')
    ]
};

export const analyticsValidation = {
    userStats: [
        param('userId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('User ID must be a positive integer')
    ],
    leaderboard: [
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be 1-100'),
        query('week')
            .optional()
            .isInt({ min: 1, max: 17 })
            .withMessage('Week must be 1-17'),
        query('season')
            .optional()
            .isInt({ min: 2020, max: 2030 })
            .withMessage('Season must be 2020-2030')
    ]
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: 'path' in error ? error.path : 'unknown',
            message: error.msg,
            value: 'value' in error ? error.value : undefined
        }));

        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errorMessages,
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// SQL Injection protection for raw queries
export const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Remove or escape dangerous characters
    return input
        .replace(/['"\\;]/g, '') // Remove quotes and semicolons
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove multi-line comment start
        .replace(/\*\//g, '') // Remove multi-line comment end
        .replace(/xp_/g, '') // Remove extended stored procedure prefix
        .replace(/sp_/g, '') // Remove stored procedure prefix
        .trim();
};

// XSS Protection for user-generated content
export const sanitizeHtml = (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log suspicious patterns
    const suspiciousPatterns = [
        /union\s+select/i,
        /drop\s+table/i,
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i
    ];

    const requestData = JSON.stringify(req.body);
    const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(requestData) || pattern.test(req.url)
    );

    if (isSuspicious) {
        console.warn('🚨 Suspicious request detected:', {
            ip: req.ip,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            body: req.body,
            timestamp: new Date().toISOString()
        });
    }

    // Log all requests in development, errors in production
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'error' : 'info';
        
        if (process.env.NODE_ENV === 'development' || logLevel === 'error') {
            console.log(`${logLevel.toUpperCase()}: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        }
    });

    next();
};

// Content-Type validation
export const validateContentType = (expectedType: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const contentType = req.get('Content-Type');
            if (!contentType?.includes(expectedType)) {
                return res.status(400).json({
                    error: `Expected Content-Type: ${expectedType}`,
                    code: 'INVALID_CONTENT_TYPE',
                    timestamp: new Date().toISOString()
                });
            }
        }
        next();
    };
};

// Request size limiting
export const requestSizeLimit = (maxSize: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxSize) {
            return res.status(413).json({
                error: 'Request entity too large',
                code: 'REQUEST_TOO_LARGE',
                maxSize: `${maxSize} bytes`,
                timestamp: new Date().toISOString()
            });
        }
        next();
    };
};

// IP whitelist for admin functions (if needed)
export const ipWhitelist = (allowedIPs: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIP = req.ip || req.socket.remoteAddress || '';
        
        if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('127.0.0.1')) {
            console.warn(`Access denied for IP: ${clientIP}`);
            return res.status(403).json({
                error: 'Access denied',
                code: 'IP_NOT_ALLOWED',
                timestamp: new Date().toISOString()
            });
        }
        next();
    };
};

export default {
    generalRateLimit,
    authRateLimit,
    predictionRateLimit,
    speedLimiter,
    corsConfig,
    securityHeaders,
    authValidation,
    predictionValidation,
    analyticsValidation,
    handleValidationErrors,
    sanitizeInput,
    sanitizeHtml,
    securityLogger,
    validateContentType,
    requestSizeLimit,
    ipWhitelist
};
