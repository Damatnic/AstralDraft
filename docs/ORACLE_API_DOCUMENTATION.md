# Oracle Prediction System - API Documentation

## 🔮 Overview

The Oracle Prediction System is a comprehensive AI-powered prediction platform for fantasy football that provides real-time analytics, machine learning predictions, and competitive leaderboards. The system is built with enterprise-grade performance optimization, multi-tier caching, and production-ready APIs.

## 📚 Table of Contents

1. [API Authentication](#api-authentication)
2. [Core Endpoints](#core-endpoints)
3. [Production Predictions](#production-predictions)
4. [Analytics & Reporting](#analytics--reporting)
5. [Leaderboards & Challenges](#leaderboards--challenges)
6. [Performance Monitoring](#performance-monitoring)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Caching Strategy](#caching-strategy)
10. [Performance Optimization](#performance-optimization)

---

## 🔐 API Authentication

### Authentication Methods

**Bearer Token Authentication**
```http
Authorization: Bearer <your-jwt-token>
```

**Optional Authentication**
Some endpoints support optional authentication for enhanced features:
- Authenticated users get personalized data
- Unauthenticated users get public data only

**Admin-Only Endpoints**
Certain management endpoints require admin privileges:
- Performance monitoring
- Database optimization
- System administration

### Getting Started

1. **Register/Login** via the auth endpoints
2. **Obtain JWT Token** from login response
3. **Include token** in Authorization header for protected endpoints

---

## 🎯 Core Endpoints

### Base URL
```
http://localhost:3001/api/oracle
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "generatedAt": "2025-08-11T10:30:00.000Z",
    "cached": false,
    "executionTime": 45
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

---

## 🏈 Production Predictions

### Get Production Predictions

**Endpoint:** `GET /api/oracle/predictions/production`

**Description:** Retrieve AI-generated predictions for the current NFL week with comprehensive analytics.

**Query Parameters:**
- `week` (number): NFL week number (1-18)
- `season` (number, default: 2024): NFL season year
- `limit` (number, default: 50): Maximum predictions to return

**Example Request:**
```http
GET /api/oracle/predictions/production?week=12&season=2024&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": "oracle_pred_12_001",
        "week": 12,
        "season": 2024,
        "type": "game_winner",
        "question": "Who will win: Chiefs vs Dolphins?",
        "options": ["Kansas City Chiefs", "Miami Dolphins"],
        "oracleChoice": "Kansas City Chiefs",
        "confidence": 87,
        "reasoning": "Chiefs have superior offensive efficiency in cold weather conditions...",
        "dataPoints": ["weather_conditions", "injury_reports", "historical_matchups"],
        "deadline": "2024-11-24T18:00:00.000Z",
        "status": "open",
        "gameId": "2024112400",
        "timestamp": "2024-11-19T10:00:00.000Z"
      }
    ],
    "meta": {
      "week": 12,
      "season": 2024,
      "totalPredictions": 15,
      "openPredictions": 15,
      "resolvedPredictions": 0,
      "oracleAccuracy": 72.4,
      "oracleConfidenceAccuracy": 78.2,
      "leaderboard": [...],
      "cached": false,
      "executionTime": 156
    }
  }
}
```

### Generate Production Predictions

**Endpoint:** `POST /api/oracle/predictions/production/generate`

**Description:** Generate new AI predictions for a specific week (Admin only).

**Request Body:**
```json
{
  "week": 12,
  "season": 2024,
  "forceRegenerate": false
}
```

**Response:** Returns generated predictions with metadata.

### Resolve Production Predictions

**Endpoint:** `POST /api/oracle/predictions/production/resolve`

**Description:** Resolve predictions using real game results (Admin only).

**Request Body:**
```json
{
  "week": 12,
  "season": 2024
}
```

---

## 📊 Analytics & Reporting

### Oracle Performance Analytics

**Endpoint:** `GET /api/oracle/analytics/performance`

**Description:** Get comprehensive Oracle accuracy metrics and performance trends.

**Query Parameters:**
- `season` (number, default: 2024): Target season
- `timeframe` (string): 'season', 'month', 'week'
- `weeks` (number, default: 18): Number of weeks to analyze

**Response Data:**
- Overall accuracy rates
- Weekly performance breakdown
- Prediction type analysis
- Confidence calibration metrics
- Trend analysis

### User Analytics

**Endpoint:** `GET /api/oracle/analytics/users`

**Description:** Get user engagement and performance metrics.

**Query Parameters:**
- `season` (number): Target season
- `userId` (number, optional): Specific user analysis

**User-Specific Response:**
```json
{
  "success": true,
  "data": {
    "userAccuracy": 68.5,
    "totalPredictions": 45,
    "oracleBeats": 12,
    "averageConfidence": 72.3,
    "weeklyPerformance": [...],
    "predictionTypeBreakdown": {...}
  }
}
```

**General Response:**
```json
{
  "success": true,
  "data": {
    "topPerformers": [...],
    "totalUsers": 156
  }
}
```

### Comparative Analytics

**Endpoint:** `GET /api/oracle/analytics/comparative`

**Description:** Compare Oracle performance vs user predictions.

**Response includes:**
- Weekly accuracy comparisons
- Prediction volume analysis
- User vs Oracle confidence correlation
- Beat-the-Oracle statistics

---

## 🏆 Leaderboards & Challenges

### Get Leaderboard

**Endpoint:** `GET /api/oracle/leaderboard`

**Description:** Retrieve current leaderboard rankings with performance metrics.

**Query Parameters:**
- `season` (number): Target season
- `week` (number, optional): Specific week filter
- `limit` (number, default: 50): Number of top users
- `sortBy` (string): 'accuracy', 'oracleScore', 'predictions'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": 123,
      "username": "Player 42",
      "accuracy": 74.2,
      "oracleScore": 1847,
      "totalPredictions": 67,
      "oracleBeats": 23,
      "averageConfidence": 68.9,
      "streak": 5
    }
  ]
}
```

### Challenge Management

**Endpoint:** `GET /api/oracle/challenges`

**Description:** Get active prediction challenges and tournaments.

**Endpoint:** `POST /api/oracle/challenges`

**Description:** Create new prediction challenge (Admin only).

---

## ⚡ Performance Monitoring

### Performance Monitoring (Admin)

**Endpoint:** `GET /api/oracle/performance/monitoring`

**Description:** Get comprehensive system performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "databaseStats": {
      "tableStats": {...},
      "indexStats": {...},
      "queryPerformance": {...}
    },
    "cacheStats": {
      "predictions": { "hits": 1247, "misses": 89, "size": 512 },
      "analytics": { "hits": 892, "misses": 34, "size": 256 },
      "users": { "hits": 445, "misses": 67, "size": 128 },
      "queries": { "hits": 2341, "misses": 123, "size": 1024 }
    },
    "recommendations": [
      "Consider partitioning table 'oracle_predictions' (125,000 rows)",
      "Index 'idx_oracle_week_type' has low usage (8%) - consider removing"
    ],
    "monitoring": {
      "uptime": 86400,
      "memoryUsage": {...},
      "nodeVersion": "v18.17.0"
    }
  }
}
```

### Database Optimization (Admin)

**Endpoint:** `POST /api/oracle/performance/optimize`

**Description:** Run database optimization including index creation and VACUUM operations.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Database optimization completed successfully",
    "optimizedAt": "2025-08-11T10:30:00.000Z"
  }
}
```

---

## 🚨 Error Handling

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REQUEST` | Malformed request data | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `SERVER_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | Temporary service issue | 503 |

### Common Error Scenarios

**Authentication Errors:**
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide a valid JWT token",
  "code": "UNAUTHORIZED"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Week must be between 1 and 18",
  "code": "INVALID_REQUEST"
}
```

---

## 🔄 Rate Limiting

### Standard Limits

- **General Endpoints:** 100 requests per minute per IP
- **Analytics Endpoints:** 30 requests per minute per user
- **Admin Endpoints:** 10 requests per minute per admin

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1692627600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}
```

