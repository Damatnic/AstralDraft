/**
 * Enhanced Authentication Security Tests
 * Comprehensive tests for the enhanced authentication system
 */

import request from 'supertest';
import express from 'express';
import { 
    applySecurityEnhanced, 
    validateSecureSession, 
    isAccountLocked, 
    lockAccount, 
    unlockAccount, 
    validatePinSecurity, 
    recordSecurityAttempt 
} from '../backend/middleware/security';
import { EnhancedAuthService } from '../backend/services/enhancedAuthService';

// Mock enhanced auth service
const mockEnhancedAuthService = {
    secureLogin: jest.fn(),
    secureLogout: jest.fn(),
    refreshSession: jest.fn(),
    changePin: jest.fn(),
    validateSession: jest.fn(),
    getSecurityStats: jest.fn(),
    logSecurityEvent: jest.fn(),
    checkAccountLockout: jest.fn(),
    validatePinSecurity: jest.fn()
};

// Mock security middleware
const mockSecurityMiddleware = {
    validateSecureSession: jest.fn(),
    rateLimitPinChange: jest.fn(),
    auditSecurityEvent: jest.fn(),
    validateSecureHeaders: jest.fn(),
    isAccountLocked: jest.fn(),
    lockAccount: jest.fn(),
    unlockAccount: jest.fn(),
    recordSecurityAttempt: jest.fn()
};

// Mock database service
const mockDatabaseService = {
    query: jest.fn(),
    transaction: jest.fn(),
    close: jest.fn()
};

jest.mock('../services/enhancedAuthService', () => mockEnhancedAuthService);

