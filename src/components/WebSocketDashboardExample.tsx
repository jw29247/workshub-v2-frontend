import React, { useState } from 'react'
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { 
  useWebSocketDashboard, 
  useUnifiedDashboard,
  type ComprehensiveDashboardData,
  type TodayDashboardData,
  type ClientHealthDashboardData 
} from '../services/websocketService'
import { ActionButton } from './ActionButton'

/**
 * WebSocket Dashboard Example Component
 * 
 * Demonstrates the new WebSocket-first architecture with:
 * - Real-time data updates
 * - Intelligent caching
 * - Optimistic UI updates
 * - Connection health monitoring
 * - Fallback to API when needed
 */

interface WebSocketDashboardExampleProps {
  userRole: 'team_member' | 'manager' | 'SLT'
  selectedWeek?: string
}

export const WebSocketDashboardExample: React.FC<WebSocketDashboardExampleProps> = ({
  userRole,
  selectedWeek
}) => {
  const [demoMode, setDemoMode] = useState<'single' | 'unified'>('unified')

  // Example 1: Single data type with WebSocket-first approach
  const comprehensiveData = useWebSocketDashboard<ComprehensiveDashboardData>('comprehensive', {
    userRole,
    enableOptimisticUpdates: true,
    fallbackToAPI: true,
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  })

  // Example 2: Unified dashboard with all data types
  const unifiedDashboard = useUnifiedDashboard(userRole, {
    selectedWeek,
    enableOptimisticUpdates: true,
    fallbackToAPI: true,
    autoRefresh: true,
    refreshInterval: 300000
  })

  // Demo optimistic update
  const handleOptimisticUpdate = () => {
    if (demoMode === 'single') {
      const requestId = comprehensiveData.optimisticUpdate({
        metrics: {
          ...comprehensiveData.data?.metrics,
          hours: {
            ...comprehensiveData.data?.metrics?.hours,
            today: {
              ...comprehensiveData.data?.metrics?.hours?.today,
              total: (comprehensiveData.data?.metrics?.hours?.today?.total || 0) + 1
            }
          }
        }
      })
      console.log('Optimistic update request ID:', requestId)
    } else {
      const requestId = unifiedDashboard.optimisticUpdate.comprehensive({
        metrics: {
          ...unifiedDashboard.comprehensive?.metrics,
          totalHoursToday: (unifiedDashboard.comprehensive?.metrics?.totalHoursToday || 0) + 1
        }
      })
      console.log('Unified optimistic update request ID:', requestId)
    }
  }

  const renderConnectionStatus = (isConnected: boolean, health: any) => (
    <div className="flex items-center gap-2 mb-4">
      {isConnected ? (
        <div className="flex items-center gap-2 text-green-600">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Connected</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Disconnected</span>
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        Cache: {health.cacheSize} | Subscriptions: {health.subscriptions}
      </div>
    </div>
  )

  const renderDataStatus = (loading: boolean, error: string | null, lastUpdate: Date | null) => (
    <div className="flex items-center gap-2 text-sm">
      {loading && (
        <div className="flex items-center gap-1 text-blue-600">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Loading...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      
      {!loading && !error && lastUpdate && (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Updated {lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}
      
      {lastUpdate && (
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">WebSocket-First Dashboard</h1>
        <p className="text-gray-600 mb-4">
          Real-time dashboard with intelligent caching, optimistic updates, and API fallback
        </p>
        
        {/* Demo Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <ActionButton
            variant={demoMode === 'single' ? 'primary' : 'secondary'}
            onClick={() => setDemoMode('single')}
          >
            Single Data Type
          </ActionButton>
          <ActionButton
            variant={demoMode === 'unified' ? 'primary' : 'secondary'}
            onClick={() => setDemoMode('unified')}
          >
            Unified Dashboard
          </ActionButton>
        </div>
      </div>

      {demoMode === 'single' ? (
        /* Single Data Type Demo */
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">Single WebSocket Dashboard Hook</h2>
            
            {renderConnectionStatus(comprehensiveData.isConnected, comprehensiveData.connectionHealth)}
            {renderDataStatus(comprehensiveData.loading, comprehensiveData.error, comprehensiveData.lastUpdate)}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ActionButton variant="secondary" onClick={comprehensiveData.refresh}>
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </ActionButton>
              <ActionButton variant="primary" onClick={handleOptimisticUpdate}>
                Optimistic Update
              </ActionButton>
            </div>
            
            {comprehensiveData.data && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Comprehensive Data Preview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Hours Today:</strong> {comprehensiveData.data.metrics?.hours?.today?.total || 0}
                  </div>
                  <div>
                    <strong>Team Members:</strong> {comprehensiveData.data.metrics?.team?.total_members || 0}
                  </div>
                  <div>
                    <strong>Active Timers:</strong> {comprehensiveData.data.active_timers?.length || 0}
                  </div>
                  <div>
                    <strong>Utilization:</strong> {comprehensiveData.data.metrics?.team?.utilization_percent || 0}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Unified Dashboard Demo */
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">Unified WebSocket Dashboard Hook</h2>
            
            {renderConnectionStatus(unifiedDashboard.isConnected, unifiedDashboard.connectionHealth)}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ActionButton variant="secondary" onClick={unifiedDashboard.refresh.all}>
                <RefreshCw className="h-4 w-4" />
                Refresh All
              </ActionButton>
              <ActionButton variant="primary" onClick={handleOptimisticUpdate}>
                Optimistic Update
              </ActionButton>
            </div>
            
            {/* Comprehensive Data */}
            <div className="mb-6">
              <h3 className="font-medium mb-2 flex items-center justify-between">
                Comprehensive Dashboard
                {renderDataStatus(
                  unifiedDashboard.loading.comprehensive,
                  unifiedDashboard.error.comprehensive,
                  unifiedDashboard.lastUpdate.comprehensive
                )}
              </h3>
              {unifiedDashboard.comprehensive && (
                <div className="bg-blue-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Hours Today:</strong> {unifiedDashboard.comprehensive.metrics?.totalHoursToday || 0}
                  </div>
                  <div>
                    <strong>Team Utilization:</strong> {unifiedDashboard.comprehensive.metrics?.teamUtilization || 0}%
                  </div>
                  <div>
                    <strong>Active Users:</strong> {unifiedDashboard.comprehensive.metrics?.activeUsersCount || 0}
                  </div>
                </div>
              )}
            </div>
            
            {/* Today Data */}
            <div className="mb-6">
              <h3 className="font-medium mb-2 flex items-center justify-between">
                Today's Dashboard
                {renderDataStatus(
                  unifiedDashboard.loading.today,
                  unifiedDashboard.error.today,
                  unifiedDashboard.lastUpdate.today
                )}
              </h3>
              {unifiedDashboard.today && (
                <div className="bg-green-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Date:</strong> {unifiedDashboard.today.date}
                  </div>
                  <div>
                    <strong>Active Now:</strong> {unifiedDashboard.today.team_summary?.active_now || 0}
                  </div>
                  <div>
                    <strong>Total Hours:</strong> {unifiedDashboard.today.team_summary?.total_hours || 0}
                  </div>
                </div>
              )}
            </div>
            
            {/* Client Health Data (if selectedWeek provided) */}
            {selectedWeek && (
              <div className="mb-6">
                <h3 className="font-medium mb-2 flex items-center justify-between">
                  Client Health (Week: {selectedWeek})
                  {renderDataStatus(
                    unifiedDashboard.loading.clientHealth,
                    unifiedDashboard.error.clientHealth,
                    unifiedDashboard.lastUpdate.clientHealth
                  )}
                </h3>
                {unifiedDashboard.clientHealth && (
                  <div className="bg-yellow-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Green:</strong> {unifiedDashboard.clientHealth.health_overview?.green || 0}
                    </div>
                    <div>
                      <strong>Amber:</strong> {unifiedDashboard.clientHealth.health_overview?.amber || 0}
                    </div>
                    <div>
                      <strong>Red:</strong> {unifiedDashboard.clientHealth.health_overview?.red || 0}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Individual Refresh Controls */}
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="font-medium mb-4">Individual Data Controls</h3>
            <div className="grid grid-cols-3 gap-4">
              <ActionButton 
                variant="secondary" 
                onClick={unifiedDashboard.refresh.comprehensive}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Comprehensive
              </ActionButton>
              <ActionButton 
                variant="secondary" 
                onClick={unifiedDashboard.refresh.today}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Today
              </ActionButton>
              <ActionButton 
                variant="secondary" 
                onClick={unifiedDashboard.refresh.clientHealth}
                disabled={!selectedWeek}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Client Health
              </ActionButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Architecture Benefits */}
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h3 className="font-medium mb-4">WebSocket-First Architecture Benefits</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-green-700">✅ Real-time Updates</h4>
            <p className="text-gray-600">Data updates automatically via WebSocket events</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-700">⚡ Intelligent Caching</h4>
            <p className="text-gray-600">Smart caching with automatic expiration</p>
          </div>
          <div>
            <h4 className="font-medium text-purple-700">🔮 Optimistic Updates</h4>
            <p className="text-gray-600">Immediate UI feedback with server confirmation</p>
          </div>
          <div>
            <h4 className="font-medium text-orange-700">🛡️ API Fallback</h4>
            <p className="text-gray-600">Graceful degradation when WebSocket unavailable</p>
          </div>
        </div>
      </div>
    </div>
  )
}