---

## 💾 Caching Strategy

### Cache Layers

The Oracle system implements a **4-tier caching strategy**:

1. **Predictions Cache**
   - TTL: 15 minutes
   - Size: 1000 entries
   - Keys: `pred:{season}:{week}:{type}`

2. **Analytics Cache**
   - TTL: 30 minutes  
   - Size: 500 entries
   - Keys: `analytics:{startDate}:{endDate}:{groupBy}`

3. **User Data Cache**
   - TTL: 10 minutes
   - Size: 200 entries
   - Keys: `user:{userId}:{timeframe}:{season}`

4. **Query Cache**
   - TTL: 5 minutes
   - Size: 2000 entries
   - Keys: `query:{hash}`

### Cache Behavior

**Cache Headers:**
```json
{
  "meta": {
    "cached": true,
    "executionTime": 12,
    "cacheHit": "analytics:2024-09-01:2024-12-31:week"
  }
}
```

**Cache Invalidation:**
- Automatic expiration based on TTL
- Manual invalidation on data updates
- Warm-up strategies for critical data

---

## 🚀 Performance Optimization

### Database Indexes

The system includes **17 optimized indexes**:

```sql
-- Core performance indexes
CREATE INDEX idx_oracle_predictions_season_week ON oracle_predictions (season, week);
CREATE INDEX idx_oracle_predictions_status_deadline ON oracle_predictions (status, deadline);
CREATE INDEX idx_enhanced_oracle_season_resolved ON enhanced_oracle_predictions (season, is_resolved);
CREATE INDEX idx_user_predictions_user_season ON user_predictions (user_id, season);
CREATE INDEX idx_oracle_leaderboard_season_week ON oracle_leaderboard (season, week);
-- ... and 12 more specialized indexes
```

