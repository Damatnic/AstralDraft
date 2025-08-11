/**
 * Real-Time Notification System Tests
 * Simplified test suite focusing on core functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { realtimeNotificationService, RealtimeNotification } from '../services/realtimeNotificationService';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn()
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock as any;

describe('Real-Time Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize as singleton', () => {
      const service1 = realtimeNotificationService;
      const service2 = realtimeNotificationService;
      expect(service1).toBe(service2);
    });

    it('should provide basic functionality', () => {
      const service = realtimeNotificationService;
      expect(service).toBeDefined();
      expect(service.getMetrics).toBeDefined();
      expect(service.getActiveConnections).toBeDefined();
      expect(service.testNotification).toBeDefined();
    });
  });

  describe('Notification Delivery', () => {
    it('should send in-app notifications', async () => {
      const notification: RealtimeNotification = {
        id: 'test-1',
        type: 'deadline_warning',
        source: 'oracle',
        title: 'Test Notification',
        message: 'This is a test',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'medium',
        deliveryChannels: ['in_app'],
        targetUsers: ['user1']
      };

      const result = await realtimeNotificationService.sendNotification(notification);
      expect(result).toBe(true);
    });

    it('should register WebSocket connections', () => {
      const mockWs = mockWebSocket as any;
      realtimeNotificationService.registerWebSocketConnection('user1', mockWs);
      
      const connections = realtimeNotificationService.getActiveConnections();
      expect(connections).toContain('user1');
    });

    it('should send WebSocket notifications', async () => {
      const mockWs = mockWebSocket as any;
      realtimeNotificationService.registerWebSocketConnection('user1', mockWs);

      const notification: RealtimeNotification = {
        id: 'test-3',
        type: 'result_announced',
        source: 'sports_data',
        title: 'Score Update',
        message: 'Team A 14 - 7 Team B',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'low',
        deliveryChannels: ['websocket'],
        targetUsers: ['user1']
      };

      const result = await realtimeNotificationService.sendNotification(notification);
      expect(result).toBe(true);
      expect(mockWs.send).toHaveBeenCalled();
    });
  });

  describe('Push Subscription Management', () => {
    it('should subscribe to push notifications', async () => {
      const subscription = {
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/test',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      };

      const result = await realtimeNotificationService.subscribeToPushNotifications(subscription);
      expect(result).toBe(true);
    });

    it('should unsubscribe from push notifications', async () => {
      const subscription = {
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/test',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      };

      await realtimeNotificationService.subscribeToPushNotifications(subscription);
      const result = await realtimeNotificationService.unsubscribeFromPushNotifications('user1');
      expect(result).toBe(true);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track delivery metrics', () => {
      const metrics = realtimeNotificationService.getMetrics();
      expect(metrics).toHaveProperty('sent');
      expect(metrics).toHaveProperty('delivered');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('byChannel');
    });

    it('should track active connections', () => {
      const connections = realtimeNotificationService.getActiveConnections();
      expect(Array.isArray(connections)).toBe(true);
    });
  });

  describe('Test Notifications', () => {
    it('should send test notifications', async () => {
      const result = await realtimeNotificationService.testNotification('user1');
      expect(result).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle WebSocket connection lifecycle', () => {
      const mockWs = mockWebSocket as any;
      
      // Register connection
      realtimeNotificationService.registerWebSocketConnection('user1', mockWs);
      expect(realtimeNotificationService.getActiveConnections()).toContain('user1');
      
      // Simulate connection close
      const closeHandler = mockWs.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      
      if (closeHandler) {
        closeHandler();
      }
    });

    it('should handle real-time notification flow end-to-end', async () => {
      // Setup WebSocket connection
      const mockWs = mockWebSocket as any;
      realtimeNotificationService.registerWebSocketConnection('user1', mockWs);
      
      // Setup push subscription
      await realtimeNotificationService.subscribeToPushNotifications({
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/test',
        keys: { p256dh: 'test', auth: 'test' }
      });
      
      // Send notification through all channels
      const notification: RealtimeNotification = {
        id: 'test-end-to-end',
        type: 'deadline_warning',
        source: 'oracle',
        title: 'End-to-End Test',
        message: 'Testing complete notification flow',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high',
        deliveryChannels: ['in_app', 'push', 'websocket'],
        targetUsers: ['user1']
      };
      
      const result = await realtimeNotificationService.sendNotification(notification);
      expect(result).toBe(true);
      
      // Verify WebSocket was called
      expect(mockWs.send).toHaveBeenCalled();
      
      // Verify metrics were updated
      const metrics = realtimeNotificationService.getMetrics();
      expect(metrics.sent).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple WebSocket connections efficiently', () => {
      for (let i = 0; i < 10; i++) {
        const mockWs = { ...mockWebSocket } as any;
        realtimeNotificationService.registerWebSocketConnection(`user${i}`, mockWs);
      }
      
      const activeConnections = realtimeNotificationService.getActiveConnections();
      expect(activeConnections.length).toBe(10);
    });
  });
});
