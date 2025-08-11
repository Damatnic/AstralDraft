/**
 * Complete Oracle Backend Server
 * Integrates enhanced Oracle API with real-time WebSocket server
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { databaseService } from './services/databaseService';
import enhancedOracleRouter from './routes/enhancedOracle';
import { OracleWebSocketServer } from './services/oracleWebSocketServer';

// Server configuration
const EXPRESS_PORT = process.env.ORACLE_API_PORT || 8767;
const WEBSOCKET_PORT = process.env.ORACLE_WS_PORT || 8766;

export class OracleBackendServer {
    private app: express.Application;
    private httpServer: any;
    private wsServer: OracleWebSocketServer | null = null;
    private isInitialized = false;

    constructor() {
        this.app = express();
        this.setupExpress();
        this.httpServer = createServer(this.app);
    }

    private setupExpress(): void {
        // Middleware
        this.app.use(cors({
            origin: ['http://localhost:8765', 'http://localhost:3000'], // Allow frontend ports
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
            next();
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'Oracle Backend Server',
                timestamp: new Date().toISOString(),
                database: this.isInitialized ? 'connected' : 'disconnected',
                websocket: this.wsServer ? 'running' : 'stopped'
            });
        });

        // Database status endpoint
        this.app.get('/api/oracle/status', async (req, res) => {
            try {
                const dbStatus = await databaseService.getStatus();
                const wsStats = this.wsServer ? this.wsServer.getStats() : null;

                res.json({
                    success: true,
                    database: dbStatus,
                    websocket: wsStats,
                    server: {
                        expressPort: EXPRESS_PORT,
                        websocketPort: WEBSOCKET_PORT,
                        uptime: process.uptime(),
                        environment: process.env.NODE_ENV || 'development'
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to get server status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Oracle API routes
        this.app.use('/api/oracle', enhancedOracleRouter);

        // Error handling middleware
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('❌ Express error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                message: `${req.method} ${req.originalUrl} is not a valid endpoint`
            });
        });
    }

    public async start(): Promise<void> {
        try {
            console.log('🚀 Starting Oracle Backend Server...');

            // Initialize database
            console.log('📁 Initializing database service...');
            this.isInitialized = await databaseService.initialize();
            
            if (!this.isInitialized) {
                throw new Error('Database initialization failed');
            }

            // Start WebSocket server
            console.log('🔮 Starting Oracle WebSocket server...');
            this.wsServer = new OracleWebSocketServer(Number(WEBSOCKET_PORT));

            // Start Express server
            console.log('🌐 Starting Oracle API server...');
            this.httpServer.listen(EXPRESS_PORT, () => {
                console.log('✅ Oracle Backend Server started successfully!');
                console.log(`📡 API Server: http://localhost:${EXPRESS_PORT}`);
                console.log(`🔮 WebSocket Server: ws://localhost:${WEBSOCKET_PORT}`);
                console.log(`📊 Database: ${this.isInitialized ? 'Connected' : 'Disconnected'}`);
                console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
            });

            // Handle server errors
            this.httpServer.on('error', (error: any) => {
                console.error('❌ HTTP server error:', error);
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${EXPRESS_PORT} is already in use. Please use a different port.`);
                }
                process.exit(1);
            });

        } catch (error) {
            console.error('❌ Failed to start Oracle Backend Server:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        console.log('⏹️ Stopping Oracle Backend Server...');

        if (this.wsServer) {
            this.wsServer.close();
        }

        if (this.httpServer) {
            this.httpServer.close();
        }

        console.log('✅ Oracle Backend Server stopped');
    }

    public getStatus() {
        return {
            initialized: this.isInitialized,
            expressPort: EXPRESS_PORT,
            websocketPort: WEBSOCKET_PORT,
            websocketStats: this.wsServer ? this.wsServer.getStats() : null
        };
    }
}

// Create and export server instance
export const oracleServer = new OracleBackendServer();

// Auto-start if this file is run directly
if (require.main === module) {
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n⏹️ Received SIGINT, shutting down gracefully...');
        await oracleServer.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n⏹️ Received SIGTERM, shutting down gracefully...');
        await oracleServer.stop();
        process.exit(0);
    });

    // Start the server
    oracleServer.start().catch((error) => {
        console.error('❌ Failed to start Oracle server:', error);
        process.exit(1);
    });
}

export default oracleServer;
