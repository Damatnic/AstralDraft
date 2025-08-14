import { initDatabase, closeDatabase } from '../backend/db/index';

// Use an in-memory database for tests
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  console.log('Setting up the test database...');
  
  try {
    // Initialize fresh in-memory database
    await initDatabase(':memory:');
    
    // Import and run the enhanced schema setup
    const { createEnhancedTables, seedSimpleAuthUsers } = await import('../backend/db/enhanced-schema');
    await createEnhancedTables();
    await seedSimpleAuthUsers();
    
    console.log('Test database setup complete.');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('Closing the test database...');
  
  try {
    await closeDatabase();
    console.log('Test database closed.');
  } catch (error) {
    console.error('Failed to close test database:', error);
  }
});

// Ensure clean exit
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in tests:', error);
  process.exit(1);
});