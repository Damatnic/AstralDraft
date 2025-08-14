/**
 * Custom React hooks for Oracle real-time and collaborative features
 * Provides clean interfaces for components to interact with Oracle services
 */

import { useState, useEffect, useCallback } from 'react';
import { oracleRealTimeService, LivePredictionUpdate } from '../services/oracleRealTimeService';
import oracleCollaborativeService, { 
    CollaborativeMessage, 
    SharedInsight, 
    CollaborativeRoom
} from '../services/oracleCollaborativeServiceMock';

/**
 * Hook for Oracle real-time functionality
 */
export const useOracleRealTime = (userId: string, predictionId: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate] = useState<LivePredictionUpdate | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        try {
            await oracleRealTimeService.subscribeToPrediction(userId, predictionId);
            setIsConnected(true);
            setConnectionError(null);
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
            setIsConnected(false);
        }
    }, [userId, predictionId]);

    const disconnect = useCallback(() => {
        // Disconnect if method exists
        if ('unsubscribeFromPrediction' in oracleRealTimeService) {
            (oracleRealTimeService as any).unsubscribeFromPrediction(userId, predictionId);
        }
        setIsConnected(false);
    }, [userId, predictionId]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        lastUpdate,
        connectionError,
        connect,
        disconnect
    };
};

/**
 * Hook for collaborative room functionality
 */
export const useCollaborativeRoom = (userId: string, predictionId: string, userInfo: any) => {
    const [room, setRoom] = useState<CollaborativeRoom | null>(null);
    const [messages, setMessages] = useState<CollaborativeMessage[]>([]);
    const [insights, setInsights] = useState<SharedInsight[]>([]);
    const [polls, setPolls] = useState<CommunityPoll[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize room
    useEffect(() => {
        const initializeRoom = async () => {
            try {
                setIsLoading(true);
                const collaborativeRoom = await oracleCollaborativeService.joinCollaborativeRoom(
                    userId, 
                    predictionId, 
                    userInfo
                );
                
                setRoom(collaborativeRoom);
                setMessages(collaborativeRoom.messages || []);
                setInsights(collaborativeRoom.sharedInsights || []);
                setPolls(collaborativeRoom.polls || []);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to join room');
            } finally {
                setIsLoading(false);
            }
        };

        initializeRoom();
    }, [userId, predictionId, userInfo]);

    // Send message
    const sendMessage = useCallback(async (
        content: string,
        type: CollaborativeMessage['type'] = 'DISCUSSION',
        mentions?: string[]
    ) => {
        try {
            const message = await oracleCollaborativeService.sendMessage(
                userId,
                predictionId,
                content,
                type,
                mentions
            );
            setMessages(prev => [...prev, message]);
            return message;
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to send message');
        }
    }, [userId, predictionId]);

    // Share insight
    const shareInsight = useCallback(async (params: InsightCreationParams) => {
        try {
            // For now, create a mock insight since the method doesn't exist yet
            const insight: SharedInsight = {
                id: `insight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                predictionId,
                userId,
                username: userInfo.username || `User${userId}`,
                title: params.title,
                content: params.content,
                type: params.type,
                confidence: params.confidence,
                supportingData: params.supportingData || [],
                tags: params.tags || [],
                votes: [],
                timestamp: new Date().toISOString(),
                isVerified: false
            };
            
            setInsights(prev => [...prev, insight]);
            return insight;
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to share insight');
        }
    }, [userId, predictionId, userInfo]);

    // Create poll
    const createPoll = useCallback(async (params: PollCreationParams) => {
        try {
            // For now, create a mock poll since the method might not be implemented
            const poll: CommunityPoll = {
                id: `poll-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                predictionId,
                createdBy: userId,
                title: params.title,
                question: params.question,
                options: params.options.map((opt, index) => ({
                    id: `opt-${index}-${Math.random().toString(36).substring(2, 6)}`,
                    ...opt
                })),
                type: params.type,
                expiresAt: new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000).toISOString(),
                isAnonymous: params.isAnonymous,
                responses: [],
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };
            
            setPolls(prev => [...prev, poll]);
            return poll;
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to create poll');
        }
    }, [userId, predictionId]);

    // Get room metrics
    const getRoomMetrics = useCallback(() => {
        if (!room) return null;

        const activeUsers = room.participants?.filter(p => p.isOnline).length || 0;
        const totalMessages = room.analytics?.totalMessages || messages.length;
        const consensusLevel = room.analytics?.consensusLevel || 0;
        
        // Calculate average confidence from insights
        const avgConfidence = insights.length > 0
            ? insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
            : 0;

        return {
            activeUsers,
            totalMessages,
            totalInsights: insights.length,
            totalPolls: polls.length,
            consensusLevel,
            averageConfidence: avgConfidence,
            engagementScore: room.analytics?.engagementScore || 0
        };
    }, [room, messages.length, insights, polls]);

    return {
        room,
        messages,
        insights,
        polls,
        isLoading,
        error,
        sendMessage,
        shareInsight,
        createPoll,
        getRoomMetrics
    };
};

