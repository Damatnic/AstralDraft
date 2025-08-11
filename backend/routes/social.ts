/**
 * Social Features API Routes
 * REST endpoints for leagues, group predictions, and debates
 */

import express from 'express';
import { runQuery, getRow, getRows } from '../db/index';

const router = express.Router();

/**
 * GET /api/social/leagues
 * Get user's leagues or all public leagues
 */
router.get('/leagues', async (req, res) => {
    try {
        const { userId = 1, type = 'all' } = req.query;

        let sql = `
            SELECT 
                sl.*,
                u.username as creator_username,
                lm.role as user_role,
                lm.joined_at as user_joined_at
            FROM social_leagues sl
            INNER JOIN users u ON sl.creator_id = u.id
            LEFT JOIN league_memberships lm ON sl.id = lm.league_id AND lm.user_id = ? AND lm.is_active = 1
            WHERE sl.is_active = 1
        `;
        const params = [Number(userId)];

        if (type === 'joined') {
            sql += ' AND lm.user_id IS NOT NULL';
        } else if (type === 'public') {
            sql += ' AND sl.type = "public"';
        }

        sql += ' ORDER BY sl.created_at DESC';

        const leagues = await getRows(sql, params);

        res.json({
            success: true,
            data: leagues.map(league => ({
                ...league,
                settings: league.settings ? JSON.parse(league.settings) : {},
                is_member: !!league.user_role
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
 * POST /api/social/leagues
 * Create a new social league
 */
router.post('/leagues', async (req, res) => {
    try {
        const { name, description, type = 'public', maxMembers = 50 } = req.body;
        const creatorId = 1; // Demo user

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'League name is required'
            });
        }

        // Generate unique league ID and join code
        const leagueId = `league_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Create league
        await runQuery(`
            INSERT INTO social_leagues (
                id, name, description, type, join_code, creator_id, max_members, settings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            leagueId,
            name,
            description || null,
            type,
            joinCode,
            creatorId,
            maxMembers,
            JSON.stringify({ allow_group_predictions: true, allow_debates: true })
        ]);

        // Add creator as admin member
        await runQuery(`
            INSERT INTO league_memberships (league_id, user_id, role)
            VALUES (?, ?, ?)
        `, [leagueId, creatorId, 'admin']);

        const createdLeague = await getRow(`
            SELECT * FROM social_leagues WHERE id = ?
        `, [leagueId]);

        res.status(201).json({
            success: true,
            data: {
                ...createdLeague,
                settings: JSON.parse(createdLeague.settings),
                is_member: true,
                user_role: 'admin'
            },
            message: 'League created successfully'
        });
    } catch (error) {
        console.error('Error creating league:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create league',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/social/leagues/:id/join
 * Join a league using join code or direct invitation
 */
router.post('/leagues/:id/join', async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { joinCode } = req.body;
        const userId = 1; // Demo user

        // Validate league exists and join code if provided
        let league;
        if (joinCode) {
            league = await getRow(`
                SELECT * FROM social_leagues 
                WHERE id = ? AND join_code = ? AND is_active = 1
            `, [leagueId, joinCode]);
        } else {
            league = await getRow(`
                SELECT * FROM social_leagues 
                WHERE id = ? AND type = 'public' AND is_active = 1
            `, [leagueId]);
        }

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found or invalid join code'
            });
        }

        // Check if already a member
        const existingMembership = await getRow(`
            SELECT * FROM league_memberships 
            WHERE league_id = ? AND user_id = ? AND is_active = 1
        `, [leagueId, userId]);

        if (existingMembership) {
            return res.status(400).json({
                success: false,
                error: 'Already a member of this league'
            });
        }

        // Check member limit
        if (league.member_count >= league.max_members) {
            return res.status(400).json({
                success: false,
                error: 'League is at maximum capacity'
            });
        }

        // Add member
        await runQuery(`
            INSERT INTO league_memberships (league_id, user_id, role)
            VALUES (?, ?, ?)
        `, [leagueId, userId, 'member']);

        // Update member count
        await runQuery(`
            UPDATE social_leagues 
            SET member_count = member_count + 1 
            WHERE id = ?
        `, [leagueId]);

        res.json({
            success: true,
            message: 'Successfully joined league'
        });
    } catch (error) {
        console.error('Error joining league:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join league',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/social/leagues/:id/debates
 * Get debates for a specific league
 */
router.get('/leagues/:id/debates', async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { status = 'all', limit = 20 } = req.query;

        let sql = `
            SELECT 
                d.*,
                u.username as creator_username,
                u.display_name as creator_display_name
            FROM debates d
            INNER JOIN users u ON d.creator_id = u.id
            WHERE d.league_id = ?
        `;
        const params: any[] = [leagueId];

        if (status !== 'all') {
            sql += ' AND d.status = ?';
            params.push(String(status));
        }

        sql += ' ORDER BY d.created_at DESC LIMIT ?';
        params.push(Number(limit));

        const debates = await getRows(sql, params);

        res.json({
            success: true,
            data: debates
        });
    } catch (error) {
        console.error('Error fetching league debates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league debates',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/social/leagues/:id/debates
 * Create a new debate in a league
 */
router.post('/leagues/:id/debates', async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { topic, category = 'general', description } = req.body;
        const creatorId = 1; // Demo user

        if (!topic) {
            return res.status(400).json({
                success: false,
                error: 'Debate topic is required'
            });
        }

        // Verify user is league member
        const membership = await getRow(`
            SELECT * FROM league_memberships 
            WHERE league_id = ? AND user_id = ? AND is_active = 1
        `, [leagueId, creatorId]);

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: 'Must be a league member to create debates'
            });
        }

        const debateId = `debate_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        await runQuery(`
            INSERT INTO debates (
                id, league_id, creator_id, topic, category, description
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [debateId, leagueId, creatorId, topic, category, description || null]);

        const createdDebate = await getRow(`
            SELECT 
                d.*,
                u.username as creator_username,
                u.display_name as creator_display_name
            FROM debates d
            INNER JOIN users u ON d.creator_id = u.id
            WHERE d.id = ?
        `, [debateId]);

        res.status(201).json({
            success: true,
            data: createdDebate,
            message: 'Debate created successfully'
        });
    } catch (error) {
        console.error('Error creating debate:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create debate',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/social/debates/:id/posts
 * Get posts for a specific debate
 */
router.get('/debates/:id/posts', async (req, res) => {
    try {
        const { id: debateId } = req.params;

        const posts = await getRows(`
            SELECT 
                dp.*,
                u.username,
                u.display_name
            FROM debate_posts dp
            INNER JOIN users u ON dp.user_id = u.id
            WHERE dp.debate_id = ?
            ORDER BY dp.is_pinned DESC, dp.created_at ASC
        `, [debateId]);

        res.json({
            success: true,
            data: posts.map(post => ({
                ...post,
                reactions: JSON.parse(post.reactions),
                is_pinned: Boolean(post.is_pinned)
            }))
        });
    } catch (error) {
        console.error('Error fetching debate posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch debate posts',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/social/debates/:id/posts
 * Create a new post in a debate
 */
router.post('/debates/:id/posts', async (req, res) => {
    try {
        const { id: debateId } = req.params;
        const { side, content } = req.body;
        const userId = 1; // Demo user

        if (!side || !content) {
            return res.status(400).json({
                success: false,
                error: 'Side and content are required'
            });
        }

        if (!['A', 'B', 'NEUTRAL'].includes(side)) {
            return res.status(400).json({
                success: false,
                error: 'Side must be A, B, or NEUTRAL'
            });
        }

        const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        await runQuery(`
            INSERT INTO debate_posts (
                id, debate_id, user_id, side, content
            ) VALUES (?, ?, ?, ?, ?)
        `, [postId, debateId, userId, side, content]);

        // Update debate participant count
        await runQuery(`
            UPDATE debates 
            SET total_participants = (
                SELECT COUNT(DISTINCT user_id) 
                FROM debate_posts 
                WHERE debate_id = ?
            )
            WHERE id = ?
        `, [debateId, debateId]);

        const createdPost = await getRow(`
            SELECT 
                dp.*,
                u.username,
                u.display_name
            FROM debate_posts dp
            INNER JOIN users u ON dp.user_id = u.id
            WHERE dp.id = ?
        `, [postId]);

        res.status(201).json({
            success: true,
            data: {
                ...createdPost,
                reactions: JSON.parse(createdPost.reactions),
                is_pinned: Boolean(createdPost.is_pinned)
            },
            message: 'Post created successfully'
        });
    } catch (error) {
        console.error('Error creating debate post:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create debate post',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/social/debates/:id/vote
 * Vote in a debate
 */
router.post('/debates/:id/vote', async (req, res) => {
    try {
        const { id: debateId } = req.params;
        const { side, reasoning } = req.body;
        const userId = 1; // Demo user

        if (!side || !['A', 'B'].includes(side)) {
            return res.status(400).json({
                success: false,
                error: 'Side must be A or B'
            });
        }

        // Check if user already voted
        const existingVote = await getRow(`
            SELECT * FROM debate_votes 
            WHERE debate_id = ? AND user_id = ?
        `, [debateId, userId]);

        if (existingVote) {
            // Update existing vote
            await runQuery(`
                UPDATE debate_votes 
                SET side = ?, reasoning = ?, voted_at = CURRENT_TIMESTAMP
                WHERE debate_id = ? AND user_id = ?
            `, [side, reasoning || null, debateId, userId]);
        } else {
            // Create new vote
            await runQuery(`
                INSERT INTO debate_votes (debate_id, user_id, side, reasoning)
                VALUES (?, ?, ?, ?)
            `, [debateId, userId, side, reasoning || null]);
        }

        // Update vote counts
        const voteCountsA = await getRow(`
            SELECT COUNT(*) as count FROM debate_votes 
            WHERE debate_id = ? AND side = 'A'
        `, [debateId]);
        
        const voteCountsB = await getRow(`
            SELECT COUNT(*) as count FROM debate_votes 
            WHERE debate_id = ? AND side = 'B'
        `, [debateId]);

        await runQuery(`
            UPDATE debates 
            SET side_a_votes = ?, side_b_votes = ?
            WHERE id = ?
        `, [voteCountsA.count, voteCountsB.count, debateId]);

        res.json({
            success: true,
            message: 'Vote recorded successfully',
            data: {
                side,
                side_a_votes: voteCountsA.count,
                side_b_votes: voteCountsB.count
            }
        });
    } catch (error) {
        console.error('Error recording debate vote:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record debate vote',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
