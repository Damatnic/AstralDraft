/**
 * Oracle Real-Time WebSocket Server
 * Handles real-time Oracle prediction updates and user interactions
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { databaseService } from '../services/databaseService';

// WebSocket message types for Oracle predictions
export interface OracleWebSocketMessage {
    type: 'SUBMIT_PREDICTION' | 'PREDICTION_UPDATE' | 'USER_PREDICTION_SUBMITTED' | 
          'CONSENSUS_UPDATE' | 'TIME_WARNING' | 'USER_STATS_UPDATE' | 'CONNECTION_STATUS' |
          'SUBSCRIBE_WEEK' | 'UNSUBSCRIBE_WEEK' | 'HEARTBEAT';
    
    // Message data
    predictionId?: string;
    userId?: number;
    playerNumber?: number;
    username?: string;
    week?: number;
    season?: number;
    
    // Prediction submission data
    choice?: number;
    confidence?: number;
    reasoning?: string;
    
    // Update data
    prediction?: any;
    consensusChoice?: number;
    consensusConfidence?: number;
    totalParticipants?: number;
    message?: string;
    stats?: any;
    
    // Connection data
    timestamp?: string;
    clientId?: string;
}

export interface OracleConnection {
    ws: WebSocket;
    playerNumber?: number;
    userId?: number;
    username?: string;
    subscribedWeeks: Set<number>;
    lastSeen: number;
    isAuthenticated: boolean;
    clientId: string;
}

export class OracleWebSocketServer {
    private wss: WebSocketServer;
    private connections: Map<string, OracleConnection> = new Map();
    private weekSubscriptions: Map<number, Set<string>> = new Map(); // week -> clientIds
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(port: number = 8766) {
        this.wss = new WebSocketServer({ 
            port,
            perMessageDeflate: false,
            maxPayload: 16 * 1024 // 16KB max message size
        });

        this.setupWebSocketServer();
        this.startHeartbeat();

        console.log(`🔮 Oracle WebSocket server running on port ${port}`);
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            const clientId = this.generateClientId();
            const connection: OracleConnection = {
                ws,
                subscribedWeeks: new Set(),
                lastSeen: Date.now(),
                isAuthenticated: false,
                clientId
            };

            this.connections.set(clientId, connection);
            console.log(`📱 Oracle client connected: ${clientId}`);

            // Send welcome message
            this.sendToClient(clientId, {
                type: 'CONNECTION_STATUS',
                message: 'Connected to Oracle WebSocket server',
                clientId,
                timestamp: new Date().toISOString()
            });

            // Handle messages
            ws.on('message', (data: Buffer) => {
                this.handleMessage(clientId, data);
            });

            // Handle disconnection
            ws.on('close', () => {
                this.handleDisconnection(clientId);
            });

            // Handle errors
            ws.on('error', (error: Error) => {
                console.error(`❌ WebSocket error for client ${clientId}:`, error);
                this.handleDisconnection(clientId);
            });
        });

        this.wss.on('error', (error: Error) => {
            console.error('❌ Oracle WebSocket server error:', error);
        });
    }

    private async handleMessage(clientId: string, data: Buffer): Promise<void> {
        const connection = this.connections.get(clientId);
        if (!connection) return;

        try {
            const message: OracleWebSocketMessage = JSON.parse(data.toString());
            connection.lastSeen = Date.now();

            console.log(`📨 Oracle message from ${clientId}:`, message.type);

            switch (message.type) {
                case 'HEARTBEAT':
                    this.sendToClient(clientId, {
                        type: 'HEARTBEAT',
                        timestamp: new Date().toISOString()
                    });
                    break;

                case 'SUBSCRIBE_WEEK':
                    await this.handleWeekSubscription(clientId, message);
                    break;

                case 'UNSUBSCRIBE_WEEK':
                    await this.handleWeekUnsubscription(clientId, message);
                    break;

                case 'SUBMIT_PREDICTION':
                    await this.handlePredictionSubmission(clientId, message);
                    break;

                default:
                    console.log(`❓ Unknown Oracle message type: ${message.type}`);
            }

        } catch (error) {
            console.error(`❌ Error handling Oracle message from ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'CONNECTION_STATUS',
                message: 'Error processing message',
                timestamp: new Date().toISOString()
            });
        }
    }

    private async handleWeekSubscription(clientId: string, message: OracleWebSocketMessage): Promise<void> {
        const connection = this.connections.get(clientId);
        if (!connection || !message.week) return;

        const week = message.week;
        const playerNumber = message.playerNumber;
        const pin = message.reasoning; // Using reasoning field to pass PIN for auth

        // Authenticate user if not already authenticated
        if (!connection.isAuthenticated && playerNumber && pin) {
            try {
                const user = await databaseService.authenticateUser(playerNumber, pin);
                if (user) {
                    connection.isAuthenticated = true;
                    connection.playerNumber = user.playerNumber;
                    connection.userId = user.id;
                    connection.username = user.username;
                    
                    console.log(`✅ Oracle client ${clientId} authenticated as ${user.username}`);
                }
            } catch (error) {
                console.error('Oracle authentication error:', error);
                this.sendToClient(clientId, {
                    type: 'CONNECTION_STATUS',
                    message: 'Authentication failed',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }

        // Subscribe to week
        connection.subscribedWeeks.add(week);
        
        if (!this.weekSubscriptions.has(week)) {
            this.weekSubscriptions.set(week, new Set());
        }
        this.weekSubscriptions.get(week)!.add(clientId);

        console.log(`📅 Client ${clientId} subscribed to week ${week}`);

        // Send current week predictions
        try {
            const predictions = await databaseService.getWeeklyPredictions(week);
            this.sendToClient(clientId, {
                type: 'PREDICTION_UPDATE',
                week,
                prediction: predictions,
                message: `Subscribed to week ${week} predictions`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching week predictions:', error);
        }
    }

    private async handleWeekUnsubscription(clientId: string, message: OracleWebSocketMessage): Promise<void> {
        const connection = this.connections.get(clientId);
        if (!connection || !message.week) return;

        const week = message.week;
        connection.subscribedWeeks.delete(week);
        
        const weekSubs = this.weekSubscriptions.get(week);
        if (weekSubs) {
            weekSubs.delete(clientId);
            if (weekSubs.size === 0) {
                this.weekSubscriptions.delete(week);
            }
        }

        console.log(`📅 Client ${clientId} unsubscribed from week ${week}`);
    }

    private async handlePredictionSubmission(clientId: string, message: OracleWebSocketMessage): Promise<void> {
        const connection = this.connections.get(clientId);
        if (!connection || !connection.isAuthenticated) {
            this.sendToClient(clientId, {
                type: 'CONNECTION_STATUS',
                message: 'Authentication required for prediction submission',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (!message.predictionId || message.choice === undefined || message.confidence === undefined) {
            this.sendToClient(clientId, {
                type: 'CONNECTION_STATUS',
                message: 'Invalid prediction submission data',
                timestamp: new Date().toISOString()
            });
            return;
        }

        try {
            // Submit prediction using database service
            const success = await databaseService.submitPrediction(
                connection.playerNumber!,
                message.predictionId,
                message.choice,
                message.confidence,
                message.reasoning
            );

            if (success) {
                // Broadcast to all subscribers of the prediction's week
                await this.broadcastPredictionUpdate(message.predictionId, {
                    type: 'USER_PREDICTION_SUBMITTED',
                    predictionId: message.predictionId,
                    userId: connection.userId,
                    playerNumber: connection.playerNumber,
                    username: connection.username,
                    choice: message.choice,
                    confidence: message.confidence,
                    timestamp: new Date().toISOString()
                });

                // Send confirmation to submitter
                this.sendToClient(clientId, {
                    type: 'CONNECTION_STATUS',
                    message: 'Prediction submitted successfully',
                    predictionId: message.predictionId,
                    timestamp: new Date().toISOString()
                });

            } else {
                this.sendToClient(clientId, {
                    type: 'CONNECTION_STATUS',
                    message: 'Failed to submit prediction',
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error submitting prediction via WebSocket:', error);
            this.sendToClient(clientId, {
                type: 'CONNECTION_STATUS',
                message: 'Error submitting prediction',
                timestamp: new Date().toISOString()
            });
        }
    }

    private async broadcastPredictionUpdate(predictionId: string, message: OracleWebSocketMessage): Promise<void> {
        // Find which weeks are affected and broadcast to subscribers
        try {
            // You could fetch the prediction to get its week, for now broadcast to all active connections
            const activeConnections = Array.from(this.connections.values())
                .filter(conn => conn.ws.readyState === WebSocket.OPEN);

            for (const connection of activeConnections) {
                this.sendToConnection(connection, message);
            }

        } catch (error) {
            console.error('Error broadcasting prediction update:', error);
        }
    }

    private sendToClient(clientId: string, message: OracleWebSocketMessage): void {
        const connection = this.connections.get(clientId);
        if (connection) {
            this.sendToConnection(connection, message);
        }
    }

    private sendToConnection(connection: OracleConnection, message: OracleWebSocketMessage): void {
        if (connection.ws.readyState === WebSocket.OPEN) {
            try {
                connection.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
            }
        }
    }

    private handleDisconnection(clientId: string): void {
        const connection = this.connections.get(clientId);
        if (connection) {
            // Remove from week subscriptions
            for (const week of connection.subscribedWeeks) {
                const weekSubs = this.weekSubscriptions.get(week);
                if (weekSubs) {
                    weekSubs.delete(clientId);
                    if (weekSubs.size === 0) {
                        this.weekSubscriptions.delete(week);
                    }
                }
            }

            this.connections.delete(clientId);
            console.log(`📱 Oracle client disconnected: ${clientId}`);
        }
    }

    private generateClientId(): string {
        return `oracle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeout = 60000; // 60 seconds

            for (const [clientId, connection] of this.connections) {
                if (now - connection.lastSeen > timeout) {
                    console.log(`💔 Oracle client ${clientId} timed out`);
                    connection.ws.terminate();
                    this.handleDisconnection(clientId);
                }
            }
        }, 30000); // Check every 30 seconds
    }

    public getStats() {
        return {
            totalConnections: this.connections.size,
            authenticatedConnections: Array.from(this.connections.values())
                .filter(conn => conn.isAuthenticated).length,
            weekSubscriptions: Object.fromEntries(
                Array.from(this.weekSubscriptions.entries()).map(([week, clients]) => [week, clients.size])
            )
        };
    }

    public close(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.wss.close();
        console.log('🔮 Oracle WebSocket server closed');
    }
}

export default OracleWebSocketServer;
