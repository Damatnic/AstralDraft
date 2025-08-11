/**
 * Enhanced Database Setup with Production Constraints
 * Comprehensive database initialization with constraints, validation, and migrations
 */

import { initDatabase, seedDatabase, validateDatabase } from './index';
import { createEnhancedTables, createEnhancedIndexes, seedSimpleAuthUsers } from './enhanced-schema';
import { applyProductionConstraints, validateDatabaseIntegrity, createMigrationTracking } from './production-constraints';

interface DatabaseSetupResult {
    success: boolean;
    message: string;
    steps: {
        baseSchema: boolean;
        enhancedTables: boolean;
        productionConstraints: boolean;
        dataSeeding: boolean;
        migrationTracking: boolean;
        validation: boolean;
    };
    validation?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        constraintsAdded?: number;
        validationRulesApplied?: number;
    };
    statistics?: {
        totalTables: number;
        totalIndexes: number;
        totalConstraints: number;
        totalUsers: number;
        totalPredictions: number;
    };
}

/**
 * Complete production-ready database setup
 */
async function setupProductionDatabase(): Promise<DatabaseSetupResult> {
    const result: DatabaseSetupResult = {
        success: false,
        message: '',
        steps: {
            baseSchema: false,
            enhancedTables: false,
            productionConstraints: false,
            dataSeeding: false,
            migrationTracking: false,
            validation: false
        }
    };

    try {
        console.log('🚀 Starting production database setup...');

        // Step 1: Initialize base database schema
        console.log('📁 Step 1: Initializing base database schema...');
        await initDatabase();
        result.steps.baseSchema = true;
        console.log('✅ Base schema initialized');

        // Step 2: Create enhanced tables for Oracle features
        console.log('⚡ Step 2: Creating enhanced Oracle tables...');
        await createEnhancedTables();
        await createEnhancedIndexes();
        result.steps.enhancedTables = true;
        console.log('✅ Enhanced tables created');

        // Step 3: Apply production constraints and validation
        console.log('🔧 Step 3: Applying production constraints...');
        const constraintResult = await applyProductionConstraints();
        result.steps.productionConstraints = constraintResult.isValid;
        result.validation = constraintResult;
        console.log(`✅ Production constraints applied: ${constraintResult.constraintsAdded} constraints`);

        // Step 4: Seed database with initial data
        console.log('🌱 Step 4: Seeding database with initial data...');
        await seedDatabase();
        await seedSimpleAuthUsers();
        result.steps.dataSeeding = true;
        console.log('✅ Database seeded with initial data');

        // Step 5: Create migration tracking
        console.log('📋 Step 5: Setting up migration tracking...');
        await createMigrationTracking();
        result.steps.migrationTracking = true;
        console.log('✅ Migration tracking configured');

        // Step 6: Final validation
        console.log('🔍 Step 6: Performing final database validation...');
        const finalValidation = await validateDatabaseIntegrity();
        const baseValidation = await validateDatabase();
        
        // Combine validation results
        result.validation = {
            isValid: finalValidation.isValid && baseValidation.isValid,
            errors: [...(finalValidation.errors || []), ...(baseValidation.errors || [])],
            warnings: [...(finalValidation.warnings || []), ...(baseValidation.warnings || [])],
            constraintsAdded: finalValidation.constraintsAdded,
            validationRulesApplied: finalValidation.validationRulesApplied
        };
        result.steps.validation = true;

        // Step 7: Gather statistics
        console.log('📊 Step 7: Gathering database statistics...');
        result.statistics = await getDatabaseStatistics();

        // Determine overall success
        result.success = Object.values(result.steps).every(step => step === true) && 
                        result.validation.isValid;

        if (result.success) {
            result.message = 'Production database setup completed successfully with all constraints and validations.';
            console.log('🎉 Production database setup completed successfully!');
            console.log(`📊 Database contains: ${result.statistics.totalTables} tables, ${result.statistics.totalIndexes} indexes, ${result.statistics.totalConstraints} constraints`);
            console.log(`👥 Users: ${result.statistics.totalUsers}, 🔮 Predictions: ${result.statistics.totalPredictions}`);
        } else {
            result.message = 'Database setup completed but with issues. Check validation errors and warnings.';
            console.log('⚠️ Database setup completed with issues');
        }

    } catch (error) {
        result.success = false;
        result.message = `Production database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌ Production database setup failed:', error);
        
        if (!result.validation) {
            result.validation = {
                isValid: false,
                errors: [result.message],
                warnings: []
            };
        }
    }

    return result;
}

/**
 * Gather comprehensive database statistics
 */
async function getDatabaseStatistics(): Promise<{
    totalTables: number;
    totalIndexes: number;
    totalConstraints: number;
    totalUsers: number;
    totalPredictions: number;
}> {
    try {
        const { getRow } = await import('./index');

        // Count tables
        const tableCount = await getRow(`
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        // Count indexes
        const indexCount = await getRow(`
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `);

        // Count triggers (constraints)
        const triggerCount = await getRow(`
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='trigger'
        `);

        // Count users
        let userCount = 0;
        try {
            const userCountResult = await getRow('SELECT COUNT(*) as count FROM simple_auth_users');
            userCount = userCountResult.count;
        } catch {
            // Table might not exist yet
        }

        // Count predictions
        let predictionCount = 0;
        try {
            const predictionCountResult = await getRow('SELECT COUNT(*) as count FROM enhanced_oracle_predictions');
            predictionCount = predictionCountResult.count;
        } catch {
            // Table might not exist yet
        }

        return {
            totalTables: tableCount.count,
            totalIndexes: indexCount.count,
            totalConstraints: triggerCount.count,
            totalUsers: userCount,
            totalPredictions: predictionCount
        };

    } catch (error) {
        console.error('Error gathering database statistics:', error);
        return {
            totalTables: 0,
            totalIndexes: 0,
            totalConstraints: 0,
            totalUsers: 0,
            totalPredictions: 0
        };
    }
}

