/**
 * Tests for Player Comparison Service and Hook
 * Comprehensive test suite for the advanced player comparison tool
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { playerComparisonService } from '../services/playerComparisonService';
import { usePlayerComparison } from '../hooks/usePlayerComparison';

// Mock the production sports data service
jest.mock('../services/productionSportsDataService', () => ({
  productionSportsDataService: {
    getPlayerDetails: jest.fn(),
    getCurrentWeekGames: jest.fn(),
    searchPlayers: jest.fn()
  }
}));

// Mock the real-time notification service
jest.mock('../services/realtimeNotificationService', () => ({
  realtimeNotificationService: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

describe('PlayerComparisonService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playerComparisonService.clearCache();
  });

  describe('comparePlayersFull', () => {
    it('should compare multiple players successfully', async () => {
      // Mock player data
      const mockPlayers = [
        {
          id: 'player1',
          name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          stats: { fantasyPoints: 25.5, passingYards: 300, passingTouchdowns: 3 },
          injuryStatus: 'healthy'
        },
        {
          id: 'player2',
          name: 'Lamar Jackson',
          position: 'QB', 
          team: 'BAL',
          stats: { fantasyPoints: 23.2, passingYards: 280, passingTouchdowns: 2, rushingYards: 60 },
          injuryStatus: 'healthy'
        }
      ];

      // Mock games data
      const mockGames = [
        {
          id: 'game1',
          homeTeam: { abbreviation: 'BUF', displayName: 'Buffalo Bills' },
          awayTeam: { abbreviation: 'MIA', displayName: 'Miami Dolphins' },
          weather: { temperature: 70, windSpeed: 5, precipitation: 0 }
        },
        {
          id: 'game2', 
          homeTeam: { abbreviation: 'BAL', displayName: 'Baltimore Ravens' },
          awayTeam: { abbreviation: 'CIN', displayName: 'Cincinnati Bengals' },
          weather: { temperature: 65, windSpeed: 8, precipitation: 0 }
        }
      ];

      // Setup mocks
      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails
        .mockResolvedValueOnce(mockPlayers[0])
        .mockResolvedValueOnce(mockPlayers[1]);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue(mockGames);

      // Execute comparison
      const result = await playerComparisonService.comparePlayersFull(['player1', 'player2'], 1, 2024);

      // Assertions
      expect(result).toBeDefined();
      expect(result.players).toHaveLength(2);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.winner).toBeDefined();
      expect(result.analysis.confidence).toBeGreaterThan(0);
      expect(result.recommendations).toHaveLength(2);

      // Verify player enhancement
      expect(result.players[0]).toHaveProperty('projectedStats');
      expect(result.players[0]).toHaveProperty('matchupAnalysis');
      expect(result.players[0]).toHaveProperty('recentPerformance');
      expect(result.players[0]).toHaveProperty('fantasyRelevance');
    });

    it('should handle empty player list', async () => {
      await expect(
        playerComparisonService.comparePlayersFull([], 1, 2024)
      ).rejects.toThrow('No valid players found');
    });

    it('should handle player not found', async () => {
      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(null);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([]);

      await expect(
        playerComparisonService.comparePlayersFull(['invalid_player'], 1, 2024)
      ).rejects.toThrow('No valid players found');
    });

    it('should cache comparison results', async () => {
      const mockPlayer = {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5 },
        injuryStatus: 'healthy'
      };

      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(mockPlayer);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([{
        id: 'game1',
        homeTeam: { abbreviation: 'BUF' },
        awayTeam: { abbreviation: 'MIA' },
        weather: {}
      }]);

      // First call
      await playerComparisonService.comparePlayersFull(['player1', 'player1'], 1, 2024);
      
      // Second call should use cache
      await playerComparisonService.comparePlayersFull(['player1', 'player1'], 1, 2024);

      // Verify service was called only once due to caching
      expect(productionSportsDataService.getPlayerDetails).toHaveBeenCalledTimes(2); // Once per player in first call
    });
  });

  describe('quickCompare', () => {
    it('should perform quick comparison between two players', async () => {
      const mockPlayer1 = {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5 },
        injuryStatus: 'healthy'
      };

      const mockPlayer2 = {
        id: 'player2',
        name: 'Lamar Jackson',
        position: 'QB',
        team: 'BAL', 
        stats: { fantasyPoints: 23.2 },
        injuryStatus: 'healthy'
      };

      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails
        .mockResolvedValueOnce(mockPlayer1)
        .mockResolvedValueOnce(mockPlayer2);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([
        {
          id: 'game1',
          homeTeam: { abbreviation: 'BUF' },
          awayTeam: { abbreviation: 'MIA' },
          weather: {}
        }
      ]);

      const result = await playerComparisonService.quickCompare('player1', 'player2', 1);

      expect(result).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keyDifferences).toBeInstanceOf(Array);
      expect(result.projectedPoints).toHaveProperty('player1');
      expect(result.projectedPoints).toHaveProperty('player2');
    });
  });

  describe('getPlayerProjection', () => {
    it('should generate projection for a single player', async () => {
      const mockPlayer = {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5, passingYards: 300, passingTouchdowns: 3 },
        injuryStatus: 'healthy'
      };

      const mockGame = {
        id: 'game1',
        homeTeam: { abbreviation: 'BUF' },
        awayTeam: { abbreviation: 'MIA' },
        weather: { temperature: 70, windSpeed: 5, precipitation: 0 }
      };

      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(mockPlayer);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([mockGame]);

      const projection = await playerComparisonService.getPlayerProjection('player1', 1, 2024);

      expect(projection).toBeDefined();
      expect(projection.week).toBe(1);
      expect(projection.fantasyPoints).toBeGreaterThan(0);
      expect(projection.confidence).toBeGreaterThan(0);
      expect(projection.projectionMethod).toBeDefined();
    });

    it('should handle player not found', async () => {
      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(null);

      await expect(
        playerComparisonService.getPlayerProjection('invalid_player', 1, 2024)
      ).rejects.toThrow('Player invalid_player not found');
    });

    it('should handle no game found', async () => {
      const mockPlayer = {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5 },
        injuryStatus: 'healthy'
      };

      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(mockPlayer);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([]);

      await expect(
        playerComparisonService.getPlayerProjection('player1', 1, 2024)
      ).rejects.toThrow('No game found for BUF in week 1');
    });
  });

  describe('analyzeMatchup', () => {
    it('should analyze player matchup', async () => {
      const mockPlayer = {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5 },
        injuryStatus: 'healthy'
      };

      const mockGame = {
        id: 'game1',
        homeTeam: { abbreviation: 'BUF', displayName: 'Buffalo Bills' },
        awayTeam: { abbreviation: 'MIA', displayName: 'Miami Dolphins' },
        weather: { temperature: 70, windSpeed: 5, precipitation: 0 }
      };

      const { productionSportsDataService } = require('../services/productionSportsDataService');
      productionSportsDataService.getPlayerDetails.mockResolvedValue(mockPlayer);
      productionSportsDataService.getCurrentWeekGames.mockResolvedValue([mockGame]);

      const matchup = await playerComparisonService.analyzeMatchup('player1', 1, 2024);

      expect(matchup).toBeDefined();
      expect(matchup.opponent).toBe('MIA');
      expect(matchup.difficulty).toMatch(/easy|medium|hard/);
      expect(matchup.difficultyScore).toBeGreaterThan(0);
      expect(matchup.defensiveRank).toBeGreaterThan(0);
      expect(matchup.weatherImpact).toBeDefined();
      expect(matchup.injuryRisk).toBeGreaterThanOrEqual(0);
      expect(typeof matchup.homeFieldAdvantage).toBe('boolean');
      expect(matchup.keyFactors).toBeInstanceOf(Array);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = playerComparisonService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache', () => {
      playerComparisonService.clearCache();
      const stats = playerComparisonService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });
  });
});

describe('usePlayerComparison hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playerComparisonService.clearCache();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePlayerComparison());

    expect(result.current.selectedPlayers).toEqual([]);
    expect(result.current.comparison).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentWeek).toBe(1);
    expect(result.current.currentSeason).toBe(2024);
    expect(result.current.canCompare).toBe(false);
    expect(result.current.hasMaxPlayers).toBe(false);
    expect(result.current.recommendedPlayer).toBeNull();
    expect(result.current.comparisonSummary).toBeNull();
  });

  it('should add and remove players', () => {
    const { result } = renderHook(() => usePlayerComparison());

    act(() => {
      result.current.addPlayer('player1');
    });

    expect(result.current.selectedPlayers).toEqual(['player1']);

    act(() => {
      result.current.addPlayer('player2');
    });

    expect(result.current.selectedPlayers).toEqual(['player1', 'player2']);
    expect(result.current.canCompare).toBe(true);

    act(() => {
      result.current.removePlayer('player1');
    });

    expect(result.current.selectedPlayers).toEqual(['player2']);
    expect(result.current.canCompare).toBe(false);
  });

  it('should respect max players limit', () => {
    const { result } = renderHook(() => usePlayerComparison({ maxPlayers: 2 }));

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
      result.current.addPlayer('player3'); // Should be ignored
    });

    expect(result.current.selectedPlayers).toEqual(['player1', 'player2']);
    expect(result.current.hasMaxPlayers).toBe(true);
  });

  it('should not add duplicate players', () => {
    const { result } = renderHook(() => usePlayerComparison());

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player1'); // Duplicate
    });

    expect(result.current.selectedPlayers).toEqual(['player1']);
  });

  it('should clear all players', () => {
    const { result } = renderHook(() => usePlayerComparison());

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
    });

    expect(result.current.selectedPlayers).toHaveLength(2);

    act(() => {
      result.current.clearPlayers();
    });

    expect(result.current.selectedPlayers).toEqual([]);
    expect(result.current.comparison).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update week and season', () => {
    const { result } = renderHook(() => usePlayerComparison());

    act(() => {
      result.current.setWeek(5);
    });

    expect(result.current.currentWeek).toBe(5);

    act(() => {
      result.current.setSeason(2025);
    });

    expect(result.current.currentSeason).toBe(2025);
  });

  it('should handle comparison errors', async () => {
    const { result } = renderHook(() => usePlayerComparison({ autoCompare: false }));

    // Mock service to throw error
    jest.spyOn(playerComparisonService, 'comparePlayersFull').mockRejectedValue(
      new Error('API Error')
    );

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
    });

    await act(async () => {
      await result.current.compareNow();
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.loading).toBe(false);
    expect(result.current.comparison).toBeNull();
  });

  it('should perform quick comparison', async () => {
    const { result } = renderHook(() => usePlayerComparison());

    const mockQuickResult = {
      winner: 'player1',
      confidence: 85,
      keyDifferences: ['Higher projection', 'Better matchup'],
      projectedPoints: { player1: 25.5, player2: 23.2 }
    };

    jest.spyOn(playerComparisonService, 'quickCompare').mockResolvedValue(mockQuickResult);

    let quickResult: any;
    await act(async () => {
      quickResult = await result.current.quickCompare('player1', 'player2');
    });

    expect(quickResult).toEqual(mockQuickResult);
  });

  it('should provide cache management methods', () => {
    const { result } = renderHook(() => usePlayerComparison());

    const stats = result.current.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('keys');

    // Should not throw
    expect(() => result.current.clearCache()).not.toThrow();
  });

  it('should auto-compare when enabled', async () => {
    const mockComparison = {
      id: 'comp1',
      players: [],
      week: 1,
      season: 2024,
      analysis: { winner: 'player1', confidence: 85, reasoning: [], riskAssessment: { safestPick: 'player1', highestUpside: 'player1', mostConsistent: 'player1' }, situationalFactors: [] },
      recommendations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jest.spyOn(playerComparisonService, 'comparePlayersFull').mockResolvedValue(mockComparison);

    const { result } = renderHook(() => usePlayerComparison({ autoCompare: true }));

    act(() => {
      result.current.addPlayer('player1');
    });

    // Should not trigger comparison with only 1 player
    expect(playerComparisonService.comparePlayersFull).not.toHaveBeenCalled();

    act(() => {
      result.current.addPlayer('player2');
    });

    // Should trigger comparison with 2 players
    await waitFor(() => {
      expect(playerComparisonService.comparePlayersFull).toHaveBeenCalledWith(['player1', 'player2'], 1, 2024);
    });
  });

  it('should not auto-compare when disabled', () => {
    const { result } = renderHook(() => usePlayerComparison({ autoCompare: false }));

    jest.spyOn(playerComparisonService, 'comparePlayersFull');

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
    });

    expect(playerComparisonService.comparePlayersFull).not.toHaveBeenCalled();
  });

  it('should provide comparison summary when available', async () => {
    const mockPlayer = {
      id: 'player1',
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      jerseyNumber: 17,
      age: 28,
      height: '6-5',
      weight: 237,
      experience: 6,
      college: 'Wyoming',
      stats: { fantasyPoints: 25.5 },
      injuryStatus: 'healthy' as const,
      projectedStats: { 
        week: 1, 
        fantasyPoints: 26.2, 
        confidence: 85, 
        projectionMethod: 'ml_model' as const 
      },
      matchupAnalysis: { 
        opponent: 'MIA', 
        difficulty: 'medium' as const, 
        difficultyScore: 5, 
        defensiveRank: 15, 
        weatherImpact: { 
          temperature: 70, 
          windSpeed: 5, 
          precipitation: 0, 
          expectedImpact: 'neutral' as const, 
          impactScore: 0 
        }, 
        injuryRisk: 5, 
        restAdvantage: false, 
        homeFieldAdvantage: true, 
        historicalPerformance: [], 
        keyFactors: [] 
      },
      recentPerformance: { 
        last4Weeks: [], 
        seasonAverage: { fantasyPoints: 25.5 }, 
        trend: 'stable' as const, 
        consistency: 85, 
        ceiling: 35, 
        floor: 15, 
        volatility: 8 
      },
      fantasyRelevance: { 
        draftRank: 5, 
        positionRank: 2, 
        tier: 1, 
        rosteredPercentage: 98 
      }
    };

    const mockComparison = {
      id: 'comp1',
      players: [mockPlayer],
      week: 1,
      season: 2024,
      analysis: { 
        winner: 'player1', 
        confidence: 85, 
        reasoning: ['Higher projection'], 
        riskAssessment: { safestPick: 'player1', highestUpside: 'player1', mostConsistent: 'player1' },
        situationalFactors: []
      },
      recommendations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { result } = renderHook(() => usePlayerComparison({ autoCompare: false }));

    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
    });

    // Manually set comparison for testing
    jest.spyOn(playerComparisonService, 'comparePlayersFull').mockResolvedValue(mockComparison);

    await act(async () => {
      await result.current.compareNow();
    });

    expect(result.current.recommendedPlayer).toEqual(mockPlayer);
    expect(result.current.comparisonSummary).toContain('Josh Allen is recommended with 85% confidence');
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playerComparisonService.clearCache();
  });

  it('should handle end-to-end player comparison workflow', async () => {
    // Setup comprehensive mock data
    const mockPlayers = [
      {
        id: 'player1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5, passingYards: 300, passingTouchdowns: 3 },
        injuryStatus: 'healthy'
      },
      {
        id: 'player2',
        name: 'Lamar Jackson',
        position: 'QB',
        team: 'BAL',
        stats: { fantasyPoints: 23.2, passingYards: 280, rushingYards: 60, passingTouchdowns: 2, rushingTouchdowns: 1 },
        injuryStatus: 'healthy'
      }
    ];

    const mockGames = [
      {
        id: 'game1',
        homeTeam: { abbreviation: 'BUF', displayName: 'Buffalo Bills' },
        awayTeam: { abbreviation: 'MIA', displayName: 'Miami Dolphins' },
        weather: { temperature: 70, windSpeed: 5, precipitation: 0 }
      },
      {
        id: 'game2',
        homeTeam: { abbreviation: 'BAL', displayName: 'Baltimore Ravens' },
        awayTeam: { abbreviation: 'CIN', displayName: 'Cincinnati Bengals' },
        weather: { temperature: 65, windSpeed: 8, precipitation: 0 }
      }
    ];

    const { productionSportsDataService } = require('../services/productionSportsDataService');
    productionSportsDataService.getPlayerDetails
      .mockResolvedValueOnce(mockPlayers[0])
      .mockResolvedValueOnce(mockPlayers[1]);
    productionSportsDataService.getCurrentWeekGames.mockResolvedValue(mockGames);

    const { result } = renderHook(() => usePlayerComparison({ autoCompare: true }));

    // Add players and trigger comparison
    act(() => {
      result.current.addPlayer('player1');
      result.current.addPlayer('player2');
    });

    // Wait for comparison to complete
    await waitFor(() => {
      expect(result.current.comparison).toBeDefined();
    });

    // Verify complete comparison result
    expect(result.current.comparison).toBeDefined();
    const comparison = result.current.comparison;
    if (comparison) {
      expect(comparison.players).toHaveLength(2);
      expect(comparison.analysis.winner).toBeDefined();
      expect(comparison.recommendations).toHaveLength(2);
    }
    expect(result.current.recommendedPlayer).toBeDefined();
    expect(result.current.comparisonSummary).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle comparison with different positions', async () => {
    const mockPlayers = [
      {
        id: 'qb1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        stats: { fantasyPoints: 25.5 },
        injuryStatus: 'healthy'
      },
      {
        id: 'rb1',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        stats: { fantasyPoints: 28.2 },
        injuryStatus: 'healthy'
      }
    ];

    const { productionSportsDataService } = require('../services/productionSportsDataService');
    productionSportsDataService.getPlayerDetails
      .mockResolvedValueOnce(mockPlayers[0])
      .mockResolvedValueOnce(mockPlayers[1]);
    productionSportsDataService.getCurrentWeekGames.mockResolvedValue([
      {
        id: 'game1',
        homeTeam: { abbreviation: 'BUF' },
        awayTeam: { abbreviation: 'MIA' },
        weather: {}
      },
      {
        id: 'game2',
        homeTeam: { abbreviation: 'SF' },
        awayTeam: { abbreviation: 'LAR' },
        weather: {}
      }
    ]);

    const comparison = await playerComparisonService.comparePlayersFull(['qb1', 'rb1'], 1, 2024);

    expect(comparison.players).toHaveLength(2);
    expect(comparison.players[0].position).toBe('QB');
    expect(comparison.players[1].position).toBe('RB');
    expect(comparison.analysis.winner).toBeDefined();
  });
});

export {};
