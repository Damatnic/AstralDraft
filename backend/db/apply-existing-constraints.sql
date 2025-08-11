-- Corrected Database Constraints for Existing Astral Draft Schema
-- Focused on 10-user friend group reliability

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ===============================================
-- INDEXES FOR EXISTING TABLES ONLY
-- ===============================================

-- User predictions indexes (core functionality)
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_id ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_id ON user_predictions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_points ON user_predictions(points_earned DESC);

-- Oracle predictions indexes
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week ON oracle_predictions(week, season);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_type ON oracle_predictions(type);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_resolved ON oracle_predictions(is_resolved);

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

-- Simple auth users indexes (PIN-based authentication for 10 friends)
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

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- ===============================================
-- COMPOSITE INDEXES FOR 10-USER OPTIMIZATION
-- ===============================================

-- Friend group leaderboard (most important query)
CREATE INDEX IF NOT EXISTS idx_user_analytics_leaderboard 
ON user_analytics(season, accuracy_rate DESC, total_points DESC);

-- Current week predictions
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_current_week 
ON oracle_predictions(week, season, is_resolved);

-- Active league members
CREATE INDEX IF NOT EXISTS idx_league_active_members 
ON league_memberships(league_id, is_active, joined_at);

-- Active players for PIN auth
CREATE INDEX IF NOT EXISTS idx_simple_auth_active_players 
ON simple_auth_users(is_active, player_number);

-- Recent prediction activity
CREATE INDEX IF NOT EXISTS idx_predictions_recent_activity 
ON enhanced_user_predictions(submitted_at DESC, user_id);

-- User prediction quick lookups
CREATE INDEX IF NOT EXISTS idx_user_predictions_composite 
ON user_predictions(user_id, prediction_id);

-- ===============================================
-- ADDITIONAL VALIDATION FOR EXISTING TABLES
-- ===============================================

-- Validate Oracle confidence for existing oracle_predictions table
CREATE TRIGGER IF NOT EXISTS validate_oracle_confidence_existing
BEFORE INSERT ON oracle_predictions
WHEN NEW.confidence < 50 OR NEW.confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'Oracle confidence must be between 50 and 100');
END;

-- Validate user confidence for existing user_predictions table
CREATE TRIGGER IF NOT EXISTS validate_user_confidence_existing
BEFORE INSERT ON user_predictions
WHEN NEW.confidence < 1 OR NEW.confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'User confidence must be between 1 and 100');
END;

-- Validate player number range for simple_auth_users (0-10 for admin + friends)
CREATE TRIGGER IF NOT EXISTS validate_player_number_range_existing
BEFORE INSERT ON simple_auth_users
WHEN NEW.player_number < 0 OR NEW.player_number > 10
BEGIN
    SELECT RAISE(ABORT, 'Player number must be between 0 and 10');
END;

-- Validate PIN hash security for simple_auth_users
CREATE TRIGGER IF NOT EXISTS validate_pin_hash_length_existing
BEFORE INSERT ON simple_auth_users
WHEN LENGTH(NEW.pin_hash) < 10
BEGIN
    SELECT RAISE(ABORT, 'PIN hash too short - security risk');
END;

-- Update simple auth timestamp
CREATE TRIGGER IF NOT EXISTS update_simple_auth_timestamp_existing
AFTER UPDATE ON simple_auth_users
BEGIN
    UPDATE simple_auth_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Clean up expired sessions for security
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions_existing
AFTER INSERT ON user_sessions
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;

-- ===============================================
-- RECORD MIGRATION FOR EXISTING SCHEMA
-- ===============================================

-- Record successful constraint application
INSERT OR REPLACE INTO migrations (id, name, description, version) VALUES 
('existing_schema_constraints_v1', 'Existing Schema Constraints', 'Add constraints for existing database schema', 1),
('ten_user_optimization_v1', 'Ten User Optimization', 'Optimize indexes for 10-user friend group', 2);

-- Analyze tables for optimal query performance
ANALYZE;

-- Display completion message
SELECT 
    '✅ Database constraints applied to existing schema!' as status,
    '🎯 Optimized for 10-friend group' as target,
    '🔒 PIN authentication preserved' as auth_status,
    COUNT(*) as migrations_applied
FROM migrations
WHERE id IN ('existing_schema_constraints_v1', 'ten_user_optimization_v1');
