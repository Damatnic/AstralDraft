/**
 * Neon PostgreSQL Database Configuration
 * Serverless PostgreSQL optimized for Netlify Functions
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Database connection URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is required');
}

// Create connection pool for traditional backend
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create serverless SQL client for Netlify Functions
export const sql = neon(DATABASE_URL);

// Drizzle ORM instance (optional, for type-safe queries)
export const db = drizzle(sql, { schema });

// Connection test function
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Neon database connected:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
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
      )
    `;

    // User sessions table for JWT management
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
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
        user_agent TEXT,
        INDEX idx_user_sessions_user_id (user_id),
        INDEX idx_user_sessions_token_family (token_family),
        INDEX idx_user_sessions_expires_at (expires_at)
      )
    `;

    // Email verification tokens
    await sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Password reset tokens
    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Leagues table
    await sql`
      CREATE TABLE IF NOT EXISTS leagues (
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
      )
    `;

    // Teams table
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
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
      )
    `;

    // Players table (NFL players)
    await sql`
      CREATE TABLE IF NOT EXISTS players (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_players_position (position),
        INDEX idx_players_team (team)
      )
    `;

    // Draft picks table
    await sql`
      CREATE TABLE IF NOT EXISTS draft_picks (
        id SERIAL PRIMARY KEY,
        league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        pick INTEGER NOT NULL,
        team_id INTEGER REFERENCES teams(id),
        player_id INTEGER REFERENCES players(id),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(league_id, round, pick)
      )
    `;

    // Transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
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
      )
    `;

    // Matchups table
    await sql`
      CREATE TABLE IF NOT EXISTS matchups (
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
      )
    `;

    // Messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'chat',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_messages_league_id (league_id),
        INDEX idx_messages_created_at (created_at)
      )
    `;

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id);
      CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
      CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_league ON transactions(league_id);
      CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week);
    `;

    console.log('✅ Neon database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    return false;
  }
}

// Cleanup function for connection pooling
export async function closeConnection() {
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

export default {
  sql,
  pool,
  db,
  testConnection,
  initializeDatabase,
  closeConnection
};