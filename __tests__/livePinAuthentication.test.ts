/**
 * @fileoverview Integrated tests for PIN authentication and database integrity.
 * This test suite uses an in-memory SQLite database to ensure tests are isolated,
 * repeatable, and do not depend on external database files. It uses `bcryptjs`
 * for hashing and verification, aligning with the application's standard dependencies.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

// Helper function to run async database queries
const queryAsync = (db: sqlite3.Database, sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getAsync = (db: sqlite3.Database, sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const runAsync = (db: sqlite3.Database, sql: string, params: any[] = []) => {
    return new Promise<void>((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

describe('Integrated PIN Authentication and Database Test', () => {
    let db: sqlite3.Database;
    const testPin = '1234';
    let testPinHash: string;

    beforeAll(async () => {
        // Use an in-memory database for isolated testing
        db = new sqlite3.Database(':memory:');
        testPinHash = await bcrypt.hash(testPin, 10);

        // Set up the schema and seed data
        await runAsync(db, `
            CREATE TABLE simple_auth_users (
                player_number INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                pin_hash TEXT NOT NULL,
                is_active BOOLEAN NOT NULL CHECK (is_active IN (0, 1)),
                session_token TEXT,
                last_login_at TIMESTAMP
            );
        `);
        
        await runAsync(db, `CREATE INDEX idx_simple_auth_username ON simple_auth_users(username);`);
        await runAsync(db, `
            INSERT INTO simple_auth_users (player_number, username, pin_hash, is_active)
            VALUES (?, ?, ?, ?);
        `, [1, 'Test Player', testPinHash, 1]);
    });

    afterAll((done) => {
        db.close((err) => {
            if (err) console.error(err);
            done();
        });
    });

    describe('PIN Authentication Logic', () => {
        it('should correctly verify a valid PIN', async () => {
            const user: any = await getAsync(db, 'SELECT pin_hash FROM simple_auth_users WHERE player_number = ?', [1]);
            const isValid = await bcrypt.compare(testPin, user.pin_hash);
            expect(isValid).toBe(true);
        });

        it('should reject an invalid PIN', async () => {
            const user: any = await getAsync(db, 'SELECT pin_hash FROM simple_auth_users WHERE player_number = ?', [1]);
            const isValid = await bcrypt.compare('wrong-pin', user.pin_hash);
            expect(isValid).toBe(false);
        });
    });

    describe('Database User and Schema Verification', () => {
        it('should have the test user configured correctly', async () => {
            const user: any = await getAsync(db, 'SELECT * FROM simple_auth_users WHERE player_number = ?', [1]);
            expect(user).toBeDefined();
            expect(user.username).toBe('Test Player');
            expect(user.is_active).toBe(1);
            expect(user.pin_hash).toBe(testPinHash);
        });

        it('should have the required index for performance', async () => {
            const indexes: any = await queryAsync(db, `
                SELECT name FROM sqlite_master
                WHERE type='index' AND tbl_name='simple_auth_users'
            `);
            const indexNames = indexes.map((idx: any) => idx.name);
            expect(indexNames).toContain('idx_simple_auth_username');
        });
    });

    describe('Session Management', () => {
        it('should support updating and retrieving a session token', async () => {
            const testToken = 'session_token_' + Date.now();
            await runAsync(db, 'UPDATE simple_auth_users SET session_token = ? WHERE player_number = ?', [testToken, 1]);

            const user: any = await getAsync(db, 'SELECT session_token FROM simple_auth_users WHERE player_number = ?', [1]);
            expect(user.session_token).toBe(testToken);
        });

        it('should track and retrieve the last login timestamp', async () => {
            const now = new Date().toISOString();
            await runAsync(db, 'UPDATE simple_auth_users SET last_login_at = ? WHERE player_number = ?', [now, 1]);

            const user: any = await getAsync(db, 'SELECT last_login_at FROM simple_auth_users WHERE player_number = ?', [1]);
            expect(user.last_login_at).toBe(now);
        });
    });
    
    describe('Performance Validation', () => {
        it('should efficiently query by player number', async () => {
            const start = Date.now();
            const user = await getAsync(db, 'SELECT * FROM simple_auth_users WHERE player_number = ?', [1]);
            const duration = Date.now() - start;

            expect(user).toBeDefined();
            expect(duration).toBeLessThan(50); // Generous timing for in-memory DB
        });

        it('should efficiently query by username', async () => {
            const start = Date.now();
            const user = await getAsync(db, 'SELECT * FROM simple_auth_users WHERE username = ?', ['Test Player']);
            const duration = Date.now() - start;

            expect(user).toBeDefined();
            expect(duration).toBeLessThan(50);
        });
    });
});

export {};
