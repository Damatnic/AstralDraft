/**
 * Real-Time Notification System
 * Comprehensive notification system with WebSocket integration, push notifications, and offline support
 */

import { EventEmitter } from 'events';
import { notificationService, OracleNotification } from './notificationService';

// Enhanced notification interfaces
export interface RealtimeNotification extends OracleNotification {
  source: 'oracle' | 'contest' | 'sports_data' | 'admin' | 'social' | 'system';
  targetUsers?: string[];
  deliveryChannels: ('in_app' | 'push' | 'websocket' | 'email')[];
  expiresAt?: string;
  metadata?: {
    gameId?: string;
    contestId?: string;
    teamIds?: string[];
    playerIds?: string[];
    importance?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: RealtimeNotification['type'];
  titleTemplate: string;
  messageTemplate: string;
  defaultPriority: RealtimeNotification['priority'];
  defaultChannels: RealtimeNotification['deliveryChannels'];
  variables: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    event: string;
    conditions: Record<string, any>;
  };
  template: string;
  targetSelection: {
    type: 'all_users' | 'contest_participants' | 'team_followers' | 'custom';
    criteria?: Record<string, any>;
  };
  throttling?: {
    maxPerHour: number;
    maxPerDay: number;
    cooldownMinutes: number;
  };
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

class RealtimeNotificationService extends EventEmitter {
  private static instance: RealtimeNotificationService;
  private readonly websocketConnections = new Map<string, WebSocket>();
  private notificationQueue: RealtimeNotification[] = [];
  private readonly pushSubscriptions = new Map<string, PushSubscription>();
  private readonly notificationTemplates = new Map<string, NotificationTemplate>();
  private readonly notificationRules = new Map<string, NotificationRule>();
  private readonly deliveryMetrics = {
    sent: 0,
    delivered: 0,
    failed: 0,
    byChannel: {
      in_app: { sent: 0, delivered: 0, failed: 0 },
      push: { sent: 0, delivered: 0, failed: 0 },
      websocket: { sent: 0, delivered: 0, failed: 0 },
      email: { sent: 0, delivered: 0, failed: 0 }
    }
  };

  private constructor() {
    super();
    this.initializeNotificationSystem();
    this.setupEventListeners();
    this.startPeriodicTasks();
  }

