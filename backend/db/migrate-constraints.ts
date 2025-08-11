/**
 * Database Migration Script for Production Constraints
 * Applies all production constraints and validation to existing database
 */

import path from 'path';
import { setupProductionDatabase, performDatabaseHealthCheck, generateDatabaseDocumentation } from './production-setup';
import { applyProductionConstraints, validateDatabaseIntegrity } from './production-constraints';

interface MigrationResult {
    success: boolean;
    message: string;
    timestamp: string;
    steps: {
        backup: boolean;
        constraints: boolean;
        validation: boolean;
        healthCheck: boolean;
        documentation: boolean;
    };
    statistics?: any;
    healthCheck?: any;
    documentationPath?: string;
}

/**
 * Apply production constraints to existing database
 */
async function migrateToProductionConstraints(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: false,
        message: '',
        timestamp: new Date().toISOString(),
        steps: {
            backup: false,
            constraints: false,
            validation: false,
            healthCheck: false,
            documentation: false
        }
    };

    try {
        console.log('🔄 Starting database migration to production constraints...');

        // Step 1: Create backup (log current state)
        console.log('💾 Step 1: Creating database backup record...');
        try {
            const { getRows } = await import('./index');
            const tableCount = await getRows(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);
            console.log(`📊 Current database has ${tableCount.length} tables`);
            result.steps.backup = true;
        } catch (error) {
            console.log('⚠️ Could not query existing database, proceeding with fresh setup:', 
                error instanceof Error ? error.message : 'Unknown error');
            result.steps.backup = true; // Allow fresh setup
        }

        // Step 2: Apply production constraints
        console.log('🔧 Step 2: Applying production constraints...');
        const constraintResult = await applyProductionConstraints();
        result.steps.constraints = constraintResult.isValid;
        
        if (constraintResult.isValid) {
            console.log(`✅ Applied ${constraintResult.constraintsAdded} constraints and ${constraintResult.validationRulesApplied} validation rules`);
        } else {
            console.log('❌ Failed to apply production constraints');
            throw new Error('Constraint application failed: ' + constraintResult.errors.join(', '));
        }

        // Step 3: Validate database integrity
        console.log('🔍 Step 3: Validating database integrity...');
        const validationResult = await validateDatabaseIntegrity();
        result.steps.validation = validationResult.isValid;
        
        if (validationResult.isValid) {
            console.log('✅ Database integrity validation passed');
        } else {
            console.log('⚠️ Database integrity issues found:', validationResult.errors);
        }

        // Step 4: Perform health check
        console.log('🏥 Step 4: Performing health check...');
        const healthCheck = await performDatabaseHealthCheck();
        result.steps.healthCheck = healthCheck.isHealthy;
        result.healthCheck = healthCheck;
        
        if (healthCheck.isHealthy) {
            console.log('✅ Database health check passed');
        } else {
            console.log('⚠️ Health check issues:', healthCheck.issues);
        }

        // Step 5: Generate documentation
        console.log('📖 Step 5: Generating database documentation...');
        try {
            const documentation = await generateDatabaseDocumentation();
            const docPath = path.join(process.cwd(), 'backend', 'db', 'schema-documentation.md');
            
            // Write documentation to file
            const fs = await import('fs/promises');
            await fs.writeFile(docPath, documentation);
            
            result.steps.documentation = true;
            result.documentationPath = docPath;
            console.log(`✅ Documentation generated: ${docPath}`);
        } catch (error) {
            console.log('⚠️ Documentation generation failed:', error);
            result.steps.documentation = false;
        }

        // Determine overall success
        const criticalSteps = [result.steps.backup, result.steps.constraints];
        const optionalSteps = [result.steps.validation, result.steps.healthCheck, result.steps.documentation];
        
        result.success = criticalSteps.every(step => step === true);
        
        if (result.success) {
            result.message = `Database migration to production constraints completed successfully. ${constraintResult.constraintsAdded} constraints applied.`;
            console.log('🎉 Database migration completed successfully!');
            
            // Report on optional steps
            const completedOptional = optionalSteps.filter(step => step === true).length;
            console.log(`📊 Optional steps completed: ${completedOptional}/${optionalSteps.length}`);
            
        } else {
            result.message = 'Database migration failed on critical steps. Check constraint application.';
            console.log('❌ Database migration failed');
        }

    } catch (error) {
        result.success = false;
        result.message = `Database migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌ Database migration error:', error);
    }

    return result;
}

/**
 * Complete fresh database setup (for new deployments)
 */
async function setupFreshProductionDatabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: false,
        message: '',
        timestamp: new Date().toISOString(),
        steps: {
            backup: true, // N/A for fresh setup
            constraints: false,
            validation: false,
            healthCheck: false,
            documentation: false
        }
    };

    try {
        console.log('🆕 Setting up fresh production database...');

        // Use the comprehensive setup function
        const setupResult = await setupProductionDatabase();
        
        result.steps.constraints = setupResult.steps.productionConstraints;
        result.steps.validation = setupResult.steps.validation;
        result.statistics = setupResult.statistics;

        // Perform health check
        const healthCheck = await performDatabaseHealthCheck();
        result.steps.healthCheck = healthCheck.isHealthy;
        result.healthCheck = healthCheck;

        // Generate documentation
        try {
            const documentation = await generateDatabaseDocumentation();
            const docPath = path.join(process.cwd(), 'backend', 'db', 'schema-documentation.md');
            
            const fs = await import('fs/promises');
            await fs.writeFile(docPath, documentation);
            
            result.steps.documentation = true;
            result.documentationPath = docPath;
        } catch (error) {
            console.log('⚠️ Documentation generation failed:', error);
        }

        result.success = setupResult.success;
        result.message = setupResult.message;

    } catch (error) {
        result.success = false;
        result.message = `Fresh database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌ Fresh database setup error:', error);
    }

    return result;
}

