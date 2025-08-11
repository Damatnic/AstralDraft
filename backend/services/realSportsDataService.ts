/**
 * Real Sports Data Service
 * Integrates with live NFL APIs to provide real-time sports data
 * Replaces mock data with actual NFL games, teams, players, and statistics
 */

import axios from 'axios';
import cron from 'node-cron';
import { runQuery, getRow, getRows } from '../db/index';

// API Configuration
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl';
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';

// Rate limiting configuration
const API_RATE_LIMIT = {
  espn: { requests: 100, window: 60000 }, // 100 requests per minute
  odds: { requests: 500, window: 3600000 }  // 500 requests per hour
};

// Cache configuration
const CACHE_TTL = {
  games: 5 * 60 * 1000,      // 5 minutes
  teams: 24 * 60 * 60 * 1000, // 24 hours
  players: 12 * 60 * 60 * 1000, // 12 hours
  odds: 2 * 60 * 1000,        // 2 minutes
  scores: 1 * 60 * 1000       // 1 minute
};

interface NFLGame {
  id: string;
  date: string;
  week: number;
  season: number;
  status: 'scheduled' | 'live' | 'completed';
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  homeScore?: number;
  awayScore?: number;
  odds?: GameOdds;
  weather?: WeatherConditions;
  venue: string;
  broadcast?: string[];
}

interface NFLTeam {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  location: string;
  color: string;
  alternateColor: string;
  logo: string;
  record?: TeamRecord;
  stats?: TeamStats;
}

interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
}

interface TeamStats {
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  yardsPerGame: number;
  yardsAllowedPerGame: number;
  turnoverDifferential: number;
  redZoneEfficiency: number;
  thirdDownConversion: number;
}

interface GameOdds {
  spread: number;
  overUnder: number;
  moneylineHome: number;
  moneylineAway: number;
  lastUpdated: string;
}

interface WeatherConditions {
  temperature: number;
  conditions: string;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
}

interface PredictionInput {
  gameId: string;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  odds: GameOdds;
  weather?: WeatherConditions;
  historicalData: any;
  teamStats: { home: TeamStats; away: TeamStats };
}

interface OraclePrediction {
  gameId: string;
  predictedWinner: string;
  confidence: number;
  spread: number;
  overUnder: number;
  keyFactors: string[];
  analysis: string;
  model: string;
  timestamp: string;
}

