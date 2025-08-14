/**
 * Fantasy Football Database Schema Implementation
 * Implements the T1.3 Database Schema requirements from AGENT_TODO_LIST.md
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/astral-draft.db');

export interface League {
    id: number;
    name: string;
    commissioner_id: number;
    settings: string; // JSON
    status: string;
    created_at: string;
    updated_at: string;
}

export interface LeagueMember {
    id: number;
    league_id: number;
    user_id: number;
    team_name: string;
    joined_at: string;
    is_active: boolean;
}

export interface NFLPlayer {
    id: number;
    name: string;
    position: string;
    nfl_team: string;
    jersey_number: number;
    status: string;
    bye_week: number;
    fantasy_position: string;
    created_at: string;
    updated_at: string;
}

export interface FantasyTeam {
    id: number;
    league_id: number;
    user_id: number;
    team_name: string;
    roster: string; // JSON
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
    points_against: number;
    created_at: string;
    updated_at: string;
}

export interface DraftPick {
    id: number;
    league_id: number;
    team_id: number;
    player_id: number;
    round: number;
    pick_number: number;
    overall_pick: number;
    pick_time: string;
    auto_pick: boolean;
}

export interface Matchup {
    id: number;
    league_id: number;
    week: number;
    team_a_id: number;
    team_b_id: number;
    team_a_score: number;
    team_b_score: number;
    status: string; // 'scheduled', 'in_progress', 'completed'
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: number;
    league_id: number;
    team_id: number;
    transaction_type: string; // 'trade', 'waiver', 'free_agent', 'drop'
    player_id: number;
    details: string; // JSON
    status: string; // 'pending', 'approved', 'rejected'
    processed_at: string;
    created_at: string;
}

export interface PlayerStats {
    id: number;
    player_id: number;
    week: number;
    season: number;
    passing_yards: number;
    passing_tds: number;
    interceptions: number;
    rushing_yards: number;
    rushing_tds: number;
    receiving_yards: number;
    receiving_tds: number;
    receptions: number;
    fumbles: number;
    fantasy_points: number;
    updated_at: string;
}

/**
 * Create all fantasy football tables
 */
