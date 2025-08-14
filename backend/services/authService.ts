/**
 * Authentication Service
 * Handles JWT token generation, password hashing, and user authentication
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getRow, runQuery } from '../db/index';

// JWT Configuration
const JWT_SECRET: string = process.env.JWT_SECRET || 'astral-draft-super-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Password Configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export interface User {
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    is_active: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthResult {
    user: Omit<User, 'is_active'>;
    tokens: AuthTokens;
}

export interface JWTPayload {
    userId: number;
    username: string;
    email: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
    
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access and refresh tokens
 */
export function generateTokens(user: User): AuthTokens {
    const payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'> = {
        userId: user.id,
        username: user.username,
        email: user.email
    };

    const accessToken = jwt.sign(
        { ...payload, type: 'access' },
        JWT_SECRET,
        { expiresIn: '7d' } // Use literal string
    );

    const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '30d' } // Use literal string
    );

    // Calculate expiration time for access token
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
        accessToken,
        refreshToken,
        expiresIn
    };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
}

/**
 * Authenticate user with username/email and password
 */
export async function authenticateUser(login: string, password: string): Promise<AuthResult> {
    // Find user by username or email
    const user = await getRow(`
        SELECT id, username, email, password_hash, display_name, avatar_url, created_at, is_active
        FROM users 
        WHERE (username = ? OR email = ?) AND is_active = 1
    `, [login, login]);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }

    // Update last login
    await runQuery(`
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [user.id]);

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token in database
    await runQuery(`
        INSERT OR REPLACE INTO user_sessions (user_id, refresh_token, expires_at, created_at)
        VALUES (?, ?, datetime('now', '+30 days'), CURRENT_TIMESTAMP)
    `, [user.id, tokens.refreshToken]);

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            created_at: user.created_at
        },
        tokens
    };
}

/**
 * Register a new user
 */
export async function registerUser(
    username: string, 
    email: string, 
    password: string, 
    displayName?: string
): Promise<AuthResult> {
    // Validate input
    if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
    }

    if (!email?.includes('@')) {
        throw new Error('Valid email address is required');
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    // Check if username or email already exists
    const existingUser = await getRow(`
        SELECT id FROM users 
        WHERE username = ? OR email = ?
    `, [username, email]);

    if (existingUser) {
        throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await runQuery(`
        INSERT INTO users (username, email, password_hash, display_name, is_active)
        VALUES (?, ?, ?, ?, 1)
    `, [username, email, passwordHash, displayName || username]);

    // Get created user
    const newUser = await getRow(`
        SELECT id, username, email, display_name, avatar_url, created_at, is_active
        FROM users 
        WHERE id = ?
    `, [result.lastID]);

    if (!newUser) {
        throw new Error('Failed to create user');
    }

    // Generate tokens
    const tokens = generateTokens(newUser);

    // Store refresh token
    await runQuery(`
        INSERT INTO user_sessions (user_id, refresh_token, expires_at, created_at)
        VALUES (?, ?, datetime('now', '+30 days'), CURRENT_TIMESTAMP)
    `, [newUser.id, tokens.refreshToken]);

    return {
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            display_name: newUser.display_name,
            avatar_url: newUser.avatar_url,
            created_at: newUser.created_at
        },
        tokens
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database and is not expired
    const session = await getRow(`
        SELECT user_id FROM user_sessions 
        WHERE refresh_token = ? AND expires_at > CURRENT_TIMESTAMP
    `, [refreshToken]);

    if (!session) {
        throw new Error('Refresh token has expired or is invalid');
    }

    // Get user data
    const user = await getRow(`
        SELECT id, username, email, display_name, avatar_url, created_at, is_active
        FROM users 
        WHERE id = ? AND is_active = 1
    `, [session.user_id]);

    if (!user) {
        throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token in database
    await runQuery(`
        UPDATE user_sessions 
        SET refresh_token = ?, expires_at = datetime('now', '+30 days'), updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND refresh_token = ?
    `, [tokens.refreshToken, user.id, refreshToken]);

    return tokens;
}

/**
 * Logout user by removing refresh token
 */
export async function logoutUser(refreshToken: string): Promise<void> {
    await runQuery(`
        DELETE FROM user_sessions 
        WHERE refresh_token = ?
    `, [refreshToken]);
}

/**
 * Logout user from all devices
 */
export async function logoutUserFromAllDevices(userId: number): Promise<void> {
    await runQuery(`
        DELETE FROM user_sessions 
        WHERE user_id = ?
    `, [userId]);
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User | null> {
    try {
        const user = await getRow(`
            SELECT id, username, email, display_name, avatar_url, created_at, is_active
            FROM users
            WHERE id = ? AND is_active = 1
        `, [userId]);

        return user || null;
    } catch (error) {
        // Log the error for debugging but return null for graceful handling
        console.error('Database error in getUserById:', error);
        return null;
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: number, 
    updates: { displayName?: string; avatarUrl?: string; email?: string }
): Promise<User> {
    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.displayName !== undefined) {
        setClause.push('display_name = ?');
        params.push(updates.displayName);
    }

    if (updates.avatarUrl !== undefined) {
        setClause.push('avatar_url = ?');
        params.push(updates.avatarUrl);
    }

    if (updates.email !== undefined) {
        // Check if email already exists
        const existingUser = await getRow(`
            SELECT id FROM users WHERE email = ? AND id != ?
        `, [updates.email, userId]);

        if (existingUser) {
            throw new Error('Email already exists');
        }

        setClause.push('email = ?');
        params.push(updates.email);
    }

    if (setClause.length === 0) {
        throw new Error('No updates provided');
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await runQuery(`
        UPDATE users 
        SET ${setClause.join(', ')}
        WHERE id = ?
    `, params);

    const updatedUser = await getUserById(userId);
    if (!updatedUser) {
        throw new Error('User not found after update');
    }

    return updatedUser;
}

/**
 * Change user password
 */
export async function changeUserPassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
): Promise<void> {
    // Get current password hash
    const user = await getRow(`
        SELECT password_hash FROM users WHERE id = ? AND is_active = 1
    `, [userId]);

    if (!user) {
        throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await runQuery(`
        UPDATE users 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [newPasswordHash, userId]);

    // Logout from all devices for security
    await logoutUserFromAllDevices(userId);
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
    await runQuery(`
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
    `);
}
