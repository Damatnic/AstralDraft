/**
 * Enhanced Authentication Service
 * Secure authentication with session management, refresh tokens, and security monitoring
 */

import { SimpleUser } from './simpleAuthService';
import { databaseService } from '../backend/services/databaseService';
import { getRow } from '../backend/db/index';
import { 
    recordSecurityAttempt, 
    isAccountLocked, 
    lockAccount, 
    unlockAccount,
    validatePinSecurity 
} from '../backend/middleware/securityEnhanced';
import crypto from 'crypto';

// Types for enhanced auth
export interface SecureSession {
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    user: SimpleUser;
    expiresAt: number;
    refreshExpiresAt: number;
}

export interface LoginAttempt {
    playerNumber: number;
    pin: string;
    rememberMe?: boolean;
    userAgent?: string;
    ipAddress?: string;
}

export interface AuthResponse {
    success: boolean;
    session?: SecureSession;
    error?: string;
    code?: string;
    lockedUntil?: number;
}

class EnhancedAuthService {
    private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    private static readonly REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
    private static readonly REMEMBER_ME_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days

    /**
     * Secure login with enhanced security checks
     */
    static async secureLogin(attempt: LoginAttempt): Promise<AuthResponse> {
        try {
            // Check for account lockout
            if (isAccountLocked(attempt.playerNumber)) {
                recordSecurityAttempt(
                    { ip: attempt.ipAddress, get: () => attempt.userAgent } as any,
                    'login',
                    false,
                    attempt.playerNumber
                );

                return {
                    success: false,
                    error: 'Account temporarily locked due to too many failed attempts',
                    code: 'ACCOUNT_LOCKED'
                };
            }

            // Validate PIN security requirements
            const pinValidation = validatePinSecurity(attempt.pin);
            if (!pinValidation.valid) {
                return {
                    success: false,
                    error: pinValidation.errors.join(', '),
                    code: 'WEAK_PIN'
                };
            }

            // Authenticate with database
            const user = await databaseService.authenticateUser(attempt.playerNumber, attempt.pin);
            
            if (!user) {
                // Record failed attempt
                recordSecurityAttempt(
                    { ip: attempt.ipAddress, get: () => attempt.userAgent } as any,
                    'login',
                    false,
                    attempt.playerNumber
                );

                // Check if we should lock the account
                const failedAttempts = await this.getRecentFailedAttempts(attempt.playerNumber);
                if (failedAttempts >= 4) { // Lock after 5 failed attempts
                    lockAccount(attempt.playerNumber);
                }

                return {
                    success: false,
                    error: 'Invalid player number or PIN',
                    code: 'INVALID_CREDENTIALS'
                };
            }

            // Create secure session
            const session = await this.createSecureSession(user, attempt.rememberMe);

            // Record successful login
            recordSecurityAttempt(
                { ip: attempt.ipAddress, get: () => attempt.userAgent } as any,
                'login',
                true,
                attempt.playerNumber
            );

            // Unlock account if it was locked
            unlockAccount(attempt.playerNumber);

            // Update last login time
            await databaseService.updateLastLogin(user.id);

            return {
                success: true,
                session
            };

        } catch (error) {
            console.error('Secure login error:', error);
            return {
                success: false,
                error: 'Authentication service error',
                code: 'SERVICE_ERROR'
            };
        }
    }

    /**
     * Create a secure session with access and refresh tokens
     */
    private static async createSecureSession(
        user: any, 
        rememberMe: boolean = false
    ): Promise<SecureSession> {
        const sessionId = this.generateSecureId();
        const accessToken = this.generateSecureId();
        const refreshToken = this.generateSecureId();
        
        const now = Date.now();
        const sessionDuration = rememberMe ? this.REMEMBER_ME_DURATION : this.SESSION_DURATION;
        const refreshDuration = rememberMe ? this.REMEMBER_ME_DURATION : this.REFRESH_DURATION;
        
        const expiresAt = now + sessionDuration;
        const refreshExpiresAt = now + refreshDuration;

        // Store session in database
        await databaseService.createSession({
            sessionId,
            userId: user.id,
            accessToken,
            refreshToken,
            expiresAt: new Date(expiresAt).toISOString(),
            refreshExpiresAt: new Date(refreshExpiresAt).toISOString(),
            userAgent: '', // Will be filled by caller
            ipAddress: '' // Will be filled by caller
        });

        return {
            sessionId,
            accessToken,
            refreshToken,
            user,
            expiresAt,
            refreshExpiresAt
        };
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshSession(refreshToken: string): Promise<AuthResponse> {
        try {
            const session = await databaseService.getSessionByRefreshToken(refreshToken);
            
            if (!session || new Date(session.refreshExpiresAt) < new Date()) {
                return {
                    success: false,
                    error: 'Invalid or expired refresh token',
                    code: 'REFRESH_EXPIRED'
                };
            }

            const user = await databaseService.getUserById(session.userId);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Generate new access token
            const newAccessToken = this.generateSecureId();
            const newExpiresAt = Date.now() + this.SESSION_DURATION;

            // Update session in database
            await databaseService.updateSessionToken(session.sessionId, newAccessToken, new Date(newExpiresAt).toISOString());

            // Map database user to SimpleUser format
            const simpleUser: SimpleUser = {
                id: user.id.toString(),
                username: user.username,
                displayName: user.displayName || user.username,
                pin: '', // PIN is not exposed for security
                email: user.email,
                isAdmin: user.isAdmin,
                customization: {
                    backgroundColor: user.colorTheme || '#3B82F6',
                    textColor: '#FFFFFF',
                    emoji: user.emoji || '👤'
                },
                createdAt: user.lastLoginAt || new Date().toISOString(),
                lastLogin: user.lastLoginAt
            };

            return {
                success: true,
                session: {
                    sessionId: session.sessionId,
                    accessToken: newAccessToken,
                    refreshToken: session.refreshToken,
                    user: simpleUser,
                    expiresAt: newExpiresAt,
                    refreshExpiresAt: new Date(session.refreshExpiresAt).getTime()
                }
            };

        } catch (error) {
            console.error('Refresh session error:', error);
            return {
                success: false,
                error: 'Session refresh failed',
                code: 'REFRESH_ERROR'
            };
        }
    }

    /**
     * Secure logout with session cleanup
     */
    static async secureLogout(accessToken: string): Promise<{ success: boolean }> {
        try {
            await databaseService.deleteSessionByToken(accessToken);
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false };
        }
    }

