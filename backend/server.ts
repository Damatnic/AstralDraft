/**
 * Astral Draft Backend Server
 * REST API server for Oracle predictions, analytics, and fantasy football data
 */

import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Import security middleware
import {
    generalRateLimit,
    authRateLimit,
    predictionRateLimit,
    speedLimiter,
    corsConfig,
    securityHeaders,
    securityLogger,
    validateContentType,
    requestSizeLimit
} from './middleware/security';

// Import enhanced security middleware
import {
    applySecurityEnhanced,
    productionApiLimit,
    enhancedSpeedLimiter,
    sanitizeRequest,
    enhancedValidationHandler
} from './middleware/securityEnhanced';

// Import session management
import {
    sessionConfig,
    csrfProtection,
    setCSRFToken,
    sessionSecurity
} from './middleware/sessionManager';

// Import route handlers
import authRoutes from './routes/auth';
import enhancedAuthRoutes from './routes/enhancedAuth';
import leagueRoutes from './routes/leagues';
import oracleRoutes from './routes/oracle';
import analyticsRoutes from './routes/analytics';
import socialRoutes from './routes/social';
import apiProxyRoutes from './routes/apiProxy';

// Import database connection
import { initDatabase } from './db/index';

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Cookie parser with secret for signed cookies
app.use(cookieParser(process.env.COOKIE_SECRET || 'change-this-secret-in-production'));

// Session configuration
app.use(sessionConfig);

// Enhanced security headers with XSS protection
app.use(securityHeaders);
app.use(applySecurityEnhanced);

// CORS configuration
app.use(corsConfig);

// Request logging and monitoring
app.use(securityLogger);

// Session security (fingerprinting and regeneration)
app.use(sessionSecurity);

// Input sanitization for all requests
app.use(sanitizeRequest);

// Production API rate limiting (20-30 requests)
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', productionApiLimit);
    app.use(enhancedSpeedLimiter);
} else {
    app.use('/api/', generalRateLimit);
    app.use(speedLimiter);
}

// Body parsing middleware with size limits
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// CSRF token generation for state-changing requests
app.use('/api/', setCSRFToken);

// Content-Type validation for JSON endpoints
app.use('/api/', validateContentType('application/json'));

// Request size validation
app.use('/api/', requestSizeLimit(1024 * 1024)); // 1MB limit

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: '1.0.0'
    });
});

// API Routes with specific rate limiting and CSRF protection
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/auth-enhanced', enhancedAuthRoutes); // Enhanced authentication with built-in rate limiting

// Protected routes with CSRF protection
app.use('/api/leagues', csrfProtection, leagueRoutes);
app.use('/api/oracle', csrfProtection, predictionRateLimit, oracleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social', csrfProtection, socialRoutes);
app.use('/api/proxy', apiProxyRoutes); // Secure API proxy endpoints

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: [
            'GET /health',
            'POST /api/auth/login',
            'GET /api/oracle/predictions',
            'POST /api/oracle/predictions',
            'GET /api/analytics/accuracy',
            'GET /api/social/leagues'
        ]
    });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${err.stack}`);
    
    const isDev = NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(isDev && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        path: req.path
    });
});

// Initialize database and start server
export async function startServer() {
    return new Promise<import('http').Server>(async (resolve, reject) => {
        try {
            // Initialize database connection
            await initDatabase();
            console.log('✅ Database initialized successfully');

            // Start server
            const server = app.listen(PORT, () => {
                console.log(`🚀 Astral Draft API Server running on port ${PORT}`);
                console.log(`📝 Environment: ${NODE_ENV}`);
                console.log(`🔒 Enhanced security middleware enabled:`);
                console.log(`   ✅ httpOnly cookies for JWT tokens`);
                console.log(`   ✅ CSRF protection enabled`);
                console.log(`   ✅ XSS protection headers`);
                console.log(`   ✅ Input sanitization active`);
                console.log(`   ✅ Rate limiting: ${NODE_ENV === 'production' ? '20-30 req/window' : '100 req/window'}`);
                console.log(`   ✅ Refresh token rotation enabled`);
                console.log(`📊 Oracle API endpoints available at http://localhost:${PORT}/api/oracle`);
                console.log(`📈 Analytics API endpoints available at http://localhost:${PORT}/api/analytics`);
                console.log(`🏈 Health check: http://localhost:${PORT}/health`);
                resolve(server);
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            reject(error);
        }
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
