/**
 * Production User Database Migr    // Create refresh tokens table for JWT management
    await runQuery(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);igrates from simple PIN-based auth to comprehensive user system
 * with JWT authentication, email verification, and user profiles
 */

import { runQuery, getRow, getRows } from '../db/index';

export const createProductionUserTables = async (): Promise<void> => {
  try {
    console.log('🔄 Creating production user tables...');

    // Create users table with comprehensive fields
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'premium', 'oracle_pro')),
        is_admin BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        email_verification_token TEXT,
        password_reset_token TEXT,
        password_reset_expires DATETIME,
        customization TEXT DEFAULT '{}',
        preferences TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Create refresh tokens table for JWT management
    await runQuery(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create user sessions table for tracking active sessions
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create user stats table for tracking performance
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        accuracy_percentage REAL DEFAULT 0.0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        rank INTEGER DEFAULT 0,
        oracle_beats INTEGER DEFAULT 0,
        avg_confidence REAL DEFAULT 0.0,
        last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create user notifications table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create audit log for user activities
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription);
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
      CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);
    `);

    // Create triggers for automatic timestamp updates
    await runQuery(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users 
      BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Create trigger for user stats initialization
    await runQuery(`
      CREATE TRIGGER IF NOT EXISTS create_user_stats 
      AFTER INSERT ON users 
      BEGIN 
        INSERT INTO user_stats (user_id) VALUES (NEW.id);
      END;
    `);

    // Create views for commonly used queries
    await runQuery(`
      CREATE VIEW IF NOT EXISTS user_profile_view AS
      SELECT 
        u.id,
        u.email,
        u.username,
        u.display_name,
        u.avatar_url,
        u.subscription,
        u.is_admin,
        u.email_verified,
        u.created_at,
        u.last_login,
        u.customization,
        u.preferences,
        us.total_predictions,
        us.correct_predictions,
        us.accuracy_percentage,
        us.current_streak,
        us.longest_streak,
        us.total_points,
        us.rank,
        us.oracle_beats,
        us.avg_confidence
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.is_active = TRUE;
    `);

    console.log('✅ Production user tables created successfully');

  } catch (error) {
    console.error('❌ Error creating production user tables:', error);
    throw error;
  }
};

export const migrateFromSimpleAuth = async (): Promise<void> => {
  try {
    console.log('🔄 Migrating from simple auth system...');

    // Check if simple_auth_users table exists
    const simpleAuthExists = await getRow(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='simple_auth_users'
    `);

    if (!simpleAuthExists) {
      console.log('⚠️  No simple auth users to migrate');
      return;
    }

    // Get all simple auth users
    const simpleUsers = await getRows(`
      SELECT * FROM simple_auth_users
    `);

    if (simpleUsers.length === 0) {
      console.log('⚠️  No simple auth users found');
      return;
    }

    console.log(`🔄 Migrating ${simpleUsers.length} users...`);

    for (const simpleUser of simpleUsers) {
      try {
        // Generate a temporary email and password for migration
        const email = `${simpleUser.username}@astral-draft-migration.com`;
        const tempPassword = `TempPass123!${simpleUser.pin}`;
        
        // Hash the temporary password
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        // Migrate user data
        await runQuery(`
          INSERT OR IGNORE INTO users (
            id,
            email,
            username, 
            display_name,
            password_hash,
            subscription,
            is_admin,
            email_verified,
            created_at,
            customization,
            preferences
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          simpleUser.id,
          email,
          simpleUser.username,
          simpleUser.displayName || simpleUser.username,
          passwordHash,
          'free',
          simpleUser.isAdmin || false,
          false, // Email not verified for migrated users
          simpleUser.createdAt || new Date().toISOString(),
          JSON.stringify(simpleUser.customization || {
            backgroundColor: '#4F46E5',
            emoji: '🎯',
            theme: 'dark'
          }),
          JSON.stringify({
            notifications: {
              email: true,
              push: true,
              predictions: true,
              leaderboard: true,
              weekly_summary: true
            },
            privacy: {
              showProfile: true,
              showStats: true,
              allowFriendRequests: true
            }
          })
        ]);

        console.log(`✅ Migrated user: ${simpleUser.username}`);

      } catch (userError) {
        console.error(`❌ Error migrating user ${simpleUser.username}:`, userError);
      }
    }

    // Create migration log
    await runQuery(`
      INSERT INTO user_audit_log (user_id, action, details) 
      SELECT id, 'MIGRATION_FROM_SIMPLE_AUTH', 
             'User migrated from simple PIN-based auth system' 
      FROM users 
      WHERE email LIKE '%@astral-draft-migration.com'
    `);

    console.log('✅ User migration completed successfully');
    console.log('⚠️  IMPORTANT: Migrated users have temporary passwords and need email verification');

  } catch (error) {
    console.error('❌ Error during user migration:', error);
    throw error;
  }
};

export const setupAdminUser = async (): Promise<void> => {
  try {
    console.log('🔄 Setting up admin user...');

    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@astral-draft.com';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await runQuery(`
      INSERT OR IGNORE INTO users (
        email,
        username,
        display_name,
        password_hash,
        subscription,
        is_admin,
        email_verified,
        customization,
        preferences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      adminEmail,
      'admin',
      'Administrator',
      passwordHash,
      'oracle_pro',
      true,
      true,
      JSON.stringify({
        backgroundColor: '#DC2626',
        emoji: '👑',
        theme: 'dark'
      }),
      JSON.stringify({
        notifications: {
          email: true,
          push: true,
          predictions: true,
          leaderboard: true,
          weekly_summary: true
        },
        privacy: {
          showProfile: true,
          showStats: true,
          allowFriendRequests: true
        }
      })
    ]);

    console.log('✅ Admin user created successfully');
    console.log(`📧 Admin email: ${adminEmail}`);
    console.log(`🔑 Admin password: ${adminPassword}`);

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    throw error;
  }
};

export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Clean up expired refresh tokens
    const expiredRefreshTokens = await runQuery(`
      DELETE FROM refresh_tokens WHERE expires_at < ?
    `, [now]);

    // Clean up expired sessions
    const expiredSessions = await runQuery(`
      DELETE FROM user_sessions WHERE expires_at < ?
    `, [now]);

    // Clean up old audit logs (older than 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldAuditLogs = await runQuery(`
      DELETE FROM user_audit_log WHERE created_at < ?
    `, [sixMonthsAgo.toISOString()]);

    console.log(`🧹 Cleanup completed: ${expiredRefreshTokens.changes} refresh tokens, ${expiredSessions.changes} sessions, ${oldAuditLogs.changes} audit logs`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Run all migrations
export const runProductionMigrations = async (): Promise<void> => {
  try {
    console.log('🚀 Starting production user system migration...');
    
    await createProductionUserTables();
    await migrateFromSimpleAuth();
    await setupAdminUser();
    await cleanupExpiredTokens();
    
    console.log('🎉 Production migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
};