    /**
     * Logout from all devices
     */
    static async logoutAllDevices(userId: number): Promise<{ success: boolean }> {
        try {
            await databaseService.deleteAllUserSessions(userId);
            return { success: true };
        } catch (error) {
            console.error('Logout all devices error:', error);
            return { success: false };
        }
    }

    /**
     * Validate access token and get user
     */
    static async validateToken(accessToken: string): Promise<{ valid: boolean; user?: any }> {
        try {
            const session = await databaseService.getSessionByAccessToken(accessToken);
            
            if (!session || new Date(session.expiresAt) < new Date()) {
                return { valid: false };
            }

            const user = await databaseService.getUserById(session.userId);
            return { 
                valid: !!user, 
                user 
            };

        } catch (error) {
            console.error('Token validation error:', error);
            return { valid: false };
        }
    }

    /**
     * Change PIN with security validation
     */
    static async changePin(
        userId: number, 
        currentPin: string, 
        newPin: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<AuthResponse> {
        try {
            // Validate current PIN
            const user = await databaseService.getUserById(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            const isCurrentPinValid = await databaseService.validateUserPin(userId, currentPin);
            if (!isCurrentPinValid) {
                recordSecurityAttempt(
                    { ip: ipAddress, get: () => userAgent } as any,
                    'pin_change',
                    false,
                    userId
                );

                return {
                    success: false,
                    error: 'Current PIN is incorrect',
                    code: 'INVALID_CURRENT_PIN'
                };
            }

            // Validate new PIN security
            const pinValidation = validatePinSecurity(newPin);
            if (!pinValidation.valid) {
                return {
                    success: false,
                    error: pinValidation.errors.join(', '),
                    code: 'WEAK_NEW_PIN'
                };
            }

            // Update PIN in database
            const success = await databaseService.updateUserPin(userId, newPin);
            
            if (success) {
                recordSecurityAttempt(
                    { ip: ipAddress, get: () => userAgent } as any,
                    'pin_change',
                    true,
                    userId
                );

                // Invalidate all existing sessions for security
                await this.logoutAllDevices(userId);

                return {
                    success: true
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to update PIN',
                    code: 'UPDATE_FAILED'
                };
            }

        } catch (error) {
            console.error('Change PIN error:', error);
            return {
                success: false,
                error: 'PIN change failed',
                code: 'CHANGE_ERROR'
            };
        }
    }

    /**
     * Get recent failed login attempts for an account
     */
    private static async getRecentFailedAttempts(playerNumber: number): Promise<number> {
        try {
            const result = await getRow(`
                SELECT COUNT(*) as failed_count
                FROM security_audit_log
                WHERE user_identifier = ?
                AND event_type = 'failed_login'
                AND created_at >= datetime('now', '-1 hour')
            `, [playerNumber.toString()]);
            
            return result ? Number(result.failed_count) : 0;
        } catch (error) {
            console.error('Error getting failed login attempts:', error);
            return 0;
        }
    }

    /**
     * Generate cryptographically secure ID
     */
    private static generateSecureId(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Cleanup expired sessions
     */
    static async cleanupExpiredSessions(): Promise<void> {
        try {
            await databaseService.deleteExpiredSessions();
        } catch (error) {
            console.error('Session cleanup error:', error);
        }
    }

    /**
     * Get security statistics for monitoring
     */
    static async getSecurityStats(): Promise<{
        activeSessions: number;
        failedAttemptsToday: number;
        lockedAccounts: number;
    }> {
        try {
            const activeSessions = await databaseService.getActiveSessionCount();
            const failedAttemptsToday = await databaseService.getFailedAttemptsToday();
            
            return {
                activeSessions,
                failedAttemptsToday,
                lockedAccounts: 0 // Would come from accountLocks map in enhanced security middleware
            };
        } catch (error) {
            console.error('Security stats error:', error);
            return {
                activeSessions: 0,
                failedAttemptsToday: 0,
                lockedAccounts: 0
            };
        }
    }
}

export default EnhancedAuthService;
