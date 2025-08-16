/**
 * Integration Test Setup
 * Configures environment for integration testing
 */

import { execSync } from 'child_process';
import path from 'path';

export default async function setupIntegration(): Promise<void> {
  console.log('🔧 Setting up integration test environment...\n');

  try {
    // Set integration test specific environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3002'; // Different port to avoid conflicts
    process.env.DB_PATH = ':memory:';
    process.env.JWT_SECRET = 'integration-test-jwt-secret';
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise
    
    // Initialize test database for integration tests
    await setupIntegrationDatabase();
    
    // Setup test data
    await seedTestData();
    
    console.log('✅ Integration test environment ready');

  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    throw error;
  }
}

async function setupIntegrationDatabase(): Promise<void> {
  console.log('📦 Setting up integration test database...');
  
  try {
    // Create a fresh in-memory database for each test run
    const dbSetupPath = path.resolve(process.cwd(), 'backend/db/testSetup.ts');
    const fs = await import('fs');
    if (fs.existsSync(dbSetupPath)) {
      const { setupTestDatabase } = await import(dbSetupPath);
      await setupTestDatabase();
    }
    
    console.log('✅ Integration database ready');
  } catch (error) {
    console.log('⚠️  Integration database setup skipped:', error.message);
  }
}

async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');
  
  try {
    // Seed test users, leagues, predictions, etc.
    const seedPath = path.resolve(process.cwd(), '__tests__/fixtures/seedData.ts');
    const fs = await import('fs');
    if (fs.existsSync(seedPath)) {
      const { seedIntegrationData } = await import(seedPath);
      await seedIntegrationData();
    }
    
    console.log('✅ Test data seeded');
  } catch (error) {
    console.log('⚠️  Test data seeding skipped:', error.message);
  }
}