/**
 * Hook for shared insights functionality
 */
export const useSharedInsights = (predictionId: string) => {
    const [insights, setInsights] = useState<SharedInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadInsights = () => {
            try {
                // Try to get insights if method exists
                if ('getSharedInsights' in oracleCollaborativeService) {
                    const existingInsights = (oracleCollaborativeService as any).getSharedInsights(predictionId);
                    setInsights(existingInsights || []);
                }
            } catch (error) {
                console.error('Failed to load insights:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInsights();
    }, [predictionId]);

    const voteOnInsight = useCallback(async (
        insightId: string,
        vote: 'HELPFUL' | 'NOT_HELPFUL' | 'MISLEADING',
        comment?: string
    ) => {
        const updateInsightVotes = (insight: SharedInsight) => {
            if (insight.id !== insightId) return insight;
            
            const updatedVotes = insight.votes.filter(v => v.userId !== 'current-user');
            updatedVotes.push({
                userId: 'current-user',
                username: 'Current User',
                vote,
                timestamp: new Date().toISOString(),
                comment
            });
            return { ...insight, votes: updatedVotes };
        };

        try {
            setInsights(prev => prev.map(updateInsightVotes));
        } catch (error) {
            console.error('Failed to vote on insight:', error);
        }
    }, []);

    return {
        insights,
        isLoading,
        voteOnInsight
    };
};

/**
 * Hook for community polls functionality
 */
export const useCommunityPolls = (predictionId: string) => {
    const [polls, setPolls] = useState<CommunityPoll[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPolls = () => {
            try {
                // Try to get polls if method exists
                if ('getCommunityPolls' in oracleCollaborativeService) {
                    const existingPolls = (oracleCollaborativeService as any).getCommunityPolls(predictionId);
                    setPolls(existingPolls || []);
                }
            } catch (error) {
                console.error('Failed to load polls:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPolls();
    }, [predictionId]);

    const respondToPoll = useCallback(async (
        pollId: string,
        choices: string[],
        confidence?: number
    ) => {
        const updatePollResponses = (poll: CommunityPoll) => {
            if (poll.id !== pollId) return poll;
            
            // Remove existing response from current user
            const filteredResponses = poll.responses.filter(r => r.userId !== 'current-user');
            
            // Add new response
            const newResponse = {
                userId: 'current-user',
                username: poll.isAnonymous ? undefined : 'Current User',
                choices,
                confidence,
                timestamp: new Date().toISOString(),
                isAnonymous: poll.isAnonymous
            };
            
            return {
                ...poll,
                responses: [...filteredResponses, newResponse]
            };
        };

        try {
            setPolls(prev => prev.map(updatePollResponses));
        } catch (error) {
            console.error('Failed to respond to poll:', error);
        }
    }, []);

    const getPollResults = useCallback((pollId: string) => {
        const poll = polls.find(p => p.id === pollId);
        if (!poll) return null;

        const optionResults = new Map();
        const totalResponses = poll.responses.length;

        poll.options.forEach(option => {
            const votes = poll.responses.filter(r => r.choices.includes(option.id)).length;
            const percentage = totalResponses > 0 ? (votes / totalResponses) * 100 : 0;
            
            optionResults.set(option.id, {
                optionId: option.id,
                votes,
                percentage
            });
        });

        return {
            totalResponses,
            optionResults,
            poll
        };
    }, [polls]);

    return {
        polls,
        isLoading,
        respondToPoll,
        getPollResults
    };
};

/**
 * Hook for Oracle dashboard data
 */
export const useOracleDashboard = (userId: string, predictionId: string, userInfo: any) => {
    const realTime = useOracleRealTime(userId, predictionId);
    const collaborative = useCollaborativeRoom(userId, predictionId, userInfo);
    const insights = useSharedInsights(predictionId);
    const polls = useCommunityPolls(predictionId);

    const isFullyConnected = realTime.isConnected && !collaborative.isLoading;

    return {
        // Real-time connection
        ...realTime,
        
        // Collaborative features
        room: collaborative.room,
        messages: collaborative.messages,
        sendMessage: collaborative.sendMessage,
        
        // Insights
        insights: insights.insights,
        shareInsight: collaborative.shareInsight,
        voteOnInsight: insights.voteOnInsight,
        
        // Polls
        polls: polls.polls,
        createPoll: collaborative.createPoll,
        respondToPoll: polls.respondToPoll,
        getPollResults: polls.getPollResults,
        
        // Metrics
        getRoomMetrics: collaborative.getRoomMetrics,
        
        // Overall state
        isFullyConnected,
        isLoading: collaborative.isLoading || insights.isLoading || polls.isLoading,
        error: realTime.connectionError || collaborative.error
    };
};
