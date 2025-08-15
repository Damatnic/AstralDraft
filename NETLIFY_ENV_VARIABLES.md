# Netlify Environment Variables for Astral Draft

## 📋 Add These to Netlify Dashboard

Go to: **Site Settings → Environment Variables**

Copy and paste these environment variables:

```env
# ========================================
# DATABASE CONNECTION (Required)
# ========================================
DATABASE_URL=postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# ========================================
# JWT SECURITY (Required - MUST CHANGE!)
# ========================================
# Generate secure secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=CHANGE_THIS_TO_32_PLUS_RANDOM_CHARACTERS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ========================================
# API KEYS (Backend Only)
# ========================================
GEMINI_API_KEY=AIzaSyDe5G8D7nRiSlGZPJ1Qcg9XBqBWPDf7b8g
SPORTSIO_API_KEY=4ce0ac2e8bb74eacbc9ba951c84e3bfa

# ========================================
# FRONTEND CONFIGURATION
# ========================================
VITE_API_BASE_URL=https://astraldraft.netlify.app/api
VITE_WEBSOCKET_URL=wss://astraldraft.netlify.app

# ========================================
# FEATURE FLAGS
# ========================================
VITE_ENABLE_LIVE_DATA=true
VITE_ENABLE_AI_ORACLE=true
VITE_NODE_ENV=production

# ========================================
# BUILD CONFIGURATION
# ========================================
NODE_ENV=production
NODE_VERSION=18
```

## 🔐 Security Notes

1. **JWT_SECRET**: 
   - MUST be changed to a secure random string
   - Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Never use the default value in production

2. **API Keys**:
   - These are only accessible on the backend (Netlify Functions)
   - Never put API keys in VITE_ variables (they're exposed to frontend)

3. **Database URL**:
   - This connection string is for your Neon database
   - Keep it secure and never commit to GitHub

## ✅ Verification Checklist

After adding environment variables:

- [ ] JWT_SECRET has been changed from default
- [ ] All variables are added to Netlify
- [ ] Deploy triggered after adding variables
- [ ] Test login at: https://astraldraft.netlify.app
- [ ] API endpoints working at: /api/*

## 🚀 API Endpoints Available

Once deployed, these endpoints will be available:

- `POST https://astraldraft.netlify.app/api/auth/register`
- `POST https://astraldraft.netlify.app/api/auth/login`
- `GET https://astraldraft.netlify.app/api/auth/me`
- `POST https://astraldraft.netlify.app/api/auth/refresh`
- `POST https://astraldraft.netlify.app/api/auth/logout`
- `GET https://astraldraft.netlify.app/api/leagues`
- `POST https://astraldraft.netlify.app/api/leagues`

## 📱 Test Admin Login

```json
{
  "email": "admin@astraldraft.com",
  "password": "AstralAdmin2025!"
}
```

## 🔧 Troubleshooting

If API calls fail:
1. Check that all environment variables are set in Netlify
2. Redeploy after adding variables (they don't update automatically)
3. Check Netlify Functions logs for errors
4. Verify database is active in Neon dashboard

---

**Site URL**: https://astraldraft.netlify.app  
**API Base**: https://astraldraft.netlify.app/api  
**Database**: Neon PostgreSQL (US East 2 - Ohio)