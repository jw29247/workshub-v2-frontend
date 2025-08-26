# Services Architecture - Migration Guide

## Unified Dashboard API Service

The `DashboardAPIService` provides a consolidated interface for all dashboard-related API operations. This reduces the complexity of component data management and ensures consistent backend-calculated data across the application.

## Migration Guide

### Before (Multiple Service Calls)

```typescript
// Old pattern - multiple service calls with frontend calculations
import { dashboardService } from '../services/dashboardService'
import { clientService } from '../services/clientService'
import { timeTrackingService } from '../services/timeTrackingService'

const [metrics, setMetrics] = useState<DashboardMetrics>()
const [clients, setClients] = useState<Client[]>()
const [timeData, setTimeData] = useState<TimeData>()

useEffect(() => {
  const fetchData = async () => {
    // Multiple API calls
    const [metricsData, clientsData, timeDataResult] = await Promise.all([
      dashboardService.getMetrics(),
      clientService.getClients(),
      timeTrackingService.getHourlyBreakdown()
    ])
    
    // Frontend calculations
    const calculatedMetrics = {
      ...metricsData,
      utilization: calculateUtilization(metricsData, clientsData),
      trends: calculateTrends(timeDataResult)
    }
    
    setMetrics(calculatedMetrics)
    setClients(clientsData)
    setTimeData(timeDataResult)
  }
  
  fetchData()
}, [])
```

### After (Unified Service)

```typescript
// New pattern - single service call with backend calculations
import { dashboardAPI } from '../services/dashboardService'

const [dashboardData, setDashboardData] = useState<ComprehensiveDashboardData>()

useEffect(() => {
  const fetchData = async () => {
    // Single API call with all calculations done server-side
    const data = await dashboardAPI.getComprehensiveData({
      includeHourly: true,
      includeProjects: true,
      includeWeeklyComparison: true
    })
    
    // No frontend calculations needed - all done in backend
    setDashboardData(data)
  }
  
  fetchData()
}, [])

// Access calculated data directly
const metrics = dashboardData?.metrics
const teamData = dashboardData?.team_data
const trends = dashboardData?.trends
```

## Service Consolidation Features

### 1. Unified Data Fetching

```typescript
// Get all dashboard data types in one call
const allData = await dashboardAPI.getAllDashboardData({
  selectedWeek: '2023-12-04',
  includeClientHealth: true,
  includeTodayData: true,
  includeHourly: true,
  includeProjects: true
})

// Access different data types
const comprehensive = allData.comprehensive
const todayData = allData.today
const clientHealth = allData.clientHealth
```

### 2. Real-time Integration

```typescript
// Subscribe to real-time updates with unified callbacks
const unsubscribe = dashboardAPI.subscribeToUpdates('manager', {
  onDataUpdate: (data) => {
    // Handle comprehensive data updates
    setDashboardData(data)
  },
  onTeamHealthUpdate: (data) => {
    // Handle team health updates
    updateTeamHealth(data)
  },
  onNotificationCreated: (data) => {
    // Handle notifications
    showNotification(data)
  }
})

// Clean up subscription
useEffect(() => {
  return () => unsubscribe()
}, [unsubscribe])
```

### 3. Health Monitoring

```typescript
// Check service health
const health = await dashboardAPI.healthCheck()

if (health.status === 'unhealthy') {
  // Show fallback UI or error state
} else if (health.status === 'degraded') {
  // Show warning or use cached data
}
```

## Component Migration Examples

### Dashboard.tsx Migration

**Before:**
```typescript
// Multiple imports and state management
const [metrics, setMetrics] = useState<DashboardMetrics>()
const [hourlyData, setHourlyData] = useState<HourlyBreakdown>()
const [projectData, setProjectData] = useState<ProjectBreakdown>()

// Multiple useEffect hooks
useEffect(() => {
  dashboardService.getMetrics().then(setMetrics)
}, [])

useEffect(() => {
  dashboardService.getHourlyBreakdown().then(setHourlyData)
}, [])

useEffect(() => {
  dashboardService.getProjectBreakdown().then(setProjectData)
}, [])
```

**After:**
```typescript
// Single import and state
const [dashboardData, setDashboardData] = useState<ComprehensiveDashboardData>()

// Single useEffect
useEffect(() => {
  dashboardAPI.getComprehensiveData().then(setDashboardData)
}, [])

// Access all data from single source
const metrics = dashboardData?.metrics
const hourlyData = dashboardData?.time_data.hourly_breakdown
const projectData = dashboardData?.client_data.project_breakdown
```

### ClientHealthMetrics.tsx Migration

**Before:**
```typescript
const [clients, setClients] = useState<Client[]>([])
const [metrics, setMetrics] = useState<HealthMetric[]>([])
const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])

// Complex grouping and calculation logic
const clientsByManager = useMemo(() => {
  // 60+ lines of frontend calculation logic
}, [clients, usersMap, presentationSchedule])
```

**After:**
```typescript
const [dashboardData, setDashboardData] = useState<ClientHealthDashboardData>()

// Single data fetch with backend calculations
useEffect(() => {
  if (selectedWeek) {
    dashboardAPI.getClientHealthData(selectedWeek).then(setDashboardData)
  }
}, [selectedWeek])

// Use pre-calculated data
const clientsByManager = dashboardData?.clients_by_manager
const healthOverview = dashboardData?.health_overview
const trackingStats = dashboardData?.tracking_stats
```

## Available Service Methods

### Primary Methods (Recommended)

- `getComprehensiveData(options)` - Full dashboard with all calculations
- `getTodayData()` - Today's dashboard with user progress
- `getClientHealthData(selectedWeek)` - Client health metrics
- `getSummaryData()` - Lightweight dashboard summary

### Utility Methods

- `getAllDashboardData(options)` - Batch multiple data types
- `healthCheck()` - Service health monitoring
- `requestDataRefresh(dataType?)` - Trigger real-time refresh
- `subscribeToUpdates(userRole, callbacks)` - Real-time subscriptions

### Legacy Methods (Deprecated)

- `getMetrics()` - Use `getComprehensiveData()` instead
- `getHourlyBreakdown()` - Use `getComprehensiveData({ includeHourly: true })` instead
- `getProjectBreakdown()` - Use `getComprehensiveData({ includeProjects: true })` instead

## Best Practices

1. **Use Unified Service**: Always prefer `dashboardAPI` over individual services
2. **Backend Calculations**: Let the server handle all calculations and aggregations
3. **Single State Management**: Use one state object per data type instead of multiple states
4. **Real-time Integration**: Subscribe to updates for live data
5. **Error Handling**: Use the health check for service monitoring
6. **Performance**: Use summary data for lightweight views

## Migration Checklist

- [ ] Replace multiple service imports with `dashboardAPI`
- [ ] Consolidate multiple state variables into single data objects
- [ ] Remove frontend calculation logic
- [ ] Update useEffect hooks to single data fetch
- [ ] Implement real-time subscriptions
- [ ] Add health monitoring for error states
- [ ] Update TypeScript interfaces to new data structures
- [ ] Test all dashboard functionality
- [ ] Remove deprecated service calls