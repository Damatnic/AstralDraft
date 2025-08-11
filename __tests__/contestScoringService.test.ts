/**
 * Contest Scoring Service Test Suite
 * Comprehensive tests for automated contest scoring system
 */

import { contestScoringService } from '../services/contestScoringService';
import { productionSportsDataService } from '../services/productionSportsDataService';

// Mock data for testing
const mockNFLGame = {
  id: 'test_game_123',
  date: '2024-09-08T17:00:00Z',
  week: 1,
  season: 2024,
  status: 'completed' as const,
  homeTeam: {
    id: 'team_home',
    name: 'Home Team',
    abbreviation: 'HOM',
    location: 'Home City',
    logo: 'https://example.com/logo.png',
    record: { wins: 0, losses: 0, ties: 0 }
  },
  awayTeam: {
    id: 'team_away',
    name: 'Away Team',
    abbreviation: 'AWY',
    location: 'Away City',
    logo: 'https://example.com/logo.png',
    record: { wins: 0, losses: 0, ties: 0 }
  },
  homeScore: 24,
  awayScore: 17,
  venue: 'Test Stadium'
};

const mockContestData = {
  name: 'Test Weekly Contest',
  type: 'weekly' as const,
  description: 'Test contest for automated scoring',
  season: 2024,
  week: 1,
  startDate: '2024-09-08T12:00:00Z',
  endDate: '2024-09-09T08:00:00Z',
  entryFee: 25,
  maxParticipants: 100,
  status: 'active' as const,
  rules: {
    predictionDeadline: '15',
    confidenceEnabled: true,
    allowLateEntry: false,
    requireAllPredictions: false,
    tiebreaker: 'accuracy' as const
  },
  scoring: {
    correctPrediction: 100,
    confidenceMultiplier: true,
    streakBonus: {
      enabled: true,
      minStreak: 3,
      bonusPerCorrect: 5,
      maxBonus: 50
    },
    difficultyMultiplier: {
      enabled: true,
      easy: 1.0,
      medium: 1.2,
      hard: 1.5,
      expert: 2.0
    },
    oracleBeatBonus: 25,
    categoryWeights: {
      'Game Lines': 1.0,
      'Player Props': 1.2,
      'Team Stats': 1.1
    }
  },
  prizePool: {
    totalPrize: 2000,
    currency: 'USD' as const,
    distribution: [
      { rank: 1, percentage: 50, amount: 1000, description: '1st Place' },
      { rank: 2, percentage: 30, amount: 600, description: '2nd Place' },
      { rank: 3, percentage: 20, amount: 400, description: '3rd Place' }
    ],
    guaranteedPrize: true
  }
};

