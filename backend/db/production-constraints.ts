/**
 * Production Database Schema Constraints and Validation
 * Adds comprehensive constraints, validation rules, and data integrity checks
 * for production-ready Astral Draft Oracle system
 */

import { runQuery, getRow } from './index';

interface DatabaseValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    constraintsAdded: number;
    validationRulesApplied: number;
}

/**
 * Apply production-ready constraints and validation rules
 */
async function applyProductionConstraints(): Promise<DatabaseValidationResult> {
    const result: DatabaseValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        constraintsAdded: 0,
        validationRulesApplied: 0
    };

    try {
        console.log('🔧 Applying production database constraints...');

        // 1. Data Validation Constraints
        await applyDataValidationConstraints(result);

        // 2. Referential Integrity Enhancements
        await enhanceReferentialIntegrity(result);

        // 3. Business Logic Constraints
        await applyBusinessLogicConstraints(result);

        // 4. Security and Audit Constraints
        await applySecurityConstraints(result);

        // 5. Performance Optimizations
        await applyPerformanceOptimizations(result);

        // 6. Data Quality Triggers
        await createDataQualityTriggers(result);

        console.log(`✅ Production constraints applied: ${result.constraintsAdded} constraints, ${result.validationRulesApplied} validation rules`);

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Failed to apply production constraints: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('❌ Production constraints failed:', error);
    }

    return result;
}

/**
 * Apply comprehensive data validation constraints
 */
