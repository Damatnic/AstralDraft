# Astral Draft Project Management System

## Project Overview
**Astral Draft** - A comprehensive fantasy football platform with real-time data, AI-powered insights, and advanced league management.

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** build system
- **TailwindCSS** for styling
- **Google Gemini AI** for intelligent features
- **Sports.io API** for real-time sports data

### Backend Stack
- **Node.js** with Express
- **SQLite** database
- **JWT** authentication
- **WebSocket** for real-time updates

## Current Project Status

### ✅ Completed Features
- [x] User authentication system with JWT
- [x] League creation and management
- [x] Draft system with real-time updates
- [x] AI Oracle powered by Gemini
- [x] Roster management
- [x] Trade system
- [x] Waiver wire
- [x] Mobile responsive design
- [x] PWA support
- [x] Crisis intervention resources (removed - not needed for fantasy sports)
- [x] Security middleware implementation
- [x] Build optimization

### 🔧 In Progress
- [ ] Production deployment fixes
- [ ] Performance optimizations
- [ ] Comprehensive testing
- [ ] API proxy implementation

### 📋 Pending
- [ ] Advanced analytics dashboard
- [ ] Historical data tracking
- [ ] Social features
- [ ] Payment integration

## Environment Variables

### Frontend (.env)
```env
# API Configuration
VITE_API_BASE_URL=https://your-api-url.com
VITE_WEBSOCKET_URL=wss://your-api-url.com

# Feature Flags
VITE_ENABLE_LIVE_DATA=true
VITE_ENABLE_AI_ORACLE=true
VITE_ENABLE_VOICE_COMMANDS=false

# Build Configuration
VITE_NODE_ENV=production
```

### Backend (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Session Security
SESSION_SECRET=your-session-secret
COOKIE_SECRET=your-cookie-secret
CSRF_SECRET=your-csrf-secret

# API Keys (Backend Only - Never expose to frontend)
GEMINI_API_KEY=your-gemini-api-key
SPORTSIO_API_KEY=your-sportsio-api-key
ESPN_API_KEY=your-espn-api-key
NFL_API_KEY=your-nfl-api-key
YAHOO_API_KEY=your-yahoo-api-key

# Database
DATABASE_URL=./astral-draft.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
```

## Task Prioritization Framework

### Priority Levels
1. **CRITICAL** - Production breaking issues
2. **HIGH** - Security vulnerabilities, data loss risks
3. **MEDIUM** - Feature bugs, performance issues
4. **LOW** - UI improvements, nice-to-have features

### Current Priority Queue
1. Fix React production build errors
2. Secure API endpoints
3. Implement comprehensive testing
4. Optimize bundle size
5. Deploy to production

## Agent Delegation Guidelines

### When to Use Specialized Agents

#### General-Purpose Agent
- Complex multi-step research tasks
- Code searching across multiple files
- Architecture decisions
- Performance analysis

#### Mental-Health-App-Engineer (Note: Not applicable for Astral Draft)
- This project is fantasy sports only
- Do not use for this project

### Task Delegation Strategy
1. **Simple fixes** - Handle directly
2. **Complex features** - Break down into subtasks
3. **Research tasks** - Delegate to general-purpose agent
4. **Parallel work** - Use multiple agents concurrently

## Build & Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run build:verify`
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Run `npm test`
- [ ] Check bundle size
- [ ] Verify environment variables
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Check error handling

### Deployment Steps
1. Build frontend: `npm run build`
2. Build backend: `npm run build:server`
3. Set environment variables
4. Deploy backend first
5. Deploy frontend
6. Verify all endpoints
7. Monitor error logs

## Security Requirements

### Authentication
- JWT tokens in httpOnly cookies
- CSRF protection on all state-changing requests
- Session fingerprinting
- Rate limiting (30 req/15min)

### Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection headers
- HTTPS only in production

### API Security
- All API keys backend-only
- Proxy endpoints for external APIs
- Request validation
- Error message sanitization

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 500KB gzipped
- **API Response Time**: < 200ms
- **WebSocket Latency**: < 100ms

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Service function testing
- Utility function testing
- Minimum 80% coverage

### Integration Tests
- API endpoint testing
- Authentication flow testing
- WebSocket communication testing
- Database operations testing

### E2E Tests
- User registration and login
- League creation and management
- Draft simulation
- Trade workflow
- Mobile responsiveness

## Monitoring & Analytics

### Error Tracking
- Client-side error boundaries
- Server error logging
- API failure tracking
- Performance monitoring

### User Analytics
- Page views
- Feature usage
- API performance
- User engagement

## Project Scripts

### Development
```bash
# Start development servers
npm run dev        # Frontend
npm run server:dev # Backend

# Testing
npm test           # Run tests
npm run test:e2e   # E2E tests

# Building
npm run build      # Build frontend
npm run build:verify # Build and verify
npm run build:server # Build backend

# Code Quality
npm run lint       # Lint code
npm run typecheck  # Type checking
```

## Communication Protocols

### Status Updates
- Daily progress on critical issues
- Weekly feature completion reports
- Immediate alerts for security issues

### Code Review Process
1. Run automated tests
2. Check code style
3. Verify security practices
4. Test functionality
5. Update documentation

## Success Metrics

- **Uptime**: 99.9%
- **Error Rate**: < 0.1%
- **User Satisfaction**: > 4.5/5
- **Performance Score**: > 90/100
- **Security Score**: A+

---

*Last Updated: 2025-01-15*
*Project Manager: Astral Draft System*
*Version: 1.0.0*