  static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService();
    }
    return RealtimeNotificationService.instance;
  }

  private initializeNotificationSystem(): void {
    this.loadNotificationTemplates();
    this.loadNotificationRules();
    this.loadPushSubscriptions();
    console.log('🔔 Real-time notification system initialized');
  }

  private setupEventListeners(): void {
    // Listen to Oracle prediction events
    this.on('prediction_deadline_warning', this.handlePredictionDeadlineWarning.bind(this));
    this.on('prediction_result_available', this.handlePredictionResult.bind(this));
    this.on('oracle_accuracy_update', this.handleAccuracyUpdate.bind(this));
    this.on('streak_milestone', this.handleStreakMilestone.bind(this));

    // Listen to contest events
    this.on('contest_started', this.handleContestStarted.bind(this));
    this.on('contest_ended', this.handleContestEnded.bind(this));
    this.on('contest_leaderboard_update', this.handleLeaderboardUpdate.bind(this));
    this.on('prize_awarded', this.handlePrizeAwarded.bind(this));

    // Listen to sports data events
    this.on('game_score_update', this.handleGameScoreUpdate.bind(this));
    this.on('player_injury_update', this.handlePlayerInjuryUpdate.bind(this));
    this.on('breaking_news', this.handleBreakingNews.bind(this));

    // Listen to admin events
    this.on('system_maintenance', this.handleSystemMaintenance.bind(this));
    this.on('admin_announcement', this.handleAdminAnnouncement.bind(this));

    // Listen to social events
    this.on('friend_request', this.handleFriendRequest.bind(this));
    this.on('league_invitation', this.handleLeagueInvitation.bind(this));
  }

  // Core notification delivery methods
  async sendNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      const processedNotification = await this.processNotification(notification);
      const deliveryPromises: Promise<boolean>[] = [];

      // Send through each requested channel
      for (const channel of processedNotification.deliveryChannels) {
        switch (channel) {
          case 'in_app':
            deliveryPromises.push(this.sendInAppNotification(processedNotification));
            break;
          case 'push':
            deliveryPromises.push(this.sendPushNotification(processedNotification));
            break;
          case 'websocket':
            deliveryPromises.push(this.sendWebSocketNotification(processedNotification));
            break;
          case 'email':
            deliveryPromises.push(this.sendEmailNotification(processedNotification));
            break;
        }
      }

      const results = await Promise.allSettled(deliveryPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      this.updateDeliveryMetrics(processedNotification, successCount > 0);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to send notification:', error);
      this.updateDeliveryMetrics(notification, false);
      return false;
    }
  }

  private async sendInAppNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      await notificationService.addNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        predictionId: notification.predictionId,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        data: notification.data
      });

      this.deliveryMetrics.byChannel.in_app.sent++;
      this.deliveryMetrics.byChannel.in_app.delivered++;
      return true;
    } catch (error) {
      this.deliveryMetrics.byChannel.in_app.failed++;
      console.error('In-app notification failed:', error);
      return false;
    }
  }

  private async sendPushNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      const targetUsers = notification.targetUsers || ['all'];
      let successCount = 0;

      for (const userId of targetUsers) {
        const success = await this.sendPushToUser(userId, notification);
        if (success) successCount++;
      }

      this.deliveryMetrics.byChannel.push.sent++;
      if (successCount > 0) {
        this.deliveryMetrics.byChannel.push.delivered++;
        return true;
      } else {
        this.deliveryMetrics.byChannel.push.failed++;
        return false;
      }
    } catch (error) {
      this.deliveryMetrics.byChannel.push.failed++;
      console.error('Push notification failed:', error);
      return false;
    }
  }

  private async sendPushToUser(userId: string, notification: RealtimeNotification): Promise<boolean> {
    if (userId === 'all') {
      return await this.sendPushToAllUsers(notification);
    } else {
      const subscription = this.pushSubscriptions.get(userId);
      if (subscription?.isActive) {
        return await this.sendWebPushToSubscription(subscription, notification);
      }
      return false;
    }
  }

  private async sendPushToAllUsers(notification: RealtimeNotification): Promise<boolean> {
    let successCount = 0;
    for (const [, subscription] of this.pushSubscriptions) {
      if (subscription.isActive) {
        const success = await this.sendWebPushToSubscription(subscription, notification);
        if (success) successCount++;
      }
    }
    return successCount > 0;
  }

  private async sendWebSocketNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      const message = {
        type: 'NOTIFICATION',
        notification: notification,
        timestamp: Date.now()
      };

      let sentCount = 0;
      
      // Send to all connected WebSocket clients
      for (const [userId, ws] of this.websocketConnections) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            if (!notification.targetUsers || notification.targetUsers.includes(userId) || notification.targetUsers.includes('all')) {
              ws.send(JSON.stringify(message));
              sentCount++;
            }
          } catch (error) {
            console.error(`Failed to send WebSocket notification to user ${userId}:`, error);
            this.websocketConnections.delete(userId);
          }
        } else {
          this.websocketConnections.delete(userId);
        }
      }

      this.deliveryMetrics.byChannel.websocket.sent++;
      if (sentCount > 0) {
        this.deliveryMetrics.byChannel.websocket.delivered++;
        return true;
      } else {
        this.deliveryMetrics.byChannel.websocket.failed++;
        return false;
      }
    } catch (error) {
      this.deliveryMetrics.byChannel.websocket.failed++;
      console.error('WebSocket notification failed:', error);
      return false;
    }
  }

  private async sendEmailNotification(notification: RealtimeNotification): Promise<boolean> {
    try {
      // Email notification implementation would go here
      // For now, just log and mark as sent
      console.log('Email notification (simulated):', notification.title);
      
      this.deliveryMetrics.byChannel.email.sent++;
      this.deliveryMetrics.byChannel.email.delivered++;
      return true;
    } catch (error) {
      this.deliveryMetrics.byChannel.email.failed++;
      console.error('Email notification failed:', error);
      return false;
    }
  }

  // WebSocket connection management
  registerWebSocketConnection(userId: string, ws: WebSocket): void {
    this.websocketConnections.set(userId, ws);
    
    ws.addEventListener('close', () => {
      this.websocketConnections.delete(userId);
    });

    ws.addEventListener('error', () => {
      this.websocketConnections.delete(userId);
    });

    console.log(`WebSocket registered for user ${userId}`);
  }

  // Push notification subscription management
  async subscribeToPushNotifications(subscription: Omit<PushSubscription, 'createdAt' | 'isActive'>): Promise<boolean> {
    try {
      const pushSubscription: PushSubscription = {
        ...subscription,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      this.pushSubscriptions.set(subscription.userId, pushSubscription);
      await this.savePushSubscriptions();
      
      console.log(`Push subscription registered for user ${subscription.userId}`);
      return true;
    } catch (error) {
      console.error('Failed to register push subscription:', error);
      return false;
    }
  }

  async unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
    try {
      const subscription = this.pushSubscriptions.get(userId);
      if (subscription) {
        subscription.isActive = false;
        await this.savePushSubscriptions();
        console.log(`Push subscription disabled for user ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Event handlers for different notification types
  private async handlePredictionDeadlineWarning(data: { predictionId: string; question: string; minutesRemaining: number; userId?: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `deadline_${data.predictionId}_${Date.now()}`,
      type: 'deadline_warning',
      source: 'oracle',
      title: '⏰ Prediction Deadline Approaching',
      message: `"${data.question}" expires in ${data.minutesRemaining} minutes`,
      predictionId: data.predictionId,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: data.minutesRemaining <= 15 ? 'high' : 'medium',
      actionUrl: `/oracle?prediction=${data.predictionId}`,
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: data.userId ? [data.userId] : ['all'],
      expiresAt: new Date(Date.now() + data.minutesRemaining * 60 * 1000).toISOString()
    };

    await this.sendNotification(notification);
  }

  private async handlePredictionResult(data: { predictionId: string; question: string; isCorrect: boolean; pointsEarned: number; userId?: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `result_${data.predictionId}_${Date.now()}`,
      type: 'result_announced',
      source: 'oracle',
      title: data.isCorrect ? '🎉 Correct Prediction!' : '📊 Prediction Result',
      message: `"${data.question}" - You ${data.isCorrect ? 'were correct' : 'missed this one'}. ${data.pointsEarned > 0 ? '+' + data.pointsEarned + ' points' : 'No points earned'}`,
      predictionId: data.predictionId,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: data.isCorrect ? 'high' : 'medium',
      actionUrl: '/oracle/analytics',
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: data.userId ? [data.userId] : ['all'],
      data: { isCorrect: data.isCorrect, pointsEarned: data.pointsEarned }
    };

    await this.sendNotification(notification);
  }

  private async handleAccuracyUpdate(data: { newAccuracy: number; previousAccuracy: number; userId?: string }): Promise<void> {
    const isImprovement = data.newAccuracy > data.previousAccuracy;
    const change = Math.abs(data.newAccuracy - data.previousAccuracy);

    if (change >= 5) { // Only notify for significant changes
      const notification: RealtimeNotification = {
        id: `accuracy_${Date.now()}`,
        type: 'accuracy_update',
        source: 'oracle',
        title: isImprovement ? '📈 Accuracy Improved!' : '📉 Accuracy Update',
        message: `Your prediction accuracy ${isImprovement ? 'increased' : 'decreased'} to ${data.newAccuracy.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: isImprovement ? 'medium' : 'low',
        actionUrl: '/oracle/analytics',
        deliveryChannels: ['in_app', 'websocket'],
        targetUsers: data.userId ? [data.userId] : ['all'],
        data: { newAccuracy: data.newAccuracy, previousAccuracy: data.previousAccuracy, change }
      };

      await this.sendNotification(notification);
    }
  }

  private async handleStreakMilestone(data: { streakCount: number; userId?: string }): Promise<void> {
    const milestones = [3, 5, 10, 15, 20, 25];
    if (milestones.includes(data.streakCount)) {
      const notification: RealtimeNotification = {
        id: `streak_${data.streakCount}_${Date.now()}`,
        type: 'streak_milestone',
        source: 'oracle',
        title: '🔥 Streak Milestone!',
        message: `Amazing! You've achieved a ${data.streakCount}-prediction winning streak!`,
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high',
        actionUrl: '/oracle/analytics',
        deliveryChannels: ['in_app', 'push', 'websocket'],
        targetUsers: data.userId ? [data.userId] : ['all'],
        data: { streakCount: data.streakCount }
      };

      await this.sendNotification(notification);
    }
  }

  private async handleContestStarted(data: { contestId: string; contestName: string; participants: string[] }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `contest_start_${data.contestId}`,
      type: 'contest_started' as any,
      source: 'contest',
      title: '🏆 Contest Started!',
      message: `"${data.contestName}" has begun. Good luck!`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actionUrl: `/contests/${data.contestId}`,
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: data.participants,
      metadata: { contestId: data.contestId, importance: 'medium' }
    };

    await this.sendNotification(notification);
  }

  private async handleContestEnded(data: { contestId: string; contestName: string; winner: string; participants: string[] }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `contest_end_${data.contestId}`,
      type: 'contest_ended' as any,
      source: 'contest',
      title: '🏁 Contest Finished!',
      message: `"${data.contestName}" has ended. Winner: ${data.winner}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actionUrl: `/contests/${data.contestId}/results`,
      deliveryChannels: ['in_app', 'websocket'],
      targetUsers: data.participants,
      metadata: { contestId: data.contestId, importance: 'medium' }
    };

    await this.sendNotification(notification);
  }

  private async handleLeaderboardUpdate(data: { contestId: string; contestName: string; topPlayers: { name: string; score: number }[]; participants: string[] }): Promise<void> {
    const topThree = data.topPlayers.slice(0, 3);
    const leaderInfo = topThree.map((p, i) => `${i + 1}. ${p.name} (${p.score})`).join(', ');
    
    const notification: RealtimeNotification = {
      id: `leaderboard_${data.contestId}_${Date.now()}`,
      type: 'leaderboard_update' as any,
      source: 'contest',
      title: '📊 Leaderboard Update',
      message: `"${data.contestName}" leaders: ${leaderInfo}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'low',
      actionUrl: `/contests/${data.contestId}/leaderboard`,
      deliveryChannels: ['websocket'],
      targetUsers: data.participants,
      metadata: { contestId: data.contestId, importance: 'low' }
    };

    await this.sendNotification(notification);
  }

  private async handlePrizeAwarded(data: { contestId: string; contestName: string; winner: string; prizeAmount: number; userId: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `prize_${data.contestId}_${data.userId}`,
      type: 'prize_awarded' as any,
      source: 'contest',
      title: '🎉 Prize Awarded!',
      message: `Congratulations! You won $${data.prizeAmount} in "${data.contestName}"`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'high',
      actionUrl: `/contests/${data.contestId}/prize`,
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: [data.userId],
      metadata: { contestId: data.contestId, importance: 'high' }
    };

    await this.sendNotification(notification);
  }

  private async handleGameScoreUpdate(data: { gameId: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `score_update_${data.gameId}_${Date.now()}`,
      type: 'score_update' as any,
      source: 'sports_data',
      title: '🏈 Live Score Update',
      message: `${data.awayTeam} ${data.awayScore} - ${data.homeScore} ${data.homeTeam}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'low',
      actionUrl: `/games/${data.gameId}`,
      deliveryChannels: ['websocket'],
      targetUsers: ['all'],
      metadata: { gameId: data.gameId, importance: 'low' }
    };

    await this.sendNotification(notification);
  }

  private async handlePlayerInjuryUpdate(data: { playerId: string; playerName: string; team: string; injuryStatus: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `injury_${data.playerId}_${Date.now()}`,
      type: 'injury_update' as any,
      source: 'sports_data',
      title: '🚨 Player Injury Update',
      message: `${data.playerName} (${data.team}) - ${data.injuryStatus}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'high',
      actionUrl: `/players/${data.playerId}`,
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: ['all'],
      metadata: { playerIds: [data.playerId], teamIds: [data.team], importance: 'high' }
    };

    await this.sendNotification(notification);
  }

  private async handleBreakingNews(data: { title: string; content: string; importance: 'low' | 'medium' | 'high' | 'critical' }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `news_${Date.now()}`,
      type: 'breaking_news' as any,
      source: 'sports_data',
      title: `📰 ${data.title}`,
      message: data.content,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: data.importance === 'critical' ? 'high' : data.importance as any,
      deliveryChannels: data.importance === 'critical' ? ['in_app', 'push', 'websocket'] : ['in_app', 'websocket'],
      targetUsers: ['all'],
      metadata: { importance: data.importance }
    };

    await this.sendNotification(notification);
  }

  private async handleSystemMaintenance(data: { title: string; message: string; maintenanceWindow: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `maintenance_${Date.now()}`,
      type: 'system_maintenance' as any,
      source: 'admin',
      title: `🔧 ${data.title}`,
      message: `${data.message} Maintenance window: ${data.maintenanceWindow}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'high',
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: ['all'],
      metadata: { importance: 'critical' }
    };

    await this.sendNotification(notification);
  }

  private async handleAdminAnnouncement(data: { title: string; message: string; priority: 'low' | 'medium' | 'high' }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `admin_announcement_${Date.now()}`,
      type: 'admin_announcement' as any,
      source: 'admin',
      title: `📢 ${data.title}`,
      message: data.message,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: data.priority,
      deliveryChannels: ['in_app', 'websocket'],
      targetUsers: ['all'],
      metadata: { importance: data.priority }
    };

    await this.sendNotification(notification);
  }

  private async handleFriendRequest(data: { fromUserId: string; fromUserName: string; toUserId: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `friend_request_${data.fromUserId}_${Date.now()}`,
      type: 'friend_request' as any,
      source: 'social',
      title: '👥 Friend Request',
      message: `${data.fromUserName} sent you a friend request`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actionUrl: '/social/friends',
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: [data.toUserId],
      metadata: { importance: 'medium' }
    };

    await this.sendNotification(notification);
  }

  private async handleLeagueInvitation(data: { fromUserId: string; fromUserName: string; leagueName: string; toUserId: string }): Promise<void> {
    const notification: RealtimeNotification = {
      id: `league_invite_${data.fromUserId}_${Date.now()}`,
      type: 'league_invitation' as any,
      source: 'social',
      title: '🏆 League Invitation',
      message: `${data.fromUserName} invited you to join "${data.leagueName}"`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'medium',
      actionUrl: '/leagues/invitations',
      deliveryChannels: ['in_app', 'push', 'websocket'],
      targetUsers: [data.toUserId],
      metadata: { importance: 'medium' }
    };

    await this.sendNotification(notification);
  }

  // Utility methods
  private async processNotification(notification: RealtimeNotification): Promise<RealtimeNotification> {
    // Apply any templates or rules processing here
    return notification;
  }

  private async sendWebPushToSubscription(subscription: PushSubscription, notification: RealtimeNotification): Promise<boolean> {
    try {
      // Web Push implementation would go here
      // For now, just simulate success
      console.log(`Sending push notification to ${subscription.userId}:`, notification.title);
      subscription.lastUsed = new Date().toISOString();
      return true;
    } catch (error) {
      console.error('Failed to send web push:', error);
      return false;
    }
  }

  private updateDeliveryMetrics(notification: RealtimeNotification, success: boolean): void {
    this.deliveryMetrics.sent++;
    if (success) {
      this.deliveryMetrics.delivered++;
    } else {
      this.deliveryMetrics.failed++;
    }
  }

  private startPeriodicTasks(): void {
    // Clean up expired notifications every 5 minutes
    setInterval(() => {
      const now = Date.now();
      this.notificationQueue = this.notificationQueue.filter(n => 
        !n.expiresAt || new Date(n.expiresAt).getTime() > now
      );
    }, 5 * 60 * 1000);

    // Check WebSocket connections every minute
    setInterval(() => {
      for (const [userId, ws] of this.websocketConnections) {
        if (ws.readyState !== WebSocket.OPEN) {
          this.websocketConnections.delete(userId);
        }
      }
    }, 60 * 1000);
  }

  // Persistence methods
  private loadNotificationTemplates(): void {
    // Load from storage - simplified for now
    console.log('📋 Notification templates loaded');
  }

  private loadNotificationRules(): void {
    // Load from storage - simplified for now
    console.log('📏 Notification rules loaded');
  }

  private loadPushSubscriptions(): void {
    // Load from storage - simplified for now
    const stored = localStorage.getItem('push_subscriptions');
    if (stored) {
      try {
        const subscriptions = JSON.parse(stored);
        for (const [userId, subscription] of Object.entries(subscriptions)) {
          this.pushSubscriptions.set(userId, subscription as PushSubscription);
        }
      } catch (error) {
        console.error('Failed to load push subscriptions:', error);
      }
    }
  }

  private async savePushSubscriptions(): Promise<void> {
    try {
      const subscriptions = Object.fromEntries(this.pushSubscriptions);
      localStorage.setItem('push_subscriptions', JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Failed to save push subscriptions:', error);
    }
  }

  // Public API methods
  getMetrics() {
    return {
      ...this.deliveryMetrics,
      activeConnections: this.websocketConnections.size,
      pushSubscriptions: this.pushSubscriptions.size,
      queueSize: this.notificationQueue.length
    };
  }

  getActiveConnections(): string[] {
    return Array.from(this.websocketConnections.keys());
  }

  async testNotification(userId?: string): Promise<boolean> {
    const testNotification: RealtimeNotification = {
      id: `test_${Date.now()}`,
      type: 'result_announced',
      source: 'system',
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system is working',
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'low',
      deliveryChannels: ['in_app', 'websocket'],
      targetUsers: userId ? [userId] : ['all']
    };

    return await this.sendNotification(testNotification);
  }
}

// Export singleton instance
export const realtimeNotificationService = RealtimeNotificationService.getInstance();
export default realtimeNotificationService;
