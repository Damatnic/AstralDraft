import { 
    hashPassword,
    verifyPassword,
    cleanupExpiredSessions,
    getUserById,
    type User
} from '../backend/services/authService';

// Mock the database functions
jest.mock('../backend/db/index', () => ({
    getRow: jest.fn(),
    runQuery: jest.fn(),
    getAllRows: jest.fn()
}));

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('password hashing', () => {
        it('should hash passwords securely', async () => {
            const password = 'TestPassword123!';
            const hashedPassword = await hashPassword(password);
            
            expect(hashedPassword).toBeDefined();
            expect(typeof hashedPassword).toBe('string');
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.startsWith('$2b$')).toBe(true); // bcrypt hash format
        });

        it('should verify correct passwords', async () => {
            const password = 'TestPassword123!';
            const hashedPassword = await hashPassword(password);
            const isValid = await verifyPassword(password, hashedPassword);
            
            expect(isValid).toBe(true);
        });

        it('should reject incorrect passwords', async () => {
            const password = 'TestPassword123!';
            const wrongPassword = 'WrongPassword123!';
            const hashedPassword = await hashPassword(password);
            const isValid = await verifyPassword(wrongPassword, hashedPassword);
            
            expect(isValid).toBe(false);
        });

        it('should generate different hashes for same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            
            expect(hash1).not.toBe(hash2);
            
            // But both should verify correctly
            expect(await verifyPassword(password, hash1)).toBe(true);
            expect(await verifyPassword(password, hash2)).toBe(true);
        });
    });

    describe('session management', () => {
        it('should cleanup expired sessions without errors', async () => {
            // Should not throw
            await expect(cleanupExpiredSessions()).resolves.toBeUndefined();
        });
    });

    describe('user retrieval', () => {
        it('should handle successful user retrieval', async () => {
            const mockUser: User = {
                id: 123,
                username: 'testuser',
                email: 'test@example.com',
                display_name: 'Test User',
                avatar_url: null,
                created_at: new Date().toISOString(),
                is_active: true
            };

            const { getRow } = require('../backend/db/index');
            getRow.mockReturnValue(mockUser);

            const result = await getUserById(123);
            expect(result).toEqual(mockUser);
        });

        it('should handle database errors gracefully', async () => {
            // Mock database error
            const { getRow } = require('../backend/db/index');
            getRow.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            const result = await getUserById(123);
            expect(result).toBeNull();
        });

        it('should return null for non-existent user', async () => {
            const { getRow } = require('../backend/db/index');
            getRow.mockReturnValue(null);

            const result = await getUserById(999);
            expect(result).toBeNull();
        });
    });
});