describe('ContestScoringService', () => {
  let testContest: any;
  let testUsers: any[];

  beforeAll(async () => {
    // Create test contest
    testContest = await contestScoringService.createContest(mockContestData);
    
    // Create test users
    testUsers = [
      { id: 'user1', username: 'TestUser1' },
      { id: 'user2', username: 'TestUser2' },
      { id: 'user3', username: 'TestUser3' }
    ];

    // Register test users
    for (const user of testUsers) {
      await contestScoringService.registerParticipant(
        testContest.id,
        user.id,
        user.username,
        `payment_${user.id}`
      );
    }
  });

  describe('Contest Creation', () => {
    test('should create contest with valid data', async () => {
      const contest = await contestScoringService.createContest({
        ...mockContestData,
        name: 'Another Test Contest'
      });

      expect(contest).toBeDefined();
      expect(contest.id).toBeDefined();
      expect(contest.name).toBe('Another Test Contest');
      expect(contest.status).toBe('active');
      expect(contest.participants).toEqual([]);
      expect(contest.predictions.length).toBeGreaterThan(0);
    });

    test('should generate predictions for weekly contest', async () => {
      expect(testContest.predictions.length).toBeGreaterThan(0);
      
      const spreadPrediction = testContest.predictions.find((p: any) => p.type === 'spread');
      expect(spreadPrediction).toBeDefined();
      expect(spreadPrediction.options.length).toBe(2);
      
      const totalPrediction = testContest.predictions.find((p: any) => p.type === 'total');
      expect(totalPrediction).toBeDefined();
      expect(totalPrediction.options.length).toBe(2);
    });
  });

  describe('Participant Registration', () => {
    test('should register participants successfully', () => {
      expect(testContest.participants.length).toBe(3);
      
      const participant = testContest.participants.find((p: any) => p.userId === 'user1');
      expect(participant).toBeDefined();
      expect(participant.username).toBe('TestUser1');
      expect(participant.isActive).toBe(true);
      expect(participant.totalScore).toBe(0);
    });

    test('should prevent duplicate registration', async () => {
      await expect(
        contestScoringService.registerParticipant(
          testContest.id,
          'user1',
          'TestUser1',
          'duplicate_payment'
        )
      ).rejects.toThrow('User already registered for this contest');
    });

    test('should enforce maximum participants', async () => {
      const smallContest = await contestScoringService.createContest({
        ...mockContestData,
        name: 'Small Contest',
        maxParticipants: 1
      });

      await contestScoringService.registerParticipant(
        smallContest.id,
        'user1',
        'TestUser1'
      );

      await expect(
        contestScoringService.registerParticipant(
          smallContest.id,
          'user2',
          'TestUser2'
        )
      ).rejects.toThrow('Contest is full');
    });
  });

  describe('Prediction Submission', () => {
    test('should submit predictions successfully', async () => {
      const prediction = testContest.predictions[0];
      
      const success = await contestScoringService.submitPrediction(
        testContest.id,
        'user1',
        {
          predictionId: prediction.id,
          choice: 0,
          confidence: 75,
          reasoning: 'Home team favored'
        }
      );

      expect(success).toBe(true);

      const updatedContest = contestScoringService.getContest(testContest.id);
      const participant = updatedContest?.participants.find((p: any) => p.userId === 'user1');
      expect(participant?.predictions.length).toBe(1);
      expect(participant?.predictions[0].choice).toBe(0);
      expect(participant?.predictions[0].confidence).toBe(75);
    });

    test('should prevent submission after deadline', async () => {
      // Create contest with past deadline
      const pastContest = await contestScoringService.createContest({
        ...mockContestData,
        name: 'Past Contest',
        startDate: '2024-09-01T12:00:00Z',
        endDate: '2024-09-01T18:00:00Z'
      });

      await contestScoringService.registerParticipant(
        pastContest.id,
        'user1',
        'TestUser1'
      );

      // Mock prediction with past deadline
      const prediction = pastContest.predictions[0];
      prediction.deadline = '2024-09-01T16:00:00Z'; // Past deadline

      await expect(
        contestScoringService.submitPrediction(
          pastContest.id,
          'user1',
          {
            predictionId: prediction.id,
            choice: 0,
            confidence: 75
          }
        )
      ).rejects.toThrow('Prediction deadline has passed');
    });

    test('should allow prediction updates before deadline', async () => {
      const prediction = testContest.predictions[1];
      
      // Submit initial prediction
      await contestScoringService.submitPrediction(
        testContest.id,
        'user1',
        {
          predictionId: prediction.id,
          choice: 0,
          confidence: 60
        }
      );

      // Update prediction
      await contestScoringService.submitPrediction(
        testContest.id,
        'user1',
        {
          predictionId: prediction.id,
          choice: 1,
          confidence: 80,
          reasoning: 'Changed my mind'
        }
      );

      const updatedContest = contestScoringService.getContest(testContest.id);
      const participant = updatedContest?.participants.find((p: any) => p.userId === 'user1');
      const userPrediction = participant?.predictions.find((p: any) => p.predictionId === prediction.id);
      
      expect(userPrediction?.choice).toBe(1);
      expect(userPrediction?.confidence).toBe(80);
      expect(userPrediction?.reasoning).toBe('Changed my mind');
    });
  });

  describe('Game Result Evaluation', () => {
    test('should evaluate spread predictions correctly', async () => {
      // Submit test predictions for all users
      const spreadPrediction = testContest.predictions.find((p: any) => p.type === 'spread');
      
      await contestScoringService.submitPrediction(testContest.id, 'user1', {
        predictionId: spreadPrediction.id,
        choice: 0, // Home team covers
        confidence: 80
      });

      await contestScoringService.submitPrediction(testContest.id, 'user2', {
        predictionId: spreadPrediction.id,
        choice: 1, // Away team covers
        confidence: 70
      });

      await contestScoringService.submitPrediction(testContest.id, 'user3', {
        predictionId: spreadPrediction.id,
        choice: 0, // Home team covers
        confidence: 90
      });

      // Mock game result (Home wins 24-17, likely covers)
      spreadPrediction.isResolved = true;
      spreadPrediction.resolution = {
        correctAnswer: 0, // Home team covered
        explanation: 'Home team won 24-17, covering the spread',
        resolutionSource: 'api',
        confidence: 95
      };

      // Force evaluation
      await contestScoringService.forceEvaluateContest(testContest.id);

      const updatedContest = contestScoringService.getContest(testContest.id);
      const user1 = updatedContest?.participants.find((p: any) => p.userId === 'user1');
      const user2 = updatedContest?.participants.find((p: any) => p.userId === 'user2');
      const user3 = updatedContest?.participants.find((p: any) => p.userId === 'user3');

      // User1 and User3 should be correct, User2 incorrect
      expect(user1?.stats.correctPredictions).toBe(1);
      expect(user2?.stats.correctPredictions).toBe(0);
      expect(user3?.stats.correctPredictions).toBe(1);

      // User3 should have higher score due to higher confidence
      expect(user3?.totalScore).toBeGreaterThan(user1?.totalScore);
      expect(user1?.totalScore).toBeGreaterThan(user2?.totalScore);
    });

    test('should evaluate total predictions correctly', async () => {
      const totalPrediction = testContest.predictions.find((p: any) => p.type === 'total');
      
      await contestScoringService.submitPrediction(testContest.id, 'user1', {
        predictionId: totalPrediction.id,
        choice: 0, // Over
        confidence: 75
      });

      await contestScoringService.submitPrediction(testContest.id, 'user2', {
        predictionId: totalPrediction.id,
        choice: 1, // Under
        confidence: 85
      });

      // Mock game result (24+17 = 41 points, assume total was 45.5)
      totalPrediction.isResolved = true;
      totalPrediction.resolution = {
        correctAnswer: 1, // Under 45.5
        actualValue: 41,
        explanation: 'Total was 41 points, under 45.5',
        resolutionSource: 'api',
        confidence: 100
      };

      await contestScoringService.forceEvaluateContest(testContest.id);

      const updatedContest = contestScoringService.getContest(testContest.id);
      const user1 = updatedContest?.participants.find((p: any) => p.userId === 'user1');
      const user2 = updatedContest?.participants.find((p: any) => p.userId === 'user2');

      // User2 should be correct for total prediction
      const user1TotalPred = user1?.predictions.find((p: any) => p.predictionId === totalPrediction.id);
      const user2TotalPred = user2?.predictions.find((p: any) => p.predictionId === totalPrediction.id);

      expect(user1TotalPred?.isCorrect).toBe(false);
      expect(user2TotalPred?.isCorrect).toBe(true);
      expect(user2TotalPred?.pointsEarned).toBeGreaterThan(0);
    });
  });

  describe('Scoring Calculations', () => {
    test('should apply confidence multipliers correctly', async () => {
      // Create new contest for isolated testing
      const scoringContest = await contestScoringService.createContest({
        ...mockContestData,
        name: 'Scoring Test Contest'
      });

      await contestScoringService.registerParticipant(
        scoringContest.id,
        'user1',
        'HighConfidence'
      );

      await contestScoringService.registerParticipant(
        scoringContest.id,
        'user2',
        'LowConfidence'
      );

      const prediction = scoringContest.predictions[0];

      // High confidence submission
      await contestScoringService.submitPrediction(scoringContest.id, 'user1', {
        predictionId: prediction.id,
        choice: 0,
        confidence: 100
      });

      // Low confidence submission
      await contestScoringService.submitPrediction(scoringContest.id, 'user2', {
        predictionId: prediction.id,
        choice: 0,
        confidence: 50
      });

      // Resolve prediction with correct answer
      prediction.isResolved = true;
      prediction.resolution = {
        correctAnswer: 0,
        explanation: 'Test resolution',
        resolutionSource: 'api',
        confidence: 100
      };

      await contestScoringService.forceEvaluateContest(scoringContest.id);

      const updatedContest = contestScoringService.getContest(scoringContest.id);
      const highConfUser = updatedContest?.participants.find((p: any) => p.userId === 'user1');
      const lowConfUser = updatedContest?.participants.find((p: any) => p.userId === 'user2');

      // High confidence should score more points
      expect(highConfUser?.totalScore).toBeGreaterThan(lowConfUser?.totalScore);
      
      // Verify confidence multiplier applied
      const basePoints = scoringContest.scoring.correctPrediction;
      expect(highConfUser?.totalScore).toBeCloseTo(basePoints * 1.0); // 100% confidence
      expect(lowConfUser?.totalScore).toBeCloseTo(basePoints * 0.5); // 50% confidence
    });

    test('should apply difficulty multipliers correctly', async () => {
      // Test with different difficulty predictions
      const easyPrediction = testContest.predictions.find((p: any) => p.difficulty === 'easy');
      const hardPrediction = testContest.predictions.find((p: any) => p.difficulty === 'hard');

      if (easyPrediction && hardPrediction) {
        await contestScoringService.submitPrediction(testContest.id, 'user1', {
          predictionId: easyPrediction.id,
          choice: 0,
          confidence: 80
        });

        await contestScoringService.submitPrediction(testContest.id, 'user1', {
          predictionId: hardPrediction.id,
          choice: 0,
          confidence: 80
        });

        // Resolve both as correct
        easyPrediction.isResolved = true;
        easyPrediction.resolution = { correctAnswer: 0, explanation: 'Easy correct', resolutionSource: 'api', confidence: 100 };
        
        hardPrediction.isResolved = true;
        hardPrediction.resolution = { correctAnswer: 0, explanation: 'Hard correct', resolutionSource: 'api', confidence: 100 };

        await contestScoringService.forceEvaluateContest(testContest.id);

        const updatedContest = contestScoringService.getContest(testContest.id);
        const participant = updatedContest?.participants.find((p: any) => p.userId === 'user1');
        
        const easyPred = participant?.predictions.find((p: any) => p.predictionId === easyPrediction.id);
        const hardPred = participant?.predictions.find((p: any) => p.predictionId === hardPrediction.id);

        // Hard prediction should score more points
        expect(hardPred?.pointsEarned).toBeGreaterThan(easyPred?.pointsEarned);
      }
    });

    test('should calculate streak bonuses correctly', async () => {
      // Submit multiple correct predictions to build streak
      const predictions = testContest.predictions.slice(0, 5);
      
      for (let i = 0; i < predictions.length; i++) {
        await contestScoringService.submitPrediction(testContest.id, 'user1', {
          predictionId: predictions[i].id,
          choice: 0,
          confidence: 80
        });

        // Resolve as correct
        predictions[i].isResolved = true;
        predictions[i].resolution = {
          correctAnswer: 0,
          explanation: `Correct prediction ${i + 1}`,
          resolutionSource: 'api',
          confidence: 100
        };
      }

      await contestScoringService.forceEvaluateContest(testContest.id);

      const updatedContest = contestScoringService.getContest(testContest.id);
      const participant = updatedContest?.participants.find((p: any) => p.userId === 'user1');

      // Should have streak bonus for 3+ correct predictions
      expect(participant?.stats.currentStreak).toBe(5);
      expect(participant?.stats.longestStreak).toBe(5);
      
      // Total score should include streak bonuses
      const baseScore = testContest.scoring.correctPrediction * 5 * 0.8; // 5 predictions * confidence
      expect(participant?.totalScore).toBeGreaterThan(baseScore);
    });
  });

  describe('Leaderboard Generation', () => {
    test('should generate accurate leaderboard', async () => {
      const leaderboard = contestScoringService.getContestLeaderboard(testContest.id);
      
      expect(leaderboard).toBeDefined();
      expect(leaderboard?.rankings.length).toBe(3);
      
      // Rankings should be sorted by score descending
      const rankings = leaderboard!.rankings;
      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].totalScore).toBeGreaterThanOrEqual(rankings[i + 1].totalScore);
        expect(rankings[i].rank).toBe(i + 1);
      }

      // Should include proper stats
      rankings.forEach(ranking => {
        expect(ranking.userId).toBeDefined();
        expect(ranking.username).toBeDefined();
        expect(ranking.totalScore).toBeGreaterThanOrEqual(0);
        expect(ranking.accuracy).toBeGreaterThanOrEqual(0);
        expect(ranking.potentialPayout).toBeGreaterThanOrEqual(0);
      });
    });

    test('should calculate potential payouts correctly', async () => {
      const leaderboard = contestScoringService.getContestLeaderboard(testContest.id);
      const rankings = leaderboard!.rankings;

      // First place should get largest payout
      expect(rankings[0].potentialPayout).toBe(1000); // 50% of $2000
      expect(rankings[1].potentialPayout).toBe(600);  // 30% of $2000
      expect(rankings[2].potentialPayout).toBe(400);  // 20% of $2000
    });

    test('should handle tiebreakers correctly', async () => {
      // Create scenario with tied scores
      const tieContest = await contestScoringService.createContest({
        ...mockContestData,
        name: 'Tiebreaker Test'
      });

      await contestScoringService.registerParticipant(tieContest.id, 'user1', 'User1');
      await contestScoringService.registerParticipant(tieContest.id, 'user2', 'User2');

      const prediction = tieContest.predictions[0];

      // Both submit same prediction with different accuracies
      await contestScoringService.submitPrediction(tieContest.id, 'user1', {
        predictionId: prediction.id,
        choice: 0,
        confidence: 100
      });

      await contestScoringService.submitPrediction(tieContest.id, 'user2', {
        predictionId: prediction.id,
        choice: 0,
        confidence: 100
      });

      prediction.isResolved = true;
      prediction.resolution = {
        correctAnswer: 0,
        explanation: 'Both correct',
        resolutionSource: 'api',
        confidence: 100
      };

      await contestScoringService.forceEvaluateContest(tieContest.id);

      const leaderboard = contestScoringService.getContestLeaderboard(tieContest.id);
      
      // Both should have same score, tiebreaker should apply
      expect(leaderboard?.rankings[0].totalScore).toBe(leaderboard?.rankings[1].totalScore);
      expect(leaderboard?.rankings[0].rank).toBe(1);
      expect(leaderboard?.rankings[1].rank).toBe(2);
    });
  });

  describe('Contest Completion', () => {
    test('should detect contest completion', async () => {
      // Resolve all remaining predictions
      for (const prediction of testContest.predictions) {
        if (!prediction.isResolved) {
          prediction.isResolved = true;
          prediction.resolution = {
            correctAnswer: Math.floor(Math.random() * prediction.options.length),
            explanation: 'Auto-resolved for testing',
            resolutionSource: 'api',
            confidence: 100
          };
        }
      }

      await contestScoringService.forceEvaluateContest(testContest.id);

      const updatedContest = contestScoringService.getContest(testContest.id);
      expect(updatedContest?.status).toBe('completed');
      expect(updatedContest?.results).toBeDefined();
    });

    test('should calculate final results correctly', async () => {
      const results = await contestScoringService.getContestResults(testContest.id);
      
      expect(results).toBeDefined();
      expect(results?.finalRankings.length).toBe(3);
      expect(results?.payouts.length).toBe(3);
      expect(results?.stats.totalParticipants).toBe(3);
      expect(results?.stats.totalPrizePool).toBe(2000);
      expect(results?.topPerformers.length).toBeGreaterThan(0);
      
      // Verify payout amounts
      const totalPayouts = results!.payouts.reduce((sum, payout) => sum + payout.amount, 0);
      expect(totalPayouts).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid contest ID', () => {
      const contest = contestScoringService.getContest('invalid_id');
      expect(contest).toBeUndefined();
    });

    test('should handle invalid prediction submission', async () => {
      await expect(
        contestScoringService.submitPrediction(
          'invalid_contest',
          'user1',
          { predictionId: 'invalid', choice: 0, confidence: 80 }
        )
      ).rejects.toThrow('Contest not found');
    });

    test('should handle unregistered user prediction', async () => {
      await expect(
        contestScoringService.submitPrediction(
          testContest.id,
          'unregistered_user',
          { predictionId: testContest.predictions[0].id, choice: 0, confidence: 80 }
        )
      ).rejects.toThrow('User not registered for this contest');
    });
  });

  describe('Service Status', () => {
    test('should provide service status', () => {
      const status = contestScoringService.getServiceStatus();
      
      expect(status.contestsActive).toBeGreaterThanOrEqual(0);
      expect(status.gameResultsCached).toBeGreaterThanOrEqual(0);
      expect(status.evaluationsCached).toBeGreaterThanOrEqual(0);
      expect(status.lastUpdate).toBeDefined();
    });
  });
});

