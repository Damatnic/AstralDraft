/**
 * Database Migration System for 10-User Astral Draft
 * Focused on reliability for small friend group, not enterprise scale
 */

import { runQuery, getRow } from './index';

export interface Migration {
    id: string;
    name: string;
    description: string;
    sql: string[];
    rollback?: string[];
    version: number;
}

/**
 * Create migrations table to track applied migrations
 */
async function createMigrationsTable(): Promise<void> {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS migrations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            version INTEGER NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            checksum TEXT
        )
    `);
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(migrationId: string): Promise<boolean> {
    const result = await getRow(
        'SELECT id FROM migrations WHERE id = ?',
        [migrationId]
    );
    return !!result;
}

/**
 * Apply a migration and track it
 */
async function applyMigration(migration: Migration): Promise<void> {
    console.log(`📦 Applying migration: ${migration.name}`);
    
    try {
        // Execute all SQL statements in the migration
        for (const sql of migration.sql) {
            await runQuery(sql);
        }

        // Record migration as applied
        await runQuery(
            'INSERT INTO migrations (id, name, description, version) VALUES (?, ?, ?, ?)',
            [migration.id, migration.name, migration.description, migration.version]
        );

        console.log(`✅ Migration applied successfully: ${migration.name}`);
    } catch (error) {
        console.error(`❌ Migration failed: ${migration.name}`, error);
        throw error;
    }
}

/**
 * Database constraints and validation rules for 10-user setup
 */
export const constraintMigrations: Migration[] = [
    {
        id: 'add_foreign_key_constraints_v1',
        name: 'Add Foreign Key Constraints',
        description: 'Add proper foreign key constraints for data integrity',
        version: 1,
        sql: [
            // Enable foreign keys globally
            'PRAGMA foreign_keys = ON',
            
            // Add missing foreign key constraints and indexes for users table
            `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
            `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
            `CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)`,
            
            // User sessions constraints and indexes
            `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token)`,
            `CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`,
            
            // Oracle predictions indexes for performance
            `CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week ON oracle_predictions(week, season)`,
            `CREATE INDEX IF NOT EXISTS idx_oracle_predictions_type ON oracle_predictions(type)`,
            `CREATE INDEX IF NOT EXISTS idx_oracle_predictions_resolved ON oracle_predictions(is_resolved)`,
            
            // User predictions constraints and indexes
            `CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_id ON user_predictions(prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_predictions_points ON user_predictions(points_earned DESC)`,
            
            // Analytics tables indexes
            `CREATE INDEX IF NOT EXISTS idx_oracle_analytics_prediction ON oracle_analytics(prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_analytics_user_week ON user_analytics(user_id, week, season)`,
            `CREATE INDEX IF NOT EXISTS idx_user_analytics_accuracy ON user_analytics(accuracy_rate DESC)`,
            
            // Social features indexes
            `CREATE INDEX IF NOT EXISTS idx_social_leagues_creator ON social_leagues(creator_id)`,
            `CREATE INDEX IF NOT EXISTS idx_social_leagues_join_code ON social_leagues(join_code)`,
            `CREATE INDEX IF NOT EXISTS idx_league_memberships_league ON league_memberships(league_id)`,
            `CREATE INDEX IF NOT EXISTS idx_league_memberships_user ON league_memberships(user_id)`,
            
            // Group predictions indexes
            `CREATE INDEX IF NOT EXISTS idx_group_predictions_league ON group_predictions(league_id)`,
            `CREATE INDEX IF NOT EXISTS idx_group_predictions_status ON group_predictions(status)`,
            `CREATE INDEX IF NOT EXISTS idx_group_predictions_closes ON group_predictions(closes_at)`,
            `CREATE INDEX IF NOT EXISTS idx_group_pred_submissions_group ON group_prediction_submissions(group_prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_group_pred_submissions_user ON group_prediction_submissions(user_id)`
        ]
    },
    
    {
        id: 'add_simple_auth_constraints_v1',
        name: 'Simple Auth Constraints',
        description: 'Add constraints for PIN-based authentication system',
        version: 2,
        sql: [
            // Simple auth users constraints and indexes
            `CREATE INDEX IF NOT EXISTS idx_simple_auth_player_number ON simple_auth_users(player_number)`,
            `CREATE INDEX IF NOT EXISTS idx_simple_auth_username ON simple_auth_users(username)`,
            `CREATE INDEX IF NOT EXISTS idx_simple_auth_active ON simple_auth_users(is_active)`,
            `CREATE INDEX IF NOT EXISTS idx_simple_auth_session ON simple_auth_users(session_token)`,
            
            // Enhanced oracle predictions constraints
            `CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_week_season ON enhanced_oracle_predictions(week, season)`,
            `CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_category ON enhanced_oracle_predictions(category)`,
            `CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_expires ON enhanced_oracle_predictions(expires_at)`,
            `CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_resolved ON enhanced_oracle_predictions(is_resolved)`,
            
            // Enhanced user predictions indexes
            `CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_user ON enhanced_user_predictions(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_prediction ON enhanced_user_predictions(prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_submitted ON enhanced_user_predictions(submitted_at)`,
            
            // Real-time predictions indexes
            `CREATE INDEX IF NOT EXISTS idx_realtime_pred_oracle ON realtime_predictions(oracle_prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_realtime_pred_status ON realtime_predictions(status)`,
            `CREATE INDEX IF NOT EXISTS idx_realtime_pred_starts ON realtime_predictions(starts_at)`,
            
            // Prediction submissions indexes
            `CREATE INDEX IF NOT EXISTS idx_pred_submissions_realtime ON prediction_submissions(realtime_prediction_id)`,
            `CREATE INDEX IF NOT EXISTS idx_pred_submissions_user ON prediction_submissions(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_pred_submissions_submitted ON prediction_submissions(submitted_at)`
        ]
    },
    
    {
        id: 'add_data_validation_rules_v1',
        name: 'Data Validation Rules',
        description: 'Add validation constraints for data integrity',
        version: 3,
        sql: [
            // User validation constraints
            `CREATE TRIGGER IF NOT EXISTS validate_user_email 
             BEFORE INSERT ON users 
             WHEN NEW.email IS NOT NULL AND NEW.email NOT LIKE '%_@_%._%'
             BEGIN
                 SELECT RAISE(ABORT, 'Invalid email format');
             END`,
            
            `CREATE TRIGGER IF NOT EXISTS validate_user_username_length
             BEFORE INSERT ON users
             WHEN LENGTH(NEW.username) < 2 OR LENGTH(NEW.username) > 50
             BEGIN
                 SELECT RAISE(ABORT, 'Username must be between 2 and 50 characters');
             END`,
            
            // Simple auth validation constraints
            `CREATE TRIGGER IF NOT EXISTS validate_player_number_range
             BEFORE INSERT ON simple_auth_users
             WHEN NEW.player_number < 0 OR NEW.player_number > 10
             BEGIN
                 SELECT RAISE(ABORT, 'Player number must be between 0 and 10');
             END`,
            
            `CREATE TRIGGER IF NOT EXISTS validate_pin_hash_length
             BEFORE INSERT ON simple_auth_users
             WHEN LENGTH(NEW.pin_hash) < 10
             BEGIN
                 SELECT RAISE(ABORT, 'PIN hash too short - security risk');
             END`,
            
            // Oracle prediction validation
            `CREATE TRIGGER IF NOT EXISTS validate_oracle_confidence
             BEFORE INSERT ON oracle_predictions
             WHEN NEW.confidence < 50 OR NEW.confidence > 100
             BEGIN
                 SELECT RAISE(ABORT, 'Oracle confidence must be between 50 and 100');
             END`,
            
            `CREATE TRIGGER IF NOT EXISTS validate_user_confidence
             BEFORE INSERT ON user_predictions
             WHEN NEW.confidence < 1 OR NEW.confidence > 100
             BEGIN
                 SELECT RAISE(ABORT, 'User confidence must be between 1 and 100');
             END`,
            
            // League validation constraints
            `CREATE TRIGGER IF NOT EXISTS validate_league_max_members
             BEFORE INSERT ON social_leagues
             WHEN NEW.max_members < 2 OR NEW.max_members > 50
             BEGIN
                 SELECT RAISE(ABORT, 'League must allow between 2 and 50 members');
             END`,
            
            // Update timestamps automatically
            `CREATE TRIGGER IF NOT EXISTS update_users_timestamp
             AFTER UPDATE ON users
             BEGIN
                 UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END`,
            
            `CREATE TRIGGER IF NOT EXISTS update_simple_auth_timestamp
             AFTER UPDATE ON simple_auth_users
             BEGIN
                 UPDATE simple_auth_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END`
        ]
    },
    
    {
        id: 'add_performance_optimizations_v1',
        name: 'Performance Optimizations for 10 Users',
        description: 'Add performance optimizations focused on small user base',
        version: 4,
        sql: [
            // Composite indexes for common queries in 10-user setup
            `CREATE INDEX IF NOT EXISTS idx_user_predictions_user_week 
             ON user_predictions(user_id, prediction_id)`,
            
            `CREATE INDEX IF NOT EXISTS idx_user_analytics_leaderboard 
             ON user_analytics(season, accuracy_rate DESC, total_points DESC)`,
            
            `CREATE INDEX IF NOT EXISTS idx_oracle_predictions_current_week 
             ON oracle_predictions(week, season, is_resolved)`,
            
            `CREATE INDEX IF NOT EXISTS idx_league_active_members 
             ON league_memberships(league_id, is_active, joined_at)`,
            
            // Optimize for friend group queries
            `CREATE INDEX IF NOT EXISTS idx_simple_auth_active_players 
             ON simple_auth_users(is_active, player_number)`,
            
            `CREATE INDEX IF NOT EXISTS idx_predictions_recent_activity 
             ON enhanced_user_predictions(submitted_at DESC, user_id)`,
            
            // Clean up expired sessions (important for 10-user security)
            `CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
             AFTER INSERT ON user_sessions
             BEGIN
                 DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
             END`
        ]
    }
];

/**
 * Apply all constraint migrations
 */
export async function applyConstraintMigrations(): Promise<void> {
    console.log('🔧 Setting up database constraints and validation for 10-user setup...');
    
    try {
        // Create migrations table first
        await createMigrationsTable();
        
        // Apply each migration in order
        for (const migration of constraintMigrations) {
            const isApplied = await isMigrationApplied(migration.id);
            
            if (!isApplied) {
                await applyMigration(migration);
            } else {
                console.log(`⏭️  Migration already applied: ${migration.name}`);
            }
        }
        
        console.log('✅ All database constraints and validations applied successfully');
        console.log('🎯 Database optimized for 10-user friend group setup');
        
    } catch (error) {
        console.error('❌ Failed to apply constraint migrations:', error);
        throw error;
    }
}

/**
 * Validate database integrity after migrations
 */
export async function validateDatabaseIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
}> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
        console.log('🔍 Validating database integrity...');
        
        // Check foreign key constraints are enabled
        const foreignKeysResult = await getRow('PRAGMA foreign_keys');
        if (!foreignKeysResult || foreignKeysResult['foreign_keys'] !== 1) {
            errors.push('Foreign key constraints are not enabled');
        }
        
        // Validate critical indexes exist
        const criticalIndexes = [
            'idx_users_username',
            'idx_simple_auth_player_number',
            'idx_oracle_predictions_week',
            'idx_user_predictions_user_id'
        ];
        
        for (const indexName of criticalIndexes) {
            const indexExists = await getRow(
                'SELECT name FROM sqlite_master WHERE type="index" AND name=?',
                [indexName]
            );
            if (!indexExists) {
                errors.push(`Critical index missing: ${indexName}`);
            }
        }
        
        // Check that simple auth users are properly set up for 10 friends
        const simpleAuthUsers = await getRow(
            'SELECT COUNT(*) as count FROM simple_auth_users WHERE is_active = 1'
        );
        
        if (!simpleAuthUsers || simpleAuthUsers.count === 0) {
            warnings.push('No active simple auth users found - may need to seed demo users');
        } else if (simpleAuthUsers.count > 10) {
            warnings.push(`More than 10 active users found (${simpleAuthUsers.count}) - designed for 10-friend setup`);
        }
        
        console.log(`✅ Database validation complete: ${errors.length} errors, ${warnings.length} warnings`);
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
        
    } catch (error) {
        console.error('❌ Database validation failed:', error);
        return {
            isValid: false,
            errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
            warnings
        };
    }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
}> {
    try {
        // Get applied migrations
        const appliedMigrations = await runQuery('SELECT id FROM migrations ORDER BY version');
        const appliedIds = Array.isArray(appliedMigrations) 
            ? appliedMigrations.map((m: any) => m.id)
            : [];
        
        // Get pending migrations
        const allMigrationIds = constraintMigrations.map(m => m.id);
        const pendingIds = allMigrationIds.filter(id => !appliedIds.includes(id));
        
        return {
            applied: appliedIds,
            pending: pendingIds,
            total: constraintMigrations.length
        };
        
    } catch (error) {
        console.error('Error getting migration status:', error);
        return {
            applied: [],
            pending: constraintMigrations.map(m => m.id),
            total: constraintMigrations.length
        };
    }
}
