-- Run each CREATE TABLE command separately in Neon SQL Editor
-- Copy and paste ONE command at a time

-- 1. First create users table
CREATE TABLE users (
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
);

-- 2. Then create user_sessions
CREATE TABLE user_sessions (
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
);

-- 3. Create email_verifications
CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create password_resets
CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create leagues
CREATE TABLE leagues (
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

-- 6. Create teams
CREATE TABLE teams (
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

-- 7. Create players
CREATE TABLE players (
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

-- 8. Create draft_picks
CREATE TABLE draft_picks (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  pick INTEGER NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  player_id INTEGER REFERENCES players(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_id, round, pick)
);

-- 9. Create transactions
CREATE TABLE transactions (
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
);

-- 10. Create matchups
CREATE TABLE matchups (
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
);

-- 11. Create messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'chat',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Verify tables exist (run this last)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';