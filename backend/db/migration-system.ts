/**
 * Database Migration System
 * Manages schema versions, applies migrations safely, and tracks changes
 */

import { runQuery, getRow, getRows } from './index';

export interface Migration {
    version: string;
    name: string;
    description: string;
    up: () => Promise<void>;
    down: () => Promise<void>;
}

export interface MigrationResult {
    success: boolean;
    appliedMigrations: string[];
    errors: string[];
    warnings: string[];
}

/**
 * Initialize migration tracking table
 */
export async function initMigrationSystem(): Promise<void> {
    try {
        await runQuery(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                checksum TEXT,
                execution_time_ms INTEGER
            )
        `);
        
        console.log('✅ Migration system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize migration system:', error);
        throw error;
    }
}

/**
 * Get list of applied migrations
 */
export async function getAppliedMigrations(): Promise<string[]> {
    try {
        const migrations = await getRows(`
            SELECT version FROM schema_migrations 
            ORDER BY applied_at ASC
        `);
        return migrations.map(m => m.version);
    } catch (error) {
        console.error('Failed to get applied migrations:', error);
        return [];
    }
}

/**
 * Check if migration has been applied
 */
export async function isMigrationApplied(version: string): Promise<boolean> {
    try {
        const migration = await getRow(`
            SELECT version FROM schema_migrations 
            WHERE version = ?
        `, [version]);
        return !!migration;
    } catch (error) {
        console.error(`Failed to check migration ${version}:`, error);
        return false;
    }
}

/**
 * Apply a single migration
 */
export async function applyMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
        console.log(`🔄 Applying migration: ${migration.version} - ${migration.name}`);
        
        // Check if already applied
        if (await isMigrationApplied(migration.version)) {
            console.log(`⏭️  Migration ${migration.version} already applied, skipping`);
            return;
        }
        
        // Apply the migration
        await migration.up();
        
        // Record the migration
        const executionTime = Date.now() - startTime;
        await runQuery(`
            INSERT INTO schema_migrations (version, name, description, execution_time_ms)
            VALUES (?, ?, ?, ?)
        `, [migration.version, migration.name, migration.description, executionTime]);
        
        console.log(`✅ Migration ${migration.version} applied successfully (${executionTime}ms)`);
        
    } catch (error) {
        console.error(`❌ Failed to apply migration ${migration.version}:`, error);
        throw error;
    }
}

/**
 * Rollback a migration
 */
export async function rollbackMigration(migration: Migration): Promise<void> {
    try {
        console.log(`⏪ Rolling back migration: ${migration.version} - ${migration.name}`);
        
        // Check if migration was applied
        if (!(await isMigrationApplied(migration.version))) {
            console.log(`⏭️  Migration ${migration.version} not applied, skipping rollback`);
            return;
        }
        
        // Apply the rollback
        await migration.down();
        
        // Remove from migrations table
        await runQuery(`
            DELETE FROM schema_migrations 
            WHERE version = ?
        `, [migration.version]);
        
        console.log(`✅ Migration ${migration.version} rolled back successfully`);
        
    } catch (error) {
        console.error(`❌ Failed to rollback migration ${migration.version}:`, error);
        throw error;
    }
}

/**
 * Apply all pending migrations
 */
export async function runMigrations(migrations: Migration[]): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: true,
        appliedMigrations: [],
        errors: [],
        warnings: []
    };
    
    try {
        // Initialize migration system if needed
        await initMigrationSystem();
        
        // Get applied migrations
        const appliedMigrations = await getAppliedMigrations();
        
        // Filter pending migrations
        const pendingMigrations = migrations.filter(
            migration => !appliedMigrations.includes(migration.version)
        );
        
        if (pendingMigrations.length === 0) {
            console.log('📋 No pending migrations to apply');
            return result;
        }
        
        console.log(`🚀 Applying ${pendingMigrations.length} pending migrations...`);
        
        // Apply each pending migration
        for (const migration of pendingMigrations) {
            try {
                await applyMigration(migration);
                result.appliedMigrations.push(migration.version);
            } catch (error) {
                result.success = false;
                result.errors.push(`Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                break; // Stop on first error
            }
        }
        
        if (result.success) {
            console.log(`✅ All migrations applied successfully (${result.appliedMigrations.length} applied)`);
        } else {
            console.error(`❌ Migration failed. Applied: ${result.appliedMigrations.length}, Errors: ${result.errors.length}`);
        }
        
    } catch (error) {
        result.success = false;
        result.errors.push(`Migration system error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
}

/**
 * Get migration status and information
 */
export async function getMigrationStatus(): Promise<{
    appliedMigrations: Array<{
        version: string;
        name: string;
        description: string;
        applied_at: string;
        execution_time_ms: number;
    }>;
    pendingCount: number;
    lastMigration: string | null;
}> {
    try {
        const appliedMigrations = await getRows(`
            SELECT version, name, description, applied_at, execution_time_ms
            FROM schema_migrations 
            ORDER BY applied_at DESC
        `);
        
        const lastMigration = appliedMigrations.length > 0 ? appliedMigrations[0].version : null;
        
        return {
            appliedMigrations,
            pendingCount: 0, // Would need to compare with available migration files
            lastMigration
        };
    } catch (error) {
        console.error('Failed to get migration status:', error);
        return {
            appliedMigrations: [],
            pendingCount: 0,
            lastMigration: null
        };
    }
}

/**
 * Validate database schema integrity
 */
export async function validateSchemaIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    foreignKeyViolations: number;
    constraintViolations: number;
}> {
    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        foreignKeyViolations: 0,
        constraintViolations: 0
    };
    
    try {
        // Check foreign key integrity
        const fkCheck = await getRows('PRAGMA foreign_key_check');
        result.foreignKeyViolations = fkCheck.length;
        
        if (result.foreignKeyViolations > 0) {
            result.isValid = false;
            result.errors.push(`${result.foreignKeyViolations} foreign key violations found`);
            fkCheck.forEach((violation: any) => {
                result.errors.push(`FK violation in table ${violation.table}: ${violation.fkid}`);
            });
        }
        
        // Check integrity
        const integrityCheck = await getRows('PRAGMA integrity_check');
        const integrityResult = integrityCheck[0]?.integrity_check;
        
        if (integrityResult !== 'ok') {
            result.isValid = false;
            result.errors.push(`Database integrity check failed: ${integrityResult}`);
        }
        
        // Validate required tables exist
        const requiredTables = [
            'users', 'user_sessions', 'oracle_predictions', 'user_predictions',
            'leagues', 'oracle_analytics', 'schema_migrations'
        ];
        
        for (const table of requiredTables) {
            const tableExists = await getRow(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            `, [table]);
            
            if (!tableExists) {
                result.isValid = false;
                result.errors.push(`Required table '${table}' is missing`);
            }
        }
        
    } catch (error) {
        result.isValid = false;
        result.errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
}
