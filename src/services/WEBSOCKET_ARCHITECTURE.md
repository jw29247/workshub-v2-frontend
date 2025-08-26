# WebSocket-First Dashboard Architecture

## Overview

This document describes the WebSocket-first architecture implementation for the WorksHub dashboard, providing real-time updates, intelligent caching, and optimistic UI patterns.

## Architecture Components

### 1. Enhanced WebSocket Service (`websocketService.ts`)

**Core Features:**
- ✅ Intelligent data caching with TTL-based expiration
- ✅ Smart subscription management with auto-reestablishment
- ✅ Throttled refresh requests to prevent spam
- ✅ Optimistic update support with server confirmation
- ✅ Connection health monitoring and diagnostics
- ✅ API fallback for offline scenarios

**Key Methods:**
```typescript
// Enhanced caching and refresh
websocketService.requestDashboardRefresh('metrics')
websocketService.getCachedDashboardData('metrics')

// Optimistic updates
websocketService.optimisticUpdate(type, data, requestId)

// Health monitoring  
websocketService.getConnectionHealth()
```

### 2. Unified Dashboard API Service (`dashboardService.ts`)

**Purpose:** Single interface for all dashboard data operations

**Core Methods:**
```typescript
// Main data fetching
dashboardAPI.getComprehensiveData(options)
dashboardAPI.getTodayData()
dashboardAPI.getClientHealthData(selectedWeek)

// Batch operations
dashboardAPI.getAllDashboardData(options)

// Health checking
dashboardAPI.healthCheck()
```

### 3. WebSocket-First Hooks

#### `useWebSocketDashboard<T>`
Single data type hook with WebSocket-first approach:

```typescript
const { data, loading, error, isConnected, refresh, optimisticUpdate } = 
  useWebSocketDashboard<ComprehensiveDashboardData>('comprehensive', {
    userRole: 'manager',
    enableOptimisticUpdates: true,
    fallbackToAPI: true,
    autoRefresh: true
  })
```

**Features:**
- Real-time data updates via WebSocket
- Intelligent caching with immediate cache returns
- API fallback when WebSocket unavailable
- Optimistic updates with rollback on failure
- Auto-refresh with configurable intervals

#### `useUnifiedDashboard`
Multi-data type hook for comprehensive dashboard state:

```typescript
const dashboard = useUnifiedDashboard('manager', {
  selectedWeek: '2023-12-04',
  enableOptimisticUpdates: true,
  fallbackToAPI: true
})

// Access different data types
const comprehensive = dashboard.comprehensive
const todayData = dashboard.today
const clientHealth = dashboard.clientHealth
```

### 4. Enhanced Dashboard Hook (`useDashboardWebSocket`)

Provides granular control over WebSocket dashboard connections:

```typescript
const {
  isConnected,
  connectionHealth,
  requestRefresh,
  getCachedData,
  optimisticUpdate
} = useDashboardWebSocket('manager', {
  onDataUpdate: (data) => console.log('Data updated:', data),
  onOptimisticUpdate: (data) => console.log('Optimistic update:', data)
}, {
  enableOptimisticUpdates: true,
  autoRefresh: true
})
```

## Data Flow Architecture

### 1. WebSocket-First Pattern

```
Component Request → WebSocket Cache Check → Immediate Cache Return (if available)
                                        ↓
                  WebSocket Refresh Request → Backend Calculation
                                        ↓
                  Real-time Update Event → Component State Update
```

### 2. Fallback Pattern

```
WebSocket Unavailable → API Direct Call → Component State Update
                               ↓
                     Cache for WebSocket Resume
```

### 3. Optimistic Update Pattern

```
User Action → Immediate UI Update (Optimistic)
                      ↓
            WebSocket Server Request
                      ↓
    Server Confirmation → Confirm/Rollback UI State
```

## Caching Strategy

### Cache TTL by Data Type
```typescript
private getTTLForDataType(type: string): number {
  switch (type) {
    case 'metrics': return 300000      // 5 minutes
    case 'team_data': return 180000    // 3 minutes
    case 'client_data': return 600000  // 10 minutes
    case 'active_timers': return 30000 // 30 seconds
    default: return 300000             // 5 minutes
  }
}
```

### Smart Cache Management
- Automatic cleanup of expired entries
- Immediate cache returns for non-critical updates
- Cache invalidation on relevant WebSocket events
- Memory-efficient storage with Map-based implementation

## Connection Management

### Subscription Tracking
```typescript
private subscriptions: Set<string> = new Set()
private pendingRefreshRequests: Set<string> = new Set()

// Auto-reestablish subscriptions on reconnect
private reestablishSubscriptions() {
  for (const subscription of this.subscriptions) {
    this.emit(subscription, {})
  }
}
```

### Health Monitoring
```typescript
getConnectionHealth(): {
  connected: boolean
  cacheSize: number
  subscriptions: number
  lastRefresh: Record<string, number>
}
```

## Event System

### Dashboard Events
- `dashboard.data_updated` - Real-time data updates
- `dashboard.team_health_updated` - Team health changes
- `dashboard.notification_created` - New notifications
- `dashboard.optimistic_update` - Optimistic UI updates
- `dashboard.update_confirmed` - Server confirmation

