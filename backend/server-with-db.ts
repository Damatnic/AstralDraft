/**
 * Server startup script with database initialization
 * Extends the existing server to include our enhanced database setup
 */

import { databaseService } from './services/databaseService';

/**
 * Initialize database and start server
 */
export async function startServerWithDatabase(): Promise<void> {
    try {
        console.log('🚀 Starting Astral Draft server with database...');

        // Initialize database first
        console.log('📁 Initializing database...');
        const dbInitialized = await databaseService.initialize();
        
        if (!dbInitialized) {
            console.error('❌ Failed to initialize database. Server startup aborted.');
            process.exit(1);
        }

        // Get database status
        const dbStatus = await databaseService.getStatus();
        console.log('📊 Database Status:', {
            initialized: dbStatus.isInitialized,
            enhancedTables: dbStatus.hasEnhancedTables,
            simpleAuthUsers: dbStatus.hasSimpleAuthUsers,
            userCount: dbStatus.userCount,
            predictionCount: dbStatus.predictionCount
        });

        // Import and start the existing server
        console.log('🌐 Starting Express server...');
        const { default: server } = await import('./server');
        
        console.log('✅ Astral Draft server with database started successfully!');
        console.log('🔮 Oracle predictions and authentication system ready');
        console.log('📱 Available at: http://localhost:8765');

    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Auto-start if this file is run directly
if (require.main === module) {
    startServerWithDatabase();
}

export { databaseService };
