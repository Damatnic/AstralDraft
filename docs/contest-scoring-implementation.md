# Contest Scoring System Implementation Guide

## Overview

The Contest Scoring Service is an automated system that evaluates predictions against actual NFL results and calculates rankings for competitive prediction contests. It integrates with the production sports data service to fetch real game results and automatically scores user predictions using sophisticated algorithms.

## Architecture

### Core Components

1. **ContestScoringService** - Main service class managing contests and scoring
2. **Production Sports Data Integration** - Real-time NFL game data and results
3. **Prediction Evaluation Engine** - Automated scoring of user predictions
4. **Leaderboard Generation** - Dynamic rankings and statistics
5. **Payout Calculation** - Prize distribution based on contest results

### Key Features

- **Real-time Game Result Fetching** - Automatically updates from NFL APIs
- **Multiple Contest Types** - Weekly, season-long, playoff brackets
- **Advanced Scoring Algorithms** - Confidence multipliers, streak bonuses, difficulty weights
- **Oracle Beat Bonuses** - Extra points for beating AI predictions
- **Automated Payout Calculation** - Prize distribution based on final rankings
- **Comprehensive Analytics** - Detailed participant statistics and trends

## Contest Types

### Weekly Contests
- **Duration**: Single NFL week (Thursday-Monday)
- **Predictions**: Game spreads, totals, player props
- **Entry Fee**: $5-50 depending on tier
- **Prize Pool**: Guaranteed minimums with entry fee scaling

### Season-Long Contests
- **Duration**: Entire NFL season (17 weeks + playoffs)
- **Predictions**: Season awards, division winners, playoff teams
- **Entry Fee**: $25-100
- **Prize Pool**: Large guaranteed pools ($10K+)

### Playoff Brackets
- **Duration**: NFL playoffs (3-4 weeks)
- **Predictions**: Tournament-style bracket picks
- **Entry Fee**: $10-25
- **Prize Pool**: Bracket-specific with upset bonuses

## Scoring System

### Base Scoring
```typescript
correctPrediction: 100 // Base points for correct prediction
```

### Confidence Multiplier
```typescript
// If enabled, multiplies base points by confidence percentage
points = basePoints * (confidence / 100)
// Example: 100 points * 0.80 confidence = 80 points
```

### Difficulty Multipliers
```typescript
difficultyMultiplier: {
  easy: 1.0,    // 100 points → 100 points
  medium: 1.2,  // 100 points → 120 points
  hard: 1.5,    // 100 points → 150 points
  expert: 2.0   // 100 points → 200 points
}
```

### Streak Bonuses
```typescript
streakBonus: {
  enabled: true,
  minStreak: 3,        // Minimum correct predictions for bonus
  bonusPerCorrect: 10, // Additional points per streak length
  maxBonus: 100        // Maximum bonus points
}
// Example: 5-game streak = 50 bonus points (5 * 10)
```

### Oracle Beat Bonus
```typescript
oracleBeatBonus: 50 // Extra points for beating AI prediction
```

### Category Weights
```typescript
categoryWeights: {
  'Game Lines': 1.0,    // Standard scoring
  'Player Props': 1.3,  // 30% bonus (harder predictions)
  'Team Stats': 1.1     // 10% bonus
}
```

## Implementation Details

### Contest Creation

```typescript
const contest = await contestScoringService.createContest({
  name: 'Week 1 NFL Predictions',
  type: 'weekly',
  description: 'Weekly NFL prediction contest',
  season: 2024,
  week: 1,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  entryFee: 10,
  maxParticipants: 100,
  status: 'pending',
  rules: contestRules,
  scoring: contestScoring,
  prizePool: prizeDistribution
});
```

### Participant Registration

```typescript
await contestScoringService.registerParticipant(
  contestId,
  userId,
  username,
  paymentId
);
```

### Prediction Submission