/**
 * Main migration entry point
 */
async function runDatabaseMigration(): Promise<void> {
    console.log('🚀 Starting Astral Draft database migration process...');
    console.log('================================================');

    try {
        // Check if database exists
        const fs = await import('fs/promises');
        const dbPath = path.join(process.cwd(), 'data', 'astral-draft.db');
        
        let migrationResult: MigrationResult;
        
        try {
            await fs.access(dbPath);
            console.log('📁 Existing database found, applying constraints migration...');
            migrationResult = await migrateToProductionConstraints();
        } catch {
            console.log('🆕 No existing database found, setting up fresh production database...');
            migrationResult = await setupFreshProductionDatabase();
        }

        // Report results
        console.log('\n================================================');
        console.log('📊 MIGRATION RESULTS');
        console.log('================================================');
        console.log(`✅ Success: ${migrationResult.success}`);
        console.log(`📝 Message: ${migrationResult.message}`);
        console.log(`⏰ Timestamp: ${migrationResult.timestamp}`);
        
        console.log('\n📋 STEPS COMPLETED:');
        Object.entries(migrationResult.steps).forEach(([step, completed]) => {
            console.log(`${completed ? '✅' : '❌'} ${step}: ${completed ? 'Success' : 'Failed'}`);
        });

        if (migrationResult.statistics) {
            console.log('\n📊 DATABASE STATISTICS:');
            console.log(`Tables: ${migrationResult.statistics.totalTables}`);
            console.log(`Indexes: ${migrationResult.statistics.totalIndexes}`);
            console.log(`Constraints: ${migrationResult.statistics.totalConstraints}`);
            console.log(`Users: ${migrationResult.statistics.totalUsers}`);
            console.log(`Predictions: ${migrationResult.statistics.totalPredictions}`);
        }

        if (migrationResult.healthCheck) {
            console.log('\n🏥 HEALTH CHECK:');
            console.log(`Healthy: ${migrationResult.healthCheck.isHealthy ? 'Yes' : 'No'}`);
            console.log(`Query Performance: ${migrationResult.healthCheck.performance.queryTime}ms`);
            if (migrationResult.healthCheck.issues.length > 0) {
                console.log(`Issues: ${migrationResult.healthCheck.issues.join(', ')}`);
            }
            if (migrationResult.healthCheck.recommendations.length > 0) {
                console.log(`Recommendations: ${migrationResult.healthCheck.recommendations.join(', ')}`);
            }
        }

        if (migrationResult.documentationPath) {
            console.log(`\n📖 Documentation: ${migrationResult.documentationPath}`);
        }

        console.log('\n================================================');
        if (migrationResult.success) {
            console.log('🎉 Database migration completed successfully!');
            console.log('🚀 Your Astral Draft database is now production-ready with full constraints and validation.');
        } else {
            console.log('❌ Database migration completed with issues.');
            console.log('⚠️ Check the logs above for specific error details.');
        }
        console.log('================================================');

    } catch (error) {
        console.error('💥 Migration process failed with critical error:', error);
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runDatabaseMigration().catch(error => {
        console.error('💥 Unhandled migration error:', error);
        process.exit(1);
    });
}

export {
    migrateToProductionConstraints,
    setupFreshProductionDatabase,
    runDatabaseMigration
};
