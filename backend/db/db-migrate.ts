/**
 * Database Management Script for 10-User Astral Draft
 * Run database migrations and validation for friend group setup
 */

import { applyConstraintMigrations, validateDatabaseIntegrity, getMigrationStatus } from './constraints-migration';
import { initDatabase } from './index';

/**
 * Main database setup and migration function
 */
async function setupDatabaseConstraints(): Promise<void> {
    try {
        console.log('🚀 Setting up Astral Draft database for 10-friend group...');
        console.log('📅 Focus: Reliability and data integrity for small user base');
        
        // Initialize database connection
        await initDatabase();
        
        // Get current migration status
        console.log('\n📊 Checking migration status...');
        const status = await getMigrationStatus();
        console.log(`   Applied: ${status.applied.length}/${status.total} migrations`);
        console.log(`   Pending: ${status.pending.length} migrations`);
        
        if (status.pending.length > 0) {
            console.log(`   Pending migrations: ${status.pending.join(', ')}`);
        }
        
        // Apply constraint migrations
        console.log('\n🔧 Applying database constraints...');
        await applyConstraintMigrations();
        
        // Validate database integrity
        console.log('\n🔍 Validating database integrity...');
        const validation = await validateDatabaseIntegrity();
        
        // Report results
        console.log('\n📋 Migration Results:');
        console.log(`   ✅ Database valid: ${validation.isValid ? 'YES' : 'NO'}`);
        
        if (validation.errors.length > 0) {
            console.log(`   ❌ Errors found: ${validation.errors.length}`);
            validation.errors.forEach(error => console.log(`      • ${error}`));
        }
        
        if (validation.warnings.length > 0) {
            console.log(`   ⚠️  Warnings: ${validation.warnings.length}`);
            validation.warnings.forEach(warning => console.log(`      • ${warning}`));
        }
        
        if (validation.isValid) {
            console.log('\n🎉 Database setup complete! Ready for 10-friend group.');
            console.log('🔒 Features enabled:');
            console.log('   • Foreign key constraints for data integrity');
            console.log('   • Optimized indexes for 10-user queries');
            console.log('   • Data validation rules');
            console.log('   • PIN authentication system preserved');
            console.log('   • Performance optimizations for small group');
        } else {
            console.log('\n❌ Database setup failed - please check errors above');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Database setup failed:', error);
        process.exit(1);
    }
}

/**
 * Rollback migrations (if needed for development)
 */
async function rollbackConstraints(): Promise<void> {
    try {
        console.log('🔄 Rolling back constraint migrations...');
        console.log('⚠️  Note: This will remove indexes and validation rules');
        
        // Note: SQLite doesn't support DROP CONSTRAINT, so we'd need to recreate tables
        // For development, it's easier to delete the database file and re-run setup
        console.log('💡 To rollback: Delete data/astral-draft.db and run setup again');
        
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

/**
 * Show current database status
 */
async function showDatabaseStatus(): Promise<void> {
    try {
        console.log('📊 Astral Draft Database Status');
        console.log('================================');
        
        const status = await getMigrationStatus();
        console.log(`Migrations Applied: ${status.applied.length}/${status.total}`);
        
        if (status.applied.length > 0) {
            console.log('\n✅ Applied Migrations:');
            status.applied.forEach(id => console.log(`   • ${id}`));
        }
        
        if (status.pending.length > 0) {
            console.log('\n⏳ Pending Migrations:');
            status.pending.forEach(id => console.log(`   • ${id}`));
        }
        
        const validation = await validateDatabaseIntegrity();
        console.log(`\n🔍 Database Valid: ${validation.isValid ? '✅ YES' : '❌ NO'}`);
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
    } catch (error) {
        console.error('❌ Status check failed:', error);
        throw error;
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2] || 'setup';
    
    switch (command) {
        case 'setup':
            setupDatabaseConstraints();
            break;
        case 'status':
            showDatabaseStatus();
            break;
        case 'rollback':
            rollbackConstraints();
            break;
        default:
            console.log('Usage: node db-migrate.js [setup|status|rollback]');
            console.log('');
            console.log('Commands:');
            console.log('  setup   - Apply database constraints and migrations');
            console.log('  status  - Show current migration status');
            console.log('  rollback - Rollback migrations (development only)');
            break;
    }
}

export { setupDatabaseConstraints, showDatabaseStatus, rollbackConstraints };
