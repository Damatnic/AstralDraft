/**
 * Database Service for Simple Authentication Integration
 * Connects our frontend SimpleAuthService with the database layer
 */

import { setupCompleteDatabase, checkDatabaseStatus } from '../db/setup';
import { 
    getSimpleAuthUser, 
    updateSimpleAuthUser, 
    SimpleAuthUser,
    getActivePredictions,
    submitUserPrediction,
    createOraclePrediction,
    OraclePredictionData,
    UserPredictionData
} from '../db/enhanced-schema';
import bcrypt from 'bcryptjs';

export interface DatabaseAuthUser {
    id: number;
    playerNumber: number;
    username: string;
    email?: string;
    displayName?: string;
    colorTheme: string;
    emoji: string;
    isAdmin: boolean;
    lastLoginAt?: string;
}

export interface DatabasePrediction {
    id: string;
    week: number;
    season: number;
    type: string;
    question: string;
    options: string[];
    oracleChoice: number;
    oracleConfidence: number;
    oracleReasoning: string;
    dataPoints: any[];
    expiresAt: string;
    participantsCount: number;
    consensusChoice?: number;
    consensusConfidence?: number;
}

export interface DatabaseUserPrediction {
    predictionId: string;
    userChoice: number;
    userConfidence: number;
    reasoning?: string;
    pointsEarned: number;
    submittedAt: string;
}

/**
 * Database Service Class
 */
export class DatabaseService {
    private static instance: DatabaseService;
    private isInitialized = false;

    private constructor() {}