```typescript
await contestScoringService.submitPrediction(contestId, userId, {
  predictionId: 'spread_game_123',
  choice: 0, // Home team covers spread
  confidence: 75, // 75% confidence
  reasoning: 'Home team has better recent form'
});
```

### Automatic Scoring

The service automatically:
1. Fetches live game results every 2 minutes
2. Evaluates completed predictions every 5 minutes
3. Updates leaderboards in real-time
4. Calculates payouts when contests complete

## Prediction Types

### Spread Predictions
```typescript
{
  type: 'spread',
  question: 'Who will cover the spread?',
  options: [
    { id: 0, text: 'Home Team (-3.5)' },
    { id: 1, text: 'Away Team (+3.5)' }
  ]
}
```

### Total Predictions
```typescript
{
  type: 'total',
  question: 'Will the total go over or under?',
  options: [
    { id: 0, text: 'Over 47.5' },
    { id: 1, text: 'Under 47.5' }
  ]
}
```

### Moneyline Predictions
```typescript
{
  type: 'moneyline',
  question: 'Who will win the game?',
  options: [
    { id: 0, text: 'Home Team' },
    { id: 1, text: 'Away Team' },
    { id: 2, text: 'Tie' }
  ]
}
```

### Player Props
```typescript
{
  type: 'player_prop',
  question: 'Which QB will throw for more yards?',
  options: [
    { id: 0, text: 'Patrick Mahomes' },
    { id: 1, text: 'Josh Allen' }
  ]
}
```

## Database Integration

### Contest Storage
```sql
CREATE TABLE contests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    season INTEGER,
    week INTEGER,
    status TEXT DEFAULT 'pending',
    entry_fee DECIMAL(10,2),
    max_participants INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Participant Tracking
```sql
CREATE TABLE contest_participants (
    contest_id TEXT,
    user_id TEXT,
    username TEXT,
    entry_time TIMESTAMP,
    payment_id TEXT,
    total_score INTEGER DEFAULT 0,
    PRIMARY KEY (contest_id, user_id)
);
```

### Prediction Submissions
```sql
CREATE TABLE contest_predictions (
    id TEXT PRIMARY KEY,
    contest_id TEXT,
    user_id TEXT,
    prediction_id TEXT,
    choice INTEGER,
    confidence INTEGER,
    submitted_at TIMESTAMP,
    is_correct BOOLEAN,
    points_earned INTEGER
);
```

## Leaderboard Generation

### Real-time Rankings
```typescript
const leaderboard = contestScoringService.getContestLeaderboard(contestId);

// Returns:
{
  contestId: "contest_123",
  lastUpdated: "2024-01-15T10:30:00Z",
  rankings: [
    {
      rank: 1,
      userId: "user_456",
      username: "AlicePredictor",
      totalScore: 1250,
      accuracy: 72.5,
      correctPredictions: 18,
      totalPredictions: 25,
      currentStreak: 5,
      oracleBeats: 3,
      trend: "up",
      potentialPayout: 500
    }
  ],
  stats: {
    totalParticipants: 50,
    averageScore: 875,
    averageAccuracy: 65.2,
    highestScore: 1250,
    resolvedPredictions: 20,
    pendingPredictions: 5
  }
}
```

### Performance Metrics
- **Accuracy**: Percentage of correct predictions
- **Total Score**: Points earned across all predictions
- **Current Streak**: Consecutive correct predictions
- **Oracle Beats**: Times user beat AI prediction
- **Category Breakdown**: Performance by prediction type

## Payout System

### Prize Distribution
```typescript
const prizePool = {
  totalPrize: 1000,
  currency: 'USD',
  distribution: [
    { rank: 1, percentage: 50, amount: 500, description: 'First Place' },
    { rank: 2, percentage: 30, amount: 300, description: 'Second Place' },
    { rank: 3, percentage: 20, amount: 200, description: 'Third Place' }
  ]
};
```

### Automatic Payout Calculation
When contests complete, the system automatically:
1. Calculates final rankings
2. Determines payout amounts
3. Creates payout records
4. Integrates with Stripe for payment processing

## Error Handling

### Game Data Failures
- Graceful fallback to cached data
- Manual resolution interface for disputed results
- Automatic retry mechanisms for API failures

### Prediction Conflicts
- Duplicate submission prevention
- Deadline enforcement
- Invalid choice validation

### Scoring Disputes
- Audit trail for all score calculations
- Manual override capabilities for edge cases
- Detailed explanation of scoring decisions

## Testing

### Comprehensive Test Suite
```bash
# Run complete contest scoring tests
node test-contest-scoring.js

