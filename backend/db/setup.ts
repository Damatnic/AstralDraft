/**
 * Database Setup and Initialization Script
 * Integrates existing schema with enhanced simple auth and Oracle features
 */

import { initDatabase, seedDatabase } from './index';
import { createEnhancedTables, seedSimpleAuthUsers } from './enhanced-schema';
import { createPaymentTables, createPaymentIndexes } from './payment-schema';
import { applyConstraintMigrations, validateDatabaseIntegrity } from './constraints-migration';

/**
 * Complete database setup for Astral Draft Oracle system
 */
async function setupCompleteDatabase(): Promise<{
    success: boolean;
    message: string;
    validation?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
}> {
    try {
        console.log('🚀 Starting complete database setup...');

        // Step 1: Initialize base database
        console.log('📁 Initializing base database schema...');
        await initDatabase();

        // Step 2: Create enhanced tables for simple auth and Oracle features
        console.log('⚡ Creating enhanced tables for authentication and Oracle...');
        await createEnhancedTables();

        // Step 3: Create payment tables for Stripe integration
        console.log('💳 Creating payment tables for Stripe integration...');
        await createPaymentTables();
        await createPaymentIndexes();

        // Step 4: Seed base database (if needed)
        console.log('🌱 Seeding base database...');
        await seedDatabase();

        // Step 5: Seed simple authentication users
        console.log('👥 Setting up simple authentication users...');
        await seedSimpleAuthUsers();

        // Step 6: Apply database constraints and validation rules for 10-user setup
        console.log('🔧 Applying database constraints and validation rules...');
        await applyConstraintMigrations();

        // Step 7: Validate entire database including new constraints
        console.log('🔍 Validating database integrity with constraints...');
        const validation = await validateDatabaseIntegrity();

        if (validation.isValid) {
            console.log('✅ Database setup completed successfully!');
            return {
                success: true,
                message: 'Database setup completed successfully with all tables, indexes, and initial data.',
                validation
            };
        } else {
            console.log('⚠️ Database setup completed with warnings.');
            return {
                success: true,
                message: 'Database setup completed but validation found some issues.',
                validation
            };
        }

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        return {
            success: false,
            message: `Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Quick database status check
 */
async function checkDatabaseStatus(): Promise<{
    isInitialized: boolean;
    hasEnhancedTables: boolean;
    hasSimpleAuthUsers: boolean;
    userCount: number;
    predictionCount: number;
}> {
    try {
        const { getRow } = await import('./index');

        // Check if base tables exist
        const baseTablesCheck = await getRow(`
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='table' AND name IN ('users', 'oracle_predictions', 'user_predictions')
        `);

        // Check if enhanced tables exist
        const enhancedTablesCheck = await getRow(`
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='table' AND name IN ('simple_auth_users', 'enhanced_oracle_predictions', 'enhanced_user_predictions')
        `);

        let userCount = 0;
        let predictionCount = 0;
        let hasSimpleAuthUsers = false;

        if (enhancedTablesCheck.count >= 1) {
            // Check simple auth users
            const simpleAuthUsersCheck = await getRow('SELECT COUNT(*) as count FROM simple_auth_users');
            userCount = simpleAuthUsersCheck.count;
            hasSimpleAuthUsers = userCount > 0;

            // Check predictions
            const predictionsCheck = await getRow('SELECT COUNT(*) as count FROM enhanced_oracle_predictions');
            predictionCount = predictionsCheck.count;
        }

        return {
            isInitialized: baseTablesCheck.count >= 2,
            hasEnhancedTables: enhancedTablesCheck.count >= 2,
            hasSimpleAuthUsers,
            userCount,
            predictionCount
        };

    } catch (error) {
        console.error('Error checking database status:', error);
        return {
            isInitialized: false,
            hasEnhancedTables: false,
            hasSimpleAuthUsers: false,
            userCount: 0,
            predictionCount: 0
        };
    }
}

/**
 * Reset database (development only)
 */
async function resetDatabase(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Database reset not allowed in production');
        return false;
    }

    try {
        console.log('🧹 Resetting database...');
        const { runQuery } = await import('./index');

        // Drop enhanced tables first (due to foreign keys)
        const enhancedTables = [
            'enhanced_user_predictions',
            'user_statistics',
            'leaderboard_rankings',
            'user_achievements',
            'system_notifications',
            'prediction_updates',
            'enhanced_oracle_predictions',
            'simple_auth_users'
        ];

        for (const table of enhancedTables) {
            await runQuery(`DROP TABLE IF EXISTS ${table}`);
        }

        // Drop base tables
        const baseTables = [
            'user_predictions',
            'oracle_predictions',
            'user_sessions',
            'users'
        ];

        for (const table of baseTables) {
            await runQuery(`DROP TABLE IF EXISTS ${table}`);
        }

        console.log('✅ Database reset completed');
        return true;

    } catch (error) {
        console.error('❌ Database reset failed:', error);
        return false;
    }
}

/**
 * Backup database (create a copy)
 */
async function backupDatabase(backupPath?: string): Promise<string | null> {
    try {
        const path = await import('path');
        const fs = await import('fs');
        
        const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'astral-draft.db');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultBackupPath = path.join(
            path.dirname(dbPath), 
            `astral-draft-backup-${timestamp}.db`
        );
        
        const finalBackupPath = backupPath || defaultBackupPath;

        // Copy the database file
        fs.copyFileSync(dbPath, finalBackupPath);
        
        console.log(`📦 Database backed up to: ${finalBackupPath}`);
        return finalBackupPath;

    } catch (error) {
        console.error('❌ Database backup failed:', error);
        return null;
    }
}

export {
    setupCompleteDatabase,
    checkDatabaseStatus,
    resetDatabase,
    backupDatabase
};
