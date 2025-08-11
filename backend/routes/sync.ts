/**
 * Data Sync API Routes
 * Handles cloud synchronization for local data persistence
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { runQuery } from '../db/index';

interface SyncOperation {
  operation: 'put' | 'delete';
  data: any;
}

const router = Router();

/**
 * Sync draft sessions
 */
router.post('/draftSessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { operation, data }: SyncOperation = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (operation === 'put') {
      // Validate user owns this draft session
      if (data.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to draft session' });
      }

      // Store draft session in database
      await runQuery(`
        INSERT OR REPLACE INTO draft_sessions (
          id, user_id, league_id, draft_type, status, settings, participants, picks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.id,
        userId,
        data.leagueId || null,
        data.draftType || 'snake',
        data.status || 'pending',
        JSON.stringify(data.settings || {}),
        JSON.stringify(data.participants || []),
        JSON.stringify(data.picks || []),
        data.createdAt || new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      console.log('✅ Synced draft session to database:', data.id);

    } else if (operation === 'delete') {
      // Delete draft session from database
      await runQuery(`DELETE FROM draft_sessions WHERE id = ? AND user_id = ?`, [data.id, userId]);
      console.log('✅ Deleted draft session from database:', data.id, 'for user:', userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Draft session sync error:', error);
    res.status(500).json({ error: 'Failed to sync draft session' });
  }
});

/**
 * Sync analytics data
 */
router.post('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { operation, data }: SyncOperation = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (operation === 'put') {
      if (data.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to analytics data' });
      }

      // Store analytics data in database
      await runQuery(`
        INSERT OR REPLACE INTO user_analytics (
          id, user_id, period_type, period_value, predictions_count, correct_predictions, 
          accuracy_rate, confidence_avg, oracle_beats, points_earned, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.id || `${userId}-${data.periodType}-${data.periodValue}`,
        userId,
        data.periodType || 'weekly',
        data.periodValue || Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        data.predictionsCount || 0,
        data.correctPredictions || 0,
        data.accuracyRate || 0,
        data.confidenceAvg || 0,
        data.oracleBeats || 0,
        data.pointsEarned || 0,
        data.createdAt || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('✅ Synced analytics data to database for user:', userId);

    } else if (operation === 'delete') {
      // Delete analytics data from database
      await runQuery(`DELETE FROM user_analytics WHERE user_id = ? AND id = ?`, [userId, data.id]);
      console.log('✅ Deleted analytics data from database for user:', userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Analytics sync error:', error);
    res.status(500).json({ error: 'Failed to sync analytics data' });
  }
});

/**
 * Sync user preferences
 */
router.post('/userPreferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { operation, data }: SyncOperation = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (operation === 'put') {
      if (data.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to user preferences' });
      }

      // Store user preferences in database
      await runQuery(`
        INSERT OR REPLACE INTO user_preferences (
          user_id, theme, notifications_enabled, email_notifications, push_notifications,
          auto_submit_predictions, confidence_display, analytics_sharing, privacy_level,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        data.theme || 'dark',
        data.notificationsEnabled ? 1 : 0,
        data.emailNotifications ? 1 : 0,
        data.pushNotifications ? 1 : 0,
        data.autoSubmitPredictions ? 1 : 0,
        data.confidenceDisplay || 'percentage',
        data.analyticsSharing ? 1 : 0,
        data.privacyLevel || 'public',
        data.createdAt || new Date().toISOString(),
        new Date().toISOString()
      ]);

      console.log('✅ Synced user preferences to database for user:', userId);

    } else if (operation === 'delete') {
      // Delete user preferences from database
      await runQuery(`DELETE FROM user_preferences WHERE user_id = ?`, [userId]);
      console.log('✅ Deleted user preferences from database for user:', userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('User preferences sync error:', error);
    res.status(500).json({ error: 'Failed to sync user preferences' });
  }
});

/**
 * Sync Oracle predictions
 */
router.post('/oraclePredictions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { operation, data }: SyncOperation = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (operation === 'put') {
      if (data.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to Oracle predictions' });
      }

      console.log('Syncing Oracle prediction:', data);

    } else if (operation === 'delete') {
      console.log('Deleting Oracle prediction:', data.id, 'for user:', userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Oracle predictions sync error:', error);
    res.status(500).json({ error: 'Failed to sync Oracle predictions' });
  }
});

/**
 * Get sync status for user
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get actual counts from database
    const draftSessionsCount = await runQuery(
      `SELECT COUNT(*) as count FROM draft_sessions WHERE user_id = ?`, 
      [userId]
    );
    
    const analyticsCount = await runQuery(
      `SELECT COUNT(*) as count FROM user_analytics WHERE user_id = ?`, 
      [userId]
    );
    
    const userPredictionsCount = await runQuery(
      `SELECT COUNT(*) as count FROM user_predictions WHERE user_id = ?`, 
      [userId]
    );
    
    const preferencesExist = await runQuery(
      `SELECT COUNT(*) as count FROM user_preferences WHERE user_id = ?`, 
      [userId]
    );

    const realStatus = {
      userId,
      counts: {
        draftSessions: draftSessionsCount.rows?.[0]?.count || 0,
        analytics: analyticsCount.rows?.[0]?.count || 0,
        preferences: preferencesExist.rows?.[0]?.count || 0,
        oraclePredictions: userPredictionsCount.rows?.[0]?.count || 0
      },
      lastSyncs: {
        draftSessions: null,
        analytics: null,
        preferences: new Date().toISOString(),
        oraclePredictions: null
      },
      serverTime: new Date().toISOString()
    };

    res.json(realStatus);
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * Bulk sync endpoint for initial data load
 */
router.post('/bulk', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { operations } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const results: any[] = [];

    // Process each operation
    for (const op of operations) {
      try {
        // Validate user ownership
        if (op.data.userId && op.data.userId !== userId) {
          results.push({ error: 'Unauthorized access', operation: op });
          continue;
        }

        // Process operation based on table type
        switch (op.table) {
          case 'draft_sessions':
            if (op.operation === 'put') {
              await runQuery(`
                INSERT OR REPLACE INTO draft_sessions (
                  id, user_id, league_id, draft_type, status, settings, participants, picks, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                op.data.id, userId, op.data.leagueId, op.data.draftType, op.data.status,
                JSON.stringify(op.data.settings), JSON.stringify(op.data.participants),
                JSON.stringify(op.data.picks), op.data.createdAt, new Date().toISOString()
              ]);
            } else if (op.operation === 'delete') {
              await runQuery(`DELETE FROM draft_sessions WHERE id = ? AND user_id = ?`, [op.data.id, userId]);
            }
            break;
          case 'user_preferences':
            if (op.operation === 'put') {
              await runQuery(`
                INSERT OR REPLACE INTO user_preferences (
                  user_id, theme, notifications_enabled, email_notifications, push_notifications,
                  auto_submit_predictions, confidence_display, analytics_sharing, privacy_level,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                userId, op.data.theme, op.data.notificationsEnabled ? 1 : 0,
                op.data.emailNotifications ? 1 : 0, op.data.pushNotifications ? 1 : 0,
                op.data.autoSubmitPredictions ? 1 : 0, op.data.confidenceDisplay,
                op.data.analyticsSharing ? 1 : 0, op.data.privacyLevel,
                op.data.createdAt, new Date().toISOString()
              ]);
            }
            break;
          default:
            results.push({ error: 'Unsupported table', operation: op });
            continue;
        }
        
        console.log('✅ Processed bulk sync operation:', op.table, op.operation, 'for user:', userId);
        
        results.push({ success: true, operation: op });
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : 'Unknown error', operation: op });
      }
    }

    res.json({
      success: true,
      processed: operations.length,
      results
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ error: 'Failed to process bulk sync' });
  }
});

export default router;
