/**
 * Database Load Testing Service
 * 
 * Simulates hundreds of concurrent users to test database connection pooling
 * and overall system performance under load.
 */

import { apiService } from './apiService';

export interface LoadTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  requestIntervalMs: number;
  endpoints: string[];
}

export interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  activeConnections: number;
  errorRate: number;
  requestsPerSecond: number;
}

export interface LoadTestResult {
  timestamp: number;
  responseTime: number;
  success: boolean;
  error?: string;
  endpoint: string;
  statusCode?: number;
}

export class LoadTestService {
  private isRunning = false;
  private results: LoadTestResult[] = [];
  private activeRequests = 0;
  private startTime = 0;
  private onMetricsUpdate?: (metrics: LoadTestMetrics) => void;
  private onResultUpdate?: (result: LoadTestResult) => void;

  constructor() {}

  /**
   * Start the load test with the given configuration
   */
  async startLoadTest(
    config: LoadTestConfig,
    onMetricsUpdate?: (metrics: LoadTestMetrics) => void,
    onResultUpdate?: (result: LoadTestResult) => void
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    this.isRunning = true;
    this.results = [];
    this.activeRequests = 0;
    this.startTime = Date.now();
    this.onMetricsUpdate = onMetricsUpdate;
    this.onResultUpdate = onResultUpdate;

    console.log(`🚀 Starting load test with ${config.concurrentUsers} concurrent users for ${config.testDurationMs}ms`);

    // Create array of user simulation promises
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i, config));
    }

    // Start all users concurrently
    await Promise.all(userPromises);

    this.isRunning = false;
    console.log('✅ Load test completed');
  }

  /**
   * Stop the currently running load test
   */
  stopLoadTest(): void {
    this.isRunning = false;
    console.log('🛑 Load test stopped');
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): LoadTestMetrics {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const elapsedSeconds = elapsed / 1000;

    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = this.results.filter(r => !r.success).length;
    const totalRequests = this.results.length;

    const responseTimes = this.results
      .filter(r => r.success)
      .map(r => r.responseTime);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      activeConnections: this.activeRequests,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      requestsPerSecond: elapsedSeconds > 0 ? totalRequests / elapsedSeconds : 0,
    };
  }

  /**
   * Get all test results
   */
  getResults(): LoadTestResult[] {
    return [...this.results];
  }

  /**
   * Check if load test is currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Simulate a single user making requests
   */
  private async simulateUser(userId: number, config: LoadTestConfig): Promise<void> {
    const endTime = this.startTime + config.testDurationMs;

    console.log(`👤 User ${userId} started`);

    while (this.isRunning && Date.now() < endTime) {
      // Pick a random endpoint to test
      const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
      
      await this.makeRequest(endpoint, userId);

      // Wait before next request
      if (config.requestIntervalMs > 0) {
        await this.sleep(config.requestIntervalMs);
      }
    }

    console.log(`👤 User ${userId} finished`);
  }

  /**
   * Make a single API request and record metrics
   */
  private async makeRequest(endpoint: string, userId: number): Promise<void> {
    this.activeRequests++;
    const requestStart = Date.now();

    try {
      const response = await apiService.get(endpoint);
      const responseTime = Date.now() - requestStart;
      
      const result: LoadTestResult = {
        timestamp: Date.now(),
        responseTime,
        success: response.ok,
        endpoint,
        statusCode: response.status,
      };

      if (!response.ok) {
        result.error = `HTTP ${response.status}`;
      }

      this.results.push(result);
      this.onResultUpdate?.(result);

    } catch (error) {
      const responseTime = Date.now() - requestStart;
      const result: LoadTestResult = {
        timestamp: Date.now(),
        responseTime,
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.results.push(result);
      this.onResultUpdate?.(result);

    } finally {
      this.activeRequests--;
      
      // Update metrics periodically
      if (this.results.length % 10 === 0) {
        this.onMetricsUpdate?.(this.getCurrentMetrics());
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get preset configurations for common load test scenarios
   * Testing the core features users access most: active timers, client hours, time logs, and week view
   */
  static getPresetConfigs(): Record<string, LoadTestConfig> {
    return {
      light: {
        concurrentUsers: 10,
        testDurationMs: 30000, // 30 seconds
        requestIntervalMs: 1000, // 1 request per second per user
        endpoints: [
          '/api/timers/active', // Active timers - main dashboard feature
          '/api/retainer-usage/bulk', // Client total hours available
        ],
      },
      moderate: {
        concurrentUsers: 50,
        testDurationMs: 60000, // 1 minute
        requestIntervalMs: 500, // 2 requests per second per user
        endpoints: [
          '/api/timers/active', // Active timers
          '/api/retainer-usage/bulk', // Client total hours
          '/api/time-entries/history', // All-time logs page
          '/api/time-logs/weekly', // Week view
        ],
      },
      heavy: {
        concurrentUsers: 100,
        testDurationMs: 120000, // 2 minutes
        requestIntervalMs: 250, // 4 requests per second per user
        endpoints: [
          '/api/timers/active', // Active timers
          '/api/retainer-usage/bulk', // Client total hours
          '/api/time-entries/history', // All-time logs page
          '/api/time-entries/summary', // Time logs summary
          '/api/time-logs/weekly', // Week view
        ],
      },
      extreme: {
        concurrentUsers: 200,
        testDurationMs: 180000, // 3 minutes
        requestIntervalMs: 100, // 10 requests per second per user
        endpoints: [
          '/api/timers/active', // Active timers
          '/api/retainer-usage/bulk', // Client total hours
          '/api/time-entries/history', // All-time logs page
          '/api/time-entries/summary', // Time logs summary
          '/api/time-logs/weekly', // Week view
          '/api/clients', // Basic clients list
        ],
      },
    };
  }
}

export const loadTestService = new LoadTestService();
