# Oracle Predictions REST API Documentation

## Overview

The Oracle Predictions REST API provides comprehensive endpoints for managing Oracle predictions, analytics, user interactions, and social features for the Astral Draft fantasy football platform.

**Base URL:** `http://localhost:3001/api`

## Authentication

Currently using demo authentication. In production, all endpoints would require JWT authentication headers.

## Rate Limiting

- Standard endpoints: 100 requests per 15 minutes
- Oracle prediction endpoints: 20 requests per 15 minutes
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Health Check

### GET /health

Check API server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T23:29:00.910Z",
  "environment": "development",
  "version": "1.0.0"
}
```

## Oracle Predictions API

### GET /api/oracle/predictions

Get Oracle predictions with optional filtering.

**Query Parameters:**
- `week` (number): Filter by NFL week
- `type` (string): Filter by prediction type (PLAYER_PERFORMANCE, GAME_OUTCOME, etc.)
- `season` (number): Filter by season (default: 2024)
- `resolved` (boolean): Filter by resolution status
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "player-performance-18-1704395123456",
      "week": 18,
      "type": "PLAYER_PERFORMANCE",
      "question": "Who will score the most fantasy points this week?",
      "options": [
        {
          "id": 0,
          "text": "Josh Allen (BUF)",
          "probability": 0.85,
          "supportingData": ["Projected: 28.5 pts", "Recent avg: 26.2 pts"]
        }
      ],
      "oracle_choice": 0,
      "confidence": 87,
      "reasoning": "Strong matchup analysis with favorable weather conditions",
      "data_points": ["Live sports data", "Weather analysis", "Injury reports"],
      "user_prediction_count": 23,
      "avg_user_confidence": 73.5,
      "is_resolved": false,
      "created_at": "2025-08-03T20:15:23.456Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### GET /api/oracle/predictions/:id

Get detailed information about a specific Oracle prediction.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "player-performance-18-1704395123456",
    "week": 18,
    "type": "PLAYER_PERFORMANCE",
    "question": "Who will score the most fantasy points this week?",
    "options": [...],
    "oracle_choice": 0,
    "confidence": 87,
    "reasoning": "Strong matchup analysis with favorable weather conditions",
    "data_points": ["Live sports data", "Weather analysis", "Injury reports"],
    "is_resolved": false,
    "user_predictions": [
      {
        "id": 1,
        "user_id": 1,
        "user_choice": 0,
        "confidence": 85,
        "reasoning": "Agree with Oracle analysis",
        "points_earned": 0,
        "username": "demo_user",
        "created_at": "2025-08-03T20:30:00.000Z"
      }
    ],
    "statistics": {
      "total_participants": 23,
      "oracle_accuracy": 0,
      "user_accuracy": 0,
      "average_user_confidence": 73.5,
      "choice_distribution": {
        "0": { "count": 15, "percentage": 65.2 },
        "1": { "count": 8, "percentage": 34.8 }
      }
    }
  }
}
```

### POST /api/oracle/predictions

Create a new Oracle prediction.

**Request Body:**
```json
{
  "week": 18,
  "type": "PLAYER_PERFORMANCE",
  "question": "Who will score the most fantasy points this week?",
  "options": [
    {
      "id": 0,
      "text": "Josh Allen (BUF)",
      "probability": 0.85,
      "supportingData": ["Projected: 28.5 pts", "Recent avg: 26.2 pts"]
    }
  ],
  "oracleChoice": 0,
  "confidence": 87,
  "reasoning": "Strong matchup analysis with favorable weather conditions",
  "dataPoints": ["Live sports data", "Weather analysis", "Injury reports"],
  "season": 2024
}
```

**Response:** Returns the created prediction with generated ID.

### POST /api/oracle/predictions/:id/submit

Submit a user prediction against an Oracle prediction.

**Request Body:**
```json
{
  "userChoice": 0,
  "confidence": 85,
  "reasoning": "Agree with Oracle analysis based on recent performance"
}
```

### POST /api/oracle/predictions/:id/resolve

Resolve an Oracle prediction with actual results (Admin only).

**Request Body:**
```json
{
  "actualResult": 0
}
```

### GET /api/oracle/leaderboard

Get Oracle challenge leaderboard.

