-- STEP 3: Create Gameplay Tables
-- Run this after Step 2

-- Draft picks table
CREATE TABLE IF NOT EXISTS draft_picks (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  pick INTEGER NOT NULL,
  team_id INTEGER REFERENCES teams(id),
  player_id INTEGER REFERENCES players(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_id, round, pick)
);

-- Transactions table
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
);

-- Matchups table
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
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'chat',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);