export class RealSportsDataService {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeScheduledTasks();
  }

  /**
   * Initialize scheduled tasks for data updates
   */
  private initializeScheduledTasks(): void {
    // Update games every 5 minutes during NFL season
    cron.schedule('*/5 * * * *', () => {
      console.log('🔄 Updating NFL games data...');
      this.updateAllGames().catch(console.error);
    });

    // Update team stats daily at 6 AM
    cron.schedule('0 6 * * *', () => {
      console.log('🔄 Updating team stats...');
      this.updateAllTeamStats().catch(console.error);
    });

    // Update odds every 2 minutes during game days
    cron.schedule('*/2 * * * *', () => {
      console.log('🔄 Updating betting odds...');
      this.updateOddsForUpcomingGames().catch(console.error);
    });

    // Clean up old predictions and cache
    cron.schedule('0 0 * * *', () => {
      console.log('🧹 Cleaning up old data...');
      this.cleanupOldData().catch(console.error);
    });
  }

  /**
   * Check rate limit for API calls
   */
  private checkRateLimit(api: string): boolean {
    const limit = API_RATE_LIMIT[api as keyof typeof API_RATE_LIMIT];
    if (!limit) return true;

    const now = Date.now();
    const record = this.rateLimits.get(api);

    if (!record || now > record.resetTime) {
      this.rateLimits.set(api, { count: 1, resetTime: now + limit.window });
      return true;
    }

    if (record.count >= limit.requests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Get cached data or fetch if expired
   */
  private async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now < cached.expires) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, expires: now + ttl });
    return data;
  }

  /**
   * Fetch current NFL games from ESPN API
   */
  async getCurrentGames(): Promise<NFLGame[]> {
    return this.getCachedOrFetch(
      'current_games',
      async () => {
        if (!this.checkRateLimit('espn')) {
          throw new Error('ESPN API rate limit exceeded');
        }

        const response = await axios.get(`${ESPN_API_BASE}/scoreboard`);
        const games = response.data.events || [];

        return games.map((event: any) => this.parseESPNGame(event));
      },
      CACHE_TTL.games
    );
  }

  /**
   * Parse ESPN game data into our format
   */
  private parseESPNGame(event: any): NFLGame {
    const competition = event.competitions[0];
    const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
    const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');

    return {
      id: event.id,
      date: new Date(event.date).toISOString(),
      week: event.week?.number || 1,
      season: event.season?.year || new Date().getFullYear(),
      status: this.parseGameStatus(competition.status.type.name),
      homeTeam: this.parseTeam(homeTeam.team),
      awayTeam: this.parseTeam(awayTeam.team),
      homeScore: parseInt(homeTeam.score) || undefined,
      awayScore: parseInt(awayTeam.score) || undefined,
      venue: competition.venue?.fullName || '',
      broadcast: competition.broadcasts?.map((b: any) => b.network) || []
    };
  }

  /**
   * Parse team data from ESPN
   */
  private parseTeam(team: any): NFLTeam {
    return {
      id: team.id,
      name: team.name,
      displayName: team.displayName,
      abbreviation: team.abbreviation,
      location: team.location,
      color: team.color || '#000000',
      alternateColor: team.alternateColor || '#FFFFFF',
      logo: team.logo
    };
  }

  /**
   * Parse game status
   */
  private parseGameStatus(status: string): 'scheduled' | 'live' | 'completed' {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('final')) return 'completed';
    if (lowerStatus.includes('progress') || lowerStatus.includes('live')) return 'live';
    return 'scheduled';
  }

  /**
   * Fetch betting odds from The Odds API
   */
  async getGameOdds(gameId: string): Promise<GameOdds | null> {
    if (!ODDS_API_KEY) {
      console.warn('⚠️ No Odds API key configured');
      return null;
    }

    return this.getCachedOrFetch(
      `odds_${gameId}`,
      async () => {
        if (!this.checkRateLimit('odds')) {
          throw new Error('Odds API rate limit exceeded');
        }

        const response = await axios.get(`${ODDS_API_BASE}/odds`, {
          params: {
            apiKey: ODDS_API_KEY,
            regions: 'us',
            markets: 'h2h,spreads,totals',
            oddsFormat: 'american'
          }
        });

        const gameOdds = response.data.find((game: any) => 
          game.id === gameId || game.sport_key === gameId
        );

        if (!gameOdds) return null;

        return this.parseOddsData(gameOdds);
      },
      CACHE_TTL.odds
    );
  }

  /**
   * Parse odds data from The Odds API
   */
  private parseOddsData(oddsData: any): GameOdds {
    const bookmaker = oddsData.bookmakers?.[0]; // Use first available bookmaker
    
    const h2h = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
    const spreads = bookmaker?.markets?.find((m: any) => m.key === 'spreads');
    const totals = bookmaker?.markets?.find((m: any) => m.key === 'totals');

    return {
      spread: spreads?.outcomes?.[0]?.point || 0,
      overUnder: totals?.outcomes?.[0]?.point || 0,
      moneylineHome: h2h?.outcomes?.find((o: any) => o.name === 'home')?.price || 0,
      moneylineAway: h2h?.outcomes?.find((o: any) => o.name === 'away')?.price || 0,
      lastUpdated: oddsData.commence_time || new Date().toISOString()
    };
  }

  /**
   * Fetch team statistics
   */
  async getTeamStats(teamId: string): Promise<TeamStats | null> {
    return this.getCachedOrFetch(
      `team_stats_${teamId}`,
      async () => {
        if (!this.checkRateLimit('espn')) {
          throw new Error('ESPN API rate limit exceeded');
        }

        const response = await axios.get(`${ESPN_API_BASE}/teams/${teamId}/statistics`);
        const stats = response.data.statistics || {};

        return this.parseTeamStats(stats);
      },
      CACHE_TTL.teams
    );
  }

  /**
   * Parse team statistics from ESPN
   */
  private parseTeamStats(stats: any): TeamStats {
    return {
      pointsPerGame: parseFloat(stats.pointsPerGame) || 0,
      pointsAllowedPerGame: parseFloat(stats.pointsAllowedPerGame) || 0,
      yardsPerGame: parseFloat(stats.yardsPerGame) || 0,
      yardsAllowedPerGame: parseFloat(stats.yardsAllowedPerGame) || 0,
      turnoverDifferential: parseInt(stats.turnoverDifferential) || 0,
      redZoneEfficiency: parseFloat(stats.redZoneEfficiency) || 0,
      thirdDownConversion: parseFloat(stats.thirdDownConversion) || 0
    };
  }

  /**
   * Generate Oracle prediction using real data
   */
  async generateOraclePrediction(gameId: string): Promise<OraclePrediction> {
    console.log(`🔮 Generating Oracle prediction for game ${gameId}...`);

    // Get real game data
    const games = await this.getCurrentGames();
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Get real betting odds
    const odds = await this.getGameOdds(gameId);
    
    // Get team statistics
    const [homeStats, awayStats] = await Promise.all([
      this.getTeamStats(game.homeTeam.id),
      this.getTeamStats(game.awayTeam.id)
    ]);

    // Prepare prediction input
    const input: PredictionInput = {
      gameId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      odds: odds || { spread: 0, overUnder: 0, moneylineHome: 0, moneylineAway: 0, lastUpdated: new Date().toISOString() },
      weather: game.weather,
      historicalData: await this.getHistoricalMatchups(game.homeTeam.id, game.awayTeam.id),
      teamStats: { 
        home: homeStats || this.getDefaultStats(), 
        away: awayStats || this.getDefaultStats() 
      }
    };

    // Generate prediction using advanced algorithms
    const prediction = await this.runPredictionAlgorithm(input);
    
    // Store prediction in database
    await this.storePrediction(prediction);
    
    return prediction;
  }

  /**
   * Advanced prediction algorithm using real data
   */
  private async runPredictionAlgorithm(input: PredictionInput): Promise<OraclePrediction> {
    const { homeTeam, awayTeam, odds, teamStats } = input;

    // Calculate team strength ratings
    const homeStrength = this.calculateTeamStrength(teamStats.home);
    const awayStrength = this.calculateTeamStrength(teamStats.away);
    
    // Factor in home field advantage (typically 3 points in NFL)
    const homeFieldAdvantage = 3;
    const adjustedHomeStrength = homeStrength + homeFieldAdvantage;

    // Calculate prediction confidence based on strength differential
    const strengthDiff = Math.abs(adjustedHomeStrength - awayStrength);
    const confidence = Math.min(95, 50 + (strengthDiff * 5));

    // Determine predicted winner
    const predictedWinner = adjustedHomeStrength > awayStrength ? homeTeam.id : awayTeam.id;
    
    // Calculate predicted spread
    const predictedSpread = adjustedHomeStrength - awayStrength;
    
    // Calculate over/under prediction
    const totalPoints = teamStats.home.pointsPerGame + teamStats.away.pointsPerGame;
    const defensiveAdjustment = (teamStats.home.pointsAllowedPerGame + teamStats.away.pointsAllowedPerGame) / 2;
    const predictedTotal = (totalPoints + defensiveAdjustment) / 2;

    // Key factors analysis
    const keyFactors = this.identifyKeyFactors(input);

    // Generate analysis text
    const analysis = this.generateAnalysisText(input, {
      homeStrength: adjustedHomeStrength,
      awayStrength,
      predictedSpread,
      predictedTotal,
      keyFactors
    });

    return {
      gameId: input.gameId,
      predictedWinner,
      confidence: Math.round(confidence),
      spread: Math.round(predictedSpread * 10) / 10,
      overUnder: Math.round(predictedTotal * 10) / 10,
      keyFactors,
      analysis,
      model: 'Oracle-ML-v2.1',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate team strength rating
   */
  private calculateTeamStrength(stats: TeamStats): number {
    const offensiveRating = (stats.pointsPerGame * 0.4) + (stats.yardsPerGame * 0.01);
    const defensiveRating = 30 - (stats.pointsAllowedPerGame * 0.4) - (stats.yardsAllowedPerGame * 0.01);
    const efficiencyBonus = (stats.redZoneEfficiency + stats.thirdDownConversion) * 0.1;
    const turnoverBonus = stats.turnoverDifferential * 2;

    return offensiveRating + defensiveRating + efficiencyBonus + turnoverBonus;
  }

  /**
   * Identify key factors for the prediction
   */
  private identifyKeyFactors(input: PredictionInput): string[] {
    const factors: string[] = [];
    const { teamStats, odds, weather } = input;

    // Offensive advantage
    const offensiveDiff = teamStats.home.pointsPerGame - teamStats.away.pointsAllowedPerGame;
    if (offensiveDiff > 7) {
      factors.push(`${input.homeTeam.displayName} offensive advantage (${offensiveDiff.toFixed(1)} pt differential)`);
    }

    // Defensive advantage
    const defensiveDiff = teamStats.away.pointsPerGame - teamStats.home.pointsAllowedPerGame;
    if (defensiveDiff < -3) {
      factors.push(`${input.homeTeam.displayName} strong defensive performance`);
    }

    // Turnover differential
    if (Math.abs(teamStats.home.turnoverDifferential - teamStats.away.turnoverDifferential) > 5) {
      const betterTeam = teamStats.home.turnoverDifferential > teamStats.away.turnoverDifferential 
        ? input.homeTeam.displayName 
        : input.awayTeam.displayName;
      factors.push(`${betterTeam} significant turnover advantage`);
    }

    // Weather impact
    if (weather && (weather.windSpeed > 15 || weather.precipitation > 0.1)) {
      factors.push('Weather conditions may impact passing game');
    }

    // Betting market insights
    if (odds.spread !== 0) {
      factors.push(`Vegas spread: ${odds.spread > 0 ? '+' : ''}${odds.spread}`);
    }

    return factors.slice(0, 5); // Limit to top 5 factors
  }

  /**
   * Generate human-readable analysis
   */
  private generateAnalysisText(input: PredictionInput, calculations: any): string {
    const { homeTeam, awayTeam } = input;
    const { predictedSpread, keyFactors } = calculations;
    
    const favored = predictedSpread > 0 ? homeTeam.displayName : awayTeam.displayName;
    const spreadValue = Math.abs(predictedSpread);
    
    let analysis = `The Oracle predicts ${favored} will win by ${spreadValue.toFixed(1)} points. `;
    
    if (keyFactors.length > 0) {
      analysis += `Key factors include: ${keyFactors.slice(0, 3).join(', ')}. `;
    }
    
    if (calculations.confidence > 75) {
      analysis += 'This prediction has high confidence based on statistical analysis.';
    } else if (calculations.confidence < 60) {
      analysis += 'This game appears to be very close with limited statistical edge.';
    } else {
      analysis += 'Moderate confidence in this prediction based on available data.';
    }
    
    return analysis;
  }

  /**
   * Store prediction in database
   */
  private async storePrediction(prediction: OraclePrediction): Promise<void> {
    await runQuery(`
      INSERT OR REPLACE INTO oracle_predictions (
        game_id, predicted_winner, confidence, spread, over_under,
        key_factors, analysis, model, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      prediction.gameId,
      prediction.predictedWinner,
      prediction.confidence,
      prediction.spread,
      prediction.overUnder,
      JSON.stringify(prediction.keyFactors),
      prediction.analysis,
      prediction.model,
      prediction.timestamp
    ]);
  }

  /**
   * Get historical matchup data
   */
  private async getHistoricalMatchups(homeTeamId: string, awayTeamId: string): Promise<any[]> {
    // Implementation would fetch historical game data
    // For now, return empty array
    return [];
  }

  /**
   * Get default stats for teams without data
   */
  private getDefaultStats(): TeamStats {
    return {
      pointsPerGame: 20,
      pointsAllowedPerGame: 20,
      yardsPerGame: 350,
      yardsAllowedPerGame: 350,
      turnoverDifferential: 0,
      redZoneEfficiency: 50,
      thirdDownConversion: 40
    };
  }

  /**
   * Update all games data
   */
  async updateAllGames(): Promise<void> {
    try {
      const games = await this.getCurrentGames();
      
      for (const game of games) {
        await runQuery(`
          INSERT OR REPLACE INTO nfl_games (
            id, home_team_id, away_team_id, game_date, week, season,
            status, home_score, away_score, venue, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          game.id,
          game.homeTeam.id,
          game.awayTeam.id,
          game.date,
          game.week,
          game.season,
          game.status,
          game.homeScore || null,
          game.awayScore || null,
          game.venue,
          new Date().toISOString()
        ]);
      }
      
      console.log(`✅ Updated ${games.length} NFL games`);
    } catch (error) {
      console.error('❌ Failed to update games:', error);
    }
  }

  /**
   * Update team statistics
   */
  async updateAllTeamStats(): Promise<void> {
    try {
      const teams = await getRows('SELECT DISTINCT home_team_id as team_id FROM nfl_games UNION SELECT DISTINCT away_team_id as team_id FROM nfl_games');
      
      for (const team of teams) {
        const stats = await this.getTeamStats(team.team_id);
        if (stats) {
          await runQuery(`
            INSERT OR REPLACE INTO team_stats (
              team_id, points_per_game, points_allowed_per_game,
              yards_per_game, yards_allowed_per_game, turnover_differential,
              red_zone_efficiency, third_down_conversion, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            team.team_id,
            stats.pointsPerGame,
            stats.pointsAllowedPerGame,
            stats.yardsPerGame,
            stats.yardsAllowedPerGame,
            stats.turnoverDifferential,
            stats.redZoneEfficiency,
            stats.thirdDownConversion,
            new Date().toISOString()
          ]);
        }
      }
      
      console.log(`✅ Updated stats for ${teams.length} teams`);
    } catch (error) {
      console.error('❌ Failed to update team stats:', error);
    }
  }

  /**
   * Update odds for upcoming games
   */
  async updateOddsForUpcomingGames(): Promise<void> {
    try {
      const upcomingGames = await getRows(`
        SELECT id FROM nfl_games 
        WHERE status = 'scheduled' 
        AND game_date > datetime('now') 
        AND game_date < datetime('now', '+7 days')
      `);
      
      for (const game of upcomingGames) {
        const odds = await this.getGameOdds(game.id);
        if (odds) {
          await runQuery(`
            INSERT OR REPLACE INTO game_odds (
              game_id, spread, over_under, moneyline_home, moneyline_away, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            game.id,
            odds.spread,
            odds.overUnder,
            odds.moneylineHome,
            odds.moneylineAway,
            new Date().toISOString()
          ]);
        }
      }
      
      console.log(`✅ Updated odds for ${upcomingGames.length} upcoming games`);
    } catch (error) {
      console.error('❌ Failed to update odds:', error);
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(): Promise<void> {
    try {
      // Clean predictions older than 30 days
      await runQuery(`
        DELETE FROM oracle_predictions 
        WHERE created_at < datetime('now', '-30 days')
      `);
      
      // Clean completed games older than 90 days
      await runQuery(`
        DELETE FROM nfl_games 
        WHERE status = 'completed' 
        AND game_date < datetime('now', '-90 days')
      `);
      
      console.log('✅ Cleaned up old data');
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
    }
  }

  /**
   * Resolve predictions based on actual game results
   */
  async resolvePredictions(): Promise<void> {
    try {
      const completedGames = await getRows(`
        SELECT g.*, op.id as prediction_id, op.predicted_winner, op.spread, op.over_under
        FROM nfl_games g
        JOIN oracle_predictions op ON g.id = op.game_id
        WHERE g.status = 'completed' 
        AND g.home_score IS NOT NULL 
        AND g.away_score IS NOT NULL
        AND op.is_resolved = 0
      `);

      for (const game of completedGames) {
        const actualSpread = game.home_score - game.away_score;
        const actualTotal = game.home_score + game.away_score;
        
        const winnerCorrect = (
          (game.predicted_winner === game.home_team_id && actualSpread > 0) ||
          (game.predicted_winner === game.away_team_id && actualSpread < 0)
        );
        
        const spreadCorrect = Math.abs(actualSpread - game.spread) <= 3; // Within 3 points
        const totalCorrect = Math.abs(actualTotal - game.over_under) <= 3; // Within 3 points

        await runQuery(`
          UPDATE oracle_predictions 
          SET 
            is_resolved = 1,
            actual_result = ?,
            winner_correct = ?,
            spread_correct = ?,
            total_correct = ?,
            resolved_at = ?
          WHERE id = ?
        `, [
          JSON.stringify({
            winner: actualSpread > 0 ? game.home_team_id : game.away_team_id,
            spread: actualSpread,
            total: actualTotal
          }),
          winnerCorrect ? 1 : 0,
          spreadCorrect ? 1 : 0,
          totalCorrect ? 1 : 0,
          new Date().toISOString(),
          game.prediction_id
        ]);
      }

      console.log(`✅ Resolved ${completedGames.length} predictions`);
    } catch (error) {
      console.error('❌ Failed to resolve predictions:', error);
    }
  }
}

// Export singleton instance
export const sportsDataService = new RealSportsDataService();
export default sportsDataService;
