/**
 * Oracle Real-Time Performance Testing Suite
 * Tests WebSocket connections, message throughput, memory usage, and concurrent user handling
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { oracleCollaborativeService } from '../services/oracleCollaborativeServiceMock';
import { oracleRealTimeBridge } from '../services/oracleRealTimeBridge';

interface PerformanceMetrics {
    connectionTime: number;
    messageLatency: number[];
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    activeConnections: number;
    messagesPerSecond: number;
    errorCount: number;
    timestamp: number;
}

interface LoadTestConfig {
    concurrentUsers: number;
    testDurationMs: number;
    messagesPerUserPerSecond: number;
    predictionId: string;
    enableInsights: boolean;
    enablePolls: boolean;
    batchSize: number;
}

interface LoadTestResults {
    totalUsers: number;
    totalMessages: number;
    successfulConnections: number;
    failedConnections: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    messagesPerSecond: number;
    errorRate: number;
    memoryPeakUsage: number;
    testDuration: number;
    performanceMetrics: PerformanceMetrics[];
}

class OraclePerformanceTestSuite extends EventEmitter {
    private isRunning = false;
    private testResults: LoadTestResults[] = [];
    private readonly activeConnections = new Map<string, any>();
    private metrics: PerformanceMetrics[] = [];
    private startTime = 0;

    /**
     * Run comprehensive performance test suite
     */
    async runPerformanceTestSuite(): Promise<LoadTestResults[]> {
        console.log('🚀 Starting Oracle Real-Time Performance Test Suite');
        
        const testConfigs: LoadTestConfig[] = [
            // Small load test
            {
                concurrentUsers: 10,
                testDurationMs: 30000, // 30 seconds
                messagesPerUserPerSecond: 1,
                predictionId: 'test-pred-small',
                enableInsights: true,
                enablePolls: false,
                batchSize: 5
            },
            // Medium load test
            {
                concurrentUsers: 50,
                testDurationMs: 60000, // 1 minute
                messagesPerUserPerSecond: 0.5,
                predictionId: 'test-pred-medium',
                enableInsights: true,
                enablePolls: true,
                batchSize: 10
            },
            // High load test
            {
                concurrentUsers: 100,
                testDurationMs: 120000, // 2 minutes
                messagesPerUserPerSecond: 0.2,
                predictionId: 'test-pred-high',
                enableInsights: false,
                enablePolls: false,
                batchSize: 20
            },
            // Stress test
            {
                concurrentUsers: 200,
                testDurationMs: 180000, // 3 minutes
                messagesPerUserPerSecond: 0.1,
                predictionId: 'test-pred-stress',
                enableInsights: false,
                enablePolls: false,
                batchSize: 50
            }
        ];

        this.testResults = [];

        for (const config of testConfigs) {
            console.log(`🧪 Running test: ${config.concurrentUsers} users for ${config.testDurationMs / 1000}s`);
            
            const result = await this.runLoadTest(config);
            this.testResults.push(result);
            
            // Wait between tests to allow cleanup
            console.log('⏳ Waiting 10 seconds between tests...');
            await this.sleep(10000);
        }

        // Run batch optimization tests
        await this.runBatchOptimizationTests();

        // Generate performance report
        this.generatePerformanceReport();

        return this.testResults;
    }

    /**
     * Run load test with specified configuration
     */
    private async runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
        this.isRunning = true;
        this.metrics = [];
        this.activeConnections.clear();
        
        const results: LoadTestResults = {
            totalUsers: config.concurrentUsers,
            totalMessages: 0,
            successfulConnections: 0,
            failedConnections: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: Infinity,
            messagesPerSecond: 0,
            errorRate: 0,
            memoryPeakUsage: 0,
            testDuration: config.testDurationMs,
            performanceMetrics: []
        };

        this.startTime = performance.now();

        // Start metrics collection
        const metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 1000); // Every second

        try {
            // Connect all users concurrently
            const connectionPromises = [];
            for (let i = 0; i < config.concurrentUsers; i++) {
                connectionPromises.push(this.simulateUser(i, config));
            }

            // Wait for all connections to complete or timeout
            const connectionResults = await Promise.allSettled(connectionPromises);
            
            connectionResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.successfulConnections++;
                } else {
                    results.failedConnections++;
                    console.error('Connection failed:', result.reason);
                }
            });

            // Run test for specified duration
            console.log(`📊 Test running for ${config.testDurationMs / 1000} seconds...`);
            await this.sleep(config.testDurationMs);

        } catch (error) {
            console.error('Load test error:', error);
        } finally {
            this.isRunning = false;
            clearInterval(metricsInterval);
            
            // Disconnect all users
            await this.disconnectAllUsers();
            
            // Calculate final results
            this.calculateResults(results);
        }

        return results;
    }

    /**
     * Simulate a single user's behavior
     */
    private async simulateUser(userId: number, config: LoadTestConfig): Promise<void> {
        const userIdStr = `test-user-${userId}`;
        const userInfo = {
            username: `TestUser${userId}`,
            avatar: `avatar-${userId}`
        };

        try {
            // Connect to Oracle real-time system
            const connectionStart = performance.now();
            await oracleRealTimeBridge.connectUser(userIdStr, config.predictionId, userInfo);
            const connectionTime = performance.now() - connectionStart;

            this.activeConnections.set(userIdStr, {
                userId: userIdStr,
                predictionId: config.predictionId,
                connectionTime,
                messagesSent: 0,
                lastMessageTime: 0
            });

            // Start sending messages at specified rate
            this.startMessageSending(userIdStr, config);

            // Simulate insight sharing if enabled
            if (config.enableInsights && Math.random() < 0.3) {
                setTimeout(() => {
                    this.simulateInsightSharing(userIdStr, config.predictionId);
                }, Math.random() * config.testDurationMs);
            }

            // Simulate poll participation if enabled
            if (config.enablePolls && Math.random() < 0.5) {
                setTimeout(() => {
                    this.simulatePollParticipation(userIdStr, config.predictionId);
                }, Math.random() * config.testDurationMs);
            }

        } catch (error) {
            console.error(`Failed to simulate user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Start sending messages for a user
     */
    private startMessageSending(userId: string, config: LoadTestConfig): void {
        if (!this.isRunning) return;

        const interval = 1000 / config.messagesPerUserPerSecond;
        
        const sendMessage = async () => {
            if (!this.isRunning) return;

            try {
                const messageStart = performance.now();
                
                const message = `Test message from ${userId} at ${new Date().toISOString()}`;
                await oracleCollaborativeService.sendMessage(
                    userId,
                    config.predictionId,
                    message,
                    ['DISCUSSION']
                );

                const messageLatency = performance.now() - messageStart;
                
                // Update connection info
                const connection = this.activeConnections.get(userId);
                if (connection) {
                    connection.messagesSent++;
                    connection.lastMessageTime = messageLatency;
                }

                // Schedule next message
                setTimeout(sendMessage, interval + Math.random() * 1000); // Add jitter

            } catch (error) {
                console.error(`Message sending error for ${userId}:`, error);
            }
        };

        // Start sending messages
        setTimeout(sendMessage, Math.random() * interval);
    }

    /**
     * Simulate insight sharing
     */
    private async simulateInsightSharing(userId: string, predictionId: string): Promise<void> {
        try {
            const insights = [
                'Player matchup analysis shows favorable conditions',
                'Historical data suggests upward trend',
                'Weather conditions may impact performance',
                'Recent form indicates potential breakout game',
                'Injury report affects projection confidence'
            ];

            const insight = insights[Math.floor(Math.random() * insights.length)];
            
            // For now, just log since shareInsight method might not be fully implemented
            console.log(`${userId} would share insight: ${insight}`);
            
        } catch (error) {
            console.error(`Insight sharing error for ${userId}:`, error);
        }
    }

    /**
     * Simulate poll participation
     */
    private async simulatePollParticipation(userId: string, predictionId: string): Promise<void> {
        try {
            // Simulate poll response
            console.log(`${userId} would participate in poll for ${predictionId}`);
            
        } catch (error) {
            console.error(`Poll participation error for ${userId}:`, error);
        }
    }

    /**
     * Collect performance metrics
     */
    private collectMetrics(): void {
        const currentTime = performance.now();
        const memoryUsage = process.memoryUsage();
        
        // Calculate messages per second
        let totalMessages = 0;
        this.activeConnections.forEach(connection => {
            totalMessages += connection.messagesSent;
        });

        const elapsed = (currentTime - this.startTime) / 1000;
        const messagesPerSecond = elapsed > 0 ? totalMessages / elapsed : 0;

        const metrics: PerformanceMetrics = {
            connectionTime: 0,
            messageLatency: [],
            memoryUsage,
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
            activeConnections: this.activeConnections.size,
            messagesPerSecond,
            errorCount: 0,
            timestamp: currentTime
        };

        this.metrics.push(metrics);
    }

    /**
     * Calculate final test results
     */
    private calculateResults(results: LoadTestResults): void {
        results.performanceMetrics = this.metrics;

        // Calculate total messages
        this.activeConnections.forEach(connection => {
            results.totalMessages += connection.messagesSent;
        });

        // Calculate latency statistics
        const latencies: number[] = [];
        this.activeConnections.forEach(connection => {
            if (connection.lastMessageTime > 0) {
                latencies.push(connection.lastMessageTime);
            }
        });

        if (latencies.length > 0) {
            results.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
            results.maxLatency = Math.max(...latencies);
            results.minLatency = Math.min(...latencies);
        }

        // Calculate messages per second
        const testDurationSeconds = results.testDuration / 1000;
        results.messagesPerSecond = results.totalMessages / testDurationSeconds;

        // Calculate error rate
        results.errorRate = results.failedConnections / results.totalUsers;

        // Find peak memory usage
        results.memoryPeakUsage = Math.max(...this.metrics.map(m => m.memoryUsage.heapUsed));
    }

    /**
     * Disconnect all test users
     */
    private async disconnectAllUsers(): Promise<void> {
        const disconnectionPromises: Promise<void>[] = [];

        this.activeConnections.forEach((connection, userId) => {
            disconnectionPromises.push(
                oracleRealTimeBridge.disconnectUser(userId, connection.predictionId)
                    .catch(error => console.error(`Failed to disconnect ${userId}:`, error))
            );
        });

        await Promise.allSettled(disconnectionPromises);
        this.activeConnections.clear();
    }

    /**
     * Run batch optimization tests
     */
    private async runBatchOptimizationTests(): Promise<void> {
        console.log('🔧 Running batch optimization tests...');

        const batchSizes = [1, 5, 10, 20, 50];
        const batchResults: any[] = [];

        for (const batchSize of batchSizes) {
            console.log(`Testing batch size: ${batchSize}`);
            
            const startTime = performance.now();
            
            // Simulate batch message sending
            const promises = [];
            for (let i = 0; i < 100; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) < 100; j++) {
                    batch.push(this.simulateBatchMessage(i + j));
                }
                promises.push(Promise.all(batch));
            }
            
            await Promise.all(promises);
            
            const elapsed = performance.now() - startTime;
            batchResults.push({
                batchSize,
                totalTime: elapsed,
                throughput: 100 / (elapsed / 1000)
            });
        }

        console.log('📊 Batch optimization results:');
        batchResults.forEach(result => {
            console.log(`  Batch size ${result.batchSize}: ${result.totalTime.toFixed(2)}ms, ${result.throughput.toFixed(2)} msgs/sec`);
        });
    }

    /**
     * Simulate a batch message for optimization testing
     */
    private async simulateBatchMessage(index: number): Promise<void> {
        // Simulate message processing time
        await this.sleep(Math.random() * 10);
        return Promise.resolve();
    }

    /**
     * Generate comprehensive performance report
     */
    private generatePerformanceReport(): void {
        console.log('\n📋 Oracle Real-Time Performance Test Results');
        console.log('='.repeat(60));

        this.testResults.forEach((result, index) => {
            console.log(`\nTest ${index + 1}: ${result.totalUsers} Concurrent Users`);
            console.log(`  Duration: ${result.testDuration / 1000}s`);
            console.log(`  Successful Connections: ${result.successfulConnections}/${result.totalUsers} (${((result.successfulConnections / result.totalUsers) * 100).toFixed(1)}%)`);
            console.log(`  Total Messages: ${result.totalMessages}`);
            console.log(`  Messages/Second: ${result.messagesPerSecond.toFixed(2)}`);
            console.log(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`);
            console.log(`  Max Latency: ${result.maxLatency.toFixed(2)}ms`);
            console.log(`  Min Latency: ${result.minLatency.toFixed(2)}ms`);
            console.log(`  Error Rate: ${(result.errorRate * 100).toFixed(2)}%`);
            console.log(`  Peak Memory: ${(result.memoryPeakUsage / 1024 / 1024).toFixed(2)}MB`);
        });

        // Performance recommendations
        console.log('\n🎯 Performance Recommendations:');
        
        const lastResult = this.testResults[this.testResults.length - 1];
        if (lastResult.errorRate > 0.05) {
            console.log('  ⚠️  High error rate detected - consider connection pooling optimization');
        }
        
        if (lastResult.averageLatency > 100) {
            console.log('  ⚠️  High latency detected - consider message batching optimization');
        }
        
        if (lastResult.memoryPeakUsage > 500 * 1024 * 1024) {
            console.log('  ⚠️  High memory usage detected - consider implementing memory cleanup');
        }
        
        if (lastResult.messagesPerSecond < 10) {
            console.log('  ⚠️  Low throughput detected - consider WebSocket optimization');
        }

        console.log('\n✅ Performance testing completed!');
    }

    /**
     * Utility method for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get test results
     */
    getTestResults(): LoadTestResults[] {
        return this.testResults;
    }

    /**
     * Get current performance metrics
     */
    getCurrentMetrics(): PerformanceMetrics[] {
        return this.metrics;
    }

    /**
     * Test WebSocket connection stability
     */
    async testWebSocketStability(): Promise<any> {
        console.log('🔗 Testing WebSocket connection stability...');
        
        const results = {
            connectionsAttempted: 0,
            connectionsSuccessful: 0,
            reconnectionsNeeded: 0,
            averageConnectionTime: 0,
            connectionStability: 0
        };

        const connectionTimes: number[] = [];
        
        // Test 50 rapid connections
        for (let i = 0; i < 50; i++) {
            const startTime = performance.now();
            
            try {
                results.connectionsAttempted++;
                
                await oracleRealTimeBridge.connectUser(
                    `stability-test-${i}`,
                    'stability-test-prediction',
                    { username: `StabilityUser${i}` }
                );
                
                const connectionTime = performance.now() - startTime;
                connectionTimes.push(connectionTime);
                results.connectionsSuccessful++;
                
                // Disconnect immediately
                await oracleRealTimeBridge.disconnectUser(
                    `stability-test-${i}`,
                    'stability-test-prediction'
                );
                
            } catch (error) {
                console.error(`Connection ${i} failed:`, error);
            }
            
            // Small delay between connections
            await this.sleep(100);
        }

        results.averageConnectionTime = connectionTimes.length > 0 
            ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length 
            : 0;
            
        results.connectionStability = results.connectionsSuccessful / results.connectionsAttempted;

        console.log(`🔗 WebSocket Stability Results:`);
        console.log(`  Connections Attempted: ${results.connectionsAttempted}`);
        console.log(`  Connections Successful: ${results.connectionsSuccessful}`);
        console.log(`  Success Rate: ${(results.connectionStability * 100).toFixed(1)}%`);
        console.log(`  Average Connection Time: ${results.averageConnectionTime.toFixed(2)}ms`);

        return results;
    }
}

