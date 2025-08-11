# Contest Scoring System Documentation

## Overview

The Contest Scoring System is an automated platform that evaluates NFL predictions against actual game results and calculates rankings for competitive contests. It integrates with the production sports data service to fetch real-time NFL data and provides comprehensive scoring, leaderboards, and payout calculations.

## System Architecture

### Core Components

1. **ContestScoringService** - Main service handling contest management and scoring
2. **ProductionSportsDataService** - Real-time NFL data integration
3. **Game Result Evaluation** - Automated prediction resolution
4. **Leaderboard Generation** - Real-time ranking calculations
5. **Payout System** - Prize pool distribution

### Data Flow

```
NFL Games → Production Sports Data → Contest Scoring Service
    ↓                                          ↓
Real Results → Prediction Evaluation → Score Calculation
    ↓                                          ↓
Leaderboards ← Ranking System ← Participant Stats
    ↓
Payout Calculation → Prize Distribution
```

## Contest Types

### Weekly Contests
- **Duration**: Single NFL week (Thursday - Monday)
- **Entry Fee**: $5 - $100
- **Predictions**: Game spreads, totals, player props
- **Prize Pool**: Entry fees + rake
- **Deadline**: 15 minutes before first game

### Season-Long Contests
- **Duration**: Entire NFL season (18 weeks)
- **Entry Fee**: $25 - $500
- **Predictions**: Weekly + playoff bracket + awards
- **Prize Pool**: Cumulative with guaranteed minimums
- **Deadline**: Rolling weekly deadlines

### Playoff Contests
- **Duration**: NFL playoffs (4 weeks)
- **Entry Fee**: $10 - $200
- **Predictions**: Bracket + prop bets
- **Prize Pool**: Tournament style payouts
- **Deadline**: Before wild card weekend

## Scoring System

### Base Scoring Rules

| Prediction Type | Base Points | Confidence Multiplier | Difficulty Multiplier |
|----------------|-------------|----------------------|----------------------|
| Game Spread | 100 | Yes (0.5x - 1.5x) | Easy: 1.0x |
| Game Total | 100 | Yes (0.5x - 1.5x) | Medium: 1.2x |
| Moneyline | 75 | Yes (0.5x - 1.5x) | Hard: 1.5x |
| Player Props | 125 | Yes (0.5x - 1.5x) | Expert: 2.0x |
| Team Stats | 90 | No | Medium: 1.2x |

### Bonus Scoring

#### Streak Bonuses
- **3+ Correct**: +5 points per prediction
- **5+ Correct**: +10 points per prediction
- **10+ Correct**: +20 points per prediction
- **Maximum Bonus**: 50 points per prediction

#### Oracle Beat Bonus
- **Beat Oracle**: +25 points
- **Beat Oracle with Low Confidence**: +50 points

#### Category Weights
- **Prime Time Games**: 1.2x multiplier
- **Division Games**: 1.1x multiplier
- **Playoff Games**: 1.5x multiplier
- **Super Bowl**: 2.0x multiplier

## Prediction Types

### Game Lines
1. **Point Spread**
   - Which team covers the spread
   - Options: Home covers, Away covers
   - Difficulty: Medium

2. **Game Total**
   - Over/Under total points
   - Options: Over, Under
   - Difficulty: Medium

3. **Moneyline**
   - Straight winner prediction
   - Options: Home wins, Away wins, Tie
   - Difficulty: Easy

### Player Props
1. **Passing Yards**
   - QB over/under passing yards
   - Difficulty: Hard

2. **Rushing Yards**
   - RB over/under rushing yards
   - Difficulty: Hard

3. **Receiving Yards**
   - WR/TE over/under receiving yards
   - Difficulty: Expert

4. **Touchdowns**
   - Player anytime touchdown scorer
   - Difficulty: Expert

### Team Statistics
1. **First Downs**
   - Team with most first downs
   - Difficulty: Medium

2. **Time of Possession**
   - Team with longer possession time
   - Difficulty: Hard

3. **Turnovers**
   - Team with fewer turnovers
   - Difficulty: Medium

## Real-Time Game Evaluation

### Data Sources
- **ESPN API**: Live scores, game status, player stats
- **The Odds API**: Betting lines, spread, totals
- **NFL API**: Official statistics, injury reports

### Evaluation Process
1. **Game Completion Detection**
   - Monitor game status changes
   - Wait for official final scores
   - Verify data accuracy

2. **Prediction Resolution**
   - Compare predictions to actual results
   - Calculate correct answers
   - Apply scoring rules

3. **Score Updates**
   - Update participant scores
   - Recalculate leaderboards
   - Process payout eligibility

### Caching Strategy
- **Live Games**: 1-minute cache
- **Completed Games**: 5-minute cache
- **Player Stats**: 10-minute cache
- **Season Data**: 1-hour cache

## Leaderboard System

### Ranking Criteria
1. **Primary**: Total points scored
2. **Tiebreaker 1**: Accuracy percentage
3. **Tiebreaker 2**: Oracle beats count
4. **Tiebreaker 3**: Submission timestamp

### Leaderboard Features
- **Real-time Updates**: Every 2 minutes during games
- **Historical Tracking**: Previous week comparisons
- **Trend Analysis**: Position changes over time
- **Performance Metrics**: Detailed statistics

