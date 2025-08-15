#!/usr/bin/env node

/**
 * Automated Neon Database Setup - No prompts version
 * Runs automatically without user interaction
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Your Neon connection string from environment or fallback
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

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
    header('Astral Draft Automated Database Setup');
    log('Starting automated setup...', 'yellow');
    log('Connecting to Neon database...', 'yellow');
    
    await client.connect();
    log('✓ Connected to Neon database successfully!', 'green');

    // Create tables
    header('Creating Tables');
    let tablesCreated = 0;
    let tablesExisted = 0;
    
    for (const { name, sql } of sqlStatements) {
      try {
        await client.query(sql);
        log(`✓ Table '${name}' created successfully`, 'green');
        tablesCreated++;
      } catch (error) {
        if (error.code === '42P07') { // Table already exists
          log(`○ Table '${name}' already exists (skipping)`, 'blue');
          tablesExisted++;
        } else {
          log(`✗ Failed to create table '${name}': ${error.message}`, 'red');
          throw error;
        }
      }
    }

    log(`\nTables summary: ${tablesCreated} created, ${tablesExisted} already existed`, 'cyan');

    // Create indexes
    header('Creating Indexes');
    let indexesCreated = 0;
    let indexesExisted = 0;
    
    for (const { name, sql } of indexStatements) {
      try {
        await client.query(sql);
        log(`✓ Index '${name}' created successfully`, 'green');
        indexesCreated++;
      } catch (error) {
        if (error.code === '42P07') { // Index already exists
          log(`○ Index '${name}' already exists (skipping)`, 'blue');
          indexesExisted++;
        } else {
          log(`✗ Failed to create index '${name}': ${error.message}`, 'red');
          throw error;
        }
      }
    }

    log(`\nIndexes summary: ${indexesCreated} created, ${indexesExisted} already existed`, 'cyan');

    // Verify setup
    header('Verification');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    log(`Total tables in database: ${tablesResult.rows.length}`, 'cyan');
    log('\nTables present:', 'yellow');
    tablesResult.rows.forEach(row => {
      log(`  ✓ ${row.table_name}`, 'green');
    });

    const indexResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    
    log(`\nTotal indexes in database: ${indexResult.rows[0].count}`, 'cyan');

    // Create default admin user
    header('Creating Default Admin User');
    const bcrypt = require('bcryptjs');
    const testPassword = await bcrypt.hash('AstralAdmin2025!', 10);
    
    try {
      const result = await client.query(`
        INSERT INTO users (email, username, password_hash, is_verified, is_admin)
        VALUES ($1, $2, $3, true, true)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, ['admin@astraldraft.com', 'admin', testPassword]);
      
      if (result.rows.length > 0) {
        log('✓ Admin user created successfully!', 'green');
        log('\n  Credentials:', 'yellow');
        log('  Email: admin@astraldraft.com', 'cyan');
        log('  Username: admin', 'cyan');
        log('  Password: AstralAdmin2025!', 'cyan');
        log('\n  ⚠️  IMPORTANT: Change this password after first login!', 'yellow');
      } else {
        log('○ Admin user already exists', 'blue');
      }
    } catch (error) {
      log(`⚠️  Could not create admin user: ${error.message}`, 'yellow');
    }

    // Final success message
    header('✅ DATABASE SETUP COMPLETE!');
    log('Your Neon database is now fully configured for Astral Draft!', 'green');
    log('\n📋 Summary:', 'cyan');
    log(`  • ${tablesResult.rows.length} tables ready`, 'green');
    log(`  • ${indexResult.rows[0].count} indexes created`, 'green');
    log(`  • Database optimized for performance`, 'green');
    log(`  • Admin user available for testing`, 'green');
    
    log('\n🚀 Next Steps:', 'yellow');
    log('  1. Add environment variables to Netlify dashboard', 'cyan');
    log('  2. Deploy your application', 'cyan');
    log('  3. Access API at: https://your-site.netlify.app/api', 'cyan');
    log('  4. Login with admin@astraldraft.com', 'cyan');

  } catch (error) {
    header('❌ SETUP FAILED');
    log(`Error: ${error.message}`, 'red');
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    log('\n✓ Database connection closed', 'green');
  }
}

// Run immediately
setupDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});