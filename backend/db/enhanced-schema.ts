/**
 * Enhanced Database Schema for Simple Authentication + Oracle Data
 * Extends existing schema to support PIN-based authentication and Oracle predictions
 */

import { runQuery, getRow, getRows } from './index';

export interface SimpleAuthUser {
    id: number;
    player_number: number; // 1-10 for players, 0 for admin
    username: string;
    pin_hash: string;
    email?: string;
    display_name?: string;
    color_theme?: string;
    emoji?: string;
    is_admin: boolean;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

export interface OraclePredictionData {
    id: string;
    week: number;
    season: number;
    type: string;
    question: string;
    options: string[]; // JSON array
    oracle_choice: number;
    oracle_confidence: number;
    oracle_reasoning: string;
    data_points: any[]; // JSON array
    actual_result?: number;
    is_resolved: boolean;
    consensus_choice?: number;
    consensus_confidence?: number;
    participants_count: number;
    total_submissions: number;
    expires_at: string;
    created_at: string;
    resolved_at?: string;
}

export interface UserPredictionData {
    id: number;
    user_id: number;
    prediction_id: string;
    user_choice: number;
    user_confidence: number;
    reasoning?: string;
    points_earned: number;
    is_correct?: boolean;
    submitted_at: string;
}

/**
 * Create enhanced tables for simple authentication and Oracle predictions
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
        )`,

        // User achievements and badges
        `CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_type TEXT NOT NULL, -- 'STREAK', 'ACCURACY', 'PARTICIPATION', etc.
            achievement_name TEXT NOT NULL,
            achievement_description TEXT,
            achievement_icon TEXT DEFAULT '🏆',
            points_value INTEGER DEFAULT 0,
            unlock_condition TEXT, -- JSON description of how it was earned
            earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            season INTEGER DEFAULT 2024,
            week INTEGER,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )`,

        // System notifications and alerts
        `CREATE TABLE IF NOT EXISTS system_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, -- NULL for system-wide notifications
            notification_type TEXT NOT NULL, -- 'PREDICTION_RESULT', 'ACHIEVEMENT', 'LEADERBOARD', etc.
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            action_url TEXT,
            is_read BOOLEAN DEFAULT 0,
            priority TEXT DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )`,

        // Real-time predictions table
        `CREATE TABLE IF NOT EXISTS realtime_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            oracle_prediction_id TEXT NOT NULL,
            status TEXT NOT NULL,
            starts_at DATETIME NOT NULL,
            FOREIGN KEY (oracle_prediction_id) REFERENCES enhanced_oracle_predictions (id) ON DELETE CASCADE
        )`,

        // Prediction submissions table
        `CREATE TABLE IF NOT EXISTS prediction_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            realtime_prediction_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (realtime_prediction_id) REFERENCES realtime_predictions (id) ON DELETE CASCADE,
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
 * Create optimized indexes for enhanced tables
 */
async function createEnhancedIndexes(): Promise<void> {
    const enhancedIndexes = [
        // Simple auth indexes
        'CREATE INDEX IF NOT EXISTS idx_simple_auth_users_player_number ON simple_auth_users(player_number)',
        'CREATE INDEX IF NOT EXISTS idx_simple_auth_users_session_token ON simple_auth_users(session_token)',
        'CREATE INDEX IF NOT EXISTS idx_simple_auth_users_last_login ON simple_auth_users(last_login_at)',

        // Enhanced predictions indexes
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_week_season ON enhanced_oracle_predictions(week, season)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_type_category ON enhanced_oracle_predictions(type, category)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_expires_at ON enhanced_oracle_predictions(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_is_resolved ON enhanced_oracle_predictions(is_resolved)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_predictions_participants ON enhanced_oracle_predictions(participants_count)',

        // Enhanced user predictions indexes
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_user_id ON enhanced_user_predictions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_prediction_id ON enhanced_user_predictions(prediction_id)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_submitted_at ON enhanced_user_predictions(submitted_at)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_points ON enhanced_user_predictions(points_earned)',
        'CREATE INDEX IF NOT EXISTS idx_enhanced_user_predictions_is_correct ON enhanced_user_predictions(is_correct)',

        // Statistics and rankings indexes
        'CREATE INDEX IF NOT EXISTS idx_user_statistics_user_week_season ON user_statistics(user_id, week, season)',
        'CREATE INDEX IF NOT EXISTS idx_user_statistics_accuracy ON user_statistics(accuracy_percentage)',
        'CREATE INDEX IF NOT EXISTS idx_user_statistics_points ON user_statistics(total_points)',
        'CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_week_season ON leaderboard_rankings(week, season)',
        'CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_overall ON leaderboard_rankings(rank_overall)',
        'CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_points ON leaderboard_rankings(points_total)',

        // Achievements and notifications indexes
        'CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type)',
        'CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at)',
        'CREATE INDEX IF NOT EXISTS idx_system_notifications_user_id ON system_notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read ON system_notifications(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at)',

        // Update tracking indexes
        'CREATE INDEX IF NOT EXISTS idx_prediction_updates_prediction_id ON prediction_updates(prediction_id)',
        'CREATE INDEX IF NOT EXISTS idx_prediction_updates_type ON prediction_updates(update_type)',
        'CREATE INDEX IF NOT EXISTS idx_prediction_updates_created_at ON prediction_updates(created_at)'
    ];

    for (const index of enhancedIndexes) {
        await runQuery(index);
    }
}

/**
 * Seed database with initial simple auth users (10 players + admin)
 */
async function seedSimpleAuthUsers(): Promise<void> {
    try {
        // Check if we already have simple auth users
        const userCount = await getRow('SELECT COUNT(*) as count FROM simple_auth_users').catch(() => ({ count: 0 }));
        if (userCount.count > 0) {
            console.log('📊 Simple auth users already exist, skipping seed...');
            return;
        }

        // Create admin user (player_number 0) - using INSERT OR IGNORE to avoid duplicates
        await runQuery(`
            INSERT OR IGNORE INTO simple_auth_users (
                player_number, username, pin_hash, is_admin, color_theme, emoji
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [0, 'Admin', '$2b$10$7347hash', true, '#DC2626', '👑']); // PIN: 7347

        // Create 10 player users (player_number 1-10)
        const defaultPinHash = '$2b$10$0000hash'; // PIN: 0000
        for (let i = 1; i <= 10; i++) {
            await runQuery(`
                INSERT OR IGNORE INTO simple_auth_users (
                    player_number, username, pin_hash, is_admin, color_theme, emoji
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [i, `Player ${i}`, defaultPinHash, false, '#3B82F6', '👤']);
        }

        console.log('🌱 Simple auth users seeded: 1 admin + 10 players');
    } catch (error) {
        console.error('❌ Simple auth user seeding failed:', error);
        // Don't throw the error, just log it
    }
}

/**
 * Get simple auth user by player number
 */
async function getSimpleAuthUser(playerNumber: number): Promise<SimpleAuthUser | null> {
    try {
        const user = await getRow(
            'SELECT * FROM simple_auth_users WHERE player_number = ? AND is_active = 1',
            [playerNumber]
        );
        return user || null;
    } catch (error) {
        console.error('Error fetching simple auth user:', error);
        return null;
    }
}

/**
 * Update simple auth user data
 */
async function updateSimpleAuthUser(
    playerNumber: number, 
    updates: Partial<SimpleAuthUser>
): Promise<boolean> {
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        
        await runQuery(
            `UPDATE simple_auth_users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE player_number = ?`,
            [...values, playerNumber]
        );
        return true;
    } catch (error) {
        console.error('Error updating simple auth user:', error);
        return false;
    }
}

/**
 * Create new Oracle prediction
 */
async function createOraclePrediction(prediction: Omit<OraclePredictionData, 'created_at'>): Promise<boolean> {
    try {
        await runQuery(`
            INSERT INTO enhanced_oracle_predictions (
                id, week, season, type, category, question, description, options,
                oracle_choice, oracle_confidence, oracle_reasoning, data_points,
                difficulty_level, points_multiplier, expires_at, created_by, tags, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            prediction.id,
            prediction.week,
            prediction.season,
            prediction.type,
            (prediction as any).category || 'GENERAL',
            prediction.question,
            (prediction as any).description || '',
            JSON.stringify(prediction.options),
            prediction.oracle_choice,
            prediction.oracle_confidence,
            prediction.oracle_reasoning,
            JSON.stringify(prediction.data_points),
            (prediction as any).difficulty_level || 5,
            (prediction as any).points_multiplier || 1.0,
            prediction.expires_at,
            (prediction as any).created_by || 0,
            JSON.stringify((prediction as any).tags || []),
            JSON.stringify((prediction as any).metadata || {})
        ]);
        return true;
    } catch (error) {
        console.error('Error creating Oracle prediction:', error);
        return false;
    }
}

/**
 * Submit user prediction
 */
async function submitUserPrediction(prediction: Omit<UserPredictionData, 'id' | 'submitted_at'>): Promise<boolean> {
    try {
        await runQuery(`
            INSERT OR REPLACE INTO enhanced_user_predictions (
                user_id, prediction_id, user_choice, user_confidence, reasoning
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            prediction.user_id,
            prediction.prediction_id,
            prediction.user_choice,
            prediction.user_confidence,
            prediction.reasoning || ''
        ]);

        // Update prediction participant count
        await runQuery(`
            UPDATE enhanced_oracle_predictions 
            SET participants_count = (
                SELECT COUNT(DISTINCT user_id) 
                FROM enhanced_user_predictions 
                WHERE prediction_id = ?
            ),
            total_submissions = (
                SELECT COUNT(*) 
                FROM enhanced_user_predictions 
                WHERE prediction_id = ?
            )
            WHERE id = ?
        `, [prediction.prediction_id, prediction.prediction_id, prediction.prediction_id]);

        return true;
    } catch (error) {
        console.error('Error submitting user prediction:', error);
        return false;
    }
}

/**
 * Get active predictions for a week
 */
async function getActivePredictions(week: number, season: number = 2024): Promise<OraclePredictionData[]> {
    try {
        const predictions = await getRows(`
            SELECT * FROM enhanced_oracle_predictions 
            WHERE week = ? AND season = ? AND is_resolved = 0 
            ORDER BY expires_at ASC
        `, [week, season]);

        return predictions.map((p: any) => ({
            ...p,
            options: JSON.parse(p.options),
            data_points: JSON.parse(p.data_points),
            tags: JSON.parse(p.tags || '[]'),
            metadata: JSON.parse(p.metadata || '{}')
        }));
    } catch (error) {
        console.error('Error fetching active predictions:', error);
        return [];
    }
}

/**
 * Update user statistics after prediction resolution
 */
async function updateUserStatistics(userId: number, week: number, season: number = 2024): Promise<void> {
    try {
        // Calculate user statistics for the week
        const stats = await getRow(`
            SELECT 
                COUNT(*) as total_predictions,
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
                SUM(points_earned) as total_points,
                AVG(user_confidence) as average_confidence
            FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eup.user_id = ? AND eop.week = ? AND eop.season = ? AND eop.is_resolved = 1
        `, [userId, week, season]);

        const accuracy = stats.total_predictions > 0 ? 
            (stats.correct_predictions / stats.total_predictions) * 100 : 0;

        await runQuery(`
            INSERT OR REPLACE INTO user_statistics (
                user_id, week, season, total_predictions, correct_predictions,
                accuracy_percentage, total_points, average_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, week, season, stats.total_predictions, stats.correct_predictions,
            accuracy, stats.total_points, stats.average_confidence
        ]);

    } catch (error) {
        console.error('Error updating user statistics:', error);
    }
}

export {
    createEnhancedTables,
    createEnhancedIndexes,
    seedSimpleAuthUsers,
    getSimpleAuthUser,
    updateSimpleAuthUser,
    createOraclePrediction,
    submitUserPrediction,
    getActivePredictions,
    updateUserStatistics
};
