import React, { useState, useEffect, useCallback } from 'react';
import {
  loadTestService,
  LoadTestService,
} from '../../services/loadTestService';
import type {
  LoadTestConfig,
  LoadTestMetrics,
  LoadTestResult,
} from '../../services/loadTestService';

interface DatabaseLoadTesterProps {
  className?: string;
}

const DatabaseLoadTester: React.FC<DatabaseLoadTesterProps> = ({ className }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<LoadTestConfig>({
    concurrentUsers: 10,
    testDurationMs: 30000,
    requestIntervalMs: 1000,
    endpoints: ['/api/timers/active', '/api/retainer-usage/bulk'],
  });
  const [metrics, setMetrics] = useState<LoadTestMetrics | null>(null);
  const [recentResults, setRecentResults] = useState<LoadTestResult[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('light');

  const presetConfigs = LoadTestService.getPresetConfigs();

  // Update metrics every second while running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setMetrics(loadTestService.getCurrentMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset);
    setConfig(presetConfigs[preset]);
  }, [presetConfigs]);

  const handleStartTest = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setMetrics(null);
    setRecentResults([]);

    try {
      await loadTestService.startLoadTest(
        config,
        (newMetrics) => setMetrics(newMetrics),
        (result) => {
          setRecentResults(prev => [result, ...prev].slice(0, 50)); // Keep last 50 results
        }
      );
    } catch (error) {
      console.error('Load test failed:', error);
      alert('Load test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
      // Get final metrics
      setMetrics(loadTestService.getCurrentMetrics());
    }
  };

  const handleStopTest = () => {
    loadTestService.stopLoadTest();
    setIsRunning(false);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const formatResponseTime = (ms: number) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className || ''}`}>
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Database Load Testing Tool
        </h2>
        <p className="text-gray-600">
          Simulate hundreds of concurrent users to test database connection pooling and system performance.
        </p>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
          
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Load Test Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="light">Light Load (10 users, 30s) - Timers & Client Hours</option>
              <option value="moderate">Moderate Load (50 users, 1m) - + Time Logs & Week View</option>
              <option value="heavy">Heavy Load (100 users, 2m) - + Summaries</option>
              <option value="extreme">Extreme Load (200 users, 3m) - All Features</option>
            </select>
          </div>

          {/* Manual Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concurrent Users
              </label>
              <input
                type="number"
                value={config.concurrentUsers}
                onChange={(e) => setConfig({...config, concurrentUsers: parseInt(e.target.value) || 1})}
                disabled={isRunning}
                min="1"
                max="500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={config.testDurationMs / 1000}
                onChange={(e) => setConfig({...config, testDurationMs: (parseInt(e.target.value) || 1) * 1000})}
                disabled={isRunning}
                min="5"
                max="600"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Interval (ms)
            </label>
            <input
              type="number"
              value={config.requestIntervalMs}
              onChange={(e) => setConfig({...config, requestIntervalMs: parseInt(e.target.value) || 100})}
              disabled={isRunning}
              min="50"
              max="5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Time between requests per user (lower = more aggressive)
            </p>
          </div>

          {/* Endpoints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Core App Features
            </label>
            <div className="space-y-2">
              {[
                '/api/timers/active',
                '/api/retainer-usage/bulk',
                '/api/time-entries/history',
                '/api/time-entries/summary', 
                '/api/time-logs/weekly',
                '/api/clients'
              ].map(endpoint => (
                <label key={endpoint} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.endpoints.includes(endpoint)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({...config, endpoints: [...config.endpoints, endpoint]});
                      } else {
                        setConfig({...config, endpoints: config.endpoints.filter(ep => ep !== endpoint)});
                      }
                    }}
                    disabled={isRunning}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{endpoint}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active timers, client hours, all-time logs, and week view
            </p>
          </div>
        </div>

        {/* Metrics Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Real-time Metrics</h3>
          
          {metrics ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{metrics.activeConnections}</div>
                  <div className="text-sm text-gray-600">Active Connections</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{metrics.requestsPerSecond.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Requests/Second</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{metrics.totalRequests}</div>
                  <div className="text-sm text-gray-600">Total Requests</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{metrics.successfulRequests}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600">{metrics.failedRequests}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{formatResponseTime(metrics.averageResponseTime)}</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{metrics.errorRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Error Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{formatResponseTime(metrics.minResponseTime)}</div>
                  <div className="text-xs text-gray-600">Min Response</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{formatResponseTime(metrics.maxResponseTime)}</div>
                  <div className="text-xs text-gray-600">Max Response</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No metrics available. Start a load test to see real-time data.
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleStartTest}
          disabled={isRunning || config.endpoints.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Running...' : 'Start Load Test'}
        </button>
        
        {isRunning && (
          <button
            onClick={handleStopTest}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Stop Test
          </button>
        )}
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Results</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="space-y-1 text-sm">
              {recentResults.slice(0, 20).map((result, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center py-1 px-2 rounded ${
                    result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  <span className="font-mono text-xs">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="flex-1 mx-2 truncate">{result.endpoint}</span>
                  <span className="font-semibold">
                    {result.success 
                      ? formatResponseTime(result.responseTime)
                      : result.error?.substring(0, 20) || 'Error'
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Development Tool Warning
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This is a development tool for testing database connection pooling and system performance.
                Use responsibly and avoid running excessive loads on production systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseLoadTester;
