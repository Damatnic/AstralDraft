/**
 * Database initialization and connection management
 * SQLite database for Oracle predictions, analytics, and social features
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { hashPassword } from '../services/authService';

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'astral-draft.db');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global database instance
let db: sqlite3.Database | null = null;

/**
 * Initialize SQLite database with required tables
 */
export async function initDatabase(dbPath: string = DB_PATH): Promise<void> {
    try {
        // Close existing connection if any
        if (db) {
            await closeDatabase();
        }
        
        const isInMemory = dbPath === ':memory:';
        if (!isInMemory) {
            const dataDir = path.dirname(dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        }
        
        db = new sqlite3.Database(dbPath);
        console.log(`📁 Connected to SQLite database: ${isInMemory ? 'in-memory' : dbPath}`);
        
        await runQuery('PRAGMA foreign_keys = ON');
        await createTables();
        await createEnhancedTables();
        
        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

/**
 * Create all required database tables
 */
async function createTables(): Promise<void> {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'user',
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )`,

        // User sessions table for JWT management
        `CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            refresh_token TEXT UNIQUE NOT NULL,
            device_info TEXT,
            ip_address TEXT,
            last_activity DATETIME,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )`,

        // Oracle predictions table
        `CREATE TABLE IF NOT EXISTS oracle_predictions (
            id TEXT PRIMARY KEY,
            week INTEGER NOT NULL,
            type TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL, -- JSON array
            oracle_choice INTEGER NOT NULL,
            confidence INTEGER NOT NULL,
            reasoning TEXT NOT NULL,
            data_points TEXT NOT NULL, -- JSON array
            actual_result INTEGER,
            is_resolved BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            season INTEGER DEFAULT 2024
        )`,

        // User predictions table
        `CREATE TABLE IF NOT EXISTS user_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            prediction_id TEXT NOT NULL,
            user_choice INTEGER NOT NULL,
            confidence INTEGER NOT NULL,
            reasoning TEXT,
            points_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (prediction_id) REFERENCES oracle_predictions (id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(user_id, prediction_id)
        )`,

        // Oracle analytics table
        `CREATE TABLE IF NOT EXISTS oracle_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            calculation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prediction_id) REFERENCES oracle_predictions (id) ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // User analytics table
        `CREATE TABLE IF NOT EXISTS user_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week INTEGER NOT NULL,
            season INTEGER DEFAULT 2024,
            total_predictions INTEGER DEFAULT 0,
            correct_predictions INTEGER DEFAULT 0,
            accuracy_rate REAL DEFAULT 0.0,
            oracle_beats INTEGER DEFAULT 0,
            total_points INTEGER DEFAULT 0,
            streak_current INTEGER DEFAULT 0,
            streak_best INTEGER DEFAULT 0,
            calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(user_id, week, season)
        )`,

        // Social leagues table
        `CREATE TABLE IF NOT EXISTS social_leagues (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'public',
            join_code TEXT UNIQUE,
            creator_id INTEGER NOT NULL,
            max_members INTEGER DEFAULT 50,
            member_count INTEGER DEFAULT 1,
            settings TEXT, -- JSON object
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        )`,

        // League memberships table
        `CREATE TABLE IF NOT EXISTS league_memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (league_id) REFERENCES social_leagues (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(league_id, user_id)
        )`,

        // Group predictions table
        `CREATE TABLE IF NOT EXISTS group_predictions (
            id TEXT PRIMARY KEY,
            league_id TEXT NOT NULL,
            creator_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            prediction_type TEXT DEFAULT 'MAJORITY_VOTE',
            closes_at DATETIME NOT NULL,
            status TEXT DEFAULT 'OPEN',
            result_value REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (league_id) REFERENCES social_leagues (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        )`,

        // Group prediction submissions table
        `CREATE TABLE IF NOT EXISTS group_prediction_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_prediction_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            prediction_value REAL NOT NULL,
            confidence INTEGER NOT NULL,
            reasoning TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_prediction_id) REFERENCES group_predictions (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(group_prediction_id, user_id)
        )`,

        // Debates table
        `CREATE TABLE IF NOT EXISTS debates (
            id TEXT PRIMARY KEY,
            league_id TEXT NOT NULL,
            creator_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            description TEXT,
            status TEXT DEFAULT 'ACTIVE',
            side_a_votes INTEGER DEFAULT 0,
            side_b_votes INTEGER DEFAULT 0,
            total_participants INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (league_id) REFERENCES social_leagues (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        )`,

        // Debate posts table
        `CREATE TABLE IF NOT EXISTS debate_posts (
            id TEXT PRIMARY KEY,
            debate_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            side TEXT NOT NULL, -- 'A', 'B', or 'NEUTRAL'
            content TEXT NOT NULL,
            reactions TEXT DEFAULT '[]', -- JSON array of reactions
            is_pinned BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (debate_id) REFERENCES debates (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
        )`,

        // Debate votes table
        `CREATE TABLE IF NOT EXISTS debate_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            debate_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            side TEXT NOT NULL, -- 'A' or 'B'
            reasoning TEXT,
            voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (debate_id) REFERENCES debates (id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(debate_id, user_id)
        )`,

        // API usage tracking table
        `CREATE TABLE IF NOT EXISTS api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            user_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            response_status INTEGER,
            response_time REAL,
            request_size INTEGER,
            response_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        )`,

        // Security audit log table for enhanced security monitoring
        `CREATE TABLE IF NOT EXISTS security_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            user_id INTEGER,
            event_type TEXT NOT NULL, -- 'login', 'pin_change', 'invalid_token', etc.
            success BOOLEAN NOT NULL,
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            details TEXT DEFAULT '{}', -- JSON object for additional data
            severity TEXT DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
        )`
    ];

    for (const table of tables) {
        await runQuery(table);
    }

    // Create indexes for better performance
    await createIndexes();
}