# Test specific components
npm test -- --grep "contest scoring"
```

### Test Coverage
- Contest creation and management
- Participant registration and validation
- Prediction submission and deadline handling
- Score calculation algorithms
- Leaderboard generation and sorting
- Payout calculation and distribution

## Performance Considerations

### Caching Strategy
- Game results cached for 2-5 minutes depending on game status
- Prediction evaluations cached to avoid recomputation
- Leaderboard updates optimized for real-time display

### Scalability
- Horizontal scaling of prediction evaluation
- Database indexing for fast leaderboard queries
- API rate limiting for external data sources

## Security Features

### Data Validation
- Input sanitization for all user submissions
- Prediction deadline enforcement
- Payment verification before contest entry

### Audit Trail
- Complete history of all score calculations
- Immutable prediction records after deadline
- Detailed logging of all system actions

## Integration Points

### Payment System
```typescript
// Integrated with Stripe webhook system
await paymentService.processContestEntry(userId, contestId, entryFee);
await paymentService.distributePayouts(contestResults.payouts);
```

### Oracle AI System
```typescript
// Integration with production Oracle predictions
const oraclePrediction = await oracleService.getPrediction(gameId);
const userBeatOracle = userChoice !== oraclePrediction.choice && userCorrect;
```

### Real-time Updates
```typescript
// WebSocket integration for live updates
websocketService.broadcast('leaderboard_update', {
  contestId,
  rankings: updatedRankings
});
```

## Future Enhancements

### Advanced Analytics
- **Prediction Pattern Analysis** - Identify user betting patterns
- **Market Efficiency Metrics** - Compare predictions to betting markets
- **Skill vs Luck Analysis** - Statistical significance testing

### Social Features
- **Team Contests** - Group competitions with shared pools
- **Following System** - Track favorite predictors
- **Achievement Badges** - Gamification elements

### Machine Learning
- **Difficulty Adjustment** - Dynamic prediction difficulty based on consensus
- **Fraud Detection** - Identify suspicious prediction patterns
- **Personalized Recommendations** - Suggest optimal prediction strategies

## Deployment

### Production Requirements
- Node.js 18+ runtime environment
- PostgreSQL or SQLite database
- Redis for caching (optional but recommended)
- Stripe account for payment processing
- NFL API access (ESPN, The Odds API)

### Environment Variables
```bash
VITE_ODDS_API_KEY=your_odds_api_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=your_database_connection
REDIS_URL=your_redis_connection (optional)
```

### Monitoring
- Contest completion rates
- Prediction accuracy distributions
- API response times and error rates
- User engagement metrics
- Revenue and payout tracking

## Support and Maintenance

### Regular Tasks
- **Daily**: Monitor contest status and resolve any stuck evaluations
- **Weekly**: Review prediction accuracy and adjust difficulty ratings
- **Monthly**: Analyze user engagement and optimize scoring algorithms
- **Seasonally**: Update NFL schedule and team information

### Emergency Procedures
- Manual contest resolution for API failures
- Payout reversal procedures for disputed results
- Data backup and recovery protocols
- Incident response for scoring disputes

This implementation provides a comprehensive, production-ready contest scoring system that can handle real-world NFL prediction contests with sophisticated scoring, automated evaluation, and integrated payment processing.
