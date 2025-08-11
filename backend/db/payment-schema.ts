/**
 * Payment Database Schema for Stripe Integration
 * Handles subscriptions, payments, contest entries, and billing
 */

import { runQuery, getRow, getRows } from './index';

export interface UserSubscription {
    id: number;
    user_id: number;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    product_type: 'oracle_premium' | 'analytics_pro' | 'ultimate';
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
    current_period_start: string;
    current_period_end: string;
    trial_end?: string;
    cancel_at_period_end: boolean;
    canceled_at?: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentHistory {
    id: number;
    user_id: number;
    stripe_payment_intent_id: string;
    stripe_charge_id?: string;
    amount: number; // in cents
    currency: string;
    payment_type: 'contest_entry' | 'subscription' | 'refund';
    contest_entry_type?: 'small' | 'medium' | 'large';
    subscription_id?: number;
    status: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'refunded';
    failure_reason?: string;
    receipt_url?: string;
    description: string;
    metadata: any; // JSON object
    created_at: string;
    updated_at: string;
}

export interface ContestEntry {
    id: number;
    user_id: number;
    payment_id: number;
    contest_type: 'small' | 'medium' | 'large';
    entry_fee: number; // in cents
    week: number;
    season: number;
    predictions: any[]; // JSON array of prediction IDs and choices
    status: 'active' | 'completed' | 'canceled';
    prize_pool?: number; // in cents
    final_rank?: number;
    payout_amount?: number; // in cents
    payout_processed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface UserBilling {
    id: number;
    user_id: number;
    stripe_customer_id: string;
    billing_email?: string;
    billing_name?: string;
    billing_address?: any; // JSON object
    default_payment_method_id?: string;
    tax_id?: string;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionUsage {
    id: number;
    subscription_id: number;
    user_id: number;
    feature_type: 'oracle_predictions' | 'advanced_analytics' | 'contest_entries' | 'api_calls';
    usage_count: number;
    period_start: string;
    period_end: string;
    limit_per_period?: number;
    created_at: string;
    updated_at: string;
}

/**
 * Create payment-related database tables
 */
export async function createPaymentTables(): Promise<void> {
    console.log('Creating payment database tables...');

    // User subscriptions table
    await runQuery(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            stripe_subscription_id TEXT UNIQUE NOT NULL,
            stripe_customer_id TEXT NOT NULL,
            product_type TEXT NOT NULL CHECK (product_type IN ('oracle_premium', 'analytics_pro', 'ultimate')),
            status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
            current_period_start DATETIME NOT NULL,
            current_period_end DATETIME NOT NULL,
            trial_end DATETIME,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            canceled_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )
    `);

    // Payment history table
    await runQuery(`
        CREATE TABLE IF NOT EXISTS payment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            stripe_payment_intent_id TEXT UNIQUE NOT NULL,
            stripe_charge_id TEXT,
            amount INTEGER NOT NULL, -- in cents
            currency TEXT DEFAULT 'usd',
            payment_type TEXT NOT NULL CHECK (payment_type IN ('contest_entry', 'subscription', 'refund')),
            contest_entry_type TEXT CHECK (contest_entry_type IN ('small', 'medium', 'large')),
            subscription_id INTEGER,
            status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'refunded')),
            failure_reason TEXT,
            receipt_url TEXT,
            description TEXT NOT NULL,
            metadata TEXT, -- JSON string
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE,
            FOREIGN KEY (subscription_id) REFERENCES user_subscriptions (id) ON DELETE SET NULL
        )
    `);

    // Contest entries table
    await runQuery(`
        CREATE TABLE IF NOT EXISTS contest_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            payment_id INTEGER NOT NULL,
            contest_type TEXT NOT NULL CHECK (contest_type IN ('small', 'medium', 'large')),
            entry_fee INTEGER NOT NULL, -- in cents
            week INTEGER NOT NULL,
            season INTEGER NOT NULL,
            predictions TEXT NOT NULL, -- JSON array
            status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'canceled')),
            prize_pool INTEGER, -- in cents
            final_rank INTEGER,
            payout_amount INTEGER, -- in cents
            payout_processed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE,
            FOREIGN KEY (payment_id) REFERENCES payment_history (id) ON DELETE CASCADE
        )
    `);

    // User billing information table
    await runQuery(`
        CREATE TABLE IF NOT EXISTS user_billing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            stripe_customer_id TEXT UNIQUE NOT NULL,
            billing_email TEXT,
            billing_name TEXT,
            billing_address TEXT, -- JSON string
            default_payment_method_id TEXT,
            tax_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )
    `);

    // Subscription usage tracking table
    await runQuery(`
        CREATE TABLE IF NOT EXISTS subscription_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            feature_type TEXT NOT NULL CHECK (feature_type IN ('oracle_predictions', 'advanced_analytics', 'contest_entries', 'api_calls')),
            usage_count INTEGER DEFAULT 0,
            period_start DATETIME NOT NULL,
            period_end DATETIME NOT NULL,
            limit_per_period INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subscription_id) REFERENCES user_subscriptions (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES simple_auth_users (id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Payment tables created successfully');
}

/**
 * Create indexes for payment tables
 */
export async function createPaymentIndexes(): Promise<void> {
    console.log('Creating payment table indexes...');

    // User subscriptions indexes
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions (stripe_customer_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions (status)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_product_type ON user_subscriptions (product_type)`);

    // Payment history indexes
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history (user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_payment_history_payment_type ON payment_history (payment_type)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history (status)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history (created_at)`);

    // Contest entries indexes
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_contest_entries_user_id ON contest_entries (user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_contest_entries_week_season ON contest_entries (week, season)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_contest_entries_contest_type ON contest_entries (contest_type)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_contest_entries_status ON contest_entries (status)`);

    // User billing indexes
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_billing_user_id ON user_billing (user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_customer_id ON user_billing (stripe_customer_id)`);

    // Subscription usage indexes
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON subscription_usage (subscription_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage (user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature_type ON subscription_usage (feature_type)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage (period_start, period_end)`);

    console.log('✅ Payment indexes created successfully');
}

/**
 * Helper functions for payment operations
 */

// Type aliases for cleaner function signatures
type CreateUserSubscriptionData = Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>;
type CreatePaymentData = Omit<PaymentHistory, 'id' | 'created_at' | 'updated_at'>;
type CreateContestEntryData = Omit<ContestEntry, 'id' | 'created_at' | 'updated_at'>;
type CreateUserBillingData = Omit<UserBilling, 'id' | 'created_at' | 'updated_at'>;

export async function getUserSubscription(userId: number): Promise<UserSubscription | null> {
    return await getRow(
        'SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ("active", "trialing") ORDER BY created_at DESC LIMIT 1',
        [userId]
    );
}

export async function getUserPaymentHistory(userId: number, limit: number = 50): Promise<PaymentHistory[]> {
    return await getRows(
        'SELECT * FROM payment_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
    );
}

export async function getUserContestEntries(userId: number, season: number, week?: number): Promise<ContestEntry[]> {
    const query = week 
        ? 'SELECT * FROM contest_entries WHERE user_id = ? AND season = ? AND week = ? ORDER BY created_at DESC'
        : 'SELECT * FROM contest_entries WHERE user_id = ? AND season = ? ORDER BY created_at DESC';
    const params = week ? [userId, season, week] : [userId, season];
    
    return await getRows(query, params);
}

export async function createUserSubscription(data: CreateUserSubscriptionData): Promise<number> {
    const result = await runQuery(`
        INSERT INTO user_subscriptions (
            user_id, stripe_subscription_id, stripe_customer_id, product_type, status,
            current_period_start, current_period_end, trial_end, cancel_at_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.user_id,
        data.stripe_subscription_id,
        data.stripe_customer_id,
        data.product_type,
        data.status,
        data.current_period_start,
        data.current_period_end,
        data.trial_end,
        data.cancel_at_period_end
    ]);
    
    return result.lastID!;
}

export async function updateUserSubscription(subscriptionId: number, updates: Partial<UserSubscription>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at').map(key => `${key} = ?`);
    const values = Object.values(updates).filter((_, index) => {
        const key = Object.keys(updates)[index];
        return key !== 'id' && key !== 'created_at';
    });
    
    await runQuery(`
        UPDATE user_subscriptions 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `, [...values, subscriptionId]);
}

export async function createPaymentRecord(data: CreatePaymentData): Promise<number> {
    const result = await runQuery(`
        INSERT INTO payment_history (
            user_id, stripe_payment_intent_id, stripe_charge_id, amount, currency,
            payment_type, contest_entry_type, subscription_id, status, failure_reason,
            receipt_url, description, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.user_id,
        data.stripe_payment_intent_id,
        data.stripe_charge_id,
        data.amount,
        data.currency,
        data.payment_type,
        data.contest_entry_type,
        data.subscription_id,
        data.status,
        data.failure_reason,
        data.receipt_url,
        data.description,
        JSON.stringify(data.metadata)
    ]);
    
    return result.lastID!;
}

export async function createContestEntry(data: CreateContestEntryData): Promise<number> {
    const result = await runQuery(`
        INSERT INTO contest_entries (
            user_id, payment_id, contest_type, entry_fee, week, season,
            predictions, status, prize_pool
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.user_id,
        data.payment_id,
        data.contest_type,
        data.entry_fee,
        data.week,
        data.season,
        JSON.stringify(data.predictions),
        data.status,
        data.prize_pool
    ]);
    
    return result.lastID!;
}

export async function getUserBilling(userId: number): Promise<UserBilling | null> {
    return await getRow(
        'SELECT * FROM user_billing WHERE user_id = ?',
        [userId]
    );
}

export async function createOrUpdateUserBilling(data: CreateUserBillingData): Promise<void> {
    const existing = await getUserBilling(data.user_id);
    
    if (existing) {
        const updates = Object.keys(data).filter(key => key !== 'user_id').map(key => `${key} = ?`);
        const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'user_id');
        
        await runQuery(`
            UPDATE user_billing 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        `, [...values, data.user_id]);
    } else {
        await runQuery(`
            INSERT INTO user_billing (
                user_id, stripe_customer_id, billing_email, billing_name,
                billing_address, default_payment_method_id, tax_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.user_id,
            data.stripe_customer_id,
            data.billing_email,
            data.billing_name,
            JSON.stringify(data.billing_address),
            data.default_payment_method_id,
            data.tax_id
        ]);
    }
}
