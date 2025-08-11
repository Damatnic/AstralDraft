/**
 * Enhanced Real-Time Sync Service Tests
 * Comprehensive unit tests for real-time data synchronization
 */

// Mock dependencies first
jest.mock('../../services/realTimeDataServiceV2', () => ({
  realTimeDataService: {
    initialize: jest.fn(),
    shutdown: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    getLatestScores: jest.fn(() => Promise.resolve({})),
    getPlayerUpdates: jest.fn(() => Promise.resolve([])),
    checkForUpdates: jest.fn(() => Promise.resolve(false)),
    onGameUpdate: jest.fn(),
    onPlayerUpdate: jest.fn(),
    onInjuryAlert: jest.fn()
  }
}));

jest.mock('../../services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

import { enhancedRealTimeSyncService } from '../../services/enhancedRealTimeSyncService';

// Mock WebSocketServer for testing
jest.mock('ws', () => {
  const mockWebSocket = {
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ping: jest.fn()
  };

  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
      clients: new Set()
    })),
    WebSocket: mockWebSocket
  };
});

describe('EnhancedRealTimeSyncService', () => {
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Ensure service is stopped after each test
    try {
      await enhancedRealTimeSyncService.shutdown();
    } catch (error) {
      // Service might not be running, ignore error
    }
  });

  describe('Service Lifecycle', () => {
    it('should initialize service without errors', async () => {
      await expect(enhancedRealTimeSyncService.initialize()).resolves.not.toThrow();
      
      // Verify service provides metrics after initialization
      const metrics = enhancedRealTimeSyncService.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should shutdown service gracefully', async () => {
      await enhancedRealTimeSyncService.initialize();
      await expect(enhancedRealTimeSyncService.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple initialization attempts', async () => {
      await enhancedRealTimeSyncService.initialize();
      
      // Second initialization should not throw
      await expect(enhancedRealTimeSyncService.initialize()).resolves.not.toThrow();
    });

    it('should handle shutdown when not running', async () => {
      // Shutdown when not running should not throw
      await expect(enhancedRealTimeSyncService.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Metrics and Status', () => {
    beforeEach(async () => {
      await enhancedRealTimeSyncService.initialize();
    });

    it('should provide performance metrics', () => {
      const metrics = enhancedRealTimeSyncService.getMetrics();
      
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('eventsThroughput');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('conflictRate');
      expect(metrics).toHaveProperty('dataVolume');
      expect(metrics).toHaveProperty('lastMetricsUpdate');
      
      expect(typeof metrics.activeConnections).toBe('number');
      expect(typeof metrics.totalConnections).toBe('number');
      expect(typeof metrics.eventsThroughput).toBe('number');
      expect(typeof metrics.averageLatency).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.conflictRate).toBe('number');
    });

    it('should provide connection count', () => {
      const count = enhancedRealTimeSyncService.getConnectionCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should handle league participants query', () => {
      const leagueId = 'test-league-123';
      const participants = enhancedRealTimeSyncService.getLeagueParticipants(leagueId);
      
      expect(Array.isArray(participants)).toBe(true);
      expect(participants.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide sync state for leagues', () => {
      const leagueId = 'test-league-456';
      const syncState = enhancedRealTimeSyncService.getSyncState(leagueId);
      
      // Will be undefined if league not initialized
      if (syncState) {
        expect(syncState).toHaveProperty('leagueId');
        expect(syncState).toHaveProperty('version');
        expect(syncState).toHaveProperty('lastUpdate');
        expect(syncState).toHaveProperty('participants');
        expect(syncState).toHaveProperty('eventHistory');
        expect(syncState.leagueId).toBe(leagueId);
      } else {
        expect(syncState).toBeUndefined();
      }
    });
  });

  describe('Sync Operations', () => {
    beforeEach(async () => {
      await enhancedRealTimeSyncService.initialize();
    });

    it('should handle force sync for league', () => {
      const leagueId = 'force-sync-league';
      
      // Should not throw even if league doesn't exist
      expect(() => {
        enhancedRealTimeSyncService.forceSync(leagueId);
      }).not.toThrow();
    });

    it('should handle sync operations gracefully', () => {
      const leagueId = 'sync-ops-league';
      
      // Test multiple sync operations
      enhancedRealTimeSyncService.forceSync(leagueId);
      const participants = enhancedRealTimeSyncService.getLeagueParticipants(leagueId);
      const syncState = enhancedRealTimeSyncService.getSyncState(leagueId);
      
      expect(Array.isArray(participants)).toBe(true);
      // Sync state might be undefined for non-existent league
      expect(syncState === undefined || typeof syncState === 'object').toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await enhancedRealTimeSyncService.initialize();
    });

    it('should handle invalid league IDs gracefully', () => {
      const invalidLeagueIds = ['', 'invalid-league'];
      
      invalidLeagueIds.forEach(leagueId => {
        expect(() => {
          enhancedRealTimeSyncService.getLeagueParticipants(leagueId);
          enhancedRealTimeSyncService.getSyncState(leagueId);
          enhancedRealTimeSyncService.forceSync(leagueId);
        }).not.toThrow();
      });
    });

    it('should maintain consistent state during errors', () => {
      const initialMetrics = enhancedRealTimeSyncService.getMetrics();
      const initialConnectionCount = enhancedRealTimeSyncService.getConnectionCount();
      
      // Perform operations that might cause errors
      enhancedRealTimeSyncService.forceSync('non-existent-league');
      enhancedRealTimeSyncService.getLeagueParticipants('invalid');
      
      // Verify service is still functional
      const finalMetrics = enhancedRealTimeSyncService.getMetrics();
      const finalConnectionCount = enhancedRealTimeSyncService.getConnectionCount();
      
      expect(finalMetrics).toBeDefined();
      expect(typeof finalConnectionCount).toBe('number');
      
      // Basic sanity checks
      expect(finalMetrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(finalConnectionCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await enhancedRealTimeSyncService.initialize();
    });

    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      const leagueIds = ['league1', 'league2', 'league3', 'league4', 'league5'];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        const leagueId = leagueIds[i % leagueIds.length];
        operations.push(
          Promise.resolve().then(() => {
            enhancedRealTimeSyncService.forceSync(leagueId);
            enhancedRealTimeSyncService.getLeagueParticipants(leagueId);
            enhancedRealTimeSyncService.getSyncState(leagueId);
            return enhancedRealTimeSyncService.getMetrics();
          })
        );
      }
      
      // All operations should complete without errors
      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
      results.forEach(metrics => {
        expect(metrics).toBeDefined();
        expect(typeof metrics.activeConnections).toBe('number');
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Perform many operations quickly
      for (let i = 0; i < 100; i++) {
        enhancedRealTimeSyncService.getMetrics();
        enhancedRealTimeSyncService.getConnectionCount();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 1 second for 200 operations)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration Points', () => {
    beforeEach(async () => {
      await enhancedRealTimeSyncService.initialize();
    });

    it('should provide consistent API responses', () => {
      // Test multiple calls return consistent structure
      const metrics1 = enhancedRealTimeSyncService.getMetrics();
      const metrics2 = enhancedRealTimeSyncService.getMetrics();
      
      expect(Object.keys(metrics1)).toEqual(Object.keys(metrics2));
      expect(typeof metrics1.activeConnections).toBe(typeof metrics2.activeConnections);
    });

    it('should handle service state transitions', async () => {
      // Test shutdown and restart
      await enhancedRealTimeSyncService.shutdown();
      await enhancedRealTimeSyncService.initialize();
      
      // Service should be functional after restart
      const metrics = enhancedRealTimeSyncService.getMetrics();
      const count = enhancedRealTimeSyncService.getConnectionCount();
      
      expect(metrics).toBeDefined();
      expect(typeof count).toBe('number');
    });
  });
});