async function createFantasyFootballSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        console.log('🏈 Creating Fantasy Football Database Schema...');
        
        const tables = [
            // Enhanced leagues table (extends existing social_leagues)
            `CREATE TABLE IF NOT EXISTS leagues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                commissioner_id INTEGER NOT NULL REFERENCES users(id),
                settings TEXT NOT NULL DEFAULT '{}', -- JSON for league settings
                status TEXT DEFAULT 'draft_pending', -- draft_pending, drafting, active, completed
                season INTEGER DEFAULT 2024,
                max_teams INTEGER DEFAULT 12,
                draft_type TEXT DEFAULT 'snake', -- snake, auction, linear
                scoring_type TEXT DEFAULT 'standard', -- standard, ppr, half_ppr
                playoff_weeks INTEGER DEFAULT 3,
                regular_season_weeks INTEGER DEFAULT 14,
                trade_deadline_week INTEGER DEFAULT 10,
                waiver_order TEXT DEFAULT 'rolling_list', -- rolling_list, faab, daily
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Enhanced league members table
            `CREATE TABLE IF NOT EXISTS league_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                team_name TEXT NOT NULL,
                draft_position INTEGER,
                is_active BOOLEAN DEFAULT 1,
                is_commissioner BOOLEAN DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(league_id, user_id)
            )`,

            // NFL players database
            `CREATE TABLE IF NOT EXISTS nfl_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                position TEXT NOT NULL, -- QB, RB, WR, TE, K, DEF
                nfl_team TEXT NOT NULL, -- Team abbreviation (e.g., 'KC', 'DAL')
                jersey_number INTEGER,
                status TEXT DEFAULT 'active', -- active, injured, suspended, bye
                bye_week INTEGER,
                fantasy_position TEXT, -- Flex positions like RB/WR
                rookie_year INTEGER,
                height TEXT,
                weight INTEGER,
                college TEXT,
                experience INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Fantasy teams (one per user per league)
            `CREATE TABLE IF NOT EXISTS fantasy_teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                team_name TEXT NOT NULL,
                team_logo TEXT,
                roster TEXT DEFAULT '[]', -- JSON array of player IDs
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                ties INTEGER DEFAULT 0,
                points_for REAL DEFAULT 0.0,
                points_against REAL DEFAULT 0.0,
                waiver_priority INTEGER DEFAULT 1,
                faab_budget REAL DEFAULT 100.0, -- Free Agent Acquisition Budget
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(league_id, user_id)
            )`,

            // Draft picks tracking
            `CREATE TABLE IF NOT EXISTS draft_picks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                team_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                player_id INTEGER NOT NULL REFERENCES nfl_players(id),
                round INTEGER NOT NULL,
                pick_number INTEGER NOT NULL, -- Pick number within round
                overall_pick INTEGER NOT NULL, -- Overall pick number in draft
                pick_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                auto_pick BOOLEAN DEFAULT 0,
                keeper_pick BOOLEAN DEFAULT 0
            )`,

            // Weekly matchups
            `CREATE TABLE IF NOT EXISTS matchups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                week INTEGER NOT NULL,
                season INTEGER DEFAULT 2024,
                team_a_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                team_b_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                team_a_score REAL DEFAULT 0.0,
                team_b_score REAL DEFAULT 0.0,
                status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed
                is_playoff BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Transactions (trades, waivers, free agents)
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                team_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                transaction_type TEXT NOT NULL, -- trade, waiver, free_agent, drop, add
                player_id INTEGER REFERENCES nfl_players(id),
                details TEXT DEFAULT '{}', -- JSON for transaction details
                status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
                waiver_priority INTEGER,
                faab_bid REAL,
                processed_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Player statistics by week
            `CREATE TABLE IF NOT EXISTS player_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL REFERENCES nfl_players(id),
                week INTEGER NOT NULL,
                season INTEGER DEFAULT 2024,
                nfl_team TEXT NOT NULL,
                opponent TEXT,
                is_home BOOLEAN DEFAULT 0,
                -- Passing stats
                passing_yards INTEGER DEFAULT 0,
                passing_tds INTEGER DEFAULT 0,
                interceptions INTEGER DEFAULT 0,
                passing_attempts INTEGER DEFAULT 0,
                passing_completions INTEGER DEFAULT 0,
                -- Rushing stats
                rushing_yards INTEGER DEFAULT 0,
                rushing_tds INTEGER DEFAULT 0,
                rushing_attempts INTEGER DEFAULT 0,
                -- Receiving stats
                receiving_yards INTEGER DEFAULT 0,
                receiving_tds INTEGER DEFAULT 0,
                receptions INTEGER DEFAULT 0,
                targets INTEGER DEFAULT 0,
                -- Other stats
                fumbles INTEGER DEFAULT 0,
                fumbles_lost INTEGER DEFAULT 0,
                two_point_conversions INTEGER DEFAULT 0,
                -- Fantasy points
                fantasy_points_standard REAL DEFAULT 0.0,
                fantasy_points_ppr REAL DEFAULT 0.0,
                fantasy_points_half_ppr REAL DEFAULT 0.0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id, week, season)
            )`,

            // Roster lineups (who's starting each week)
            `CREATE TABLE IF NOT EXISTS lineup_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                week INTEGER NOT NULL,
                season INTEGER DEFAULT 2024,
                lineup TEXT NOT NULL DEFAULT '{}', -- JSON mapping positions to player IDs
                bench TEXT DEFAULT '[]', -- JSON array of benched player IDs
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, week, season)
            )`,

            // Waivers/Free agency
            `CREATE TABLE IF NOT EXISTS waiver_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL REFERENCES leagues(id),
                team_id INTEGER NOT NULL REFERENCES fantasy_teams(id),
                player_id INTEGER NOT NULL REFERENCES nfl_players(id),
                drop_player_id INTEGER REFERENCES nfl_players(id),
                priority INTEGER NOT NULL,
                faab_bid REAL DEFAULT 0.0,
                status TEXT DEFAULT 'pending', -- pending, successful, failed
                processed_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        let completedTables = 0;
        const totalTables = tables.length;

        tables.forEach((tableSQL, index) => {
            db.run(tableSQL, (err) => {
                if (err) {
                    console.error(`❌ Error creating table ${index + 1}:`, err);
                    reject(err);
                    return;
                }
                
                completedTables++;
                console.log(`✅ Created table ${completedTables}/${totalTables}`);
                
                if (completedTables === totalTables) {
                    console.log('🎉 All fantasy football tables created successfully!');
                    createIndexes(db, resolve, reject);
                }
            });
        });
    });
}

