/**
 * WebSocket Draft Server
 * Handles real-time draft room connections and synchronization
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

// Oracle Prediction Interfaces
export interface OraclePredictionUpdate {
  id: string;
  type: 'NEW_PREDICTION' | 'USER_SUBMISSION' | 'CONSENSUS_UPDATE' | 'RESULT_AVAILABLE';
  prediction?: {
    id: string;
    question: string;
    options: Array<{ text: string; probability: number }>;
    oracleChoice: number;
    consensusChoice?: number;
    userSubmissions: number;
    week: number;
  };
  userSubmission?: {
    userId: string;
    predictionId: string;
    choice: number;
    confidence: number;
  };
  consensusData?: {
    predictionId: string;
    choice: number;
    percentage: number;
    totalVotes: number;
  };
  result?: {
    predictionId: string;
    correctChoice: number;
    oracleWon: boolean;
    communityWon: boolean;
  };
}

export interface DraftRoom {
  leagueId: string;
  participants: Map<string, {
    ws: WebSocket;
    userId: string;
    teamId: number;
    lastSeen: number;
  }>;
  draftState: {
    status: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    currentRound: number;
    currentPick: number;
    currentPicker: number;
    timePerPick: number;
    timeRemaining: number;
    isPaused: boolean;
    picks: Array<{
      teamId: number;
      playerId: number;
      pickNumber: number;
      timestamp: number;
    }>;
    chatMessages: Array<{
      userId: string;
      message: string;
      timestamp: number;
      isTradeProposal?: boolean;
    }>;
  };
  timer?: NodeJS.Timeout;
}

class DraftWebSocketServer {
  private wss: WebSocketServer;
  private readonly server: any;
  private readonly app: express.Application;
  private readonly draftRooms: Map<string, DraftRoom> = new Map();
  private readonly oracleConnections: Map<string, {
    ws: WebSocket;
    userId: string;
    lastSeen: number;
  }> = new Map();
  private readonly port: number;

  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.setupExpress();
    this.server = createServer(this.app);
    this.setupWebSocket();
  }

  private setupExpress(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Draft room status endpoint
    this.app.get('/api/draft-rooms/:leagueId', (req, res) => {
      const { leagueId } = req.params;
      const room = this.draftRooms.get(leagueId);
      
      if (!room) {
        return res.status(404).json({ error: 'Draft room not found' });
      }

      res.json({
        leagueId: room.leagueId,
        status: room.draftState.status,
        currentRound: room.draftState.currentRound,
        currentPick: room.draftState.currentPick,
        participantCount: room.participants.size,
        participants: Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          teamId: p.teamId,
          isOnline: true,
          lastSeen: p.lastSeen
        }))
      });
    });

    // Create or join draft room endpoint
    this.app.post('/api/draft-rooms/:leagueId/join', (req, res) => {
      const { leagueId } = req.params;
      const { userId, teamId } = req.body;

      if (!userId || !teamId) {
        return res.status(400).json({ error: 'userId and teamId are required' });
      }

      let room = this.draftRooms.get(leagueId);
      if (!room) {
        this.createDraftRoom(leagueId);
        room = this.draftRooms.get(leagueId)!;
      }

      res.json({
        message: 'Draft room ready',
        leagueId,
        wsUrl: `ws://localhost:${this.port}/draft-room?leagueId=${leagueId}&userId=${userId}`
      });
    });
  }

  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/draft-room'
    });

    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const leagueId = url.searchParams.get('leagueId');
      const userId = url.searchParams.get('userId');

      if (!leagueId || !userId) {
        ws.close(1008, 'Missing leagueId or userId');
        return;
      }

      this.handleConnection(ws, leagueId, userId);
    });

    // Oracle Predictions WebSocket Server
    const oracleWss = new WebSocketServer({
      server: this.server,
      path: '/oracle-predictions'
    });

    oracleWss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        ws.close(1008, 'Missing userId');
        return;
      }

      this.handleOracleConnection(ws, userId);
    });

    console.log('WebSocket server configured with draft and oracle endpoints');
  }

  private handleConnection(ws: WebSocket, leagueId: string, userId: string): void {
    console.log(`User ${userId} connecting to draft room ${leagueId}`);

    let room = this.draftRooms.get(leagueId);
    if (!room) {
      room = this.createDraftRoom(leagueId);
    }

    // Assign team ID based on available slots
    const teamId = this.getAvailableTeamId(room);
    
    // Add participant to room
    room.participants.set(userId, {
      ws,
      userId,
      teamId,
      lastSeen: Date.now()
    });

    // Send initial draft state
    this.sendMessage(ws, {
      type: 'DRAFT_STATUS',
      data: {
        leagueId,
        status: room.draftState.status,
        currentRound: room.draftState.currentRound,
        currentPick: room.draftState.currentPick,
        participants: Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          teamId: p.teamId,
          isOnline: true,
          lastSeen: p.lastSeen
        }))
      }
    });

    // Broadcast user joined
    this.broadcastToRoom(leagueId, {
      type: 'USER_JOINED',
      data: {
        leagueId,
        userId,
        teamId,
        timestamp: Date.now()
      }
    }, userId);

    // Setup message handlers
    ws.on('message', (data) => {
      this.handleMessage(leagueId, userId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(leagueId, userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
    });

    // Start draft timer if enough participants
    if (room.participants.size >= 2 && room.draftState.status === 'WAITING') {
      this.startDraft(leagueId);
    }
  }

  private handleMessage(leagueId: string, userId: string, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      const room = this.draftRooms.get(leagueId);
      
      if (!room) return;

      switch (message.type) {
        case 'PING': {
          // Heartbeat response
          const participant = room.participants.get(userId);
          if (participant) {
            participant.lastSeen = Date.now();
            this.sendMessage(participant.ws, { type: 'PONG' });
          }
          break;
        }

        case 'PICK_MADE':
          this.handlePickMade(leagueId, userId, message.data);
          break;

        case 'CHAT_MESSAGE':
          this.handleChatMessage(leagueId, userId, message.data);
          break;

        case 'TIMER_UPDATE':
          this.handleTimerUpdate(leagueId, userId, message.data);
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handlePickMade(leagueId: string, userId: string, data: any): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant) return;

    // Verify it's the participant's turn
    if (room.draftState.currentPicker !== participant.teamId) {
      return;
    }

    // Add pick to draft state
    room.draftState.picks.push({
      teamId: participant.teamId,
      playerId: data.playerId,
      pickNumber: room.draftState.currentPick,
      timestamp: Date.now()
    });

    // Advance to next pick
    this.advanceToNextPick(room);

    // Broadcast pick to all participants
    this.broadcastToRoom(leagueId, {
      type: 'PICK_MADE',
      data: {
        leagueId,
        teamId: participant.teamId,
        playerId: data.playerId,
        pickNumber: room.draftState.currentPick - 1,
        timestamp: Date.now()
      }
    });

    // Send updated draft status
    this.sendDraftStatus(leagueId);
  }

  private handleChatMessage(leagueId: string, userId: string, data: any): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    const chatMessage = {
      userId,
      message: data.message,
      timestamp: Date.now(),
      isTradeProposal: data.isTradeProposal || false
    };

    room.draftState.chatMessages.push(chatMessage);

    // Keep only last 100 messages
    if (room.draftState.chatMessages.length > 100) {
      room.draftState.chatMessages.shift();
    }

    // Broadcast chat message
    this.broadcastToRoom(leagueId, {
      type: 'CHAT_MESSAGE',
      data: {
        leagueId,
        ...chatMessage
      }
    });
  }

  private handleTimerUpdate(leagueId: string, userId: string, data: any): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    // Only allow commissioner or current picker to pause/resume
    room.draftState.isPaused = data.isPaused;

    if (data.isPaused) {
      this.pauseDraftTimer(leagueId);
    } else {
      this.resumeDraftTimer(leagueId);
    }

    this.sendTimerUpdate(leagueId);
  }

  private handleDisconnection(leagueId: string, userId: string): void {
    console.log(`User ${userId} disconnected from draft room ${leagueId}`);
    
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (participant) {
      // Broadcast user left
      this.broadcastToRoom(leagueId, {
        type: 'USER_LEFT',
        data: {
          leagueId,
          userId,
          teamId: participant.teamId,
          timestamp: Date.now()
        }
      }, userId);

      room.participants.delete(userId);

      // Clean up room if empty
      if (room.participants.size === 0) {
        if (room.timer) {
          clearInterval(room.timer);
        }
        this.draftRooms.delete(leagueId);
        console.log(`Draft room ${leagueId} cleaned up`);
      }
    }
  }

  private createDraftRoom(leagueId: string): DraftRoom {
    const room: DraftRoom = {
      leagueId,
      participants: new Map(),
      draftState: {
        status: 'WAITING',
        currentRound: 1,
        currentPick: 1,
        currentPicker: 1,
        timePerPick: 120, // 2 minutes
        timeRemaining: 120,
        isPaused: false,
        picks: [],
        chatMessages: []
      }
    };

    this.draftRooms.set(leagueId, room);
    console.log(`Created draft room for league ${leagueId}`);
    return room;
  }

  private getAvailableTeamId(room: DraftRoom): number {
    const usedTeamIds = new Set(Array.from(room.participants.values()).map(p => p.teamId));
    for (let i = 1; i <= 12; i++) {
      if (!usedTeamIds.has(i)) {
        return i;
      }
    }
    return 1; // Fallback
  }

  private startDraft(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    room.draftState.status = 'ACTIVE';
    room.draftState.timeRemaining = room.draftState.timePerPick;
    
    this.startDraftTimer(leagueId);
    this.sendDraftStatus(leagueId);

    console.log(`Draft started for league ${leagueId}`);
  }

  private startDraftTimer(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    if (room.timer) {
      clearInterval(room.timer);
    }

    room.timer = setInterval(() => {
      if (room.draftState.isPaused) return;

      room.draftState.timeRemaining--;

      if (room.draftState.timeRemaining <= 0) {
        // Time expired, auto-pick or skip
        this.handleTimeExpired(leagueId);
      } else {
        this.sendTimerUpdate(leagueId);
      }
    }, 1000);
  }

  private pauseDraftTimer(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room?.timer) return;

    clearInterval(room.timer);
    room.timer = undefined;
  }

  private resumeDraftTimer(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    this.startDraftTimer(leagueId);
  }

  private handleTimeExpired(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    // Auto-pick the highest ranked available player
    const autoPick = {
      teamId: room.draftState.currentPicker,
      playerId: 999, // Mock auto-pick player ID
      pickNumber: room.draftState.currentPick,
      timestamp: Date.now()
    };

    room.draftState.picks.push(autoPick);
    this.advanceToNextPick(room);

    // Broadcast auto-pick
    this.broadcastToRoom(leagueId, {
      type: 'PICK_MADE',
      data: {
        leagueId,
        ...autoPick,
        isAutoPick: true
      }
    });

    this.sendDraftStatus(leagueId);
  }

  private advanceToNextPick(room: DraftRoom): void {
    room.draftState.currentPick++;
    
    // Calculate next picker (snake draft logic)
    const totalTeams = 12; // Assuming 12 teams
    const isEvenRound = room.draftState.currentRound % 2 === 0;
    
    if (isEvenRound) {
      // Reverse order in even rounds
      room.draftState.currentPicker--;
      if (room.draftState.currentPicker < 1) {
        room.draftState.currentRound++;
        room.draftState.currentPicker = 1;
      }
    } else {
      // Normal order in odd rounds
      room.draftState.currentPicker++;
      if (room.draftState.currentPicker > totalTeams) {
        room.draftState.currentRound++;
        room.draftState.currentPicker = totalTeams;
      }
    }

    // Reset timer
    room.draftState.timeRemaining = room.draftState.timePerPick;

    // Check if draft is complete (15 rounds typical)
    if (room.draftState.currentRound > 15) {
      room.draftState.status = 'COMPLETED';
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = undefined;
      }
    }
  }

  private sendDraftStatus(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    this.broadcastToRoom(leagueId, {
      type: 'DRAFT_STATUS',
      data: {
        leagueId,
        status: room.draftState.status,
        currentRound: room.draftState.currentRound,
        currentPick: room.draftState.currentPick,
        participants: Array.from(room.participants.values()).map(p => ({
          userId: p.userId,
          teamId: p.teamId,
          isOnline: true,
          lastSeen: p.lastSeen
        }))
      }
    });
  }

  private sendTimerUpdate(leagueId: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    this.broadcastToRoom(leagueId, {
      type: 'TIMER_UPDATE',
      data: {
        leagueId,
        timeRemaining: room.draftState.timeRemaining,
        currentPicker: room.draftState.currentPicker,
        pickNumber: room.draftState.currentPick,
        isPaused: room.draftState.isPaused
      }
    });
  }

  private broadcastToRoom(leagueId: string, message: any, excludeUserId?: string): void {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    for (const [userId, participant] of room.participants) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      if (participant.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(participant.ws, message);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: any): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // Oracle Prediction WebSocket Handlers
  private handleOracleConnection(ws: WebSocket, userId: string): void {
    console.log(`User ${userId} connecting to Oracle predictions`);

    // Add to Oracle connections
    this.oracleConnections.set(userId, {
      ws,
      userId,
      lastSeen: Date.now()
    });

    // Send initial connection confirmation
    this.sendMessage(ws, {
      type: 'ORACLE_CONNECTION_STATUS',
      data: {
        status: 'connected',
        userId,
        timestamp: new Date().toISOString()
      }
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleOracleMessage(ws, userId, data);
      } catch (error) {
        console.error('Error parsing Oracle message:', error);
        this.sendMessage(ws, {
          type: 'ERROR',
          data: { message: 'Invalid message format' }
        });
      }
    });

    ws.on('close', () => {
      console.log(`User ${userId} disconnected from Oracle predictions`);
      this.oracleConnections.delete(userId);
    });

    ws.on('error', (error) => {
      console.error(`Oracle WebSocket error for user ${userId}:`, error);
      this.oracleConnections.delete(userId);
    });
  }

  private handleOracleMessage(ws: WebSocket, userId: string, data: any): void {
    switch (data.type) {
      case 'SUBMIT_PREDICTION':
        this.handleUserPredictionSubmission(userId, data.payload);
        break;
      case 'REQUEST_PREDICTIONS':
        this.handlePredictionRequest(ws, data.payload);
        break;
      case 'PING':
        this.sendMessage(ws, { type: 'PONG', data: { timestamp: Date.now() } });
        break;
      default:
        console.log(`Unknown Oracle message type: ${data.type}`);
    }
  }

  private handleUserPredictionSubmission(userId: string, payload: any): void {
    const { predictionId, choice, confidence } = payload;
    
    // Broadcast user submission to all Oracle connections
    const update: OraclePredictionUpdate = {
      id: `submission-${Date.now()}`,
      type: 'USER_SUBMISSION',
      userSubmission: {
        userId,
        predictionId,
        choice,
        confidence
      }
    };

    this.broadcastToOracle(update);
    
    // Here you would typically save to database
    console.log(`User ${userId} submitted prediction for ${predictionId}: choice ${choice} with ${confidence}% confidence`);
  }

  private handlePredictionRequest(ws: WebSocket, payload: any): void {
    const { week } = payload;
    
    // Mock prediction data - in real implementation, fetch from Oracle service
    const mockPrediction = {
      id: `prediction-${Date.now()}`,
      question: `Week ${week} Mock Prediction`,
      options: [
        { text: 'Option A', probability: 0.6 },
        { text: 'Option B', probability: 0.4 }
      ],
      oracleChoice: 0,
      consensusChoice: 1,
      userSubmissions: Math.floor(Math.random() * 100),
      week
    };

    this.sendMessage(ws, {
      type: 'NEW_PREDICTION',
      data: mockPrediction
    });
  }

  private broadcastToOracle(update: OraclePredictionUpdate): void {
    const message = {
      type: update.type,
      data: update
    };

    this.oracleConnections.forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.ws, message);
      }
    });
  }

  // Public methods for Oracle prediction updates
  public broadcastNewPrediction(prediction: any): void {
    const update: OraclePredictionUpdate = {
      id: `new-pred-${Date.now()}`,
      type: 'NEW_PREDICTION',
      prediction
    };
    this.broadcastToOracle(update);
  }

  public broadcastConsensusUpdate(predictionId: string, consensusData: any): void {
    const update: OraclePredictionUpdate = {
      id: `consensus-${Date.now()}`,
      type: 'CONSENSUS_UPDATE',
      consensusData: {
        predictionId,
        ...consensusData
      }
    };
    this.broadcastToOracle(update);
  }

  public broadcastPredictionResult(predictionId: string, result: any): void {
    const update: OraclePredictionUpdate = {
      id: `result-${Date.now()}`,
      type: 'RESULT_AVAILABLE',
      result: {
        predictionId,
        ...result
      }
    };
    this.broadcastToOracle(update);
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Draft WebSocket server listening on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`WebSocket endpoint: ws://localhost:${this.port}/draft-room`);
      console.log(`Oracle WebSocket endpoint: ws://localhost:${this.port}/oracle-predictions`);
    });
  }

  public stop(): void {
    this.wss.close();
    this.server.close();
    console.log('Draft WebSocket server stopped');
  }
}

// Export for use in other modules
export default DraftWebSocketServer;

// Start server if run directly
if (require.main === module) {
  const server = new DraftWebSocketServer();
  server.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.stop();
    process.exit(0);
  });
}
