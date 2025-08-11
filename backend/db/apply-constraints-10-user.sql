-- Database Constraints and Indexing for 10-User Astral Draft
-- Focused on reliability and performance for small friend group

-- Enable foreign keys globally
PRAGMA foreign_keys = ON;

-- Create migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT
);

-- ===============================================
-- INDEXES FOR PERFORMANCE (10-USER OPTIMIZED)
-- ===============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- User sessions indexes (for JWT management)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Oracle predictions indexes
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week ON oracle_predictions(week, season);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_type ON oracle_predictions(type);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_resolved ON oracle_predictions(is_resolved);

-- User predictions indexes (most important for 10-user queries)
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_id ON user_predictions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_points ON user_predictions(points_earned DESC);

-- Analytics tables indexes
CREATE INDEX IF NOT EXISTS idx_oracle_analytics_prediction ON oracle_analytics(prediction_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_week ON user_analytics(user_id, week, season);
CREATE INDEX IF NOT EXISTS idx_user_analytics_accuracy ON user_analytics(accuracy_rate DESC);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_social_leagues_creator ON social_leagues(creator_id);
CREATE INDEX IF NOT EXISTS idx_social_leagues_join_code ON social_leagues(join_code);
CREATE INDEX IF NOT EXISTS idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_user ON league_memberships(user_id);

-- Group predictions indexes
CREATE INDEX IF NOT EXISTS idx_group_predictions_league ON group_predictions(league_id);
CREATE INDEX IF NOT EXISTS idx_group_predictions_status ON group_predictions(status);
CREATE INDEX IF NOT EXISTS idx_group_predictions_closes ON group_predictions(closes_at);
CREATE INDEX IF NOT EXISTS idx_group_pred_submissions_group ON group_prediction_submissions(group_prediction_id);
CREATE INDEX IF NOT EXISTS idx_group_pred_submissions_user ON group_prediction_submissions(user_id);

-- ===============================================
-- SIMPLE AUTH TABLE INDEXES
-- ===============================================

-- Simple auth users indexes (PIN-based authentication)
CREATE INDEX IF NOT EXISTS idx_simple_auth_player_number ON simple_auth_users(player_number);
CREATE INDEX IF NOT EXISTS idx_simple_auth_username ON simple_auth_users(username);
CREATE INDEX IF NOT EXISTS idx_simple_auth_active ON simple_auth_users(is_active);
CREATE INDEX IF NOT EXISTS idx_simple_auth_session ON simple_auth_users(session_token);

-- Enhanced oracle predictions indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_week_season ON enhanced_oracle_predictions(week, season);
CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_category ON enhanced_oracle_predictions(category);
CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_expires ON enhanced_oracle_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_oracle_resolved ON enhanced_oracle_predictions(is_resolved);

-- Enhanced user predictions indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_user ON enhanced_user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_prediction ON enhanced_user_predictions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_pred_submitted ON enhanced_user_predictions(submitted_at);

-- Real-time predictions indexes
CREATE INDEX IF NOT EXISTS idx_realtime_pred_oracle ON realtime_predictions(oracle_prediction_id);
CREATE INDEX IF NOT EXISTS idx_realtime_pred_status ON realtime_predictions(status);
CREATE INDEX IF NOT EXISTS idx_realtime_pred_starts ON realtime_predictions(starts_at);

-- Prediction submissions indexes
CREATE INDEX IF NOT EXISTS idx_pred_submissions_realtime ON prediction_submissions(realtime_prediction_id);
CREATE INDEX IF NOT EXISTS idx_pred_submissions_user ON prediction_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_submissions_submitted ON prediction_submissions(submitted_at);

-- ===============================================
-- COMPOSITE INDEXES FOR 10-USER QUERIES
-- ===============================================

-- Optimize for friend group leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_leaderboard 
ON user_analytics(season, accuracy_rate DESC, total_points DESC);

-- Optimize for current week predictions
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_current_week 
ON oracle_predictions(week, season, is_resolved);

-- Optimize for active league members
CREATE INDEX IF NOT EXISTS idx_league_active_members 
ON league_memberships(league_id, is_active, joined_at);

-- Optimize for friend group queries
CREATE INDEX IF NOT EXISTS idx_simple_auth_active_players 
ON simple_auth_users(is_active, player_number);

-- Optimize for recent prediction activity
CREATE INDEX IF NOT EXISTS idx_predictions_recent_activity 
ON enhanced_user_predictions(submitted_at DESC, user_id);

-- User predictions composite for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_week 
ON user_predictions(user_id, prediction_id);

-- ===============================================
-- DATA VALIDATION TRIGGERS
-- ===============================================

-- Validate user email format
CREATE TRIGGER IF NOT EXISTS validate_user_email 
BEFORE INSERT ON users 
WHEN NEW.email IS NOT NULL AND NEW.email NOT LIKE '%_@_%._%'
BEGIN
    SELECT RAISE(ABORT, 'Invalid email format');
END;

-- Validate username length
CREATE TRIGGER IF NOT EXISTS validate_user_username_length
BEFORE INSERT ON users
WHEN LENGTH(NEW.username) < 2 OR LENGTH(NEW.username) > 50
BEGIN
    SELECT RAISE(ABORT, 'Username must be between 2 and 50 characters');
END;

-- Validate player number range for PIN auth (0-10 for admin + 10 friends)
CREATE TRIGGER IF NOT EXISTS validate_player_number_range
BEFORE INSERT ON simple_auth_users
WHEN NEW.player_number < 0 OR NEW.player_number > 10
BEGIN
    SELECT RAISE(ABORT, 'Player number must be between 0 and 10');
END;

-- Validate PIN hash security
CREATE TRIGGER IF NOT EXISTS validate_pin_hash_length
BEFORE INSERT ON simple_auth_users
WHEN LENGTH(NEW.pin_hash) < 10
BEGIN
    SELECT RAISE(ABORT, 'PIN hash too short - security risk');
END;

-- Validate Oracle confidence range
CREATE TRIGGER IF NOT EXISTS validate_oracle_confidence
BEFORE INSERT ON oracle_predictions
WHEN NEW.confidence < 50 OR NEW.confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'Oracle confidence must be between 50 and 100');
END;

