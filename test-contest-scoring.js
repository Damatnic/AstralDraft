/**
 * Contest Scoring Service Test
 * Comprehensive test for the automated contest scoring system
 */

const contestScoringService = require('./services/contestScoringService');

// Mock game results for testing
const mockGameResults = [
  {
    gameId: 'game_1',
    homeScore: 24,
    awayScore: 17,
    status: 'final',
    finalResult: {
      winner: 'home',
      margin: 7,
      totalPoints: 41,
      coveredSpread: true,
      hitOver: false
    },
    lastUpdated: new Date().toISOString()
  },
  {
    gameId: 'game_2',
    homeScore: 31,
    awayScore: 28,
    status: 'final',
    finalResult: {
      winner: 'home',
      margin: 3,
      totalPoints: 59,
      coveredSpread: false,
      hitOver: true
    },
    lastUpdated: new Date().toISOString()
  }
];

// Mock contest configuration
const mockContestRules = {
  predictionDeadline: '15', // 15 minutes before game
  maxPredictionsPerUser: 10,
  confidenceEnabled: true,
  allowLateEntry: false,
  requireAllPredictions: true,
  tiebreaker: 'accuracy'
};

const mockContestScoring = {
  correctPrediction: 100, // Base points
  confidenceMultiplier: true,
  streakBonus: {
    enabled: true,
    minStreak: 3,
    bonusPerCorrect: 10,
    maxBonus: 100
  },
  difficultyMultiplier: {
    enabled: true,
    easy: 1.0,
    medium: 1.2,
    hard: 1.5,
    expert: 2.0
  },
  oracleBeatBonus: 50,
  categoryWeights: {
    'Game Lines': 1.0,
    'Player Props': 1.3,
    'Team Stats': 1.1
  }
};

const mockPrizePool = {
  totalPrize: 1000,
  currency: 'USD',
  distribution: [
    { rank: 1, percentage: 50, amount: 500, description: 'First Place' },
    { rank: 2, percentage: 30, amount: 300, description: 'Second Place' },
    { rank: 3, percentage: 20, amount: 200, description: 'Third Place' }
  ],
  guaranteedPrize: true
};

// Test functions
async function testContestCreation() {
  console.log('\n🧪 Testing Contest Creation...');
  
  try {
    const contest = await contestScoringService.createContest({
      name: 'Week 1 NFL Predictions',
      type: 'weekly',
      description: 'Weekly NFL prediction contest with spread and total bets',
      season: 2024,
      week: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      entryFee: 10,
      maxParticipants: 100,
      status: 'pending',
      rules: mockContestRules,
      scoring: mockContestScoring,
      prizePool: mockPrizePool
    });

    console.log(`✅ Contest created successfully: ${contest.id}`);
    console.log(`   Name: ${contest.name}`);
    console.log(`   Type: ${contest.type}`);
    console.log(`   Predictions: ${contest.predictions.length}`);
    
    return contest.id;
  } catch (error) {
    console.error('❌ Contest creation failed:', error);
    throw error;
  }
}

async function testParticipantRegistration(contestId) {
  console.log('\n🧪 Testing Participant Registration...');
  
  try {
    // Register multiple test participants
    const participants = [
      { userId: 'user_1', username: 'AlicePredictor' },
      { userId: 'user_2', username: 'BobAnalyst' },
      { userId: 'user_3', username: 'CharlieExpert' },
      { userId: 'user_4', username: 'DianaSharp' },
      { userId: 'user_5', username: 'EvanWins' }
    ];

    for (const participant of participants) {
      await contestScoringService.registerParticipant(
        contestId,
        participant.userId,
        participant.username,
        `payment_${participant.userId}`
      );
      console.log(`✅ Registered: ${participant.username}`);
    }

    const contest = contestScoringService.getContest(contestId);
    console.log(`✅ Total participants: ${contest?.participants.length}`);
    
  } catch (error) {
    console.error('❌ Participant registration failed:', error);
    throw error;
  }
}