**Query Parameters:**
- `week` (number): Filter by specific week
- `season` (number): Filter by season (default: 2024)
- `timeframe` (string): 'all', 'week', 'month' (default: 'all')
- `limit` (number): Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "demo_user",
      "display_name": "Demo User",
      "total_predictions": 45,
      "total_points": 387,
      "avg_confidence": 76.3,
      "oracle_beats": 12,
      "correct_predictions": 31,
      "accuracy_rate": 68.89
    }
  ],
  "meta": {
    "timeframe": "all",
    "week": null,
    "season": 2024,
    "total_players": 1
  }
}
```

### GET /api/oracle/stats

Get Oracle prediction statistics and performance metrics.

**Query Parameters:**
- `season` (number): Filter by season (default: 2024)

**Response:**
```json
{
  "success": true,
  "data": {
    "oracle_performance": {
      "total_predictions": 25,
      "resolved_predictions": 20,
      "oracle_correct": 17,
      "avg_oracle_confidence": 82.5,
      "accuracy_rate": 85.0,
      "weeks_active": 8,
      "prediction_types": 5
    },
    "user_performance": {
      "total_users": 15,
      "total_user_predictions": 340,
      "avg_user_confidence": 73.2,
      "user_correct": 234,
      "accuracy_rate": 68.82
    },
    "type_breakdown": [
      {
        "type": "PLAYER_PERFORMANCE",
        "count": 8,
        "correct": 7,
        "avg_confidence": 84.2,
        "accuracy_rate": 87.5
      }
    ],
    "season": 2024
  }
}
```

## Analytics API

### GET /api/analytics/accuracy

Get detailed accuracy analytics for Oracle and users.

**Query Parameters:**
- `week` (number): Filter by specific week
- `season` (number): Filter by season (default: 2024)
- `userId` (number): Filter by specific user
- `timeframe` (string): 'all', 'week', 'month'

### GET /api/analytics/trends

Get trending analytics and performance patterns.

**Query Parameters:**
- `season` (number): Filter by season (default: 2024)
- `weeks` (number): Number of weeks to analyze (default: 10)

### GET /api/analytics/insights

Get personalized insights and recommendations for a user.

**Query Parameters:**
- `userId` (number): User ID (default: 1)
- `season` (number): Season to analyze (default: 2024)

### GET /api/analytics/performance-comparison

Compare user performance against Oracle or other users.

**Query Parameters:**
- `userId` (number): User ID to compare (default: 1)
- `season` (number): Season to analyze (default: 2024)
- `compareWith` (string): 'oracle' or 'average' (default: 'oracle')

### POST /api/analytics/track-event

Track analytics events for prediction interactions.

**Request Body:**
```json
{
  "predictionId": "player-performance-18-1704395123456",
  "eventType": "prediction_viewed",
  "eventData": {
    "source": "mobile_app",
    "duration": 45
  },
  "userId": 1
}
```

## Social Features API

### GET /api/social/leagues

Get user's leagues or all public leagues.

**Query Parameters:**
- `userId` (number): User ID (default: 1)
- `type` (string): 'all', 'joined', 'public' (default: 'all')

### POST /api/social/leagues

Create a new social league.

**Request Body:**
```json
{
  "name": "Championship League",
  "description": "High-stakes fantasy football predictions",
  "type": "public",
  "maxMembers": 50
}
```

### POST /api/social/leagues/:id/join

Join a league using join code or direct invitation.

**Request Body:**
```json
{
  "joinCode": "ABC12345"
}
```

### GET /api/social/leagues/:id/debates

Get debates for a specific league.

**Query Parameters:**
- `status` (string): 'all', 'ACTIVE', 'CLOSED' (default: 'all')
- `limit` (number): Number of results (default: 20)

### POST /api/social/leagues/:id/debates

Create a new debate in a league.

**Request Body:**
```json
{
  "topic": "Should we start Player X this week?",
  "category": "lineups",
  "description": "Considering the matchup and recent form"
}
```

### GET /api/social/debates/:id/posts

Get posts for a specific debate.

### POST /api/social/debates/:id/posts

Create a new post in a debate.

**Request Body:**
```json
{
  "side": "A",
  "content": "Player X has a great matchup this week against a weak secondary"
}
```

### POST /api/social/debates/:id/vote

Vote in a debate.

**Request Body:**
```json
{
  "side": "A",
  "reasoning": "Better statistical analysis supports this position"
}
```

## Authentication API

### POST /api/auth/login

Authenticate user and return session token.

**Request Body:**
```json
{
  "username": "demo_user",
  "password": "password123"
}
```

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "password123",
  "displayName": "New User"
}
```

### GET /api/auth/profile

Get user profile information.

### PUT /api/auth/profile

Update user profile information.

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

## League Management API

### GET /api/leagues

Get all available leagues.

**Query Parameters:**
- `type` (string): 'all', 'public', 'private' (default: 'all')
- `limit` (number): Results per page (default: 50)

### GET /api/leagues/:id

Get detailed information about a specific league.

### GET /api/leagues/:id/members

Get all members of a specific league.

### PUT /api/leagues/:id

Update league settings (Admin only).

### DELETE /api/leagues/:id/members/:userId

Remove a member from the league (Admin only).

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "timestamp": "2025-08-03T23:29:00.910Z",
  "path": "/api/oracle/predictions"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

## Database Schema

The API uses SQLite with the following main tables:

- `oracle_predictions` - Oracle AI predictions
- `user_predictions` - User prediction submissions
- `oracle_analytics` - Analytics and metrics data
- `user_analytics` - User performance data
- `social_leagues` - Social league information
- `league_memberships` - League membership data
- `debates` - League debate topics
- `debate_posts` - Debate discussion posts
- `debate_votes` - User votes in debates
- `group_predictions` - Collaborative prediction challenges
- `users` - User account information
- `api_usage` - API usage tracking

## Security Features

- Helmet.js security headers
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## Development

To start the API server in development mode:

```bash
npm run server:dev
```

The server will automatically restart on code changes.

## Production Deployment

For production deployment:

1. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CORS_ORIGIN=https://yourdomain.com`
   - `DB_PATH=/path/to/production/database.db`

2. Build and start:
   ```bash
   npm run build
   npm run server
   ```

## Future Enhancements

- JWT authentication implementation
- Redis caching for performance
- WebSocket support for real-time updates
- API versioning
- Swagger/OpenAPI documentation
- Comprehensive test suite
- Database migrations
- Monitoring and logging
- API key management for third-party access