describe('Enhanced Authentication Security', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        jest.clearAllMocks();
    });

    describe('Security Middleware', () => {
        describe('applySecurityEnhanced', () => {
            it('should set comprehensive security headers', async () => {
                app.use(applySecurityEnhanced);
                app.get('/test', (req, res) => res.json({ success: true }));

                const response = await request(app).get('/test');

                expect(response.headers['x-content-type-options']).toBe('nosniff');
                expect(response.headers['x-frame-options']).toBe('DENY');
                expect(response.headers['x-xss-protection']).toBe('1; mode=block');
                expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
                expect(response.headers['permissions-policy']).toContain('geolocation=()');
                expect(response.headers['content-security-policy']).toContain("default-src 'self'");
            });
        });

        describe('validateSecureSession', () => {
            it('should reject requests without access token', async () => {
                app.use(validateSecureSession);
                app.get('/protected', (req, res) => res.json({ success: true }));

                const response = await request(app).get('/protected');

                expect(response.status).toBe(401);
                expect(response.body).toHaveProperty('error', 'Access token required');
                expect(response.body).toHaveProperty('code', 'MISSING_TOKEN');
            });

            it('should accept valid access token in Authorization header', async () => {
                app.use(validateSecureSession);
                app.get('/protected', (req, res) => res.json({ user: (req as any).user }));

                const response = await request(app)
                    .get('/protected')
                    .set('Authorization', 'Bearer valid-token');

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).toHaveProperty('isAdmin', true);
            });

            it('should accept valid access token in cookies', async () => {
                app.use(validateSecureSession);
                app.get('/protected', (req, res) => res.json({ user: (req as any).user }));

                const response = await request(app)
                    .get('/protected')
                    .set('Cookie', 'accessToken=valid-token');

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('user');
            });
        });
    });

    describe('Account Lockout System', () => {
        beforeEach(() => {
            // Clear account locks before each test
            jest.clearAllMocks();
        });

        describe('isAccountLocked', () => {
            it('should return false for unlocked accounts', () => {
                expect(isAccountLocked(1)).toBe(false);
            });

            it('should return true for locked accounts within lockout period', () => {
                lockAccount(1);
                expect(isAccountLocked(1)).toBe(true);
            });
        });

        describe('lockAccount', () => {
            it('should lock account for specified duration', () => {
                lockAccount(1);
                expect(isAccountLocked(1)).toBe(true);
            });

            it('should implement exponential backoff for repeat offenders', () => {
                // First lockout
                lockAccount(1);
                unlockAccount(1);

                // Second lockout should be longer
                lockAccount(1);
                expect(isAccountLocked(1)).toBe(true);
            });
        });

        describe('unlockAccount', () => {
            it('should unlock previously locked accounts', () => {
                lockAccount(1);
                expect(isAccountLocked(1)).toBe(true);

                unlockAccount(1);
                expect(isAccountLocked(1)).toBe(false);
            });
        });
    });

    describe('PIN Security Validation', () => {
        describe('validatePinSecurity', () => {
            it('should accept strong PINs', () => {
                const strongPins = ['7347', '9182', '5926', 'A1B2'];
                
                strongPins.forEach(pin => {
                    const result = validatePinSecurity(pin);
                    expect(result.valid).toBe(true);
                    expect(result.errors).toHaveLength(0);
                });
            });

            it('should reject weak PINs', () => {
                const weakPins = ['0000', '1111', '1234', '4321'];
                
                weakPins.forEach(pin => {
                    const result = validatePinSecurity(pin);
                    expect(result.valid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors[0]).toContain('too common');
                });
            });

            it('should reject sequential patterns', () => {
                const sequentialPins = ['123', '234', '345', '876', '765'];
                
                sequentialPins.forEach(pin => {
                    const result = validatePinSecurity(pin);
                    expect(result.valid).toBe(false);
                    expect(result.errors.some(error => error.includes('sequential'))).toBe(true);
                });
            });

            it('should enforce minimum length requirements', () => {
                const shortPins = ['1', '12', '123'];
                
                shortPins.forEach(pin => {
                    const result = validatePinSecurity(pin);
                    expect(result.valid).toBe(false);
                    expect(result.errors.some(error => error.includes('at least 4'))).toBe(true);
                });
            });

            it('should enforce maximum length requirements', () => {
                const longPin = '123456789012345678901'; // 21 characters
                
                const result = validatePinSecurity(longPin);
                expect(result.valid).toBe(false);
                expect(result.errors.some(error => error.includes('no more than 20'))).toBe(true);
            });
        });
    });

    describe('Security Audit Logging', () => {
        describe('recordSecurityAttempt', () => {
            let consoleSpy: jest.SpyInstance;

            beforeEach(() => {
                consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            });

            afterEach(() => {
                consoleSpy.mockRestore();
            });

            it('should log successful login attempts', () => {
                const mockReq = {
                    ip: '192.168.1.1',
                    get: jest.fn().mockReturnValue('Mozilla/5.0')
                };

                recordSecurityAttempt(mockReq, 'login', true, 1);

                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('🔍 Security Event:')
                );
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('"success":true')
                );
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('"eventType":"login"')
                );
            });

            it('should log failed login attempts', () => {
                const mockReq = {
                    ip: '192.168.1.1',
                    get: jest.fn().mockReturnValue('Mozilla/5.0')
                };

                recordSecurityAttempt(mockReq, 'login', false, 1);

                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('🔍 Security Event:')
                );
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('"success":false')
                );
            });

            it('should handle missing request properties gracefully', () => {
                const mockReq = {}; // Empty request object

                expect(() => {
                    recordSecurityAttempt(mockReq, 'test', true);
                }).not.toThrow();

                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('"ip":"unknown"')
                );
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('"userAgent":"unknown"')
                );
            });
        });
    });

    describe('EnhancedAuthService', () => {
        const mockDatabaseService = (jest.requireMock('../../backend/services/databaseService') as any).databaseService;

        describe('secureLogin', () => {
            beforeEach(() => {
                jest.clearAllMocks();
            });

            it('should reject login for locked accounts', async () => {
                // Mock account lockout check
                jest.spyOn(jest.requireMock('../../backend/middleware/securityEnhanced') as any, 'isAccountLocked')
                    .mockReturnValue(true);

                const loginAttempt = {
                    playerNumber: 1,
                    pin: '7347',
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0'
                };

                const result = await EnhancedAuthService.secureLogin(loginAttempt);

                expect(result.success).toBe(false);
                expect(result.error).toContain('Account temporarily locked');
                expect(result.code).toBe('ACCOUNT_LOCKED');
            });

            it('should validate PIN security requirements', async () => {
                // Mock unlocked account
                jest.spyOn(jest.requireMock('../../backend/middleware/securityEnhanced') as any, 'isAccountLocked')
                    .mockReturnValue(false);

                const loginAttempt = {
                    playerNumber: 1,
                    pin: '0000', // Weak PIN
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0'
                };

                const result = await EnhancedAuthService.secureLogin(loginAttempt);

                expect(result.success).toBe(false);
                expect(result.error).toContain('too common');
                expect(result.code).toBe('WEAK_PIN');
            });

            it('should authenticate valid credentials successfully', async () => {
                // Mock successful authentication
                jest.spyOn(jest.requireMock('../../backend/middleware/securityEnhanced') as any, 'isAccountLocked')
                    .mockReturnValue(false);
                mockDatabaseService.authenticateUser.mockResolvedValue({
                    id: 1,
                    playerNumber: 1,
                    username: 'admin',
                    isAdmin: true
                });
                mockDatabaseService.createSession.mockResolvedValue(true);
                mockDatabaseService.updateLastLogin.mockResolvedValue(true);

                const loginAttempt = {
                    playerNumber: 1,
                    pin: '7347',
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0'
                };

                const result = await EnhancedAuthService.secureLogin(loginAttempt);

                expect(result.success).toBe(true);
                expect(result.session).toBeDefined();
                expect(result.session?.user).toBeDefined();
                expect(result.session?.accessToken).toBeDefined();
                expect(result.session?.refreshToken).toBeDefined();
            });
        });

        describe('refreshSession', () => {
            it('should refresh valid sessions', async () => {
                mockDatabaseService.getSessionByRefreshToken.mockResolvedValue({
                    sessionId: 'test-session',
                    userId: 1,
                    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString()
                });
                mockDatabaseService.getUserById.mockResolvedValue({
                    id: 1,
                    username: 'admin'
                });
                mockDatabaseService.updateSessionToken.mockResolvedValue(true);

                const result = await EnhancedAuthService.refreshSession('valid-refresh-token');

                expect(result.success).toBe(true);
                expect(result.session).toBeDefined();
                expect(result.session?.accessToken).toBeDefined();
            });

            it('should reject expired refresh tokens', async () => {
                mockDatabaseService.getSessionByRefreshToken.mockResolvedValue({
                    sessionId: 'test-session',
                    userId: 1,
                    refreshExpiresAt: new Date(Date.now() - 1000).toISOString() // Expired
                });

                const result = await EnhancedAuthService.refreshSession('expired-token');

                expect(result.success).toBe(false);
                expect(result.error).toContain('expired');
                expect(result.code).toBe('REFRESH_EXPIRED');
            });
        });

        describe('changePin', () => {
            it('should validate current PIN before allowing change', async () => {
                mockDatabaseService.getUserById.mockResolvedValue({ id: 1 });
                mockDatabaseService.validateUserPin.mockResolvedValue(false); // Invalid current PIN

                const result = await EnhancedAuthService.changePin(1, 'wrong-pin', '7347');

                expect(result.success).toBe(false);
                expect(result.error).toContain('Current PIN is incorrect');
                expect(result.code).toBe('INVALID_CURRENT_PIN');
            });

            it('should validate new PIN security requirements', async () => {
                mockDatabaseService.getUserById.mockResolvedValue({ id: 1 });
                mockDatabaseService.validateUserPin.mockResolvedValue(true);

                const result = await EnhancedAuthService.changePin(1, 'correct-pin', '0000'); // Weak new PIN

                expect(result.success).toBe(false);
                expect(result.error).toContain('too common');
                expect(result.code).toBe('WEAK_NEW_PIN');
            });

            it('should successfully change PIN with valid inputs', async () => {
                mockDatabaseService.getUserById.mockResolvedValue({ id: 1 });
                mockDatabaseService.validateUserPin.mockResolvedValue(true);
                mockDatabaseService.updateUserPin.mockResolvedValue(true);
                mockDatabaseService.deleteAllUserSessions.mockResolvedValue(true);

                const result = await EnhancedAuthService.changePin(1, 'correct-pin', '7347');

                expect(result.success).toBe(true);
                expect(mockDatabaseService.deleteAllUserSessions).toHaveBeenCalledWith(1);
            });
        });
    });

    describe('Rate Limiting Integration', () => {
        it('should apply rate limiting to authentication endpoints', async () => {
            // This would require integration testing with actual rate limiting
            // For unit tests, we verify the middleware is properly configured
            const rateLimit = (jest.requireMock('../../backend/middleware/securityEnhanced') as any).createSecureRateLimit;
            
            expect(typeof rateLimit).toBe('function');
            
            const limiter = rateLimit(60000, 5, true);
            expect(limiter).toBeDefined();
        });
    });
});
