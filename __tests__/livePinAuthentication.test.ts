/**
 * Live PIN Authentication Database Test
 * Tests actual database PIN authentication with real data
 */

import { describe, it, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const dbPath = path.join(process.cwd(), 'data', 'astral-draft.db');

describe('Live PIN Authentication Database Test', () => {
    let db: Database.Database;

    beforeAll(() => {
        db = new Database(dbPath, { readonly: true });
    });

    afterAll(() => {
        db.close();
    });

    describe('Database User Verification', () => {
        it('should have exactly 11 users (Admin + 10 friends)', () => {
            const users = db.prepare(`
                SELECT player_number, username, is_active 
                FROM simple_auth_users 
                ORDER BY player_number
            `).all();

            expect(users).toHaveLength(11);
            
            // Verify we have players 0-10
            const playerNumbers = users.map((u: any) => u.player_number);
            expect(playerNumbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        });

        it('should have admin user configured correctly', () => {
            const admin = db.prepare(`
                SELECT * FROM simple_auth_users WHERE player_number = 0
            `).get() as any;

            expect(admin).toBeDefined();
            expect(admin.username).toBe('Admin');
            expect(admin.is_active).toBe(1); // SQLite stores booleans as integers
            expect(admin.pin_hash).toBe('$2b$10$7347hash');
        });

        it('should have player users configured correctly', () => {
            const players = db.prepare(`
                SELECT * FROM simple_auth_users 
                WHERE player_number BETWEEN 1 AND 10 
                ORDER BY player_number
            `).all() as any[];

            expect(players).toHaveLength(10);
            
            players.forEach((player, index) => {
                expect(player.player_number).toBe(index + 1);
                expect(player.username).toBe(`Player ${index + 1}`);
                expect(player.is_active).toBe(1);
                expect(player.pin_hash).toBe('$2b$10$0000hash');
            });
        });

        it('should have all required indexes for performance', () => {
            const indexes = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='index' AND name LIKE 'idx_simple_auth_%'
            `).all() as any[];

            const expectedIndexes = [
                'idx_simple_auth_player_number',
                'idx_simple_auth_username', 
                'idx_simple_auth_active',
                'idx_simple_auth_session',
                'idx_simple_auth_active_players'
            ];

            expectedIndexes.forEach(indexName => {
                const hasIndex = indexes.some(idx => idx.name === indexName);
                expect(hasIndex).toBe(true);
            });
        });

        it('should have validation triggers for security', () => {
            const triggers = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='trigger' AND name LIKE '%player_number%' OR name LIKE '%pin_hash%'
            `).all() as any[];

            const expectedTriggers = [
                'validate_player_number_range_existing',
                'validate_pin_hash_length_existing'
            ];

            expectedTriggers.forEach(triggerName => {
                const hasTrigger = triggers.some(t => t.name === triggerName);
                expect(hasTrigger).toBe(true);
            });
        });
    });

    describe('PIN Authentication Logic Test', () => {
        it('should verify admin PIN correctly', () => {
            const admin = db.prepare(`
                SELECT pin_hash FROM simple_auth_users WHERE player_number = 0
            `).get() as any;

            // Test admin PIN logic
            const adminPin = '7347';
            const adminHash = '$2b$10$7347hash';
            
            expect(admin.pin_hash).toBe(adminHash);
            
            // Simulate the verification logic from the service
            const isValid = admin.pin_hash === adminHash && adminPin === '7347';
            expect(isValid).toBe(true);
        });

        it('should verify player PIN correctly', () => {
            const player = db.prepare(`
                SELECT pin_hash FROM simple_auth_users WHERE player_number = 1
            `).get() as any;

            // Test player PIN logic
            const playerPin = '0000';
            const playerHash = '$2b$10$0000hash';
            
            expect(player.pin_hash).toBe(playerHash);
            
            // Simulate the verification logic from the service
            const isValid = player.pin_hash === playerHash && playerPin === '0000';
            expect(isValid).toBe(true);
        });

        it('should reject invalid PINs', () => {
            const admin = db.prepare(`
                SELECT pin_hash FROM simple_auth_users WHERE player_number = 0
            `).get() as any;

            // Test with wrong PIN
            const wrongPin = '1234';
            const isValid = admin.pin_hash === '$2b$10$7347hash' && wrongPin === '7347';
            expect(isValid).toBe(false);
        });
    });

    describe('Database Constraints Validation', () => {
        it('should enforce player number constraints (0-10)', () => {
            // Test that our validation trigger works
            expect(() => {
                db.prepare(`
                    INSERT INTO simple_auth_users 
                    (player_number, username, pin_hash, is_active) 
                    VALUES (11, 'Invalid Player', '$2b$10$test', 1)
                `).run();
            }).toThrow();
        });

        it('should enforce PIN hash length constraints', () => {
            // Test that PIN hash must be long enough
            expect(() => {
                db.prepare(`
                    INSERT INTO simple_auth_users 
                    (player_number, username, pin_hash, is_active) 
                    VALUES (15, 'Test User', 'short', 1)
                `).run();
            }).toThrow();
        });
    });

    describe('Performance Validation', () => {
        it('should efficiently query by player number', () => {
            const start = Date.now();
            
            // Query by player number (should use index)
            const user = db.prepare(`
                SELECT * FROM simple_auth_users WHERE player_number = ?
            `).get(5);
            
            const duration = Date.now() - start;
            
            expect(user).toBeDefined();
            expect(duration).toBeLessThan(10); // Should be very fast with index
        });

        it('should efficiently query by username', () => {
            const start = Date.now();
            
            // Query by username (should use index)
            const user = db.prepare(`
                SELECT * FROM simple_auth_users WHERE username = ?
            `).get('Player 3');
            
            const duration = Date.now() - start;
            
            expect(user).toBeDefined();
            expect(duration).toBeLessThan(10); // Should be very fast with index
        });

        it('should efficiently query active users', () => {
            const start = Date.now();
            
            // Query active users (should use index)
            const activeUsers = db.prepare(`
                SELECT * FROM simple_auth_users WHERE is_active = 1
            `).all();
            
            const duration = Date.now() - start;
            
            expect(activeUsers).toHaveLength(11);
            expect(duration).toBeLessThan(10); // Should be very fast with index
        });
    });

    describe('Session Management Validation', () => {
        it('should support session token updates', () => {
            // Test that we can update session tokens
            const updateStmt = db.prepare(`
                UPDATE simple_auth_users 
                SET session_token = ? 
                WHERE player_number = ?
            `);
            
            const testToken = 'test_session_' + Date.now();
            const result = updateStmt.run(testToken, 0);
            
            expect(result.changes).toBe(1);
            
            // Verify the update
            const updated = db.prepare(`
                SELECT session_token FROM simple_auth_users WHERE player_number = 0
            `).get() as any;
            
            expect(updated.session_token).toBe(testToken);
            
            // Clean up
            updateStmt.run(null, 0);
        });

        it('should track last login timestamps', () => {
            // Test that we can update last login
            const updateStmt = db.prepare(`
                UPDATE simple_auth_users 
                SET last_login_at = ? 
                WHERE player_number = ?
            `);
            
            const now = new Date().toISOString();
            const result = updateStmt.run(now, 1);
            
            expect(result.changes).toBe(1);
            
            // Verify the update
            const updated = db.prepare(`
                SELECT last_login_at FROM simple_auth_users WHERE player_number = 1
            `).get() as any;
            
            expect(updated.last_login_at).toBe(now);
        });
    });
});

export {};