### Display Information
- Current rank and points
- Accuracy percentage
- Current streak
- Oracle beats
- Potential payout
- Recent performance trend

## Prize Pool Distribution

### Small Contests ($5-$25 entry)
- **1st Place**: 60% of prize pool
- **2nd Place**: 25% of prize pool
- **3rd Place**: 15% of prize pool

### Medium Contests ($50-$100 entry)
- **1st Place**: 40% of prize pool
- **2nd Place**: 25% of prize pool
- **3rd Place**: 15% of prize pool
- **4th-5th Place**: 10% of prize pool

### Large Contests ($200+ entry)
- **Top 10%**: Prize money distribution
- **Graduated Payouts**: Larger fields, more winners
- **Guaranteed Minimums**: Minimum prize pools

### Payout Processing
1. **Contest Completion**: All predictions resolved
2. **Final Rankings**: Leaderboard locked
3. **Payout Calculation**: Prize distribution calculated
4. **Payment Processing**: Stripe integration for payouts
5. **Tax Reporting**: 1099 forms for large winnings

## API Integration

### Sports Data Integration
```typescript
// Fetch live game results
const liveScores = await productionSportsDataService.getLiveScores();

// Get completed game details
const gameResult = await productionSportsDataService.getCurrentWeekGames(week);

// Resolve predictions against results
const resolution = await contestScoringService.evaluatePrediction(prediction);
```

### Contest Management
```typescript
// Create new contest
const contest = await contestScoringService.createContest({
  name: "Week 1 Prediction Contest",
  type: "weekly",
  week: 1,
  season: 2024,
  entryFee: 25,
  maxParticipants: 1000
});

// Register participant
await contestScoringService.registerParticipant(
  contest.id, 
  userId, 
  username, 
  paymentId
);

// Submit prediction
await contestScoringService.submitPrediction(contest.id, userId, {
  predictionId: "spread_game123",
  choice: 0,
  confidence: 75,
  reasoning: "Home team has better offense"
});
```

### Real-time Updates
```typescript
// Get current leaderboard
const leaderboard = contestScoringService.getContestLeaderboard(contestId);

// Check contest status
const status = contestScoringService.getServiceStatus();

// Force evaluation (for testing)
await contestScoringService.forceEvaluateContest(contestId);
```

## Security & Integrity

### Prediction Deadlines
- Strict enforcement of submission deadlines
- No late entries after games begin
- Automatic deadline calculation (15 min before kickoff)

### Data Validation
- Multiple source verification for game results
- Automated consistency checks
- Manual review for disputed outcomes

### Fraud Prevention
- One entry per user per contest
- Payment verification required
- Suspicious pattern detection

### Audit Trail
- Complete prediction history
- Timestamp verification
- Score calculation logs

## Performance Optimization

### Caching Strategy
- Redis cache for frequent lookups
- CDN for static prediction data
- Database query optimization

### Real-time Processing
- WebSocket connections for live updates
- Event-driven architecture
- Asynchronous processing

### Scalability
- Horizontal service scaling
- Database sharding by contest
- Load balancing for high traffic

## Monitoring & Analytics

### Key Metrics
- **Participation Rate**: Users per contest
- **Accuracy Rate**: Overall prediction accuracy
- **Oracle Beat Rate**: Users beating AI predictions
- **Revenue Metrics**: Entry fees and rake
- **User Engagement**: Retention and activity

### Alerting
- Contest completion delays
- Data feed interruptions
- Payment processing failures
- Unusual scoring patterns

### Reporting
- Daily contest summaries
- Weekly performance reports
- Monthly revenue analysis
- User behavior insights

## Testing Strategy

### Unit Tests
- Prediction evaluation logic
- Scoring calculations
- Leaderboard generation
- Payout calculations

### Integration Tests
- Sports data API integration
- Database operations
- Payment processing
- Real-time updates

### End-to-End Tests
- Complete contest lifecycle
- Multi-user scenarios
- Edge case handling
- Performance under load

## Future Enhancements

### Advanced Features
- **Live Betting**: In-game prediction updates
- **Social Features**: Friend challenges, groups
- **Achievements**: Badges and milestones
- **Analytics**: Advanced user insights

### Additional Sports
- **NBA Integration**: Basketball contests
- **MLB Integration**: Baseball contests
- **NCAA Integration**: College sports

### Mobile Optimization
- **Push Notifications**: Live score updates
- **Offline Mode**: Cached predictions
- **Progressive Web App**: Enhanced mobile experience

## Deployment

### Production Environment
- **AWS/Azure**: Cloud infrastructure
- **Docker**: Containerized services
- **Kubernetes**: Orchestration
- **PostgreSQL**: Primary database
- **Redis**: Caching layer

### Monitoring Stack
- **Datadog**: Application monitoring
- **Sentry**: Error tracking
- **LogDNA**: Log aggregation
- **Grafana**: Custom dashboards

### Backup & Recovery
- **Daily Backups**: Database snapshots
- **Point-in-time Recovery**: Transaction logs
- **Disaster Recovery**: Multi-region deployment
- **Data Retention**: 7-year compliance

---

*This documentation covers the complete contest scoring system implementation. For technical implementation details, see the source code in `services/contestScoringService.ts`.*
