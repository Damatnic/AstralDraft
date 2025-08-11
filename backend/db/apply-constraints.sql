-- Production Database Constraints and Validation Rules
-- Apply to existing Astral Draft Oracle database

-- ==================================================
-- DATA VALIDATION CONSTRAINTS
-- ==================================================

-- Users table validation
CREATE TRIGGER IF NOT EXISTS users_email_format_trigger
BEFORE INSERT ON users
FOR EACH ROW
WHEN NEW.email IS NOT NULL AND NEW.email NOT LIKE '%@%.%'
BEGIN
    SELECT RAISE(ABORT, 'Invalid email format');
END;

CREATE TRIGGER IF NOT EXISTS users_username_length_trigger
BEFORE INSERT ON users
FOR EACH ROW
WHEN NEW.username IS NOT NULL AND (LENGTH(NEW.username) < 3 OR LENGTH(NEW.username) > 30)
BEGIN
    SELECT RAISE(ABORT, 'Username must be between 3 and 30 characters');
END;

-- Simple auth users validation
CREATE TRIGGER IF NOT EXISTS simple_auth_users_player_number_range_trigger
BEFORE INSERT ON simple_auth_users
FOR EACH ROW
WHEN NEW.player_number < 1 OR NEW.player_number > 1000
BEGIN
    SELECT RAISE(ABORT, 'Player number must be between 1 and 1000');
END;

CREATE TRIGGER IF NOT EXISTS simple_auth_users_pin_length_trigger
BEFORE INSERT ON simple_auth_users
FOR EACH ROW
WHEN LENGTH(NEW.pin) != 4
BEGIN
    SELECT RAISE(ABORT, 'PIN must be exactly 4 digits');
END;

-- Oracle predictions validation
CREATE TRIGGER IF NOT EXISTS oracle_predictions_week_range_trigger
BEFORE INSERT ON enhanced_oracle_predictions
FOR EACH ROW
WHEN NEW.week < 1 OR NEW.week > 18
BEGIN
    SELECT RAISE(ABORT, 'Week must be between 1 and 18');
END;

CREATE TRIGGER IF NOT EXISTS oracle_predictions_confidence_range_trigger
BEFORE INSERT ON enhanced_oracle_predictions
FOR EACH ROW
WHEN NEW.confidence < 0.0 OR NEW.confidence > 1.0
BEGIN
    SELECT RAISE(ABORT, 'Confidence must be between 0.0 and 1.0');
END;

CREATE TRIGGER IF NOT EXISTS oracle_predictions_choice_valid_trigger
BEFORE INSERT ON enhanced_oracle_predictions
FOR EACH ROW
WHEN NEW.choice NOT IN ('home', 'away', 'over', 'under')
BEGIN
    SELECT RAISE(ABORT, 'Choice must be one of: home, away, over, under');
END;

-- User predictions validation
CREATE TRIGGER IF NOT EXISTS user_predictions_confidence_range_trigger
BEFORE INSERT ON enhanced_user_predictions
FOR EACH ROW
WHEN NEW.confidence < 0.0 OR NEW.confidence > 1.0
BEGIN
    SELECT RAISE(ABORT, 'User prediction confidence must be between 0.0 and 1.0');
END;

-- No duplicate predictions for same user/game
CREATE TRIGGER IF NOT EXISTS user_predictions_no_duplicate_trigger
BEFORE INSERT ON enhanced_user_predictions
FOR EACH ROW
WHEN EXISTS (
    SELECT 1 FROM enhanced_user_predictions 
    WHERE user_id = NEW.user_id 
    AND prediction_id = NEW.prediction_id
)
BEGIN
    SELECT RAISE(ABORT, 'User has already submitted a prediction for this game');
END;

-- ==================================================
-- BUSINESS LOGIC CONSTRAINTS
-- ==================================================

-- Leaderboard stats validation
CREATE TRIGGER IF NOT EXISTS user_statistics_accuracy_range_trigger
BEFORE INSERT ON enhanced_user_statistics
FOR EACH ROW
WHEN NEW.accuracy_rate < 0.0 OR NEW.accuracy_rate > 1.0
BEGIN
    SELECT RAISE(ABORT, 'Accuracy rate must be between 0.0 and 1.0');
END;

CREATE TRIGGER IF NOT EXISTS user_statistics_non_negative_counts_trigger
BEFORE INSERT ON enhanced_user_statistics
FOR EACH ROW
WHEN NEW.total_predictions < 0 OR NEW.correct_predictions < 0 OR NEW.oracle_beats < 0
BEGIN
    SELECT RAISE(ABORT, 'Prediction counts cannot be negative');
END;

