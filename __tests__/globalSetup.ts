/**
 * Global Setup for All Tests
 * Initializes test environment and shared resources
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { startServer } from '../backend/server';
import { Server } from 'http';
import { TextEncoder, TextDecoder } from 'util';

let testServer: Server;

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting global test setup...\n');

  try {

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    process.env.RATE_LIMIT_ENABLED = 'false';
    
    // Create test directories
    const testDirs = [
      'coverage',
      '__tests__/fixtures',
      '__tests__/temp',
      'test-results'
    ];

    testDirs.forEach(dir => {
      const dirPath = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Initialize test database
    await initializeTestDatabase();
    
    // Start global test server
    testServer = await startServer();
    (global as any).__TEST_SERVER__ = testServer;
    
    // Setup mock services
    setupMockServices();
    
    console.log('✅ Global test setup completed successfully');

  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

async function initializeTestDatabase(): Promise<void> {
  console.log('📦 Initializing test database...');
  
  // Create test database schema if needed
  const dbSetupPath = path.resolve(process.cwd(), 'backend/db/testSetup.ts');
  if (fs.existsSync(dbSetupPath)) {
    try {
      // Import and run database setup
      const { setupTestDatabase } = await import(dbSetupPath);
      await setupTestDatabase();
      console.log('✅ Test database initialized');
    } catch (error) {
      console.log('⚠️  Test database setup skipped:', error.message);
    }
  }
}

function setupMockServices(): void {
  console.log('🔧 Setting up mock services...');
  
  // Mock external API calls
  global.fetch = jest.fn();
  
  // Mock file system operations for testing
  jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
  }));
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  console.log('✅ Mock services configured');
}