### Query Optimization

**Optimized Query Features:**
- Batch operations for bulk data processing
- Pagination with limit/offset support
- Index hints for query planner optimization
- Execution time monitoring
- Memory-efficient result processing

### Performance Monitoring

**Key Metrics:**
- Query execution times
- Cache hit rates
- Database connection pooling
- Memory usage tracking
- Index utilization statistics

### Best Practices

1. **Use Pagination:** Always limit result sets with `limit` parameter
2. **Cache-Friendly Queries:** Structure queries to benefit from caching
3. **Batch Operations:** Group multiple operations when possible
4. **Monitor Performance:** Use monitoring endpoints to track system health
5. **Optimize Indexes:** Regular index analysis and optimization

---

## 🔧 Development & Deployment

### Environment Setup

**Required Environment Variables:**
```env
NODE_ENV=production
JWT_SECRET=your-secret-key
DB_PATH=./data/astral-draft.db
CACHE_TTL_PREDICTIONS=900
CACHE_TTL_ANALYTICS=1800
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Database Initialization

```bash
# Run database optimization
POST /api/oracle/performance/optimize

# Verify system health
GET /api/oracle/health
```

### Monitoring & Maintenance

**Regular Tasks:**
- Monitor cache hit rates
- Analyze slow queries
- Update database indexes
- Review performance metrics
- Backup database regularly

**Health Checks:**
```bash
# System health
curl http://localhost:3001/api/oracle/health

# Performance metrics (admin required)
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3001/api/oracle/performance/monitoring
```

---

## 📞 Support & Resources

### API Testing

Use the provided examples with tools like:
- **Postman:** Import the API collection
- **cURL:** Command-line testing
- **Thunder Client:** VS Code extension

### Performance Optimization

For optimal performance:
- Enable all database indexes
- Configure appropriate cache TTL values
- Monitor system resources
- Use pagination for large datasets

### Common Integration Patterns

**Real-time Updates:**
```javascript
// WebSocket connection for live predictions
const ws = new WebSocket('ws://localhost:3001/oracle-updates');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Handle real-time prediction updates
};
```

**Batch Analytics:**
```javascript
// Efficient batch analytics retrieval
const analyticsData = await fetch('/api/oracle/analytics/performance?season=2024&timeframe=season');
const userLeaderboard = await fetch('/api/oracle/leaderboard?limit=100&sortBy=accuracy');
```

---

## 🎉 Conclusion

The Oracle Prediction System provides a comprehensive, high-performance API for fantasy football predictions with enterprise-grade features including:

- ✅ **Real-time AI Predictions**
- ✅ **Advanced Analytics & Reporting** 
- ✅ **Multi-tier Caching System**
- ✅ **Performance Optimization**
- ✅ **Comprehensive Monitoring**
- ✅ **Production-ready Architecture**

For additional support or feature requests, please refer to the system documentation or contact the development team.

---

*Last Updated: August 11, 2025*
*API Version: 1.0.0*
*System Status: Production Ready* ✅
