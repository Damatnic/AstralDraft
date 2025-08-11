-- Production Database Constraints and Validation Rules
-- Apply to existing Astral Draft Oracle database (corrected for actual schema)

-- ==================================================
-- DATA VALIDATION CONSTRAINTS
-- ==================================================

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
WHEN NEW.oracle_confidence < 0 OR NEW.oracle_confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'Oracle confidence must be between 0 and 100');
END;

-- User predictions validation
CREATE TRIGGER IF NOT EXISTS user_predictions_confidence_range_trigger
BEFORE INSERT ON enhanced_user_predictions
FOR EACH ROW
WHEN NEW.user_confidence < 0 OR NEW.user_confidence > 100
BEGIN
    SELECT RAISE(ABORT, 'User prediction confidence must be between 0 and 100');
END;

-- No duplicate predictions for same user/prediction
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

-- User statistics validation (if table exists)
CREATE TRIGGER IF NOT EXISTS user_statistics_non_negative_counts_trigger
BEFORE INSERT ON user_statistics
FOR EACH ROW
WHEN NEW.total_predictions < 0 OR NEW.correct_predictions < 0
BEGIN
    SELECT RAISE(ABORT, 'Prediction counts cannot be negative');
END;

-- Ensure correct predictions don't exceed total predictions
CREATE TRIGGER IF NOT EXISTS user_statistics_logical_counts_trigger
BEFORE INSERT ON user_statistics
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

-- Auto-update timestamps for user predictions
CREATE TRIGGER IF NOT EXISTS user_predictions_update_timestamp_trigger
AFTER UPDATE ON enhanced_user_predictions
FOR EACH ROW
BEGIN
    UPDATE enhanced_user_predictions 
    SET last_updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- ==================================================
-- PERFORMANCE OPTIMIZATION
-- ==================================================

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_week_created ON enhanced_oracle_predictions(week, created_at);
CREATE INDEX IF NOT EXISTS idx_oracle_predictions_resolved ON enhanced_oracle_predictions(is_resolved, week);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_submitted ON enhanced_user_predictions(user_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_user_predictions_prediction_user ON enhanced_user_predictions(prediction_id, user_id);
CREATE INDEX IF NOT EXISTS idx_simple_auth_users_player_number ON simple_auth_users(player_number);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_score ON leaderboard_rankings(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_accuracy ON leaderboard_rankings(accuracy_percentage DESC);

-- Create constraint tracking table
CREATE TABLE IF NOT EXISTS constraint_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    constraint_name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Log constraint application
INSERT OR REPLACE INTO constraint_log (
    constraint_name, 
    applied_at, 
    description
) VALUES 
    ('production_constraints_v1', datetime('now'), 'Applied comprehensive production database constraints and validation rules');

-- Vacuum and analyze for optimization
PRAGMA optimize;
ANALYZE;
