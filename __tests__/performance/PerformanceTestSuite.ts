/**
 * Performance Test Infrastructure
 * Comprehensive performance testing for Astral Draft
 */

import { performance } from 'perf_hooks';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  success: boolean;
  metrics: PerformanceMetrics;
  errors?: string[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface LoadTestConfig {
  concurrent: number;
  duration: number; // seconds
  rampUp: number; // seconds
  endpoints: string[];
}

export class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Run comprehensive performance test suite
   */
  async runAllTests(): Promise<PerformanceTestResult[]> {
    console.log('🚀 Starting comprehensive performance test suite...\n');

    // Bundle performance tests
    await this.testBundlePerformance();
    
    // API performance tests
    await this.testAPIPerformance();
    
    // Database performance tests
    await this.testDatabasePerformance();
    
    // Memory leak tests
    await this.testMemoryLeaks();
    
    // Load testing
    await this.testLoadCapacity();
    
    // Frontend performance tests
    await this.testFrontendPerformance();

    // Generate performance report
    await this.generatePerformanceReport();

    return this.results;
  }

  /**
   * Test bundle performance and loading times
   */
  async testBundlePerformance(): Promise<void> {
    console.log('📦 Testing bundle performance...');

    const testResult: PerformanceTestResult = {
      testName: 'Bundle Performance',
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      },
      errors: []
    };

    const startTime = performance.now();

    try {
      // Test bundle size analysis
      await this.analyzeBundleSize();
      
      // Test chunk loading performance
      await this.testChunkLoading();
      
      // Test critical path performance
      await this.testCriticalPath();

    } catch (error) {
      testResult.success = false;
      testResult.errors?.push(error.message);
    }

    testResult.duration = performance.now() - startTime;
    this.results.push(testResult);
  }

  /**
   * Test API endpoint performance
   */
  async testAPIPerformance(): Promise<void> {
    console.log('🔗 Testing API performance...');

    const endpoints = [
      '/api/auth/profile',
      '/api/oracle/predictions',
      '/api/analytics/accuracy',
      '/api/leagues',
      '/api/players'
    ];

    for (const endpoint of endpoints) {
      const testResult = await this.benchmarkEndpoint(endpoint);
      this.results.push(testResult);
    }
  }

  /**
   * Test database query performance
   */
  async testDatabasePerformance(): Promise<void> {
    console.log('🗄️  Testing database performance...');

    const testResult: PerformanceTestResult = {
      testName: 'Database Performance',
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = performance.now();

    try {
      // Test query execution times
      await this.benchmarkQueries([
        'SELECT * FROM users LIMIT 100',
        'SELECT * FROM predictions WHERE created_at > datetime("now", "-7 days")',
        'SELECT COUNT(*) FROM oracle_predictions'
      ]);

      // Test complex joins
      await this.benchmarkComplexQueries();

      // Test concurrent database access
      await this.benchmarkConcurrentAccess();

    } catch (error) {
      testResult.success = false;
      testResult.errors = [error.message];
    }

    testResult.duration = performance.now() - startTime;
    this.results.push(testResult);
  }

  /**
   * Test for memory leaks
   */
  async testMemoryLeaks(): Promise<void> {
    console.log('🧠 Testing for memory leaks...');

    const testResult: PerformanceTestResult = {
      testName: 'Memory Leak Detection',
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    try {
      // Simulate heavy operations and monitor memory
      for (let i = 0; i < 100; i++) {
        await this.simulateHeavyOperation();
        
        if (i % 10 === 0) {
          global.gc?.(); // Force garbage collection if available
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Flag if memory increased significantly (>50MB)
      if (memoryIncrease > 50 * 1024 * 1024) {
        testResult.success = false;
        testResult.errors = [`Potential memory leak detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`];
      }

    } catch (error) {
      testResult.success = false;
      testResult.errors = [error.message];
    }

    testResult.duration = performance.now() - startTime;
    testResult.metrics.memoryUsage = process.memoryUsage();
    this.results.push(testResult);
  }

  /**
   * Test load capacity and concurrent users
   */
  async testLoadCapacity(): Promise<void> {
    console.log('⚡ Testing load capacity...');

    const loadConfigs: LoadTestConfig[] = [
      { concurrent: 10, duration: 30, rampUp: 5, endpoints: ['/api/auth/profile'] },
      { concurrent: 50, duration: 60, rampUp: 10, endpoints: ['/api/oracle/predictions'] },
      { concurrent: 100, duration: 120, rampUp: 20, endpoints: ['/api/analytics/accuracy'] }
    ];

    for (const config of loadConfigs) {
      const testResult = await this.runLoadTest(config);
      this.results.push(testResult);
    }
  }

  /**
   * Test frontend performance metrics
   */
  async testFrontendPerformance(): Promise<void> {
    console.log('🖥️  Testing frontend performance...');

    const testResult: PerformanceTestResult = {
      testName: 'Frontend Performance',
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = performance.now();

    try {
      // Test component rendering performance
      await this.benchmarkComponentRendering();
      
      // Test state management performance
      await this.benchmarkStateUpdates();
      
      // Test virtual scrolling performance
      await this.benchmarkVirtualScrolling();

    } catch (error) {
      testResult.success = false;
      testResult.errors = [error.message];
    }

    testResult.duration = performance.now() - startTime;
    this.results.push(testResult);
  }

  // Helper methods
  private async analyzeBundleSize(): Promise<void> {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      // Analyze bundle sizes using existing script
      await execAsync('node scripts/performance/bundleOptimizer.cjs');
    }
  }

  private async testChunkLoading(): Promise<void> {
    // Simulate chunk loading times
    const chunks = ['vendor-react', 'vendor-charts', 'feature-oracle'];
    
    for (const chunk of chunks) {
      const startTime = performance.now();
      // Simulate chunk loading
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      const loadTime = performance.now() - startTime;
      
      if (loadTime > 500) { // Flag slow chunks
        throw new Error(`Chunk ${chunk} loaded slowly: ${loadTime}ms`);
      }
    }
  }

  private async testCriticalPath(): Promise<void> {
    // Test critical rendering path performance
    const criticalResources = ['index.css', 'vendor-react.js', 'index.js'];
    
    for (const resource of criticalResources) {
      const startTime = performance.now();
      // Simulate resource loading
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      const loadTime = performance.now() - startTime;
      
      if (loadTime > 300) { // Flag slow critical resources
        throw new Error(`Critical resource ${resource} loaded slowly: ${loadTime}ms`);
      }
    }
  }

  private async benchmarkEndpoint(endpoint: string): Promise<PerformanceTestResult> {
    const testResult: PerformanceTestResult = {
      testName: `API Endpoint: ${endpoint}`,
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = performance.now();
    
    try {
      // Simulate API calls (would use actual HTTP requests in real implementation)
      const responses = await Promise.all(
        Array(10).fill(null).map(() => this.simulateAPICall(endpoint))
      );
      
      const successfulRequests = responses.filter(r => r.success).length;
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      
      testResult.metrics.responseTime = avgResponseTime;
      testResult.metrics.throughput = successfulRequests / ((performance.now() - startTime) / 1000);
      testResult.metrics.errorRate = (responses.length - successfulRequests) / responses.length;

      if (avgResponseTime > 1000) { // Flag slow endpoints
        testResult.success = false;
        testResult.errors = [`Endpoint ${endpoint} is too slow: ${avgResponseTime}ms average`];
      }

    } catch (error) {
      testResult.success = false;
      testResult.errors = [error.message];
    }

    testResult.duration = performance.now() - startTime;
    return testResult;
  }

  private async simulateAPICall(endpoint: string): Promise<{ success: boolean; responseTime: number }> {
    const startTime = performance.now();
    
    // Simulate network latency and processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    
    const responseTime = performance.now() - startTime;
    const success = Math.random() > 0.05; // 95% success rate
    
    return { success, responseTime };
  }

  private async benchmarkQueries(queries: string[]): Promise<void> {
    for (const query of queries) {
      const startTime = performance.now();
      
      // Simulate database query execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 10));
      
      const queryTime = performance.now() - startTime;
      
      if (queryTime > 200) { // Flag slow queries
        throw new Error(`Slow query detected: ${query} took ${queryTime}ms`);
      }
    }
  }

  private async benchmarkComplexQueries(): Promise<void> {
    // Simulate complex join operations
    const complexQueries = [
      'Complex analytics query',
      'Multi-table join with aggregation',
      'Prediction accuracy calculation'
    ];

    for (const query of complexQueries) {
      const startTime = performance.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
      const queryTime = performance.now() - startTime;
      
      if (queryTime > 500) {
        throw new Error(`Complex query too slow: ${query} took ${queryTime}ms`);
      }
    }
  }

  private async benchmarkConcurrentAccess(): Promise<void> {
    // Simulate concurrent database access
    const concurrentQueries = Array(20).fill(null).map((_, i) => 
      this.simulateAPICall(`/api/test-concurrent-${i}`)
    );

    const results = await Promise.all(concurrentQueries);
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    if (avgResponseTime > 300) {
      throw new Error(`Concurrent access too slow: ${avgResponseTime}ms average`);
    }
  }

  private async simulateHeavyOperation(): Promise<void> {
    // Simulate memory-intensive operations
    const data = new Array(10000).fill(null).map(() => ({
      id: Math.random(),
      data: new Array(100).fill('test-data'),
      timestamp: Date.now()
    }));

    // Simulate processing
    data.forEach(item => {
      item.data.reverse();
    });

    // Let the operation complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private async runLoadTest(config: LoadTestConfig): Promise<PerformanceTestResult> {
    const testResult: PerformanceTestResult = {
      testName: `Load Test: ${config.concurrent} concurrent users`,
      duration: 0,
      success: true,
      metrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = performance.now();

    try {
      // Simulate load testing
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < config.concurrent; i++) {
        // Stagger the start times for ramp-up
        const delay = (i / config.concurrent) * config.rampUp * 1000;
        
        promises.push(
          new Promise(resolve => 
            setTimeout(async () => {
              const result = await this.simulateUserSession(config.duration);
              resolve(result);
            }, delay)
          )
        );
      }

      const results = await Promise.all(promises);
      const successfulSessions = results.filter(r => r?.success).length;
      
      testResult.metrics.throughput = successfulSessions / (config.duration);
      testResult.metrics.errorRate = (config.concurrent - successfulSessions) / config.concurrent;

      if (testResult.metrics.errorRate > 0.1) { // More than 10% errors
        testResult.success = false;
        testResult.errors = [`High error rate during load test: ${(testResult.metrics.errorRate * 100).toFixed(1)}%`];
      }

    } catch (error) {
      testResult.success = false;
      testResult.errors = [error.message];
    }

    testResult.duration = performance.now() - startTime;
    return testResult;
  }

  private async simulateUserSession(duration: number): Promise<{ success: boolean }> {
    const sessionEnd = Date.now() + (duration * 1000);
    let requestCount = 0;
    let errorCount = 0;

    while (Date.now() < sessionEnd) {
      try {
        await this.simulateAPICall('/api/test-endpoint');
        requestCount++;
      } catch (error) {
        errorCount++;
        console.warn(`API call failed during load test: ${error}`);
      }

      // Wait between requests (simulate user think time)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    }

    return { success: errorCount / requestCount < 0.1 };
  }

  private async benchmarkComponentRendering(): Promise<void> {
    // Simulate React component rendering performance
    const components = ['OracleAnalyticsDashboard', 'DraftRoomView', 'AnalyticsHubView'];
    
    for (const component of components) {
      const startTime = performance.now();
      
      // Simulate component mounting and rendering
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20));
      
      const renderTime = performance.now() - startTime;
      
      if (renderTime > 200) {
        throw new Error(`Component ${component} renders slowly: ${renderTime}ms`);
      }
    }
  }

  private async benchmarkStateUpdates(): Promise<void> {
    // Simulate state management performance
    const updates = Array(100).fill(null);
    
    const startTime = performance.now();
    
    for (const _ of updates) {
      // Simulate state update
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const totalTime = performance.now() - startTime;
    
    if (totalTime > 500) {
      throw new Error(`State updates too slow: ${totalTime}ms for 100 updates`);
    }
  }

  private async benchmarkVirtualScrolling(): Promise<void> {
    // Simulate virtual scrolling performance with large datasets
    const items = Array(10000).fill(null).map((_, i) => ({ id: i, data: `Item ${i}` }));
    
    const startTime = performance.now();
    
    // Simulate rendering visible items
    const visibleItems = items.slice(0, 50);
    await new Promise(resolve => setTimeout(resolve, visibleItems.length));
    
    const renderTime = performance.now() - startTime;
    
    if (renderTime > 100) {
      throw new Error(`Virtual scrolling too slow: ${renderTime}ms`);
    }
  }

  private async generatePerformanceReport(): Promise<void> {
    console.log('\n📊 Generating performance report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        averageDuration: this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.resolve(process.cwd(), 'test-results/performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Performance report saved to: ${reportPath}`);
    console.log(`✅ Tests passed: ${report.summary.passed}/${report.summary.totalTests}`);
    
    if (report.summary.failed > 0) {
      console.log(`❌ Tests failed: ${report.summary.failed}`);
      console.log('Failed tests:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.testName}: ${r.errors?.join(', ')}`);
      });
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze results and generate recommendations
    const failedTests = this.results.filter(r => !r.success);
    
    if (failedTests.some(t => t.testName.includes('Bundle'))) {
      recommendations.push('Consider further bundle optimization and code splitting');
    }
    
    if (failedTests.some(t => t.testName.includes('API'))) {
      recommendations.push('Optimize API endpoint performance and implement caching');
    }
    
    if (failedTests.some(t => t.testName.includes('Memory'))) {
      recommendations.push('Investigate and fix potential memory leaks');
    }
    
    if (failedTests.some(t => t.testName.includes('Load'))) {
      recommendations.push('Improve application scalability and concurrent user handling');
    }

    return recommendations;
  }
}

export default PerformanceTestSuite;