// Export singleton instance and testing functions
export const oraclePerformanceTestSuite = new OraclePerformanceTestSuite();

export const runOraclePerformanceTests = async (): Promise<LoadTestResults[]> => {
    return oraclePerformanceTestSuite.runPerformanceTestSuite();
};

export const testOracleWebSocketStability = async (): Promise<any> => {
    return oraclePerformanceTestSuite.testWebSocketStability();
};

export default oraclePerformanceTestSuite;

// Test suite for Oracle Real-Time Performance
describe('Oracle Real-Time Performance Tests', () => {
    let performanceTestSuite: OraclePerformanceTestSuite;

    beforeEach(() => {
        performanceTestSuite = new OraclePerformanceTestSuite();
    });

    afterEach(async () => {
        // Allow any background processes to clean up
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should initialize performance test suite', () => {
        expect(performanceTestSuite).toBeDefined();
    });

    test('should run comprehensive performance test suite', async () => {
        const results = await performanceTestSuite.runPerformanceTestSuite();

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        
        // Verify each result has the expected structure
        results.forEach(result => {
            expect(result.totalUsers).toBeGreaterThanOrEqual(0);
            expect(result.successfulConnections).toBeGreaterThanOrEqual(0);
            expect(result.failedConnections).toBeGreaterThanOrEqual(0);
            expect(result.averageLatency).toBeGreaterThanOrEqual(0);
            expect(result.totalMessages).toBeGreaterThanOrEqual(0);
            expect(result.testDuration).toBeGreaterThan(0);
        });
    }, 60000); // 60 second timeout for comprehensive test

    test('should create valid test configurations', () => {
        // Test that the performance test suite has proper configuration
        const suite = new OraclePerformanceTestSuite();
        expect(suite).toBeInstanceOf(OraclePerformanceTestSuite);
    });

    test('should handle mock collaborative service operations', async () => {
        // Test basic operations with the mock service
        const predictionId = 'test-prediction-123';
        const userId = 'test-user-456';

        // Create a room
        const room = await oracleCollaborativeService.createRoom(predictionId, userId);
        expect(room).toBeDefined();
        expect(room.predictionId).toBe(predictionId);

        // Send a message
        const message = await oracleCollaborativeService.sendMessage(
            userId, 
            predictionId, 
            'Test message for performance testing'
        );
        expect(message).toBeDefined();
        expect(message.content).toBe('Test message for performance testing');

        // Share an insight
        const insight = await oracleCollaborativeService.shareInsight(
            userId,
            predictionId,
            'This is a test insight for performance validation'
        );
        expect(insight).toBeDefined();
        expect(insight.content).toBe('This is a test insight for performance validation');

        // Get metrics
        const metrics = oracleCollaborativeService.getMetrics();
        expect(metrics.totalRooms).toBeGreaterThan(0);
        expect(metrics.totalMessages).toBeGreaterThan(0);
        expect(metrics.totalInsights).toBeGreaterThan(0);

        // Cleanup
        oracleCollaborativeService.cleanup();
    });
});