-- Validate user confidence range
CREATE TRIGGER IF NOT EXISTS validate_user_confidence
BEFORE INSERT ON user_predictions
WHEN NEW.confidence < 1 OR NEW.confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'User confidence must be between 1 and 100');
END;

-- Validate league member limits
CREATE TRIGGER IF NOT EXISTS validate_league_max_members
BEFORE INSERT ON social_leagues
WHEN NEW.max_members < 2 OR NEW.max_members > 50
BEGIN
    SELECT RAISE(ABORT, 'League must allow between 2 and 50 members');
END;

-- ===============================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ===============================================

-- Update users timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update simple auth users timestamp
CREATE TRIGGER IF NOT EXISTS update_simple_auth_timestamp
AFTER UPDATE ON simple_auth_users
BEGIN
    UPDATE simple_auth_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===============================================
-- CLEANUP TRIGGERS FOR 10-USER SECURITY
-- ===============================================

-- Clean up expired sessions automatically
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
AFTER INSERT ON user_sessions
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;

-- ===============================================
-- RECORD MIGRATION APPLICATION
-- ===============================================

-- Record that constraint migrations have been applied
INSERT OR REPLACE INTO migrations (id, name, description, version) VALUES 
('add_foreign_key_constraints_v1', 'Add Foreign Key Constraints', 'Add proper foreign key constraints for data integrity', 1),
('add_simple_auth_constraints_v1', 'Simple Auth Constraints', 'Add constraints for PIN-based authentication system', 2),
('add_data_validation_rules_v1', 'Data Validation Rules', 'Add validation constraints for data integrity', 3),
('add_performance_optimizations_v1', 'Performance Optimizations for 10 Users', 'Add performance optimizations focused on small user base', 4);

-- ===============================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ===============================================

ANALYZE;

-- Display completion message
SELECT 
    '✅ Database constraints and indexes applied successfully!' as status,
    '🎯 Optimized for 10-user friend group setup' as optimization,
    '🔒 Data validation and security enabled' as security,
    COUNT(*) as total_migrations_applied
FROM migrations;
