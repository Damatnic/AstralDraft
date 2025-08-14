/**
 * Global Teardown for All Tests
 * Cleans up test environment and resources
 */

import path from 'path';
import fs from 'fs';
import { productionSportsDataService } from '../services/productionSportsDataService';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting global test teardown...\n');

  try {
    // Clean up test files
    await cleanupTestFiles();
    
    // Close any open connections
    await closeConnections();
    
    // Reset environment variables
    resetEnvironmentVariables();
    
    console.log('✅ Global test teardown completed successfully');

  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

async function cleanupTestFiles(): Promise<void> {
  console.log('🗑️  Cleaning up test files...');
  
  const tempDirs = [
    '__tests__/temp',
    'test-results/temp'
  ];

  tempDirs.forEach(dir => {
    const dirPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`⚠️  Could not clean ${dir}:`, error.message);
      }
    }
  });
  
  console.log('✅ Test files cleaned up');
}

async function closeConnections(): Promise<void> {
  console.log('🔌 Closing test connections...');
  
  // Close the global test server
  const server = (global as any).__TEST_SERVER__;
  if (server && server.close) {
    await new Promise(resolve => server.close(resolve));
    console.log('✅ Test server closed');
  }

  // Clean up production sports data service timers
  try {
    productionSportsDataService.cleanup();
    console.log('✅ Production sports data service cleaned up');
  } catch (error) {
    console.warn('⚠️  Production sports data service cleanup warning:', error.message);
  }

  // Close database connections
  try {
    // If using a real database connection, close it here
    // await database.close();
  } catch (error) {
    console.warn('⚠️  Database connection cleanup warning:', error.message);
  }
  
  console.log('✅ Connections closed');
}

function resetEnvironmentVariables(): void {
  console.log('🔄 Resetting environment variables...');
  
  const testEnvVars = [
    'NODE_ENV',
    'PORT',
    'DB_PATH',
    'JWT_SECRET',
    'RATE_LIMIT_ENABLED'
  ];

  testEnvVars.forEach(varName => {
    if (process.env[varName] && process.env[varName].includes('test')) {
      delete process.env[varName];
    }
  });
  
  console.log('✅ Environment variables reset');
}