/**
 * Create performance indexes
 */
function createIndexes(db: sqlite3.Database, resolve: () => void, reject: (err: Error) => void): void {
    console.log('📊 Creating performance indexes...');
    
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_leagues_commissioner ON leagues(commissioner_id)',
        'CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status)',
        'CREATE INDEX IF NOT EXISTS idx_league_members_league ON league_members(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_nfl_players_position ON nfl_players(position)',
        'CREATE INDEX IF NOT EXISTS idx_nfl_players_team ON nfl_players(nfl_team)',
        'CREATE INDEX IF NOT EXISTS idx_nfl_players_status ON nfl_players(status)',
        'CREATE INDEX IF NOT EXISTS idx_fantasy_teams_league ON fantasy_teams(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_fantasy_teams_user ON fantasy_teams(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_draft_picks_league ON draft_picks(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_draft_picks_team ON draft_picks(team_id)',
        'CREATE INDEX IF NOT EXISTS idx_draft_picks_overall ON draft_picks(overall_pick)',
        'CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week)',
        'CREATE INDEX IF NOT EXISTS idx_matchups_teams ON matchups(team_a_id, team_b_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_league ON transactions(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_team ON transactions(team_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)',
        'CREATE INDEX IF NOT EXISTS idx_player_stats_player_week ON player_stats(player_id, week, season)',
        'CREATE INDEX IF NOT EXISTS idx_lineup_settings_team_week ON lineup_settings(team_id, week)',
        'CREATE INDEX IF NOT EXISTS idx_waiver_claims_league ON waiver_claims(league_id)',
        'CREATE INDEX IF NOT EXISTS idx_waiver_claims_status ON waiver_claims(status)'
    ];

    let completedIndexes = 0;
    const totalIndexes = indexes.length;

    indexes.forEach((indexSQL, index) => {
        db.run(indexSQL, (err) => {
            if (err) {
                console.error(`❌ Error creating index ${index + 1}:`, err);
                reject(err);
                return;
            }
            
            completedIndexes++;
            console.log(`✅ Created index ${completedIndexes}/${totalIndexes}`);
            
            if (completedIndexes === totalIndexes) {
                console.log('🎉 All indexes created successfully!');
                insertSampleData(db, resolve, reject);
            }
        });
    });
}

/**
 * Insert sample data for testing
 */
function insertSampleData(db: sqlite3.Database, resolve: () => void, reject: (err: Error) => void): void {
    console.log('🏈 Inserting sample fantasy football data...');
    
    // Sample NFL players (just a few for testing)
    const samplePlayers = [
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Patrick Mahomes', 'QB', 'KC', 15, 10)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Josh Allen', 'QB', 'BUF', 17, 12)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Christian McCaffrey', 'RB', 'SF', 23, 9)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Tyreek Hill', 'WR', 'MIA', 10, 6)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Travis Kelce', 'TE', 'KC', 87, 10)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Nick Chubb', 'RB', 'CLE', 24, 5)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_wheel) VALUES ('Cooper Kupp', 'WR', 'LAR', 10, 6)",
        "INSERT OR IGNORE INTO nfl_players (name, position, nfl_team, jersey_number, bye_week) VALUES ('Lamar Jackson', 'QB', 'BAL', 8, 14)"
    ];

    let completedInserts = 0;
    const totalInserts = samplePlayers.length;

    samplePlayers.forEach((playerSQL, index) => {
        db.run(playerSQL, (err) => {
            if (err) {
                console.error(`❌ Error inserting player ${index + 1}:`, err);
            }
            
            completedInserts++;
            console.log(`✅ Inserted sample player ${completedInserts}/${totalInserts}`);
            
            if (completedInserts === totalInserts) {
                console.log('🎉 Sample data inserted successfully!');
                db.close();
                resolve();
            }
        });
    });
}

/**
 * Run the schema creation
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    createFantasyFootballSchema()
        .then(() => {
            console.log('✅ Fantasy Football Database Schema Implementation Complete!');
            console.log('📋 Summary:');
            console.log('   - 10 new fantasy football tables created');
            console.log('   - 21 performance indexes added');
            console.log('   - Sample NFL players inserted');
            console.log('   - Ready for league creation and management');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Schema creation failed:', err);
            process.exit(1);
        });
}

export { createFantasyFootballSchema };
