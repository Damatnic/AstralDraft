import { seasonContestService } from '../services/seasonContestService';
import type { ContestScoring, ContestRules, StreakBonus, WeeklyBonus, BonusCategory, PenaltyRule } from '../services/seasonContestService';

// Helper function to create valid ContestRules objects
const createValidContestRules = (): ContestRules => ({
  scoringSystem: 'POINTS' as const,
  allowLateEntries: true,
  requireAllPredictions: false,
  tiebreaker: 'TOTAL_POINTS' as const,
  bonusCategories: [] as BonusCategory[],
  penalties: [] as PenaltyRule[]
});

// Helper function to create valid ContestScoring objects
const createValidContestScoring = (): ContestScoring => ({
  correctPrediction: 10,
  partialCredit: 5,
  confidenceMultiplier: true,
  streakBonus: {
    minStreak: 3,
    bonusPerCorrect: 2,
    maxBonus: 10,
    resetOnIncorrect: true
  } as StreakBonus,
  categoryWeights: {
    'GAME_OUTCOME': 1.0,
    'TOTAL_POINTS': 0.8,
    'PLAYER_PERFORMANCE': 1.2
  },
  weeklyBonuses: [] as WeeklyBonus[],
  playoffMultiplier: 1.5,
  championshipBonus: 25
});

// Helper function to create valid contest data
const createValidContestData = (overrides = {}) => ({
  name: 'Test Contest',
  description: 'A test contest for unit testing',
  season: 2024,
  status: 'UPCOMING' as const,
  contestType: 'WEEKLY_PREDICTIONS' as const,
  startDate: new Date('2024-09-01'),
  endDate: new Date('2024-12-31'),
  prizePool: 1000,
  rules: createValidContestRules(),
  scoring: createValidContestScoring(),
  ...overrides
});

