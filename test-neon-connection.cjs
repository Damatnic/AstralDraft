#!/usr/bin/env node

/**
 * Test Neon Database Connection
 * Simple script to verify connection string works
 */

const { Client } = require('pg');

// Try different connection string formats
const connectionStrings = [
  // Original with channel_binding
  'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  
  // Without channel_binding  
  'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  
  // With explicit port
  'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require',
  
  // Direct connection (non-pooled)
  'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96.us-east-2.aws.neon.tech/neondb?sslmode=require'
];

async function testConnection(connectionString, description) {
  console.log(`\nTesting: ${description}`);
  console.log(`URL: ${connectionString.substring(0, 50)}...`);
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ SUCCESS - Connected!');
    
    const result = await client.query('SELECT NOW() as time, current_database() as db');
    console.log(`   Database: ${result.rows[0].db}`);
    console.log(`   Time: ${result.rows[0].time}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('Testing Neon Database Connections');
  console.log('========================================');
  
  let successfulConnection = null;
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const descriptions = [
      'With channel_binding parameter',
      'Without channel_binding',
      'With explicit port 5432',
      'Direct connection (non-pooled)'
    ];
    
    const success = await testConnection(connectionStrings[i], descriptions[i]);
    if (success && !successfulConnection) {
      successfulConnection = connectionStrings[i];
    }
  }
  
  console.log('\n========================================');
  if (successfulConnection) {
    console.log('✅ WORKING CONNECTION STRING FOUND!');
    console.log('\nAdd this to your .env.local file:');
    console.log(`DATABASE_URL=${successfulConnection}`);
    console.log('\nThen run: node setup-database-auto.cjs');
  } else {
    console.log('❌ No working connection found.');
    console.log('\nPossible issues:');
    console.log('1. Password might have changed - check Neon dashboard');
    console.log('2. Database might be suspended - wake it up in Neon dashboard');
    console.log('3. IP restrictions might be enabled - check Neon settings');
    console.log('\nGo to https://console.neon.tech and:');
    console.log('1. Click on your project');
    console.log('2. Go to "Connection Details"');
    console.log('3. Copy the POOLED connection string');
    console.log('4. Make sure "Show password" is enabled');
  }
  console.log('========================================');
}

runTests().catch(console.error);