/**
 * Create database indexes for optimal query performance
 */
async function createIndexes(): Promise<void> {
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week ON oracle_predictions(week)',
        'CREATE INDEX IF NOT EXISTS idx_oracle_predictions_type ON oracle_predictions(type)',
        'CREATE INDEX IF NOT EXISTS idx_oracle_predictions_season ON oracle_predictions(season)',
        'CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_id ON user_predictions(prediction_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id_week ON user_analytics(user_id, week)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_league_memberships_league_id ON league_memberships(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_league_memberships_user_id ON league_memberships(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_group_predictions_league_id ON group_predictions(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_debates_league_id ON debates(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_debate_posts_debate_id ON debate_posts(debate_id)',
        'CREATE INDEX IF NOT EXISTS idx_debate_votes_debate_id ON debate_votes(debate_id)',
        'CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint)',
        'CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_ip ON security_audit_log(ip_address)',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_type ON security_audit_log(event_type)',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_log(timestamp)'
    ];

    for (const index of indexes) {
        await runQuery(index);
    }
}

/**
 * Create enhanced tables for Oracle system
 */
async function createEnhancedTables(): Promise<void> {
    const enhancedTables = [
        // Simple authentication users table (compatible with our auth system)
        `CREATE TABLE IF NOT EXISTS simple_auth_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_number INTEGER NOT NULL UNIQUE, -- 1-10 for players, 0 for admin
            username TEXT NOT NULL DEFAULT 'Player',
            pin_hash TEXT NOT NULL,
            email TEXT,
            display_name TEXT,
            color_theme TEXT DEFAULT '#3B82F6',
            emoji TEXT DEFAULT '👤',
            is_admin BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            session_token TEXT,
            last_login_at DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Enhanced Oracle predictions table with real-time features
        `CREATE TABLE IF NOT EXISTS enhanced_oracle_predictions (
            id TEXT PRIMARY KEY,
            week INTEGER NOT NULL,
            season INTEGER DEFAULT 2024,
            type TEXT NOT NULL,
            category TEXT DEFAULT 'GENERAL',
            question TEXT NOT NULL,
            description TEXT,
            options TEXT NOT NULL, -- JSON array of option strings
            oracle_choice INTEGER NOT NULL,
            oracle_confidence INTEGER NOT NULL,
            oracle_reasoning TEXT NOT NULL,
            data_points TEXT NOT NULL, -- JSON array of data sources
            actual_result INTEGER,
            is_resolved BOOLEAN DEFAULT 0,
            consensus_choice INTEGER,
            consensus_confidence INTEGER,
            participants_count INTEGER DEFAULT 0,
            total_submissions INTEGER DEFAULT 0,
            difficulty_level INTEGER DEFAULT 5, -- 1-10 scale
            points_multiplier REAL DEFAULT 1.0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            created_by INTEGER DEFAULT 0, -- 0 = system, user_id for user-created
            tags TEXT DEFAULT '[]', -- JSON array of tags
            metadata TEXT DEFAULT '{}' -- JSON object for additional data
        )`,

        // Enhanced user predictions with scoring data
        `CREATE TABLE IF NOT EXISTS enhanced_user_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            prediction_id TEXT NOT NULL,
            user_choice INTEGER NOT NULL,
            user_confidence INTEGER NOT NULL,
            reasoning TEXT,
            points_earned INTEGER DEFAULT 0,
            base_points INTEGER DEFAULT 0,
            bonus_points INTEGER DEFAULT 0,
            is_correct BOOLEAN,
            confidence_accuracy REAL, -- How close confidence was to actual probability
            time_to_submit INTEGER, -- Seconds from prediction creation to submission
            revision_count INTEGER DEFAULT 0, -- Number of times user changed their prediction
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE,
            FOREIGN KEY (prediction_id) REFERENCES enhanced_oracle_predictions (id) ON DELETE CASCADE,
            UNIQUE(user_id, prediction_id)
        )`,

        // Real-time prediction updates tracking
        `CREATE TABLE IF NOT EXISTS prediction_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT NOT NULL,
            update_type TEXT NOT NULL, -- 'CONSENSUS_CHANGE', 'PARTICIPATION_UPDATE', 'TIME_WARNING', etc.
            old_value TEXT,
            new_value TEXT,
            message TEXT,
            metadata TEXT DEFAULT '{}', -- JSON object
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prediction_id) REFERENCES enhanced_oracle_predictions (id) ON DELETE CASCADE
        )`,

        // User statistics and achievements
        `CREATE TABLE IF NOT EXISTS user_statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week INTEGER,
            season INTEGER DEFAULT 2024,
            total_predictions INTEGER DEFAULT 0,
            correct_predictions INTEGER DEFAULT 0,
            accuracy_percentage REAL DEFAULT 0.0,
            total_points INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            oracle_beats INTEGER DEFAULT 0, -- Times beat Oracle confidence
            average_confidence REAL DEFAULT 0.0,
            early_bird_predictions INTEGER DEFAULT 0, -- Submitted within first hour
            last_minute_predictions INTEGER DEFAULT 0, -- Submitted in final hour
            total_reasoning_length INTEGER DEFAULT 0,
            categories_participated TEXT DEFAULT '[]', -- JSON array of categories
            calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE,
            UNIQUE(user_id, week, season)
        )`,

        // Leaderboard rankings
        `CREATE TABLE IF NOT EXISTS leaderboard_rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week INTEGER,
            season INTEGER DEFAULT 2024,
            rank_overall INTEGER,
            rank_weekly INTEGER,
            rank_accuracy INTEGER,
            rank_points INTEGER,
            rank_streak INTEGER,
            points_total INTEGER DEFAULT 0,
            points_weekly INTEGER DEFAULT 0,
            accuracy_overall REAL DEFAULT 0.0,
            accuracy_weekly REAL DEFAULT 0.0,
            streak_current INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )`
    ];

    for (const table of enhancedTables) {
        await runQuery(table);
    }

    // Create enhanced indexes
    await createEnhancedIndexes();
}

/**
 * Create enhanced indexes for optimal query performance
 */
async function createEnhancedIndexes(): Promise<void> {
    const enhancedIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_simple_auth_users_player_number ON simple_auth_users(player_number)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_week ON enhanced_oracle_predictions(week)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_season ON enhanced_oracle_predictions(season)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_type ON enhanced_oracle_predictions(type)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_expires_at ON enhanced_oracle_predictions(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_user_id ON enhanced_user_predictions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_prediction_id ON enhanced_user_predictions(prediction_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id_week ON user_statistics(user_id, week)',
        'CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_week_season ON leaderboard_rankings(week, season)',
        'CREATE INDEX IF NOT EXISTS idx_prediction_updates_prediction_id ON prediction_updates(prediction_id)'
    ];

    for (const index of enhancedIndexes) {
        await runQuery(index);
    }
}

/**
 * Get database instance
 */
export function getDatabase(): sqlite3.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Run a database query (promisified)
 */
export function runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initDatabase() first.'));
            return;
        }
        db.run(sql, params, function(err) {
            if (err) {
                reject(new Error(err.message));
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

/**
 * Get a single row from database
 */
export function getRow(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initDatabase() first.'));
            return;
        }
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(new Error(err.message));
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Get all rows from database
 */
export function getRows(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized. Call initDatabase() first.'));
            return;
        }
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(new Error(err.message));
            } else {
                resolve(rows || []);
            }
        });
    });
}

/**
 * Close database connection
 */
export function closeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve();
            return;
        }
        
        db.close((err) => {
            if (err) {
                reject(new Error(err.message));
            } else {
                console.log('📁 Database connection closed');
                db = null; // Clear the reference
                resolve();
            }
        });
    });
}

/**
 * Seed database with initial data (for development)
 */
export async function seedDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        console.log('⚠️  Skipping database seeding in production');
        return;
    }

    try {
        // Check if we already have data
        const userCount = await getRow('SELECT COUNT(*) as count FROM users');
        if (userCount.count > 0) {
            console.log('📊 Database already seeded, skipping...');
            return;
        }

        // Create demo user
        const password = 'TestPassword123!';
        const hashedPassword = await hashPassword(password);
        
        await runQuery(`
            INSERT INTO users (username, email, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        `, ['testuser', 'test@example.com', hashedPassword, 'Test User', 'admin']);

        console.log('🌱 Database seeded with demo data');
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
    }
}

/**
 * Validate database schema and data integrity
 */
export async function validateDatabase(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Check if foreign keys are enabled
        const foreignKeysResult = await getRow('PRAGMA foreign_keys');
        if (foreignKeysResult.foreign_keys !== 1) {
            errors.push('Foreign keys are not enabled');
        }

        // Check for orphaned records
        const orphanedUserPredictions = await getRow(`
            SELECT COUNT(*) as count 
            FROM user_predictions up 
            LEFT JOIN users u ON up.user_id = u.id 
            WHERE u.id IS NULL
        `);
        if (orphanedUserPredictions.count > 0) {
            warnings.push(`Found ${orphanedUserPredictions.count} orphaned user predictions`);
        }

        // Check for missing required data
        const usersWithoutUsername = await getRow(`
            SELECT COUNT(*) as count FROM users WHERE username IS NULL OR username = ''
        `);
        if (usersWithoutUsername.count > 0) {
            errors.push(`Found ${usersWithoutUsername.count} users without username`);
        }

        // Check for data consistency
        const invalidConfidenceScores = await getRow(`
            SELECT COUNT(*) as count 
            FROM oracle_predictions 
            WHERE confidence < 0 OR confidence > 100
        `);
        if (invalidConfidenceScores.count > 0) {
            warnings.push(`Found ${invalidConfidenceScores.count} predictions with invalid confidence scores`);
        }

        console.log(`📊 Database validation completed: ${errors.length} errors, ${warnings.length} warnings`);
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    } catch (error) {
        console.error('❌ Database validation failed:', error);
        return {
            isValid: false,
            errors: ['Database validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
            warnings
        };
    }
}
