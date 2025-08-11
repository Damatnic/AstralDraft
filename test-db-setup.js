/**
 * Simple database constraint setup test
 * Test the migration system for 10-user Astral Draft setup
 */

const path = require('path');

// Set up module resolution for TypeScript
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
    }
});

// Import and run the setup
async function testDatabaseConstraints() {
    try {
        console.log('🧪 Testing database constraints setup...');
        
        // Import the migration functions
        const { setupDatabaseConstraints } = require('./backend/db/db-migrate.ts');
        
        // Run the setup
        await setupDatabaseConstraints();
        
        console.log('✅ Database constraints test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database constraints test failed:', error);
        process.exit(1);
    }
}

testDatabaseConstraints();
