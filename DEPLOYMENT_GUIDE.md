# Astral Draft Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL database (or use SQLite for development)
- API keys for Gemini AI and sports data providers

### Development Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd astral-draft
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

3. **Start Development Servers**
```bash
# Terminal 1: Start backend server
npm run server:dev

# Terminal 2: Start frontend development server  
npm run dev
```

Access the app at http://localhost:8765

## Production Deployment (Netlify)

### Frontend Deployment

1. **Build for Production**
```bash
npm run build:prod
```

2. **Deploy to Netlify**
```bash
# Via CLI
npm run deploy

# Or via Netlify Dashboard
# 1. Connect your GitHub repo
# 2. Set build command: npm run build:prod
# 3. Set publish directory: dist
# 4. Add environment variables in Netlify settings
```

### Backend Deployment Options

#### Option 1: Netlify Functions (Serverless)
- Backend routes are automatically deployed as Netlify Functions
- Configure environment variables in Netlify dashboard
- No additional server needed

#### Option 2: Separate Backend Server (Heroku/Railway/Render)
```bash
# Deploy backend to your preferred platform
# Set environment variables on the platform
# Update VITE_API_BASE_URL in frontend to point to backend URL
```

## Configuration

### Required API Keys

1. **Gemini AI** (for AI Oracle features)
   - Get key from: https://makersuite.google.com/app/apikey
   - Set as: GEMINI_API_KEY

2. **Sports Data** (optional but recommended)
   - ESPN API: Public, no key needed for basic data
   - Sports.io: https://sportsdata.io/
   - Set as: SPORTSIO_API_KEY

### Database Setup

#### Development (SQLite)
- Automatically created at ./data/astral-draft.db
- No configuration needed

#### Production (PostgreSQL with Neon)
1. Create account at https://neon.tech
2. Create new database
3. Copy connection string to DATABASE_URL
4. Run migrations:
```bash
npm run db:setup
```

### Security Configuration

1. **Generate Secrets**
```bash
# Generate secure random strings for production
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Update in .env**
- JWT_SECRET
- SESSION_SECRET
- COOKIE_SECRET
- CSRF_SECRET

## Features Configuration

### Enable/Disable Features
Edit feature flags in .env:
```env
ENABLE_AI_FEATURES=true       # AI Oracle and predictions
ENABLE_PAYMENTS=false          # Stripe integration
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_PUSH_NOTIFICATIONS=false
```

### Rate Limiting
Configure in .env:
```env
RATE_LIMIT_WINDOW_MS=60000    # 1 minute
RATE_LIMIT_MAX_REQUESTS=100   # requests per window
```

## Monitoring & Maintenance

### Health Check
```bash
curl http://localhost:3001/health
```

### API Status
```bash
curl http://localhost:3001/api/proxy/health
```

### Logs
- Frontend: Browser console
- Backend: Server console or platform logs
- Netlify: Function logs in Netlify dashboard

## Troubleshooting

### Common Issues

1. **API Keys Not Working**
   - Ensure keys are in backend .env (not prefixed with VITE_)
   - Restart server after changing .env
   - Check API proxy health endpoint

2. **Database Connection Failed**
   - Verify DATABASE_URL format
   - Check network/firewall settings
   - Ensure SSL mode is correct

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version: `node --version` (should be 18+)
   - Run type check: `npm run type-check`

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check CORS configuration matches frontend URL
   - Ensure cookies are enabled

### Support

For issues or questions:
1. Check existing GitHub issues
2. Review error logs
3. Test with minimal configuration first
4. Gradually enable features

## Performance Optimization

### Frontend
- Lazy loading implemented for views
- Code splitting for optimal bundle size
- PWA support for offline functionality
- Image optimization with modern formats

### Backend
- Request caching for API calls
- Rate limiting to prevent abuse
- Compression enabled
- Database query optimization

## Security Best Practices

1. **Never commit .env files**
2. **Use strong, unique secrets in production**
3. **Enable HTTPS in production**
4. **Keep dependencies updated**
5. **Regular security audits**: `npm audit`
6. **Input validation and sanitization enabled**
7. **CSRF protection active**
8. **XSS protection headers configured**