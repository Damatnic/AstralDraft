# Neon PostgreSQL Setup Guide for Astral Draft

## Overview
This guide will help you set up Neon PostgreSQL as the backend database for Astral Draft, fully integrated with Netlify Functions for a serverless architecture.

## 1. Create Neon Account & Database

1. **Sign up for Neon** at [neon.tech](https://neon.tech)
2. **Create a new project**:
   - Project name: `astral-draft`
   - Region: Choose closest to your users
   - PostgreSQL version: 16 (latest stable)

3. **Save your connection string**:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Initialize Database Tables

Run this SQL in the Neon SQL Editor to create all required tables:

```sql
-- Users table
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
);

-- User sessions table for JWT management
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
  user_agent TEXT
);

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

-- Players table (NFL players)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_family ON user_sessions(token_family);
CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
```

## 3. Configure Netlify Environment Variables

In your Netlify dashboard (Site settings → Environment variables), add:

### Required Variables:
```env
# Neon Database (get from Neon dashboard)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# JWT Secret (generate a secure 32+ character string)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars-change-this

# API Keys (backend only)
GEMINI_API_KEY=AIzaSyDe5G8D7nRiSlGZPJ1Qcg9XBqBWPDf7b8g
SPORTSIO_API_KEY=4ce0ac2e8bb74eacbc9ba951c84e3bfa

# Frontend URLs (update with your Netlify URL)
VITE_API_BASE_URL=https://astral-draft.netlify.app/api
VITE_WEBSOCKET_URL=wss://astral-draft.netlify.app
```

### Optional Variables:
```env
# Additional sports APIs
ESPN_API_KEY=your-espn-api-key
NFL_API_KEY=your-nfl-api-key
YAHOO_API_KEY=your-yahoo-api-key

# Session Security (optional, will use defaults)
SESSION_SECRET=your-session-secret
COOKIE_SECRET=your-cookie-secret
CSRF_SECRET=your-csrf-secret
```

## 4. Deploy to Netlify

1. **Connect your GitHub repository** to Netlify
2. **Deploy settings** will be auto-configured from `netlify.toml`
3. **Add environment variables** in Netlify dashboard
4. **Deploy the site**

## 5. Test the Setup

After deployment, test the API endpoints:

### Test Registration:
```bash
curl -X POST https://your-site.netlify.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!"}'
```

### Test Login:
```bash
curl -X POST https://your-site.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## 6. Neon Features to Enable

In your Neon dashboard, consider enabling:

1. **Autoscaling**: Automatically scale compute based on load
2. **Branching**: Create database branches for development
3. **Point-in-time Recovery**: Restore to any point in the last 7 days
4. **Connection Pooling**: Enable for better performance

## 7. Monitoring & Maintenance

### Neon Dashboard:
- Monitor query performance
- Check storage usage
- Review slow queries
- Set up alerts

### Netlify Functions:
- Monitor function execution times
- Check error logs
- Review API usage

## 8. Local Development

For local development with Neon:

1. **Install Netlify CLI**:
```bash
npm install -g netlify-cli
```

2. **Create `.env.local`**:
```env
DATABASE_URL=your-neon-connection-string
JWT_SECRET=local-development-secret
GEMINI_API_KEY=your-gemini-key
SPORTSIO_API_KEY=your-sportsio-key
```

3. **Run locally**:
```bash
netlify dev
```

## 9. Troubleshooting

### Common Issues:

**Connection timeout**:
- Check if SSL is required: `?sslmode=require`
- Verify connection string format
- Check Neon dashboard for service status

**Authentication errors**:
- Ensure JWT_SECRET is set in environment
- Check token expiration times
- Verify CORS settings

**Performance issues**:
- Enable connection pooling in Neon
- Add appropriate indexes
- Use Neon's query insights

## 10. Production Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] All environment variables set in Netlify
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] SSL enforced on database connections
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Support Resources

- **Neon Documentation**: [docs.neon.tech](https://docs.neon.tech)
- **Netlify Functions**: [docs.netlify.com/functions](https://docs.netlify.com/functions)
- **Astral Draft Issues**: [GitHub Issues](https://github.com/yourusername/astral-draft/issues)

---

*Last Updated: 2025-01-15*
*Database: Neon PostgreSQL*
*Hosting: Netlify with Serverless Functions*