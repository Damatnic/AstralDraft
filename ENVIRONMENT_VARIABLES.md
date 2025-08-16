# Astral Draft Environment Variables Guide

This document provides comprehensive instructions for setting up all required environment variables for the Astral Draft fantasy football application.

## Table of Contents
- [Required Environment Variables](#required-environment-variables)
- [Database Configuration](#database-configuration)
- [API Keys](#api-keys)
- [Authentication & Security](#authentication--security)
- [Deployment Configuration](#deployment-configuration)
- [How to Set Up Environment Variables](#how-to-set-up-environment-variables)

---

## Required Environment Variables

### 1. Database Configuration

#### **DATABASE_URL**
- **Description**: PostgreSQL connection string for your Neon database
- **Format**: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`
- **Example**: `postgresql://neondb_owner:npg_password@ep-red-glitter.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **How to get it**:
  1. Sign up for [Neon](https://neon.tech)
  2. Create a new project
  3. Go to Dashboard → Connection Details
  4. Copy the connection string
  5. Make sure to include `?sslmode=require&channel_binding=require` at the end

---

### 2. API Keys

#### **VITE_GEMINI_API_KEY**
- **Description**: Google Gemini AI API key for AI-powered player predictions and analysis
- **How to get it**:
  1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
  2. Sign in with your Google account
  3. Click "Get API Key"
  4. Create a new project or select existing
  5. Copy the generated API key
- **Free Tier**: 60 requests per minute, suitable for development
- **Example**: `AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxx`

#### **VITE_SPORTS_IO_API_KEY**
- **Description**: Sports.io API key for real-time NFL data, player stats, and game information
- **How to get it**:
  1. Visit [Sports.io](https://sportsdata.io/)
  2. Click "Get Started" or "Sign Up"
  3. Choose the NFL API package
  4. Select a plan (Free trial available)
  5. After registration, go to your dashboard
  6. Find your API key in the "API Keys" section
- **Free Tier**: 1,000 requests per month
- **Pricing**: Starts at $49/month for 10,000 requests
- **Example**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### **VITE_ESPN_API_KEY** (Optional)
- **Description**: ESPN API access for additional player data and fantasy projections
- **Note**: ESPN's official API requires partnership approval
- **Alternative**: Use ESPN's public endpoints (no key required) for basic data
- **How to apply**:
  1. Visit [ESPN Developer Center](https://www.espn.com/apis/devcenter/)
  2. Submit partnership application
  3. Wait for approval (can take weeks)
- **Workaround**: Use public endpoints like `https://site.api.espn.com/apis/site/v2/sports/football/nfl/`

#### **VITE_NFL_API_KEY** (Optional)
- **Description**: Official NFL API for game data and statistics
- **How to get it**:
  1. Apply at [NFL Developer Portal](https://developer.nfl.com/)
  2. Submit use case description
  3. Wait for approval
- **Alternative**: Use NFL's public data feeds

#### **VITE_ODDS_API_KEY** (Optional)
- **Description**: The Odds API for betting lines and game odds
- **How to get it**:
  1. Visit [The Odds API](https://the-odds-api.com/)
  2. Click "Get API Key"
  3. Sign up with email
  4. Verify email
  5. Get your API key from dashboard
- **Free Tier**: 500 requests per month
- **Example**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### 3. Authentication & Security

#### **JWT_SECRET**
- **Description**: Secret key for signing JWT tokens
- **How to generate**:
  ```bash
  # Option 1: Using Node.js
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  
  # Option 2: Using OpenSSL
  openssl rand -hex 64
  
  # Option 3: Using an online generator (NOT for production)
  # Visit: https://generate-secret.vercel.app/64
  ```
- **Requirements**: Minimum 32 characters, ideally 64+ characters
- **Example**: `7d3f8a9b2c5e1f4d6a8b3c7e9f2a5d8e1b4c7f9a2d5e8b1c4f7a9d2e5b8c1f4a7d`

#### **REFRESH_TOKEN_SECRET**
- **Description**: Secret key for signing refresh tokens
- **How to generate**: Same as JWT_SECRET but use a different value
- **Example**: `9f8e7d6c5b4a3f2e1d9c8b7a6f5e4d3c2b1a9f8e7d6c5b4a3f2e1d9c8b7a6f5e`

#### **SESSION_SECRET**
- **Description**: Secret for Express session management
- **How to generate**: Same method as JWT_SECRET
- **Example**: `4a7d1e5f8c2b9a6f3e7d1c5b8a2f9e6d3c1b7a5f4e9d2c8b6a3f7e1d5c9b2a6f`

#### **ENCRYPTION_KEY**
- **Description**: Key for encrypting sensitive data in database
- **How to generate**: Must be exactly 32 characters
  ```bash
  node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
  ```
- **Example**: `a3f7e9d5c1b8a6f4e2d9c7b5a3f1e8d6`

---

### 4. Deployment Configuration

#### **NETLIFY_AUTH_TOKEN**
- **Description**: Authentication token for Netlify deployments
- **How to get it**:
  1. Log in to [Netlify](https://app.netlify.com)
  2. Go to User Settings → Applications
  3. Click "New access token"
  4. Give it a name (e.g., "Astral Draft Deploy")
  5. Copy the token (you won't see it again!)
- **Example**: `nfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### **NETLIFY_SITE_ID**
- **Description**: Your Netlify site identifier
- **How to get it**:
  1. Go to your site dashboard on Netlify
  2. Go to Site Settings → General
  3. Copy the "Site ID"
- **Example**: `12345678-1234-1234-1234-123456789012`

#### **NODE_ENV**
- **Description**: Application environment
- **Values**: `development`, `production`, `test`
- **Default**: `development`

#### **PORT**
- **Description**: Port for the backend server
- **Default**: `3001`
- **Note**: Netlify Functions ignore this (use default ports)

---

## How to Set Up Environment Variables

### Local Development (.env file)

1. Create a `.env` file in the root directory:
```bash
touch .env
```

2. Add all variables (replace with your actual values):
```env
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require&channel_binding=require

# API Keys
VITE_GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_SPORTS_IO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_ESPN_API_KEY=optional_key_here
VITE_NFL_API_KEY=optional_key_here
VITE_ODDS_API_KEY=optional_key_here

# Authentication
JWT_SECRET=your_64_character_jwt_secret_here
REFRESH_TOKEN_SECRET=your_64_character_refresh_secret_here
SESSION_SECRET=your_64_character_session_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

# Deployment
NETLIFY_AUTH_TOKEN=nfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NETLIFY_SITE_ID=12345678-1234-1234-1234-123456789012
NODE_ENV=development
PORT=3001
```

3. Create a `.env.example` file with empty values for team collaboration:
```env
# Copy this file to .env and fill in your values
DATABASE_URL=
VITE_GEMINI_API_KEY=
VITE_SPORTS_IO_API_KEY=
# ... etc
```

### Netlify Deployment

1. **Via Netlify UI**:
   - Go to Site Settings → Environment Variables
   - Click "Add a variable"
   - Add each variable one by one
   - Select "Production" and/or "Preview" for scope

2. **Via Netlify CLI**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables
netlify env:set DATABASE_URL "your_database_url"
netlify env:set VITE_GEMINI_API_KEY "your_gemini_key"
netlify env:set JWT_SECRET "your_jwt_secret"
# ... repeat for all variables
```

3. **Via netlify.toml** (NOT for secrets!):
```toml
[build.environment]
  NODE_ENV = "production"
  # Only non-sensitive variables here
```

### GitHub Actions Secrets

For CI/CD pipeline, add secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`
   - `VITE_GEMINI_API_KEY`
   - `VITE_SPORTS_IO_API_KEY`
   - `VITE_ESPN_API_KEY`
   - `VITE_NFL_API_KEY`
   - `VITE_ODDS_API_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - etc.

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use different secrets** for development, staging, and production
4. **Limit API key permissions** to only what's needed
5. **Monitor API usage** to detect unusual activity
6. **Use environment-specific** API keys when possible
7. **Enable 2FA** on all service accounts

---

## Troubleshooting

### Common Issues

1. **"Invalid API Key" errors**:
   - Check for trailing spaces in your .env file
   - Ensure quotes aren't included in the value
   - Verify the key hasn't expired

2. **Database connection fails**:
   - Check if `channel_binding=require` is included
   - Verify SSL mode is set to `require`
   - Ensure your IP is whitelisted in Neon

3. **Environment variables not loading**:
   - Restart your development server
   - Check if `.env` is in the root directory
   - Verify variable names start with `VITE_` for frontend access

4. **Netlify deployment missing variables**:
   - Variables must be set in Netlify UI or CLI
   - Build cache might need clearing
   - Check if using correct environment scope

---

## Support

If you need help setting up any of these services:

- **Neon Database**: [Neon Documentation](https://neon.tech/docs)
- **Google Gemini**: [Gemini API Docs](https://ai.google.dev/docs)
- **Sports.io**: [Sports.io Support](https://sportsdata.io/developers)
- **Netlify**: [Netlify Docs](https://docs.netlify.com)

For application-specific issues, please open an issue on [GitHub](https://github.com/Damatnic/AstralDraft/issues).