// Integration tests with production sports data service
describe('Sports Data Integration', () => {
  test('should fetch live game data', async () => {
    const liveScores = await productionSportsDataService.getLiveScores();
    expect(Array.isArray(liveScores)).toBe(true);
  });

  test('should fetch current week games', async () => {
    const games = await productionSportsDataService.getCurrentWeekGames(1, 2024);
    expect(Array.isArray(games)).toBe(true);
  });

  test('should provide API status', () => {
    const status = productionSportsDataService.getAPIStatus();
    expect(status.isConnected).toBe(true);
    expect(status.services.length).toBeGreaterThan(0);
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('should handle large number of participants', async () => {
    const largeContest = await contestScoringService.createContest({
      ...mockContestData,
      name: 'Large Contest',
      maxParticipants: 1000
    });

    const startTime = Date.now();
    
    // Register 100 participants
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        contestScoringService.registerParticipant(
          largeContest.id,
          `perf_user_${i}`,
          `PerfUser${i}`
        )
      );
    }
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(largeContest.participants.length).toBe(100);
  });

  test('should handle concurrent prediction submissions', async () => {
    const concurrentContest = await contestScoringService.createContest({
      ...mockContestData,
      name: 'Concurrent Test'
    });

    // Register users
    for (let i = 0; i < 10; i++) {
      await contestScoringService.registerParticipant(
        concurrentContest.id,
        `concurrent_user_${i}`,
        `ConcurrentUser${i}`
      );
    }

    const prediction = concurrentContest.predictions[0];
    const startTime = Date.now();

    // Submit predictions concurrently
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        contestScoringService.submitPrediction(concurrentContest.id, `concurrent_user_${i}`, {
          predictionId: prediction.id,
          choice: i % 2,
          confidence: 75
        })
      );
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000); // 2 seconds
    
    const updatedContest = contestScoringService.getContest(concurrentContest.id);
    updatedContest?.participants.forEach(participant => {
      expect(participant.predictions.length).toBe(1);
    });
  });
});

export { }; // Ensure this file is treated as a module
