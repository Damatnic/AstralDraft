/**
 * Real-Time Notification Integration Hook
 * Connects real-time notification service with the existing notification system
 */

import { useEffect, useCallback } from 'react';
import { realtimeNotificationService, RealtimeNotification } from '../services/realtimeNotificationService';
import { useNotifications } from '../contexts/NotificationContext';

export interface RealtimeNotificationHookOptions {
  enableToasts?: boolean;
  enableSounds?: boolean;
  highPriorityOnly?: boolean;
  maxToastDuration?: number;
}

export const useRealtimeNotifications = (options: RealtimeNotificationHookOptions = {}) => {
  const {
    enableToasts = true,
    enableSounds = true,
    highPriorityOnly = false,
    maxToastDuration = 5000
  } = options;

  const { refreshNotifications, preferences } = useNotifications();

  // Convert real-time notification to display format
  const convertToDisplayFormat = useCallback((notification: RealtimeNotification) => {
    const getCategory = (source: string) => {
      if (source === 'oracle') return 'oracle';
      if (source === 'contest' || source === 'social') return 'league';
      return 'draft';
    };

    return {
      id: notification.id,
      type: notification.type.toUpperCase(),
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      isRead: notification.isRead,
      priority: notification.priority,
      category: getCategory(notification.source),
      actionUrl: notification.actionUrl,
      data: notification.data
    };
  }, []);

  // Show toast notification
  const showToast = useCallback((notification: RealtimeNotification) => {
    if (!enableToasts) return;

    // Check if we should show this notification based on settings
    if (highPriorityOnly && notification.priority !== 'high') return;

    // Create a toast notification event
    const toastEvent = new CustomEvent('showNotificationToast', {
      detail: {
        notification: convertToDisplayFormat(notification),
        duration: maxToastDuration
      }
    });
    
    window.dispatchEvent(toastEvent);
  }, [enableToasts, highPriorityOnly, maxToastDuration, convertToDisplayFormat]);

  // Play notification sound
  const playNotificationSound = useCallback((notification: RealtimeNotification) => {
    if (!enableSounds || !preferences?.enableSoundNotifications) return;

    // Different sounds for different priorities
    let soundFile = '/sounds/notification.mp3';
    if (notification.priority === 'high') {
      soundFile = '/sounds/high-priority.mp3';
    } else if (notification.source === 'oracle') {
      soundFile = '/sounds/oracle.mp3';
    }

    const audio = new Audio(soundFile);
    audio.volume = 0.3; // Keep it subtle
    audio.play().catch(() => {
      // Fallback to default notification sound
      const fallbackAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
      fallbackAudio.play().catch(() => {}); // Ignore if this fails too
    });
  }, [enableSounds, preferences]);

  // Handle incoming real-time notifications
  const handleRealtimeNotification = useCallback((notification: RealtimeNotification) => {
    // Always refresh the notification list
    refreshNotifications();

    // Show toast for important notifications
    const shouldShowToast = 
      notification.priority === 'high' ||
      notification.type === 'deadline_warning' ||
      notification.type === 'result_announced' ||
      notification.type === 'streak_milestone' ||
      notification.source === 'admin';

    if (shouldShowToast) {
      showToast(notification);
    }

    // Play sound for all notifications (filtered by preferences)
    playNotificationSound(notification);

    // Log for debugging
    console.log('Real-time notification received:', notification.title);
  }, [refreshNotifications, showToast, playNotificationSound]);

  // Setup real-time notification listener
  useEffect(() => {
    realtimeNotificationService.on('notification_received', handleRealtimeNotification);
    
    return () => {
      realtimeNotificationService.off('notification_received', handleRealtimeNotification);
    };
  }, [handleRealtimeNotification]);

  // API methods for triggering notifications programmatically
  const triggerPredictionDeadlineWarning = useCallback((data: {
    predictionId: string;
    question: string;
    minutesRemaining: number;
    userId?: string;
  }) => {
    realtimeNotificationService.emit('prediction_deadline_warning', data);
  }, []);

  const triggerPredictionResult = useCallback((data: {
    predictionId: string;
    question: string;
    isCorrect: boolean;
    pointsEarned: number;
    userId?: string;
  }) => {
    realtimeNotificationService.emit('prediction_result_available', data);
  }, []);

  const triggerAccuracyUpdate = useCallback((data: {
    newAccuracy: number;
    previousAccuracy: number;
    userId?: string;
  }) => {
    realtimeNotificationService.emit('oracle_accuracy_update', data);
  }, []);

  const triggerStreakMilestone = useCallback((data: {
    streakCount: number;
    userId?: string;
  }) => {
    realtimeNotificationService.emit('streak_milestone', data);
  }, []);

  const triggerContestUpdate = useCallback((data: {
    contestId: string;
    contestName: string;
    participants: string[];
  }) => {
    realtimeNotificationService.emit('contest_started', data);
  }, []);

  const triggerGameScoreUpdate = useCallback((data: {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  }) => {
    realtimeNotificationService.emit('game_score_update', data);
  }, []);

  const triggerPlayerInjuryUpdate = useCallback((data: {
    playerId: string;
    playerName: string;
    team: string;
    injuryStatus: string;
  }) => {
    realtimeNotificationService.emit('player_injury_update', data);
  }, []);

  const triggerAdminAnnouncement = useCallback((data: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }) => {
    realtimeNotificationService.emit('admin_announcement', data);
  }, []);

  const testNotification = useCallback(() => {
    realtimeNotificationService.testNotification();
  }, []);

  // Get real-time service metrics
  const getMetrics = useCallback(() => {
    return realtimeNotificationService.getMetrics();
  }, []);

  const getActiveConnections = useCallback(() => {
    return realtimeNotificationService.getActiveConnections();
  }, []);

  return {
    // Trigger methods for different notification types
    triggerPredictionDeadlineWarning,
    triggerPredictionResult,
    triggerAccuracyUpdate,
    triggerStreakMilestone,
    triggerContestUpdate,
    triggerGameScoreUpdate,
    triggerPlayerInjuryUpdate,
    triggerAdminAnnouncement,
    testNotification,
    
    // Utility methods
    getMetrics,
    getActiveConnections,
    
    // Service reference for advanced usage
    realtimeService: realtimeNotificationService
  };
};

// Export types for external use
export type { RealtimeNotification } from '../services/realtimeNotificationService';
