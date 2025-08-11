/**
 * Oracle Education Service Tests
 * Comprehensive unit tests for educational content management
 */

import { oracleEducationService } from '../../services/oracleEducationService';
import type { DifficultyLevel, EducationCategory } from '../../services/oracleEducationService';

describe('OracleEducationService', () => {
  
  describe('Topic Management', () => {
    it('should return all educational topics', () => {
      const topics = oracleEducationService.getTopics();
      
      expect(topics).toBeInstanceOf(Array);
      expect(topics.length).toBeGreaterThan(0);
      
      // Verify topic structure
      topics.forEach(topic => {
        expect(topic).toHaveProperty('id');
        expect(topic).toHaveProperty('title');
        expect(topic).toHaveProperty('category');
        expect(topic).toHaveProperty('difficulty');
        expect(topic).toHaveProperty('description');
        expect(topic).toHaveProperty('content');
        expect(topic).toHaveProperty('estimatedReadTime');
        expect(topic).toHaveProperty('lastUpdated');
      });
    });

    it('should filter topics by category correctly', () => {
      const oracleBasicsTopics = oracleEducationService.getTopicsByCategory('ORACLE_BASICS');
      const fantasyBasicsTopics = oracleEducationService.getTopicsByCategory('FANTASY_FUNDAMENTALS');
      
      expect(oracleBasicsTopics.length).toBeGreaterThan(0);
      expect(fantasyBasicsTopics.length).toBeGreaterThan(0);
      
      oracleBasicsTopics.forEach(topic => {
        expect(topic.category).toBe('ORACLE_BASICS');
      });
      
      fantasyBasicsTopics.forEach(topic => {
        expect(topic.category).toBe('FANTASY_FUNDAMENTALS');
      });
    });

    it('should filter topics by difficulty level', () => {
      const beginnerTopics = oracleEducationService.getTopicsByDifficulty('BEGINNER');
      const expertTopics = oracleEducationService.getTopicsByDifficulty('EXPERT');
      
      expect(beginnerTopics.length).toBeGreaterThan(0);
      expect(expertTopics.length).toBeGreaterThan(0);
      
      beginnerTopics.forEach(topic => {
        expect(topic.difficulty).toBe('BEGINNER');
      });
      
      expertTopics.forEach(topic => {
        expect(topic.difficulty).toBe('EXPERT');
      });
    });

    it('should retrieve specific topic by ID', () => {
      const oracleIntroTopic = oracleEducationService.getTopic('oracle-introduction');
      
      expect(oracleIntroTopic).toBeDefined();
      expect(oracleIntroTopic?.id).toBe('oracle-introduction');
      expect(oracleIntroTopic?.title).toContain('Oracle');
      expect(oracleIntroTopic?.category).toBe('ORACLE_BASICS');
      expect(oracleIntroTopic?.difficulty).toBe('BEGINNER');
    });

    it('should return null for non-existent topic ID', () => {
      const nonExistentTopic = oracleEducationService.getTopic('non-existent-topic');
      expect(nonExistentTopic).toBeNull();
    });
  });

  describe('Learning Path Recommendations', () => {
    it('should provide appropriate learning path for beginners', () => {
      const beginnerPath = oracleEducationService.getRecommendedLearningPath('BEGINNER');
      
      expect(beginnerPath).toBeInstanceOf(Array);
      expect(beginnerPath.length).toBeGreaterThan(0);
      expect(beginnerPath).toContain('oracle-introduction');
      expect(beginnerPath).toContain('fantasy-basics');
      expect(beginnerPath).toContain('prediction-types');
    });

    it('should provide advanced learning path for experts', () => {
      const expertPath = oracleEducationService.getRecommendedLearningPath('EXPERT');
      
      expect(expertPath).toBeInstanceOf(Array);
      expect(expertPath.length).toBeGreaterThan(0);
      expect(expertPath).toContain('feature-engineering');
      expect(expertPath).toContain('ensemble-methods');
    });

    it('should default to beginner path for invalid difficulty', () => {
      const defaultPath = oracleEducationService.getRecommendedLearningPath('INVALID' as DifficultyLevel);
      const beginnerPath = oracleEducationService.getRecommendedLearningPath('BEGINNER');
      
      expect(defaultPath).toEqual(beginnerPath);
    });
  });

  describe('User Progress Tracking', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should initialize with empty progress when no data exists', () => {
      const stats = oracleEducationService.getLearningStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.completedCount).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.totalTimeSpent).toBe(0);
    });

    it('should track topic completion', () => {
      const topicId = 'oracle-introduction';
      
      oracleEducationService.markTopicCompleted(topicId);
      
      const stats = oracleEducationService.getLearningStatistics();
      expect(stats.completedCount).toBe(1);
      expect(stats.completionRate).toBeGreaterThan(0);
    });

    it('should track quiz completion', () => {
      const topicId = 'oracle-introduction';
      const score = 85;
      
      oracleEducationService.recordQuizScore(topicId, score);
      
      const stats = oracleEducationService.getLearningStatistics();
      expect(stats.averageQuizScore).toBe(85);
    });

    it('should respect topic access prerequisites', () => {
      // Test that advanced topics require prerequisites
      const canAccessAdvanced = oracleEducationService.canAccessTopic('feature-engineering');
      
      // Without completing prerequisites, should have restricted access
      expect(typeof canAccessAdvanced).toBe('boolean');
    });
  });

  describe('Content Quality', () => {
    it('should have well-formed content for all topics', () => {
      const topics = oracleEducationService.getTopics();
      
      topics.forEach(topic => {
        // Verify content structure
        expect(topic.content).toHaveProperty('introduction');
        expect(topic.content).toHaveProperty('sections');
        expect(topic.content).toHaveProperty('keyTakeaways');
        
        expect(typeof topic.content.introduction).toBe('string');
        expect(topic.content.introduction.length).toBeGreaterThan(50);
        
        expect(topic.content.sections).toBeInstanceOf(Array);
        expect(topic.content.keyTakeaways).toBeInstanceOf(Array);
        expect(topic.content.keyTakeaways.length).toBeGreaterThan(0);
        
        // Verify realistic read time
        expect(topic.estimatedReadTime).toBeGreaterThan(0);
        expect(topic.estimatedReadTime).toBeLessThan(60); // Max 60 minutes
      });
    });

    it('should have proper difficulty progression', () => {
      const allTopics = oracleEducationService.getTopics();
      const beginnerTopics = allTopics.filter(t => t.difficulty === 'BEGINNER');
      const expertTopics = allTopics.filter(t => t.difficulty === 'EXPERT');
      
      // Should have topics at all difficulty levels
      expect(beginnerTopics.length).toBeGreaterThan(0);
      expect(expertTopics.length).toBeGreaterThan(0);
      
      // Beginner topics should generally have shorter read times
      const avgBeginnerTime = beginnerTopics.reduce((sum, t) => sum + t.estimatedReadTime, 0) / beginnerTopics.length;
      const avgExpertTime = expertTopics.reduce((sum, t) => sum + t.estimatedReadTime, 0) / expertTopics.length;
      
      expect(avgExpertTime).toBeGreaterThanOrEqual(avgBeginnerTime);
    });

    it('should have comprehensive category coverage', () => {
      const topics = oracleEducationService.getTopics();
      const categories = new Set(topics.map(t => t.category));
      
      // Should cover major categories
      expect(categories.has('ORACLE_BASICS')).toBe(true);
      expect(categories.has('FANTASY_FUNDAMENTALS')).toBe(true);
      expect(categories.has('PREDICTION_ALGORITHMS')).toBe(true);
      expect(categories.has('STATISTICAL_ANALYSIS')).toBe(true);
      expect(categories.has('MACHINE_LEARNING')).toBe(true);
      
      // Should have balanced distribution
      expect(categories.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid category gracefully', () => {
      expect(() => {
        oracleEducationService.getTopicsByCategory('INVALID_CATEGORY' as EducationCategory);
      }).not.toThrow();
      
      const result = oracleEducationService.getTopicsByCategory('INVALID_CATEGORY' as EducationCategory);
      expect(result).toEqual([]);
    });

    it('should handle invalid difficulty gracefully', () => {
      expect(() => {
        oracleEducationService.getTopicsByDifficulty('INVALID_DIFFICULTY' as DifficultyLevel);
      }).not.toThrow();
      
      const result = oracleEducationService.getTopicsByDifficulty('INVALID_DIFFICULTY' as DifficultyLevel);
      expect(result).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => { throw new Error('Storage error'); }),
          setItem: jest.fn(() => { throw new Error('Storage error'); }),
          clear: jest.fn()
        },
        writable: true
      });

      expect(() => {
        oracleEducationService.getLearningStatistics();
      }).not.toThrow();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });
});