async function applyDataValidationConstraints(result: DatabaseValidationResult): Promise<void> {
    const constraints = [
        // Users table validation
        {
            name: 'users_email_format',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_users_email 
                  BEFORE INSERT ON users 
                  WHEN NEW.email NOT LIKE '%_@_%.__%' 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Invalid email format'); 
                  END`
        },
        {
            name: 'users_username_length',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_users_username_length 
                  BEFORE INSERT ON users 
                  WHEN LENGTH(NEW.username) < 3 OR LENGTH(NEW.username) > 50 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Username must be between 3 and 50 characters'); 
                  END`
        },

        // Simple auth users validation
        {
            name: 'simple_auth_users_player_number_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_simple_auth_player_number 
                  BEFORE INSERT ON simple_auth_users 
                  WHEN NEW.player_number < 0 OR NEW.player_number > 10 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Player number must be between 0 (admin) and 10'); 
                  END`
        },
        {
            name: 'simple_auth_users_pin_length',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_simple_auth_pin_hash 
                  BEFORE INSERT ON simple_auth_users 
                  WHEN LENGTH(NEW.pin_hash) < 10 
                  BEGIN 
                    SELECT RAISE(ABORT, 'PIN hash must be properly encrypted (minimum 10 characters)'); 
                  END`
        },

        // Oracle predictions validation
        {
            name: 'oracle_predictions_week_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_oracle_predictions_week 
                  BEFORE INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.week < 1 OR NEW.week > 18 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Week must be between 1 and 18'); 
                  END`
        },
        {
            name: 'oracle_predictions_confidence_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_oracle_confidence 
                  BEFORE INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.oracle_confidence < 1 OR NEW.oracle_confidence > 100 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Oracle confidence must be between 1 and 100'); 
                  END`
        },
        {
            name: 'oracle_predictions_choice_valid',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_oracle_choice 
                  BEFORE INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.oracle_choice < 0 OR NEW.oracle_choice >= JSON_ARRAY_LENGTH(NEW.options) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Oracle choice must be a valid option index'); 
                  END`
        },
        {
            name: 'oracle_predictions_expires_future',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_oracle_expires_at 
                  BEFORE INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.expires_at <= CURRENT_TIMESTAMP 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Prediction expiration must be in the future'); 
                  END`
        },

        // User predictions validation
        {
            name: 'user_predictions_confidence_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_user_confidence 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN NEW.user_confidence < 1 OR NEW.user_confidence > 100 
                  BEGIN 
                    SELECT RAISE(ABORT, 'User confidence must be between 1 and 100'); 
                  END`
        },
        {
            name: 'user_predictions_no_duplicate_submissions',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_duplicate_user_predictions 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN EXISTS (
                    SELECT 1 FROM enhanced_user_predictions 
                    WHERE user_id = NEW.user_id AND prediction_id = NEW.prediction_id
                  ) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'User has already submitted a prediction for this question'); 
                  END`
        },

        // Statistics validation
        {
            name: 'user_statistics_accuracy_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_user_accuracy 
                  BEFORE INSERT ON user_statistics 
                  WHEN NEW.accuracy_percentage < 0.0 OR NEW.accuracy_percentage > 100.0 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Accuracy percentage must be between 0.0 and 100.0'); 
                  END`
        },
        {
            name: 'user_statistics_non_negative_counts',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_user_statistics_counts 
                  BEFORE INSERT ON user_statistics 
                  WHEN NEW.total_predictions < 0 OR NEW.correct_predictions < 0 OR NEW.total_points < 0 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Statistics counts cannot be negative'); 
                  END`
        }
    ];

    for (const constraint of constraints) {
        try {
            await runQuery(constraint.sql);
            result.constraintsAdded++;
            console.log(`✓ Applied constraint: ${constraint.name}`);
        } catch (error) {
            result.warnings.push(`Failed to apply constraint ${constraint.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.warn(`⚠️ Failed to apply constraint: ${constraint.name}`);
        }
    }

    result.validationRulesApplied += constraints.length;
}

/**
 * Enhance referential integrity with cascade rules
 */
async function enhanceReferentialIntegrity(result: DatabaseValidationResult): Promise<void> {
    // Note: SQLite doesn't support ALTER TABLE to add foreign key constraints
    // But we can create triggers to enforce referential integrity

    const integrityTriggers = [
        // Prevent orphaned user predictions when users are deleted
        {
            name: 'prevent_orphaned_user_predictions',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_orphaned_user_predictions 
                  BEFORE DELETE ON simple_auth_users 
                  WHEN EXISTS (SELECT 1 FROM enhanced_user_predictions WHERE user_id = OLD.id) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Cannot delete user with existing predictions. Archive user instead.'); 
                  END`
        },

        // Prevent orphaned statistics when users are deleted
        {
            name: 'prevent_orphaned_user_statistics',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_orphaned_user_statistics 
                  BEFORE DELETE ON simple_auth_users 
                  WHEN EXISTS (SELECT 1 FROM user_statistics WHERE user_id = OLD.id) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Cannot delete user with existing statistics. Archive user instead.'); 
                  END`
        },

        // Prevent deletion of resolved predictions with user submissions
        {
            name: 'prevent_resolved_prediction_deletion',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_resolved_prediction_deletion 
                  BEFORE DELETE ON enhanced_oracle_predictions 
                  WHEN OLD.is_resolved = 1 AND EXISTS (SELECT 1 FROM enhanced_user_predictions WHERE prediction_id = OLD.id) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Cannot delete resolved predictions with user submissions'); 
                  END`
        }
    ];

    for (const trigger of integrityTriggers) {
        try {
            await runQuery(trigger.sql);
            result.constraintsAdded++;
            console.log(`✓ Applied integrity trigger: ${trigger.name}`);
        } catch (error) {
            result.warnings.push(`Failed to apply integrity trigger ${trigger.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Apply business logic constraints
 */
async function applyBusinessLogicConstraints(result: DatabaseValidationResult): Promise<void> {
    const businessConstraints = [
        // Prevent submission after prediction expires
        {
            name: 'prevent_late_submissions',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_late_submissions 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN EXISTS (
                    SELECT 1 FROM enhanced_oracle_predictions 
                    WHERE id = NEW.prediction_id AND expires_at <= CURRENT_TIMESTAMP
                  ) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Cannot submit prediction after expiration time'); 
                  END`
        },

        // Prevent submission to resolved predictions
        {
            name: 'prevent_submission_to_resolved',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_submission_to_resolved 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN EXISTS (
                    SELECT 1 FROM enhanced_oracle_predictions 
                    WHERE id = NEW.prediction_id AND is_resolved = 1
                  ) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Cannot submit prediction to already resolved questions'); 
                  END`
        },

        // Ensure oracle choice is within valid range
        {
            name: 'validate_oracle_choice_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_oracle_choice_range 
                  BEFORE UPDATE ON enhanced_oracle_predictions 
                  WHEN NEW.oracle_choice < 0 OR NEW.oracle_choice >= JSON_ARRAY_LENGTH(NEW.options) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Oracle choice must be within valid option range'); 
                  END`
        },

        // Ensure user choice is within valid range
        {
            name: 'validate_user_choice_range',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_user_choice_range 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN NEW.user_choice < 0 OR NEW.user_choice >= (
                    SELECT JSON_ARRAY_LENGTH(options) FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id
                  ) 
                  BEGIN 
                    SELECT RAISE(ABORT, 'User choice must be within valid option range'); 
                  END`
        },

        // Prevent negative points
        {
            name: 'prevent_negative_points',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_negative_points 
                  BEFORE INSERT ON enhanced_user_predictions 
                  WHEN NEW.points_earned < 0 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Points earned cannot be negative'); 
                  END`
        },

        // Validate points multiplier range
        {
            name: 'validate_points_multiplier',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_points_multiplier 
                  BEFORE INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.points_multiplier < 0.1 OR NEW.points_multiplier > 10.0 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Points multiplier must be between 0.1 and 10.0'); 
                  END`
        }
    ];

    for (const constraint of businessConstraints) {
        try {
            await runQuery(constraint.sql);
            result.constraintsAdded++;
            console.log(`✓ Applied business constraint: ${constraint.name}`);
        } catch (error) {
            result.warnings.push(`Failed to apply business constraint ${constraint.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Apply security and audit constraints
 */
async function applySecurityConstraints(result: DatabaseValidationResult): Promise<void> {
    const securityConstraints = [
        // Rate limiting for login attempts
        {
            name: 'login_attempt_rate_limit',
            sql: `CREATE TRIGGER IF NOT EXISTS login_attempt_rate_limit 
                  BEFORE UPDATE OF login_attempts ON simple_auth_users 
                  WHEN NEW.login_attempts >= 5 AND OLD.locked_until IS NULL 
                  BEGIN 
                    UPDATE simple_auth_users 
                    SET locked_until = datetime('now', '+30 minutes') 
                    WHERE id = NEW.id; 
                  END`
        },

        // Audit trail for user updates
        {
            name: 'audit_user_updates',
            sql: `CREATE TRIGGER IF NOT EXISTS audit_user_updates 
                  AFTER UPDATE ON simple_auth_users 
                  BEGIN 
                    UPDATE simple_auth_users 
                    SET updated_at = CURRENT_TIMESTAMP 
                    WHERE id = NEW.id; 
                  END`
        },

        // Prevent admin privilege escalation
        {
            name: 'prevent_admin_privilege_escalation',
            sql: `CREATE TRIGGER IF NOT EXISTS prevent_admin_privilege_escalation 
                  BEFORE UPDATE OF is_admin ON simple_auth_users 
                  WHEN OLD.is_admin = 0 AND NEW.is_admin = 1 AND NEW.player_number != 0 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Only player_number 0 can have admin privileges'); 
                  END`
        },

        // Session token validation
        {
            name: 'validate_session_token_length',
            sql: `CREATE TRIGGER IF NOT EXISTS validate_session_token_length 
                  BEFORE UPDATE OF session_token ON simple_auth_users 
                  WHEN NEW.session_token IS NOT NULL AND LENGTH(NEW.session_token) < 32 
                  BEGIN 
                    SELECT RAISE(ABORT, 'Session token must be at least 32 characters'); 
                  END`
        }
    ];

    for (const constraint of securityConstraints) {
        try {
            await runQuery(constraint.sql);
            result.constraintsAdded++;
            console.log(`✓ Applied security constraint: ${constraint.name}`);
        } catch (error) {
            result.warnings.push(`Failed to apply security constraint ${constraint.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Apply performance optimization constraints
 */
async function applyPerformanceOptimizations(result: DatabaseValidationResult): Promise<void> {
    const performanceIndexes = [
        // Compound indexes for common queries
        'CREATE INDEX IF NOT EXISTS idx_enhanced_predictions_week_type_resolved ON enhanced_oracle_predictions(week, type, is_resolved)',
        'CREATE INDEX IF NOT EXISTS idx_user_predictions_user_submitted ON enhanced_user_predictions(user_id, submitted_at)',
        'CREATE INDEX IF NOT EXISTS idx_user_statistics_season_accuracy ON user_statistics(season, accuracy_percentage DESC)',
        'CREATE INDEX IF NOT EXISTS idx_leaderboard_points_week ON leaderboard_rankings(points_total DESC, week)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON system_notifications(user_id, is_read, created_at DESC)',
        
        // Partial indexes for performance
        'CREATE INDEX IF NOT EXISTS idx_active_predictions ON enhanced_oracle_predictions(expires_at) WHERE is_resolved = 0',
        'CREATE INDEX IF NOT EXISTS idx_unread_notifications ON system_notifications(user_id, created_at DESC) WHERE is_read = 0',
        'CREATE INDEX IF NOT EXISTS idx_recent_achievements ON user_achievements(user_id, earned_at DESC) WHERE earned_at > datetime("now", "-30 days")'
    ];

    for (const index of performanceIndexes) {
        try {
            await runQuery(index);
            result.constraintsAdded++;
            console.log(`✓ Applied performance index: ${index.substring(0, 60)}...`);
        } catch (error) {
            result.warnings.push(`Failed to apply performance index: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Create data quality triggers for automatic maintenance
 */
async function createDataQualityTriggers(result: DatabaseValidationResult): Promise<void> {
    const qualityTriggers = [
        // Auto-update participant count when predictions are submitted
        {
            name: 'auto_update_participant_count',
            sql: `CREATE TRIGGER IF NOT EXISTS auto_update_participant_count 
                  AFTER INSERT ON enhanced_user_predictions 
                  BEGIN 
                    UPDATE enhanced_oracle_predictions 
                    SET participants_count = (
                      SELECT COUNT(DISTINCT user_id) FROM enhanced_user_predictions 
                      WHERE prediction_id = NEW.prediction_id
                    ),
                    total_submissions = (
                      SELECT COUNT(*) FROM enhanced_user_predictions 
                      WHERE prediction_id = NEW.prediction_id
                    )
                    WHERE id = NEW.prediction_id; 
                  END`
        },

        // Auto-calculate accuracy when predictions are resolved
        {
            name: 'auto_calculate_accuracy',
            sql: `CREATE TRIGGER IF NOT EXISTS auto_calculate_accuracy 
                  AFTER UPDATE OF is_resolved ON enhanced_oracle_predictions 
                  WHEN NEW.is_resolved = 1 AND OLD.is_resolved = 0 
                  BEGIN 
                    UPDATE enhanced_user_predictions 
                    SET is_correct = (user_choice = NEW.actual_result) 
                    WHERE prediction_id = NEW.id; 
                  END`
        },

        // Auto-cleanup expired predictions
        {
            name: 'auto_mark_expired_predictions',
            sql: `CREATE TRIGGER IF NOT EXISTS auto_mark_expired_predictions 
                  AFTER INSERT ON enhanced_oracle_predictions 
                  WHEN NEW.expires_at <= CURRENT_TIMESTAMP 
                  BEGIN 
                    UPDATE enhanced_oracle_predictions 
                    SET is_resolved = 1 
                    WHERE id = NEW.id; 
                  END`
        },

        // Auto-update user statistics when predictions are resolved
        {
            name: 'auto_update_user_stats',
            sql: `CREATE TRIGGER IF NOT EXISTS auto_update_user_stats 
                  AFTER UPDATE OF is_correct ON enhanced_user_predictions 
                  WHEN NEW.is_correct IS NOT NULL AND OLD.is_correct IS NULL 
                  BEGIN 
                    INSERT OR REPLACE INTO user_statistics (
                      user_id, week, season, total_predictions, correct_predictions, 
                      accuracy_percentage, total_points, calculated_at
                    ) 
                    SELECT 
                      NEW.user_id,
                      (SELECT week FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id),
                      (SELECT season FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id),
                      COUNT(*),
                      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END),
                      ROUND((SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2),
                      SUM(points_earned),
                      CURRENT_TIMESTAMP
                    FROM enhanced_user_predictions eup
                    JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
                    WHERE eup.user_id = NEW.user_id 
                      AND eop.week = (SELECT week FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id)
                      AND eop.season = (SELECT season FROM enhanced_oracle_predictions WHERE id = NEW.prediction_id)
                      AND eop.is_resolved = 1; 
                  END`
        }
    ];

    for (const trigger of qualityTriggers) {
        try {
            await runQuery(trigger.sql);
            result.constraintsAdded++;
            console.log(`✓ Applied data quality trigger: ${trigger.name}`);
        } catch (error) {
            result.warnings.push(`Failed to apply data quality trigger ${trigger.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Validate database integrity and constraints
 */
async function validateDatabaseIntegrity(): Promise<DatabaseValidationResult> {
    const result: DatabaseValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        constraintsAdded: 0,
        validationRulesApplied: 0
    };

    try {
        console.log('🔍 Validating database integrity...');

        // 1. Check foreign key constraints
        const foreignKeyCheck = await runQuery('PRAGMA foreign_key_check');
        if (foreignKeyCheck && Array.isArray(foreignKeyCheck) && foreignKeyCheck.length > 0) {
            result.errors.push('Foreign key constraint violations found');
            result.isValid = false;
        }

        // 2. Check for orphaned records
        const orphanedUserPredictions = await getRow(`
            SELECT COUNT(*) as count FROM enhanced_user_predictions eup
            LEFT JOIN simple_auth_users sau ON eup.user_id = sau.id
            WHERE sau.id IS NULL
        `);
        if (orphanedUserPredictions.count > 0) {
            result.warnings.push(`Found ${orphanedUserPredictions.count} orphaned user predictions`);
        }

        // 3. Check data consistency
        const inconsistentStats = await getRow(`
            SELECT COUNT(*) as count FROM user_statistics 
            WHERE correct_predictions > total_predictions 
               OR accuracy_percentage < 0 
               OR accuracy_percentage > 100
        `);
        if (inconsistentStats.count > 0) {
            result.warnings.push(`Found ${inconsistentStats.count} records with inconsistent statistics`);
        }

        // 4. Check for invalid prediction choices
        const invalidChoices = await getRow(`
            SELECT COUNT(*) as count FROM enhanced_user_predictions eup
            JOIN enhanced_oracle_predictions eop ON eup.prediction_id = eop.id
            WHERE eup.user_choice >= JSON_ARRAY_LENGTH(eop.options) OR eup.user_choice < 0
        `);
        if (invalidChoices.count > 0) {
            result.errors.push(`Found ${invalidChoices.count} invalid prediction choices`);
            result.isValid = false;
        }

        console.log(`✅ Database integrity validation completed: ${result.errors.length} errors, ${result.warnings.length} warnings`);

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('❌ Database validation failed:', error);
    }

    return result;
}

/**
 * Create database migration tracking
 */
async function createMigrationTracking(): Promise<void> {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL UNIQUE,
            version TEXT NOT NULL,
            description TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            checksum TEXT
        )
    `);

    // Record this constraint application as a migration
    await runQuery(`
        INSERT OR IGNORE INTO schema_migrations (migration_name, version, description, checksum)
        VALUES (?, ?, ?, ?)
    `, [
        'production_constraints_v1',
        '1.0.0',
        'Applied production database constraints and validation rules',
        'prod_constraints_' + Date.now()
    ]);
}

export {
    applyProductionConstraints,
    validateDatabaseIntegrity,
    createMigrationTracking
};