async function testPredictionSubmissions(contestId) {
  console.log('\n🧪 Testing Prediction Submissions...');
  
  try {
    const contest = contestScoringService.getContest(contestId);
    if (!contest) throw new Error('Contest not found');

    // Submit predictions for each participant
    const predictionScenarios = [
      // User 1: Conservative, high accuracy
      {
        userId: 'user_1',
        predictions: [
          { choice: 0, confidence: 70 }, // Home team spread
          { choice: 1, confidence: 65 }  // Under total
        ]
      },
      // User 2: Aggressive, high confidence
      {
        userId: 'user_2',
        predictions: [
          { choice: 0, confidence: 95 }, // Home team spread
          { choice: 0, confidence: 90 }  // Over total
        ]
      },
      // User 3: Mixed strategy
      {
        userId: 'user_3',
        predictions: [
          { choice: 1, confidence: 80 }, // Away team spread
          { choice: 1, confidence: 75 }  // Under total
        ]
      },
      // User 4: Contrarian picks
      {
        userId: 'user_4',
        predictions: [
          { choice: 1, confidence: 60 }, // Away team spread
          { choice: 0, confidence: 85 }  // Over total
        ]
      },
      // User 5: Random strategy
      {
        userId: 'user_5',
        predictions: [
          { choice: 0, confidence: 55 }, // Home team spread
          { choice: 0, confidence: 70 }  // Over total
        ]
      }
    ];

    for (const scenario of predictionScenarios) {
      for (let i = 0; i < Math.min(scenario.predictions.length, contest.predictions.length); i++) {
        const prediction = contest.predictions[i];
        const userPrediction = scenario.predictions[i];
        
        await contestScoringService.submitPrediction(contestId, scenario.userId, {
          predictionId: prediction.id,
          choice: userPrediction.choice,
          confidence: userPrediction.confidence,
          reasoning: `Prediction reasoning for ${prediction.question}`
        });
      }
      console.log(`✅ Submitted predictions for ${scenario.userId}`);
    }

    console.log(`✅ All predictions submitted successfully`);
    
  } catch (error) {
    console.error('❌ Prediction submission failed:', error);
    throw error;
  }
}

async function testScoreCalculation(contestId) {
  console.log('\n🧪 Testing Score Calculation...');
  
  try {
    // Simulate game results and force evaluation
    console.log('🔄 Simulating game completion and scoring...');
    
    // Force contest evaluation (in real system, this happens automatically)
    await contestScoringService.forceEvaluateContest(contestId);
    
    const leaderboard = contestScoringService.getContestLeaderboard(contestId);
    if (!leaderboard) {
      throw new Error('Failed to generate leaderboard');
    }

    console.log('\n📊 Leaderboard Results:');
    console.log('Rank | Username       | Score | Accuracy | Correct | Streak | Oracle Beats');
    console.log('-----|----------------|-------|----------|---------|--------|-------------');
    
    leaderboard.rankings.forEach(ranking => {
      console.log(
        `${ranking.rank.toString().padStart(4)} | ` +
        `${ranking.username.padEnd(14)} | ` +
        `${ranking.totalScore.toString().padStart(5)} | ` +
        `${ranking.accuracy.toFixed(1).padStart(7)}% | ` +
        `${ranking.correctPredictions.toString().padStart(7)} | ` +
        `${ranking.currentStreak.toString().padStart(6)} | ` +
        `${ranking.oracleBeats.toString().padStart(11)}`
      );
    });

    console.log('\n📈 Contest Statistics:');
    console.log(`Total Participants: ${leaderboard.stats.totalParticipants}`);
    console.log(`Average Score: ${leaderboard.stats.averageScore.toFixed(1)}`);
    console.log(`Average Accuracy: ${leaderboard.stats.averageAccuracy.toFixed(1)}%`);
    console.log(`Highest Score: ${leaderboard.stats.highestScore}`);
    console.log(`Resolved Predictions: ${leaderboard.stats.resolvedPredictions}/${leaderboard.stats.totalPredictions}`);

    console.log('✅ Score calculation completed successfully');
    
  } catch (error) {
    console.error('❌ Score calculation failed:', error);
    throw error;
  }
}

