-- STEP 2: Create League and Team Tables
-- Run this after Step 1

-- Leagues table
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
);

-- Teams table
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
);

-- Players table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);