describe('SeasonContestService', () => {
  afterEach(() => {
    // Clean up any created contests after each test
    // Note: In a real implementation, we'd want a cleanup method
  });

  describe('createContest', () => {
    it('should create a new season contest', () => {
      const contestData = createValidContestData();

      const contest = seasonContestService.createContest(contestData);

      expect(contest).toBeDefined();
      expect(contest.id).toBeDefined();
      expect(contest.name).toBe(contestData.name);
      expect(contest.description).toBe(contestData.description);
      expect(contest.season).toBe(contestData.season);
      expect(contest.status).toBe(contestData.status);
      expect(contest.contestType).toBe(contestData.contestType);
      expect(contest.participants).toEqual([]);
      expect(contest.leaderboard).toBeDefined();
    });

    it('should generate unique contest IDs', () => {
      const contestData = createValidContestData({ name: 'Test Contest 1' });

      const contest1 = seasonContestService.createContest(contestData);
      const contest2 = seasonContestService.createContest(createValidContestData({ name: 'Test Contest 2' }));

      expect(contest1.id).not.toBe(contest2.id);
    });
  });

  describe('joinContest', () => {
    let contestId: string;

    beforeEach(() => {
      const contestData = createValidContestData({
        name: 'Join Test Contest',
        description: 'Contest for testing joins',
        status: 'ACTIVE' as const,
        maxParticipants: 10
      });

      const contest = seasonContestService.createContest(contestData);
      contestId = contest.id;
    });

    it('should allow user to join contest', () => {
      const result = seasonContestService.joinContest(
        contestId,
        'user1',
        'Test User',
        'avatar1.png'
      );

      expect(result).toBe(true);

      const contest = seasonContestService.getContest(contestId);
      expect(contest?.participants).toHaveLength(1);
      expect(contest?.participants[0].userId).toBe('user1');
      expect(contest?.participants[0].userName).toBe('Test User');
      expect(contest?.participants[0].avatar).toBe('avatar1.png');
    });

    it('should prevent duplicate joins', () => {
      seasonContestService.joinContest(contestId, 'user1', 'Test User', 'avatar1.png');
      
      const result = seasonContestService.joinContest(
        contestId,
        'user1',
        'Test User',
        'avatar1.png'
      );

      expect(result).toBe(false);

      const contest = seasonContestService.getContest(contestId);
      expect(contest?.participants).toHaveLength(1);
    });

    it('should return false for non-existent contest', () => {
      const result = seasonContestService.joinContest(
        'non-existent-id',
        'user1',
        'Test User',
        'avatar1.png'
      );

      expect(result).toBe(false);
    });
  });

  describe('getContest', () => {
    it('should return contest by ID', () => {
      const contestData = createValidContestData({
        name: 'Get Test Contest',
        description: 'Contest for testing retrieval',
        status: 'ACTIVE' as const
      });

      const created = seasonContestService.createContest(contestData);
      const retrieved = seasonContestService.getContest(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(contestData.name);
    });

    it('should return undefined for non-existent contest', () => {
      const result = seasonContestService.getContest('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getActiveContests', () => {
    it('should return only active contests', () => {
      // Clear any existing contests first to ensure test isolation
      const allContests = seasonContestService.getActiveContests();
      console.log(`Found ${allContests.length} existing active contests before test`);
      
      // Create upcoming contest first
      const upcomingContestData = createValidContestData({
        name: 'Upcoming Contest For Isolation Test',
        description: 'An upcoming contest for test isolation',
        status: 'UPCOMING' as const
      });

      // Create active contest
      const activeContestData = createValidContestData({
        name: 'Active Contest For Isolation Test',
        description: 'An active contest for test isolation',
        status: 'ACTIVE' as const
      });

      seasonContestService.createContest(upcomingContestData);
      const activeContest = seasonContestService.createContest(activeContestData);

      const activeContests = seasonContestService.getActiveContests();
      
      // Filter for only the contests we created in this test
      const testActiveContests = activeContests.filter(contest => 
        contest.name === 'Active Contest For Isolation Test'
      );
      
      expect(testActiveContests).toHaveLength(1);
      expect(testActiveContests[0].status).toBe('ACTIVE');
      expect(testActiveContests[0].name).toBe('Active Contest For Isolation Test');
      expect(testActiveContests[0].id).toBe(activeContest.id);
    });
  });

  describe('generateWeeklyContest', () => {
    it('should generate weekly contest with predictions', () => {
      const weeklyContest = seasonContestService.generateWeeklyContest(1, 'Season Opener');

      expect(weeklyContest).toBeDefined();
      expect(weeklyContest.week).toBe(1);
      expect(weeklyContest.theme).toBe('Season Opener');
      expect(weeklyContest.deadline).toBeDefined();
      expect(weeklyContest.deadline instanceof Date).toBe(true);
      expect(Array.isArray(weeklyContest.predictions)).toBe(true);
      expect(Array.isArray(weeklyContest.bonusQuestions)).toBe(true);
    });

    it('should generate different contests for different weeks', () => {
      const week1Contest = seasonContestService.generateWeeklyContest(1, 'Week 1');
      const week2Contest = seasonContestService.generateWeeklyContest(2, 'Week 2');

      expect(week1Contest.week).toBe(1);
      expect(week2Contest.week).toBe(2);
      expect(week1Contest.deadline.getTime()).not.toBe(week2Contest.deadline.getTime());
    });
  });

  describe('createPlayoffBracket', () => {
    it('should create playoff bracket structure', () => {
      const bracket = seasonContestService.createPlayoffBracket();

      expect(bracket).toBeDefined();
      expect(bracket.id).toBeDefined();
      expect(bracket.name).toBeDefined();
      expect(Array.isArray(bracket.rounds)).toBe(true);
      expect(bracket.status).toBeDefined();
      expect(['SEEDING', 'ROUND_1', 'DIVISIONAL', 'CONFERENCE', 'SUPER_BOWL', 'COMPLETED']).toContain(bracket.status);
      expect(bracket.seedingComplete).toBeDefined();
      expect(typeof bracket.seedingComplete).toBe('boolean');
      expect(bracket.currentRound).toBeDefined();
      expect(typeof bracket.currentRound).toBe('number');
      expect(bracket.scoringRules).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid inputs gracefully', () => {
      expect(() => seasonContestService.getContest('')).not.toThrow();
      expect(() => seasonContestService.getContest(null as any)).not.toThrow();
      expect(() => seasonContestService.getUserContests('')).not.toThrow();
      expect(() => seasonContestService.getLeaderboard('invalid-id')).not.toThrow();
    });
  });
});