-- Ensure correct predictions don't exceed total predictions
CREATE TRIGGER IF NOT EXISTS user_statistics_logical_counts_trigger
BEFORE INSERT ON enhanced_user_statistics
FOR EACH ROW
WHEN NEW.correct_predictions > NEW.total_predictions
BEGIN
    SELECT RAISE(ABORT, 'Correct predictions cannot exceed total predictions');
END;

-- ==================================================
-- REFERENTIAL INTEGRITY ENHANCEMENTS
-- ==================================================

-- User predictions must reference valid user and prediction
CREATE TRIGGER IF NOT EXISTS user_predictions_valid_user_trigger
BEFORE INSERT ON enhanced_user_predictions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM simple_auth_users WHERE id = NEW.user_id)
BEGIN
    SELECT RAISE(ABORT, 'Invalid user_id in user prediction');
END;

CREATE TRIGGER IF NOT EXISTS user_predictions_valid_prediction_trigger
BEFORE INSERT ON enhanced_user_predictions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id)
BEGIN
    SELECT RAISE(ABORT, 'Invalid prediction_id in user prediction');
END;

-- User statistics must reference valid user
CREATE TRIGGER IF NOT EXISTS user_statistics_valid_user_trigger
BEFORE INSERT ON enhanced_user_statistics
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM simple_auth_users WHERE id = NEW.user_id)
BEGIN
    SELECT RAISE(ABORT, 'Invalid user_id in user statistics');
END;

-- ==================================================
-- SECURITY AND AUDIT CONSTRAINTS
-- ==================================================

-- Prevent modification of resolved predictions
CREATE TRIGGER IF NOT EXISTS oracle_predictions_no_modify_resolved_trigger
BEFORE UPDATE ON enhanced_oracle_predictions
FOR EACH ROW
WHEN OLD.is_resolved = 1
BEGIN
    SELECT RAISE(ABORT, 'Cannot modify resolved Oracle predictions');
END;

-- Prevent backdating predictions
CREATE TRIGGER IF NOT EXISTS oracle_predictions_no_backdate_trigger
BEFORE INSERT ON enhanced_oracle_predictions
FOR EACH ROW
WHEN NEW.created_at < datetime('now', '-1 day')
BEGIN
    SELECT RAISE(ABORT, 'Cannot create predictions backdated more than 1 day');
END;

-- ==================================================
-- DATA MAINTENANCE TRIGGERS
-- ==================================================

-- Auto-update timestamps
CREATE TRIGGER IF NOT EXISTS oracle_predictions_update_timestamp_trigger
AFTER UPDATE ON enhanced_oracle_predictions
FOR EACH ROW
BEGIN
    UPDATE enhanced_oracle_predictions 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS user_predictions_update_timestamp_trigger
AFTER UPDATE ON enhanced_user_predictions
FOR EACH ROW
BEGIN
    UPDATE enhanced_user_predictions 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Auto-update user statistics when predictions are added
CREATE TRIGGER IF NOT EXISTS auto_update_user_stats_on_prediction_trigger
AFTER INSERT ON enhanced_user_predictions
FOR EACH ROW
BEGIN
    INSERT OR REPLACE INTO enhanced_user_statistics (
        user_id, 
        total_predictions, 
        correct_predictions, 
        accuracy_rate, 
        oracle_beats, 
        updated_at
    )
    SELECT 
        NEW.user_id,
        COUNT(*) as total_predictions,
        SUM(CASE WHEN up.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
        CAST(SUM(CASE WHEN up.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as accuracy_rate,
        SUM(CASE WHEN up.beats_oracle = 1 THEN 1 ELSE 0 END) as oracle_beats,
        datetime('now') as updated_at
    FROM enhanced_user_predictions up
    WHERE up.user_id = NEW.user_id;
END;

-- ==================================================
-- PERFORMANCE OPTIMIZATION
-- ==================================================

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week_created ON enhanced_oracle_predictions(week, created_at);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_resolved ON enhanced_oracle_predictions(is_resolved, week);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_created ON enhanced_user_predictions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_user ON enhanced_user_predictions(prediction_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_accuracy ON enhanced_user_statistics(accuracy_rate DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_oracle_beats ON enhanced_user_statistics(oracle_beats DESC);
CREATE INDEX IF NOT EXISTS idx_simple_auth_users_player_number ON simple_auth_users(player_number);

-- ==================================================
-- CONSTRAINT VALIDATION COMPLETE
-- ==================================================

-- Log constraint application
INSERT OR REPLACE INTO constraint_log (
    constraint_name, 
    applied_at, 
    description
) VALUES 
    ('production_constraints_v1', datetime('now'), 'Applied comprehensive production database constraints and validation rules');

-- Vacuum and analyze for optimization
PRAGMA optimize;
VACUUM;
ANALYZE;
