-- STEP 4: Create Indexes for Performance
-- Run this after Step 3

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_family ON user_sessions(token_family);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- League indexes
CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- Player indexes
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_external_id ON players(external_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_league ON transactions(league_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Matchup indexes
CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_league_id ON messages(league_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);