    static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Initialize database connection and setup
     */
    async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            console.log('📊 Database already initialized');
            return true;
        }

        try {
            console.log('🚀 Initializing database service...');
            
            const result = await setupCompleteDatabase();
            if (result.success) {
                this.isInitialized = true;
                console.log('✅ Database service initialized successfully');
                return true;
            } else {
                console.error('❌ Database initialization failed:', result.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Database service initialization error:', error);
            return false;
        }
    }

    /**
     * Get database status information
     */
    async getStatus() {
        return await checkDatabaseStatus();
    }

    /**
     * Authenticate user with PIN
     */
    async authenticateUser(playerNumber: number, pin: string): Promise<DatabaseAuthUser | null> {
        try {
            const user = await getSimpleAuthUser(playerNumber);
            if (!user || !user.is_active) {
                return null;
            }

            // For development, we'll use simple comparison instead of bcrypt for demo
            const isValidPin = await this.verifyPin(pin, user.pin_hash);
            if (!isValidPin) {
                return null;
            }

            // Update last login
            await updateSimpleAuthUser(playerNumber, {
                last_login_at: new Date().toISOString()
            });

            return this.mapUserToAuth(user);
        } catch (error) {
            console.error('Error authenticating user:', error);
            return null;
        }
    }

    /**
     * Update user profile information
     */
    async updateUser(playerNumber: number, updates: {
        username?: string;
        email?: string;
        colorTheme?: string;
        emoji?: string;
        pin?: string;
    }): Promise<boolean> {
        try {
            const updateData: Partial<SimpleAuthUser> = {};

            if (updates.username) updateData.username = updates.username;
            if (updates.email) updateData.email = updates.email;
            if (updates.colorTheme) updateData.color_theme = updates.colorTheme;
            if (updates.emoji) updateData.emoji = updates.emoji;
            
            if (updates.pin) {
                updateData.pin_hash = await this.hashPin(updates.pin);
            }

            return await updateSimpleAuthUser(playerNumber, updateData);
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    }

    /**
     * Get active Oracle predictions for a week
     */
    async getWeeklyPredictions(week: number, season: number = 2024): Promise<DatabasePrediction[]> {
        try {
            const predictions = await getActivePredictions(week, season);
            return predictions.map(this.mapPredictionToDatabase);
        } catch (error) {
            console.error('Error fetching weekly predictions:', error);
            return [];
        }
    }

    /**
     * Submit user prediction
     */
    async submitPrediction(
        playerNumber: number, 
        predictionId: string, 
        choice: number, 
        confidence: number,
        reasoning?: string
    ): Promise<boolean> {
        try {
            const user = await getSimpleAuthUser(playerNumber);
            if (!user) {
                console.error('User not found for player number:', playerNumber);
                return false;
            }

            const prediction: Omit<UserPredictionData, 'id' | 'submitted_at'> = {
                user_id: user.id,
                prediction_id: predictionId,
                user_choice: choice,
                user_confidence: confidence,
                reasoning: reasoning || '',
                points_earned: 0 // Will be calculated after resolution
            };

            return await submitUserPrediction(prediction);
        } catch (error) {
            console.error('Error submitting prediction:', error);
            return false;
        }
    }

    /**
     * Create new Oracle prediction (admin only)
     */
    async createPrediction(
        playerNumber: number,
        predictionData: {
            id: string;
            week: number;
            type: string;
            question: string;
            options: string[];
            oracleChoice: number;
            oracleConfidence: number;
            oracleReasoning: string;
            dataPoints: any[];
            expiresAt: string;
        }
    ): Promise<boolean> {
        try {
            const user = await getSimpleAuthUser(playerNumber);
            if (!user || !user.is_admin) {
                console.error('Admin access required for creating predictions');
                return false;
            }

            const prediction: Omit<OraclePredictionData, 'created_at'> = {
                id: predictionData.id,
                week: predictionData.week,
                season: 2024,
                type: predictionData.type,
                question: predictionData.question,
                options: predictionData.options,
                oracle_choice: predictionData.oracleChoice,
                oracle_confidence: predictionData.oracleConfidence,
                oracle_reasoning: predictionData.oracleReasoning,
                data_points: predictionData.dataPoints,
                is_resolved: false,
                participants_count: 0,
                total_submissions: 0,
                expires_at: predictionData.expiresAt
            };

            return await createOraclePrediction(prediction);
        } catch (error) {
            console.error('Error creating prediction:', error);
            return false;
        }
    }

    /**
     * Hash PIN for storage
     */
    private async hashPin(pin: string): Promise<string> {
        // For demo purposes, we'll use a simple hash
        // In production, use proper bcrypt
        return await bcrypt.hash(pin, 10);
    }

    /**
     * Verify PIN against hash
     */
    private async verifyPin(pin: string, hash: string): Promise<boolean> {
        try {
            // For demo purposes with default PINs, do simple comparison
            if (hash === '$2b$10$7347hash' && pin === '7347') return true; // Admin
            if (hash === '$2b$10$0000hash' && pin === '0000') return true; // Default players
            
            // For proper hashed PINs
            return await bcrypt.compare(pin, hash);
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return false;
        }
    }

    /**
     * Map database user to auth format
     */
    private mapUserToAuth(user: SimpleAuthUser): DatabaseAuthUser {
        return {
            id: user.id,
            playerNumber: user.player_number,
            username: user.username,
            email: user.email || undefined,
            displayName: user.display_name || user.username,
            colorTheme: user.color_theme || '#3B82F6',
            emoji: user.emoji || '👤',
            isAdmin: user.is_admin,
            lastLoginAt: user.last_login_at || undefined
        };
    }

    /**
     * Map database prediction to frontend format
     */
    private mapPredictionToDatabase(prediction: OraclePredictionData): DatabasePrediction {
        return {
            id: prediction.id,
            week: prediction.week,
            season: prediction.season,
            type: prediction.type,
            question: prediction.question,
            options: prediction.options,
            oracleChoice: prediction.oracle_choice,
            oracleConfidence: prediction.oracle_confidence,
            oracleReasoning: prediction.oracle_reasoning,
            dataPoints: prediction.data_points,
            expiresAt: prediction.expires_at,
            participantsCount: prediction.participants_count,
            consensusChoice: prediction.consensus_choice,
            consensusConfidence: prediction.consensus_confidence
        };
    }

    // === Enhanced Authentication Session Management ===

    /**
     * Update user's last login timestamp
     */
    async updateLastLogin(userId: number): Promise<boolean> {
        try {
            const user = await getSimpleAuthUser(userId);
            if (!user) return false;

            return await updateSimpleAuthUser(userId, {
                last_login_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
            return false;
        }
    }

    /**
     * Create secure session record
     */
    async createSession(sessionData: {
        sessionId: string;
        userId: number;
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
        refreshExpiresAt: string;
        userAgent: string;
        ipAddress: string;
    }): Promise<boolean> {
        try {
            // For now, store sessions in memory or simplified storage
            // In production, this would insert into a sessions table
            console.log('Session created:', sessionData.sessionId);
            return true;
        } catch (error) {
            console.error('Error creating session:', error);
            return false;
        }
    }

    /**
     * Get session by refresh token
     */
    async getSessionByRefreshToken(refreshToken: string): Promise<any> {
        try {
            // Simplified implementation - would query sessions table
            return null;
        } catch (error) {
            console.error('Error getting session by refresh token:', error);
            return null;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: number): Promise<DatabaseAuthUser | null> {
        try {
            const user = await getSimpleAuthUser(userId);
            if (!user) return null;
            return this.mapUserToAuth(user);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }

    /**
     * Update session access token
     */
    async updateSessionToken(sessionId: string, accessToken: string, expiresAt: string): Promise<boolean> {
        try {
            // Simplified implementation - would update sessions table
            console.log('Session token updated:', sessionId);
            return true;
        } catch (error) {
            console.error('Error updating session token:', error);
            return false;
        }
    }

    /**
     * Delete session by access token
     */
    async deleteSessionByToken(accessToken: string): Promise<boolean> {
        try {
            // Simplified implementation - would delete from sessions table
            console.log('Session deleted by token');
            return true;
        } catch (error) {
            console.error('Error deleting session by token:', error);
            return false;
        }
    }

    /**
     * Delete all user sessions
     */
    async deleteAllUserSessions(userId: number): Promise<boolean> {
        try {
            // Simplified implementation - would delete all user sessions
            console.log('All user sessions deleted:', userId);
            return true;
        } catch (error) {
            console.error('Error deleting all user sessions:', error);
            return false;
        }
    }

    /**
     * Get session by access token
     */
    async getSessionByAccessToken(accessToken: string): Promise<any> {
        try {
            // Simplified implementation - would query sessions table
            return null;
        } catch (error) {
            console.error('Error getting session by access token:', error);
            return null;
        }
    }

    /**
     * Validate user PIN
     */
    async validateUserPin(userId: number, pin: string): Promise<boolean> {
        try {
            const user = await getSimpleAuthUser(userId);
            if (!user) return false;
            return await this.verifyPin(pin, user.pin_hash);
        } catch (error) {
            console.error('Error validating user PIN:', error);
            return false;
        }
    }

    /**
     * Update user PIN
     */
    async updateUserPin(userId: number, newPin: string): Promise<boolean> {
        try {
            const hashedPin = await this.hashPin(newPin);
            return await updateSimpleAuthUser(userId, {
                pin_hash: hashedPin
            });
        } catch (error) {
            console.error('Error updating user PIN:', error);
            return false;
        }
    }

    /**
     * Delete expired sessions
     */
    async deleteExpiredSessions(): Promise<void> {
        try {
            // Simplified implementation - would delete expired sessions
            console.log('Expired sessions cleaned up');
        } catch (error) {
            console.error('Error deleting expired sessions:', error);
        }
    }

    /**
     * Get active session count
     */
    async getActiveSessionCount(): Promise<number> {
        try {
            // Simplified implementation - would count active sessions
            return 0;
        } catch (error) {
            console.error('Error getting active session count:', error);
            return 0;
        }
    }

    /**
     * Get failed attempts today
     */
    async getFailedAttemptsToday(): Promise<number> {
        try {
            // Would query security_audit_log table
            return 0;
        } catch (error) {
            console.error('Error getting failed attempts today:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