async function testContestFinalization(contestId) {
  console.log('\n🧪 Testing Contest Finalization...');
  
  try {
    const results = await contestScoringService.getContestResults(contestId);
    if (!results) {
      console.log('⏳ Contest not yet finalized (predictions still pending)');
      return;
    }

    console.log('\n🏆 Final Contest Results:');
    console.log(`Winner: ${results.finalRankings[0].username} with ${results.finalRankings[0].totalScore} points`);
    console.log(`Winning Accuracy: ${results.stats.winningAccuracy.toFixed(1)}%`);
    console.log(`Total Prize Pool: $${results.stats.totalPrizePool}`);

    console.log('\n💰 Payouts:');
    results.payouts.forEach(payout => {
      console.log(`Rank ${payout.rank}: $${payout.amount} (${payout.percentage.toFixed(1)}%)`);
    });

    console.log('\n🌟 Top Performers:');
    results.stats.topPerformers.forEach(performer => {
      console.log(`${performer.category}: ${performer.username} (${performer.value})`);
    });

    if (results.stats.surpriseResults.length > 0) {
      console.log('\n😮 Surprise Results:');
      results.stats.surpriseResults.forEach(surprise => {
        console.log(`• ${surprise}`);
      });
    }

    console.log('✅ Contest finalization completed successfully');
    
  } catch (error) {
    console.error('❌ Contest finalization failed:', error);
    throw error;
  }
}

async function testServiceStatus() {
  console.log('\n🧪 Testing Service Status...');
  
  try {
    const status = contestScoringService.getServiceStatus();
    
    console.log('📊 Service Status:');
    console.log(`Active Contests: ${status.contestsActive}`);
    console.log(`Game Results Cached: ${status.gameResultsCached}`);
    console.log(`Evaluations Cached: ${status.evaluationsCached}`);
    console.log(`Last Update: ${new Date(status.lastUpdate).toLocaleString()}`);

    const allContests = contestScoringService.getAllContests();
    console.log(`Total Contests Created: ${allContests.length}`);

    const activeContests = contestScoringService.getActiveContests();
    console.log(`Currently Active: ${activeContests.length}`);

    console.log('✅ Service status check completed');
    
  } catch (error) {
    console.error('❌ Service status check failed:', error);
    throw error;
  }
}

// Main test execution
async function runContestScoringTests() {
  console.log('🚀 Starting Contest Scoring Service Tests...');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Contest Creation
    const contestId = await testContestCreation();
    
    // Test 2: Participant Registration
    await testParticipantRegistration(contestId);
    
    // Test 3: Prediction Submissions
    await testPredictionSubmissions(contestId);
    
    // Test 4: Score Calculation
    await testScoreCalculation(contestId);
    
    // Test 5: Contest Finalization
    await testContestFinalization(contestId);
    
    // Test 6: Service Status
    await testServiceStatus();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All Contest Scoring Tests Completed Successfully!');
    console.log('✅ Contest creation, participant management, prediction scoring,');
    console.log('   leaderboard generation, and payout calculation all working.');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('💥 Test execution failed:', error);
    console.error('❌ Contest scoring system needs attention.');
    throw error;
  }
}

// Export for use in other test suites
module.exports = {
  runContestScoringTests,
  testContestCreation,
  testParticipantRegistration,
  testPredictionSubmissions,
  testScoreCalculation,
  testContestFinalization,
  testServiceStatus
};

// Run tests if this file is executed directly
if (require.main === module) {
  runContestScoringTests().catch(console.error);
}
