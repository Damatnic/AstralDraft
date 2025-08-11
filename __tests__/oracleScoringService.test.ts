import { oracleScoringService } from '../services/oracleScoringService';
import type { ScoringResult, ChallengeSubmission, ChallengeResult } from '../services/oracleScoringService';

describe('OracleScoringService', () => {
    // Using the singleton instance

    describe('calculateUserScore', () => {
        it('should calculate basic user score correctly', () => {
            const scoringResults: ScoringResult[] = [
                {
                    userId: 'user1',
                    predictionId: 'pred1',
                    basePoints: 100,
                    confidenceBonus: 20,
                    oracleBeatBonus: 50,
                    streakMultiplier: 1.2,
                    totalPoints: 204,
                    wasCorrect: true,
                    beatOracle: true,
                    newStreak: 1
                },
                {
                    userId: 'user1',
                    predictionId: 'pred2',
                    basePoints: 100,
                    confidenceBonus: 10,
                    oracleBeatBonus: 0,
                    streakMultiplier: 1.0,
                    totalPoints: 110,
                    wasCorrect: true,
                    beatOracle: false,
                    newStreak: 2
                },
                {
                    userId: 'user1',
                    predictionId: 'pred3',
                    basePoints: 0,
                    confidenceBonus: 0,
                    oracleBeatBonus: 0,
                    streakMultiplier: 1.0,
                    totalPoints: 0,
                    wasCorrect: false,
                    beatOracle: false,
                    newStreak: 0
                }
            ];

            const userScore = oracleScoringService.calculateUserScore('user1', scoringResults);

            expect(userScore.userId).toBe('user1');
            expect(userScore.totalPredictions).toBe(3);
            expect(userScore.correctPredictions).toBe(2);
            expect(userScore.accuracy).toBeCloseTo(66.67, 1);
            expect(userScore.totalPoints).toBe(314);
        });

        it('should handle empty predictions array', () => {
            const userScore = oracleScoringService.calculateUserScore('user1', []);

            expect(userScore.userId).toBe('user1');
            expect(userScore.totalPredictions).toBe(0);
            expect(userScore.correctPredictions).toBe(0);
            expect(userScore.accuracy).toBe(0);
            expect(userScore.totalPoints).toBe(0);
            expect(userScore.currentStreak).toBe(0);
            expect(userScore.longestStreak).toBe(0);
        });
    });

    describe('calculateScore', () => {
        it('should calculate correct prediction score', () => {
            const submission: ChallengeSubmission = {
                id: 'sub1',
                userId: 'user1',
                predictionId: 'pred1',
                userChoice: 1,
                confidence: 80,
                submittedAt: new Date()
            };

            const result: ChallengeResult = {
                predictionId: 'pred1',
                correctAnswer: 1,
                oracleChoice: 2,
                oracleConfidence: 70,
                resolvedAt: new Date()
            };

            const scoringResult = oracleScoringService.calculateScore(submission, result, 0);

            expect(scoringResult.wasCorrect).toBe(true);
            expect(scoringResult.beatOracle).toBe(true);
            expect(scoringResult.totalPoints).toBeGreaterThan(0);
            expect(scoringResult.newStreak).toBe(1);
        });

        it('should handle incorrect prediction', () => {
            const submission: ChallengeSubmission = {
                id: 'sub1',
                userId: 'user1',
                predictionId: 'pred1',
                userChoice: 1,
                confidence: 80,
                submittedAt: new Date()
            };

            const result: ChallengeResult = {
                predictionId: 'pred1',
                correctAnswer: 2,
                oracleChoice: 2,
                oracleConfidence: 90,
                resolvedAt: new Date()
            };

            const scoringResult = oracleScoringService.calculateScore(submission, result, 5);

            expect(scoringResult.wasCorrect).toBe(false);
            expect(scoringResult.beatOracle).toBe(false);
            expect(scoringResult.totalPoints).toBe(0);
            expect(scoringResult.newStreak).toBe(0);
        });
    });

    describe('getAchievements', () => {
        it('should return list of available achievements', () => {
            const achievements = oracleScoringService.getAchievements();

            expect(achievements).toBeDefined();
            expect(Array.isArray(achievements)).toBe(true);
            expect(achievements.length).toBeGreaterThan(0);
            
            // Check that achievements have required properties
            achievements.forEach(achievement => {
                expect(achievement).toHaveProperty('id');
                expect(achievement).toHaveProperty('name');
                expect(achievement).toHaveProperty('description');
                expect(achievement).toHaveProperty('requirement');
                expect(achievement).toHaveProperty('tier');
            });
        });
    });

    describe('getAchievementsByTier', () => {
        it('should return achievements filtered by tier', () => {
            const bronzeAchievements = oracleScoringService.getAchievementsByTier('bronze');
            const silverAchievements = oracleScoringService.getAchievementsByTier('silver');
            const goldAchievements = oracleScoringService.getAchievementsByTier('gold');

            expect(Array.isArray(bronzeAchievements)).toBe(true);
            expect(Array.isArray(silverAchievements)).toBe(true);
            expect(Array.isArray(goldAchievements)).toBe(true);

            // All bronze achievements should have bronze tier
            bronzeAchievements.forEach(achievement => {
                expect(achievement.tier).toBe('bronze');
            });

            // All silver achievements should have silver tier
            silverAchievements.forEach(achievement => {
                expect(achievement.tier).toBe('silver');
            });

            // All gold achievements should have gold tier
            goldAchievements.forEach(achievement => {
                expect(achievement.tier).toBe('gold');
            });
        });
    });

    describe('generateLeaderboard', () => {
        it('should generate leaderboard from scoring results', () => {
            const scoringResults: ScoringResult[] = [
                {
                    userId: 'user1',
                    predictionId: 'pred1',
                    basePoints: 100,
                    confidenceBonus: 20,
                    oracleBeatBonus: 0,
                    streakMultiplier: 1.0,
                    totalPoints: 120,
                    wasCorrect: true,
                    beatOracle: false,
                    newStreak: 1
                },
                {
                    userId: 'user2',
                    predictionId: 'pred2',
                    basePoints: 100,
                    confidenceBonus: 30,
                    oracleBeatBonus: 50,
                    streakMultiplier: 1.0,
                    totalPoints: 180,
                    wasCorrect: true,
                    beatOracle: true,
                    newStreak: 1
                }
            ];

            const leaderboard = oracleScoringService.generateLeaderboard(scoringResults);

            expect(leaderboard).toBeDefined();
            expect(Array.isArray(leaderboard)).toBe(true);
            expect(leaderboard.length).toBe(2);
            
            // Should be sorted by points descending
            expect(leaderboard[0].totalPoints).toBeGreaterThanOrEqual(leaderboard[1].totalPoints);
            
            // Check leaderboard entry structure
            leaderboard.forEach((entry, index) => {
                expect(entry).toHaveProperty('userId');
                expect(entry).toHaveProperty('totalPoints');
                expect(entry).toHaveProperty('accuracy');
                expect(entry).toHaveProperty('totalPredictions');
                expect(entry).toHaveProperty('rank');
                expect(entry.rank).toBe(index + 1);
            });
        });
    });
});
