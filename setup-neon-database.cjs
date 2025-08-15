#!/usr/bin/env node

/**
 * Automated Neon Database Setup Script for Astral Draft
 * This script will create all necessary tables and indexes in your Neon database
 */

const { Client } = require('pg');
const readline = require('readline');

// Your Neon connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color output for console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const header = (title) => {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
};

// SQL statements for creating tables
const sqlStatements = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      is_verified BOOLEAN DEFAULT false,
      is_admin BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      login_count INTEGER DEFAULT 0,
      account_locked BOOLEAN DEFAULT false,
      lock_reason TEXT,
      locked_until TIMESTAMP
    )`
  },
  {
    name: 'user_sessions',
    sql: `CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      refresh_token_hash TEXT UNIQUE,
      token_family VARCHAR(255),
      parent_token TEXT,
      is_revoked BOOLEAN DEFAULT false,
      revoked_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      user_agent TEXT
    )`
  },
  {
    name: 'email_verifications',
    sql: `CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'password_resets',
    sql: `CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'leagues',
    sql: `CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      commissioner_id INTEGER REFERENCES users(id),
      settings JSONB DEFAULT '{}',
      scoring_system JSONB DEFAULT '{}',
      draft_settings JSONB DEFAULT '{}',
      waiver_settings JSONB DEFAULT '{}',
      trade_settings JSONB DEFAULT '{}',
      season_year INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'teams',
    sql: `CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      owner_id INTEGER REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      logo_url TEXT,
      motto TEXT,
      roster JSONB DEFAULT '[]',
      stats JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'players',
    sql: `CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      external_id VARCHAR(100) UNIQUE,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(10),
      team VARCHAR(10),
      photo_url TEXT,
      stats JSONB DEFAULT '{}',
      projections JSONB DEFAULT '{}',
      injury_status VARCHAR(50),
      bye_week INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'draft_picks',
    sql: `CREATE TABLE IF NOT EXISTS draft_picks (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      pick INTEGER NOT NULL,
      team_id INTEGER REFERENCES teams(id),
      player_id INTEGER REFERENCES players(id),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(league_id, round, pick)
    )`
  },
  {
    name: 'transactions',
    sql: `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      team_id INTEGER REFERENCES teams(id),
      player_id INTEGER REFERENCES players(id),
      related_team_id INTEGER REFERENCES teams(id),
      details JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP
    )`
  },
  {
    name: 'matchups',
    sql: `CREATE TABLE IF NOT EXISTS matchups (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      home_team_id INTEGER REFERENCES teams(id),
      away_team_id INTEGER REFERENCES teams(id),
      home_score DECIMAL(10, 2) DEFAULT 0,
      away_score DECIMAL(10, 2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(league_id, week, home_team_id, away_team_id)
    )`
  },
  {
    name: 'messages',
    sql: `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'chat',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  }
];

// SQL statements for creating indexes
const indexStatements = [
  { name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
  { name: 'idx_users_username', sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)' },
  { name: 'idx_user_sessions_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)' },
  { name: 'idx_user_sessions_token_family', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_token_family ON user_sessions(token_family)' },
  { name: 'idx_user_sessions_expires_at', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)' },
  { name: 'idx_leagues_commissioner', sql: 'CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id)' },
  { name: 'idx_leagues_status', sql: 'CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status)' },
  { name: 'idx_teams_league', sql: 'CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id)' },
  { name: 'idx_teams_owner', sql: 'CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)' },
  { name: 'idx_players_position', sql: 'CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)' },
  { name: 'idx_players_team', sql: 'CREATE INDEX IF NOT EXISTS idx_players_team ON players(team)' },
  { name: 'idx_players_external_id', sql: 'CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id)' },
  { name: 'idx_transactions_league', sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_league ON transactions(league_id)' },
  { name: 'idx_transactions_status', sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)' },
  { name: 'idx_matchups_league_week', sql: 'CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week)' },
  { name: 'idx_messages_league_id', sql: 'CREATE INDEX IF NOT EXISTS idx_messages_league_id ON messages(league_id)' },
  { name: 'idx_messages_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)' }
];

async function setupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    header('Astral Draft Database Setup');
    log('Connecting to Neon database...', 'yellow');
    
    await client.connect();
    log('✓ Connected to Neon database', 'green');

    // Create tables
    header('Creating Tables');
    for (const { name, sql } of sqlStatements) {
      try {
        await client.query(sql);
        log(`✓ Table '${name}' created`, 'green');
      } catch (error) {
        if (error.code === '42P07') { // Table already exists
          log(`○ Table '${name}' already exists`, 'blue');
        } else {
          log(`✗ Failed to create table '${name}': ${error.message}`, 'red');
        }
      }
    }

    // Create indexes
    header('Creating Indexes');
    for (const { name, sql } of indexStatements) {
      try {
        await client.query(sql);
        log(`✓ Index '${name}' created`, 'green');
      } catch (error) {
        if (error.code === '42P07') { // Index already exists
          log(`○ Index '${name}' already exists`, 'blue');
        } else {
          log(`✗ Failed to create index '${name}': ${error.message}`, 'red');
        }
      }
    }

    // Verify setup
    header('Verifying Database Setup');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    log(`\nTables created: ${tablesResult.rows.length}`, 'cyan');
    tablesResult.rows.forEach(row => {
      log(`  • ${row.table_name}`, 'green');
    });

    const indexResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    
    log(`\nIndexes created: ${indexResult.rows[0].count}`, 'cyan');

    // Create a test user (optional)
    const createTestUser = await new Promise((resolve) => {
      rl.question('\nWould you like to create a test user? (y/n): ', (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });

    if (createTestUser) {
      const bcrypt = require('bcryptjs');
      const testPassword = await bcrypt.hash('TestPass123!', 10);
      
      try {
        await client.query(`
          INSERT INTO users (email, username, password_hash, is_verified, is_admin)
          VALUES ($1, $2, $3, true, true)
          ON CONFLICT (email) DO NOTHING
        `, ['admin@astraldraft.com', 'admin', testPassword]);
        
        log('\n✓ Test user created:', 'green');
        log('  Email: admin@astraldraft.com', 'cyan');
        log('  Password: TestPass123!', 'cyan');
      } catch (error) {
        log(`\n✗ Failed to create test user: ${error.message}`, 'red');
      }
    }

    header('Setup Complete!');
    log('✓ Database is ready for Astral Draft', 'green');
    log('\nNext steps:', 'yellow');
    log('1. Add environment variables to Netlify', 'cyan');
    log('2. Deploy your application', 'cyan');
    log('3. Test the API endpoints', 'cyan');

  } catch (error) {
    log(`\n✗ Setup failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

// Run the setup
header('Welcome to Astral Draft Database Setup');
log('This script will create all necessary tables and indexes in your Neon database.\n', 'yellow');

rl.question('Press Enter to start the setup (or Ctrl+C to cancel)... ', () => {
  setupDatabase().catch(console.error);
});