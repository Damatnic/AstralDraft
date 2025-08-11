/**
 * League Management API Routes
 * REST endpoints for fantasy league operations and management
 */

import express from 'express';
import { runQuery, getRow, getRows } from '../db/index';

const router = express.Router();

/**
 * GET /api/leagues
 * Get all available leagues
 */
router.get('/', async (req, res) => {
    try {
        const { type = 'all', limit = 50 } = req.query;

        let sql = `
            SELECT 
                sl.*,
                u.username as creator_username,
                u.display_name as creator_display_name
            FROM social_leagues sl
            INNER JOIN users u ON sl.creator_id = u.id
            WHERE sl.is_active = 1
        `;
        const params: any[] = [];

        if (type === 'public') {
            sql += ' AND sl.type = "public"';
        } else if (type === 'private') {
            sql += ' AND sl.type = "private"';
        }

        sql += ' ORDER BY sl.created_at DESC LIMIT ?';
        params.push(Number(limit));

        const leagues = await getRows(sql, params);

        res.json({
            success: true,
            data: leagues.map(league => ({
                ...league,
                settings: league.settings ? JSON.parse(league.settings) : {}
            }))
        });
    } catch (error) {
        console.error('Error fetching leagues:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leagues',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/leagues/:id
 * Get detailed information about a specific league
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get league details
        const league = await getRow(`
            SELECT 
                sl.*,
                u.username as creator_username,
                u.display_name as creator_display_name
            FROM social_leagues sl
            INNER JOIN users u ON sl.creator_id = u.id
            WHERE sl.id = ? AND sl.is_active = 1
        `, [id]);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Get league members
        const members = await getRows(`
            SELECT 
                lm.role,
                lm.joined_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url
            FROM league_memberships lm
            INNER JOIN users u ON lm.user_id = u.id
            WHERE lm.league_id = ? AND lm.is_active = 1
            ORDER BY lm.joined_at ASC
        `, [id]);

        // Get recent activity (debates, group predictions)
        const recentDebates = await getRows(`
            SELECT 
                d.id,
                d.topic,
                d.category,
                d.created_at,
                u.username as creator_username
            FROM debates d
            INNER JOIN users u ON d.creator_id = u.id
            WHERE d.league_id = ? AND d.status = 'ACTIVE'
            ORDER BY d.created_at DESC
            LIMIT 5
        `, [id]);

        const recentGroupPredictions = await getRows(`
            SELECT 
                gp.id,
                gp.title,
                gp.prediction_type,
                gp.closes_at,
                gp.status,
                u.username as creator_username
            FROM group_predictions gp
            INNER JOIN users u ON gp.creator_id = u.id
            WHERE gp.league_id = ?
            ORDER BY gp.created_at DESC
            LIMIT 5
        `, [id]);

        res.json({
            success: true,
            data: {
                league: {
                    ...league,
                    settings: league.settings ? JSON.parse(league.settings) : {}
                },
                members,
                recent_activity: {
                    debates: recentDebates,
                    group_predictions: recentGroupPredictions
                }
            }
        });
    } catch (error) {
        console.error('Error fetching league details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league details',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/leagues/:id/members
 * Get all members of a specific league
 */
router.get('/:id/members', async (req, res) => {
    try {
        const { id } = req.params;

        const members = await getRows(`
            SELECT 
                lm.role,
                lm.joined_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(up.id) as total_predictions,
                SUM(up.points_earned) as total_points
            FROM league_memberships lm
            INNER JOIN users u ON lm.user_id = u.id
            LEFT JOIN user_predictions up ON u.id = up.user_id
            WHERE lm.league_id = ? AND lm.is_active = 1
            GROUP BY lm.user_id, lm.role, lm.joined_at, u.id, u.username, u.display_name, u.avatar_url
            ORDER BY total_points DESC, lm.joined_at ASC
        `, [id]);

        res.json({
            success: true,
            data: members.map(member => ({
                ...member,
                total_predictions: member.total_predictions || 0,
                total_points: member.total_points || 0
            }))
        });
    } catch (error) {
        console.error('Error fetching league members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league members',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUT /api/leagues/:id
 * Update league settings (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, settings } = req.body;
        const userId = 1; // Demo user

        // Verify user is league admin
        const membership = await getRow(`
            SELECT * FROM league_memberships 
            WHERE league_id = ? AND user_id = ? AND role = 'admin' AND is_active = 1
        `, [id, userId]);

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to update league'
            });
        }

        // Update league
        await runQuery(`
            UPDATE social_leagues 
            SET name = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, description, JSON.stringify(settings), id]);

        // Get updated league
        const updatedLeague = await getRow(`
            SELECT * FROM social_leagues WHERE id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...updatedLeague,
                settings: JSON.parse(updatedLeague.settings)
            },
            message: 'League updated successfully'
        });
    } catch (error) {
        console.error('Error updating league:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update league',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/leagues/:id/members/:userId
 * Remove a member from the league (admin only)
 */
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const { id: leagueId, userId: targetUserId } = req.params;
        const adminUserId = 1; // Demo user

        // Verify admin permissions
        const adminMembership = await getRow(`
            SELECT * FROM league_memberships 
            WHERE league_id = ? AND user_id = ? AND role = 'admin' AND is_active = 1
        `, [leagueId, adminUserId]);

        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions to remove members'
            });
        }

        // Cannot remove the league creator
        const league = await getRow(`
            SELECT creator_id FROM social_leagues WHERE id = ?
        `, [leagueId]);

        if (league.creator_id === Number(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot remove league creator'
            });
        }

        // Remove member
        await runQuery(`
            UPDATE league_memberships 
            SET is_active = 0 
            WHERE league_id = ? AND user_id = ?
        `, [leagueId, targetUserId]);

        // Update member count
        await runQuery(`
            UPDATE social_leagues 
            SET member_count = member_count - 1 
            WHERE id = ?
        `, [leagueId]);

        res.json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Error removing league member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove league member',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
