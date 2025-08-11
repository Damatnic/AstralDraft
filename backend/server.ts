/**
 * Astral Draft Backend Server
 * REST API server for Oracle predictions, analytics, and fantasy football data
 */

import express from 'express';
import compression from 'compression';
import { json } from 'body-parser';

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

// Import route handlers
import authRoutes from './routes/auth';
import leagueRoutes from './routes/leagues';
import oracleRoutes from './routes/oracle';
import analyticsRoutes from './routes/analytics';
import socialRoutes from './routes/social';

// Import database connection
import { initDatabase } from './db/index';

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Basic security headers
app.use(securityHeaders);

// CORS configuration
app.use(corsConfig);

// Request logging and monitoring
app.use(securityLogger);

// General API rate limiting
app.use('/api/', generalRateLimit);

// Speed limiting for high-frequency requests
app.use(speedLimiter);

// Body parsing middleware with size limits
app.use(json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(compression());

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

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/oracle', predictionRateLimit, oracleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social', socialRoutes);

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
async function startServer() {
    try {
        // Initialize database connection
        await initDatabase();
        console.log('✅ Database initialized successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Astral Draft API Server running on port ${PORT}`);
            console.log(`📝 Environment: ${NODE_ENV}`);
            console.log(`🔒 Security middleware enabled`);
            console.log(`📊 Oracle API endpoints available at http://localhost:${PORT}/api/oracle`);
            console.log(`📈 Analytics API endpoints available at http://localhost:${PORT}/api/analytics`);
            console.log(`🏈 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
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

// Start the server
startServer();

export default app;