### Event Processing
```typescript
// Enhanced event with caching metadata
this.socket.on('dashboard.data_updated', (data: DashboardDataUpdatedEvent) => {
  this.cacheData(`dashboard.${data.type}`, data.data, this.getTTLForDataType(data.type))
  
  this.notifyListeners('dashboard.data_updated', {
    ...data,
    cached: true,
    timestamp: new Date().toISOString()
  })
})
```

## Performance Optimizations

### 1. Throttled Refresh Requests
```typescript
private throttledDashboardRefresh(dataType: string, throttleMs: number) {
  const now = Date.now()
  const lastRefresh = this.lastDataRefresh.get(dataType) || 0

  if (now - lastRefresh >= throttleMs) {
    this.requestDashboardRefresh(dataType as any)
    this.lastDataRefresh.set(dataType, now)
  }
}
```

### 2. Intelligent Cache Returns
- Return cached data immediately for non-critical updates
- Always request fresh data in background
- Merge optimistic updates with base data
- Clean up expired cache entries automatically

### 3. Connection Efficiency
- Single WebSocket connection for all dashboard data
- Smart subscription management
- Batched refresh requests
- Exponential backoff for reconnections

## Migration Benefits

### Before (API-First)
```typescript
// Multiple API calls
const [metrics, setMetrics] = useState()
const [teamData, setTeamData] = useState()
const [clientData, setClientData] = useState()

useEffect(() => {
  Promise.all([
    dashboardService.getMetrics(),
    dashboardService.getTeamData(),
    dashboardService.getClientData()
  ]).then(([m, t, c]) => {
    // Frontend calculations
    const calculated = calculateMetrics(m, t, c)
    setMetrics(calculated)
  })
}, [])
```

### After (WebSocket-First)
```typescript
// Single WebSocket hook with backend calculations
const { comprehensive, today, clientHealth } = useUnifiedDashboard('manager', {
  enableOptimisticUpdates: true,
  fallbackToAPI: true,
  autoRefresh: true
})

// All data is backend-calculated and real-time updated
```

## Error Handling & Resilience

### Connection Failures
```typescript
// Graceful degradation with API fallback
if (!isConnected && options.fallbackToAPI) {
  const apiData = await dashboardAPI.getComprehensiveData()
  setData(apiData)
}
```

### Optimistic Update Failures
```typescript
// Automatic rollback on server rejection
onUpdateConfirmed: (confirmation) => {
  if (!confirmation.success) {
    // Rollback optimistic changes
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(confirmation.requestId)
      return newMap
    })
  }
}
```

## Testing Strategy

### Component Testing
```typescript
// Test WebSocket-first behavior
const { result } = renderHook(() => 
  useWebSocketDashboard('comprehensive', {
    userRole: 'manager',
    fallbackToAPI: true
  })
)

// Verify cache behavior, optimistic updates, fallback logic
```

### Integration Testing
- WebSocket connection simulation
- Cache TTL verification
- Optimistic update confirmation flow
- API fallback scenarios

## Usage Examples

### Basic WebSocket Dashboard
```typescript
export const DashboardComponent = () => {
  const { data, loading, error, refresh } = useWebSocketDashboard('comprehensive', {
    userRole: 'manager',
    enableOptimisticUpdates: true,
    fallbackToAPI: true
  })

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <DashboardView data={data} onRefresh={refresh} />
}
```

### Optimistic Updates
```typescript
export const OptimisticComponent = () => {
  const { data, optimisticUpdate } = useWebSocketDashboard('today', {
    userRole: 'team_member',
    enableOptimisticUpdates: true
  })

  const handleUpdate = async (newData) => {
    // Immediate UI update
    const requestId = optimisticUpdate(newData)
    
    try {
      // Server request
      await api.updateData(newData)
      // Confirmation will come via WebSocket
    } catch (error) {
      // Rollback handled automatically
      console.error('Update failed:', error)
    }
  }

  return <InteractiveView data={data} onUpdate={handleUpdate} />
}
```

### Multi-Data Dashboard
```typescript
export const UnifiedDashboard = () => {
  const dashboard = useUnifiedDashboard('SLT', {
    selectedWeek: '2023-12-04',
    enableOptimisticUpdates: true,
    autoRefresh: true
  })

  return (
    <div>
      <ComprehensiveView data={dashboard.comprehensive} />
      <TodayView data={dashboard.today} />
      <ClientHealthView data={dashboard.clientHealth} />
      
      <button onClick={dashboard.refresh.all}>
        Refresh All Data
      </button>
    </div>
  )
}
```

## Conclusion

The WebSocket-first architecture provides:

1. **Real-time responsiveness** - Immediate updates via WebSocket events
2. **Intelligent caching** - Smart TTL-based caching with automatic cleanup
3. **Optimistic UX** - Immediate feedback with server confirmation
4. **Resilient operation** - Graceful degradation with API fallback
5. **Performance optimization** - Reduced API calls and smart refresh patterns
6. **Developer experience** - Simple hooks with comprehensive functionality

This architecture transforms the dashboard from a polling-based system to a truly real-time, event-driven experience while maintaining reliability and performance.