/**
 * Quick health check for production database
 */
async function performDatabaseHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    performance: {
        queryTime: number;
        indexEfficiency: string;
        tableOptimization: string;
    };
}> {
    const healthCheck = {
        isHealthy: true,
        issues: [] as string[],
        recommendations: [] as string[],
        performance: {
            queryTime: 0,
            indexEfficiency: 'Good',
            tableOptimization: 'Optimized'
        }
    };

    try {
        const { getRow } = await import('./index');
        const startTime = Date.now();

        // Test basic query performance
        await getRow('SELECT COUNT(*) FROM simple_auth_users');
        await getRow('SELECT COUNT(*) FROM enhanced_oracle_predictions');
        await getRow('SELECT COUNT(*) FROM enhanced_user_predictions');

        healthCheck.performance.queryTime = Date.now() - startTime;

        // Check for common issues
        const integrityCheck = await validateDatabaseIntegrity();
        if (!integrityCheck.isValid) {
            healthCheck.isHealthy = false;
            healthCheck.issues.push(...integrityCheck.errors);
        }

        if (integrityCheck.warnings.length > 0) {
            healthCheck.recommendations.push(...integrityCheck.warnings);
        }

        // Check database size and performance
        if (healthCheck.performance.queryTime > 1000) {
            healthCheck.recommendations.push('Consider database optimization - queries taking longer than expected');
            healthCheck.performance.indexEfficiency = 'Poor';
        } else if (healthCheck.performance.queryTime > 500) {
            healthCheck.recommendations.push('Monitor database performance - queries approaching slow threshold');
            healthCheck.performance.indexEfficiency = 'Fair';
        }

        console.log(`🏥 Database health check completed: ${healthCheck.isHealthy ? 'Healthy' : 'Issues Found'}`);
        console.log(`⚡ Query performance: ${healthCheck.performance.queryTime}ms`);

    } catch (error) {
        healthCheck.isHealthy = false;
        healthCheck.issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('❌ Database health check failed:', error);
    }

    return healthCheck;
}

/**
 * Generate database documentation
 */
async function generateDatabaseDocumentation(): Promise<string> {
    try {
        const { getRows } = await import('./index');
        
        let documentation = '# Astral Draft Oracle Database Schema\n\n';
        documentation += 'Generated on: ' + new Date().toISOString() + '\n\n';

        // Get all tables
        const tables = await getRows(`
            SELECT name, sql FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        documentation += '## Tables\n\n';
        for (const table of tables) {
            documentation += `### ${table.name}\n\n`;
            documentation += '```sql\n' + table.sql + '\n```\n\n';
        }

        // Get all indexes
        const indexes = await getRows(`
            SELECT name, sql FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        documentation += '## Indexes\n\n';
        for (const index of indexes) {
            if (index.sql) {
                documentation += `### ${index.name}\n\n`;
                documentation += '```sql\n' + index.sql + '\n```\n\n';
            }
        }

        // Get all triggers
        const triggers = await getRows(`
            SELECT name, sql FROM sqlite_master 
            WHERE type='trigger'
            ORDER BY name
        `);

        documentation += '## Triggers (Constraints)\n\n';
        for (const trigger of triggers) {
            documentation += `### ${trigger.name}\n\n`;
            documentation += '```sql\n' + trigger.sql + '\n```\n\n';
        }

        return documentation;

    } catch (error) {
        console.error('Error generating database documentation:', error);
        return '# Database Documentation Generation Failed\n\nError: ' + (error instanceof Error ? error.message : 'Unknown error');
    }
}

export {
    setupProductionDatabase,
    performDatabaseHealthCheck,
    generateDatabaseDocumentation,
    getDatabaseStatistics
};
