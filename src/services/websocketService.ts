import { io, Socket } from 'socket.io-client'
import { API_URL } from '../config'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'

// Event types
export interface TimerStartedEvent {
  user_email: string
  timer: {
    id: string
    user_id: string
    user_email: string
    user_name?: string
    task_id?: string
    task_name?: string
    description?: string
    start_time: string
  }
  timestamp: string
}

export interface TimerStoppedEvent {
  user_email: string
  time_entry: {
    id: string
    user_id: string
    user_email: string
    task_id?: string
    task_name?: string
    duration: number
    start_time: string
    end_time: string
  }
  timestamp: string
}

export interface TimeEntryUpdatedEvent {
  time_entry: {
    id: string
    user_id: string
    user_email: string
    task_id?: string
    duration: number
  }
  timestamp: string
}

export interface ActiveTimersUpdateEvent {
  active_timers: Array<{
    id: string
    user_id: string
    user_email: string
    user_name?: string
    task_id?: string
    task_name?: string
    description?: string
    start_time: string
  }>
  timestamp: string
}

export interface ClientHealthScoreUpdatedEvent {
  client_id: number
  week_starting: string
  scores: Array<{
    id: number
    metric_id: number
    score: string
    notes?: string
    week_starting: string
    created_by_id?: string
    updated_at?: string
  }>
  updated_by: string
  timestamp: string
}

export interface ClientHealthMetricUpdatedEvent {
  metric: {
    id: number
    name: string
    display_name: string
    description: string | null
    is_active: boolean
    order_index: number
    service_applicability: 'all' | 'cro_only' | 'non_cro_only'
  }
  timestamp: string
}

export interface SyncProgressEvent {
  stage: string
  message: string
  progress?: number
  current_count?: number
  total_count?: number
  rate_limit_delay?: number
  error?: string
  timestamp: string
}

export interface SyncCompletedEvent {
  success: boolean
  message: string
  stats?: {
    created: number
    updated: number
    deleted: number
    skipped: number
    total_from_clickup: number
  }
  timestamp: string
}

// Dashboard BFF events - Step 11: WebSocket Integration
export interface DashboardDataUpdatedEvent {
  type: 'metrics' | 'team_data' | 'client_data' | 'active_timers' | 'comprehensive'
  data: any
  user_roles?: Array<'team_member' | 'manager' | 'SLT'> // Which roles should receive this update
  timestamp: string
}

export interface TeamHealthUpdatedEvent {
  data: {
    average_pulse_score: number
    health_status: 'excellent' | 'good' | 'concerning' | 'critical'
    recent_pulse_checks: number
  }
  timestamp: string
}

export interface NotificationCreatedEvent {
  notification: {
    id: number
    title: string
    message: string
    type: 'info' | 'warning' | 'success'
    display_date: string
    is_active: boolean
  }
  timestamp: string
}

// WebSocket service class
class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map()
  
  // WebSocket-first architecture enhancements
  private dashboardDataCache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map()
  private subscriptions: Set<string> = new Set()
  private pendingRefreshRequests: Set<string> = new Set()
  private lastDataRefresh: Map<string, number> = new Map()

  constructor() {
    // Bind methods to preserve 'this' context
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
    this.emit = this.emit.bind(this)
    this.on = this.on.bind(this)
    this.off = this.off.bind(this)
  }

  connect(userEmail?: string) {
    if (this.socket && this.isConnected) {
      return
    }

    // Create socket connection
    const socketUrl = API_URL || window.location.origin

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      ...(userEmail && { auth: { email: userEmail } }),
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts
    })

    // Set up event handlers
    this.socket.on('connect', () => {
      this.isConnected = true
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000

      // Authenticate if we have user email
      if (userEmail) {
        this.socket?.emit('authenticate', { email: userEmail })
      }

      // Re-establish subscriptions after reconnection
      this.reestablishSubscriptions()

      // Notify listeners
      this.notifyListeners('connected', { timestamp: new Date().toISOString() })
    })

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false
      this.notifyListeners('disconnected', { reason, timestamp: new Date().toISOString() })
    })

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000) // Exponential backoff
      this.notifyListeners('connection_error', { error: error.message, timestamp: new Date().toISOString() })
    })

    // Timer events
    this.socket.on('timer.started', (data: TimerStartedEvent) => {
      this.notifyListeners('timer.started', data)
      // Trigger dashboard data refresh for active timers
      this.requestDashboardRefresh('active_timers')
    })

    this.socket.on('timer.stopped', (data: TimerStoppedEvent) => {
      this.notifyListeners('timer.stopped', data)
      // Trigger dashboard data refresh for active timers and metrics
      this.requestDashboardRefresh('metrics')
    })

    this.socket.on('time_entry.updated', (data: TimeEntryUpdatedEvent) => {
      this.notifyListeners('time_entry.updated', data)
      // Throttled dashboard refresh to avoid excessive updates
      this.throttledDashboardRefresh('metrics', 5000)
    })

    this.socket.on('active_timers.update', (data: ActiveTimersUpdateEvent) => {
      this.cacheData('active_timers', data, 60000) // Cache for 1 minute
      this.notifyListeners('active_timers.update', data)
    })

    // Authentication response
    this.socket.on('authenticated', (data: { status: string; message?: string }) => {
      this.notifyListeners('authenticated', data)
      // Request initial dashboard data after authentication
      this.requestDashboardRefresh('comprehensive')
    })

    // Ping/pong for connection testing
    this.socket.on('pong', (data: { timestamp: string }) => {
      this.notifyListeners('pong', data)
    })

    // Client health events
    this.socket.on('client_health.score_updated', (data: ClientHealthScoreUpdatedEvent) => {
      this.notifyListeners('client_health.score_updated', data)
      // Trigger client health data refresh
      this.requestDashboardRefresh('client_data')
    })

    this.socket.on('client_health.metric_updated', (data: ClientHealthMetricUpdatedEvent) => {
      this.notifyListeners('client_health.metric_updated', data)
      // Trigger client health data refresh
      this.requestDashboardRefresh('client_data')
    })

    // Sync progress events
    this.socket.on('sync.progress', (data: SyncProgressEvent) => {
      this.notifyListeners('sync.progress', data)
    })

    this.socket.on('sync.completed', (data: SyncCompletedEvent) => {
      this.notifyListeners('sync.completed', data)
      // Refresh all dashboard data after sync completion
      this.requestDashboardRefresh('comprehensive')
    })

    // Enhanced Dashboard BFF events with caching and smart refresh
    this.socket.on('dashboard.data_updated', (data: DashboardDataUpdatedEvent) => {
      // Cache the data based on type
      this.cacheData(`dashboard.${data.type}`, data.data, this.getTTLForDataType(data.type))
      
      // Notify listeners with enhanced data
      this.notifyListeners('dashboard.data_updated', {
        ...data,
        cached: true,
        timestamp: new Date().toISOString()
      })
    })

    this.socket.on('dashboard.team_health_updated', (data: TeamHealthUpdatedEvent) => {
      this.cacheData('dashboard.team_health', data, 300000) // Cache for 5 minutes
      this.notifyListeners('dashboard.team_health_updated', data)
    })

    this.socket.on('dashboard.notification_created', (data: NotificationCreatedEvent) => {
      this.notifyListeners('dashboard.notification_created', data)
    })

    // New optimistic update events
    this.socket.on('dashboard.optimistic_update', (data: { type: string; data: unknown; requestId: string }) => {
      this.notifyListeners('dashboard.optimistic_update', data)
    })

    this.socket.on('dashboard.update_confirmed', (data: { requestId: string; success: boolean; data?: unknown }) => {
      this.notifyListeners('dashboard.update_confirmed', data)
    })
  }

  disconnect() {
    if (this.socket) {
      // Remove all event listeners before disconnecting
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
    // Clear all custom listeners and caches
    this.listeners.clear()
    this.dashboardDataCache.clear()
    this.subscriptions.clear()
    this.pendingRefreshRequests.clear()
    this.lastDataRefresh.clear()
  }

  emit(event: string, data: unknown) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      // Queue important events for when connection is restored
      if (event.startsWith('dashboard.')) {
        this.queuePendingRequest(event, data)
      }
    }
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: unknown) => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
      // Remove the Set if it's empty to prevent memory buildup
      if (this.listeners.get(event)!.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  private notifyListeners(event: string, data: unknown) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data)
        } catch {
          // Listener error - prevent one bad listener from affecting others
        }
      })
    }
  }

  // WebSocket-first architecture enhancements

  private cacheData(key: string, data: unknown, ttl: number) {
    this.dashboardDataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // Clean up expired cache entries
    this.cleanupExpiredCache()
  }

  private getCachedData(key: string): unknown | null {
    const cached = this.dashboardDataCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.dashboardDataCache.delete(key)
      return null
    }

    return cached.data
  }

  private cleanupExpiredCache() {
    const now = Date.now()
    for (const [key, cached] of this.dashboardDataCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.dashboardDataCache.delete(key)
      }
    }
  }

  private getTTLForDataType(type: string): number {
    switch (type) {
      case 'metrics':
        return 300000 // 5 minutes
      case 'team_data':
        return 180000 // 3 minutes
      case 'client_data':
        return 600000 // 10 minutes
      case 'active_timers':
        return 30000 // 30 seconds
      default:
        return 300000 // 5 minutes default
    }
  }

  private throttledDashboardRefresh(dataType: string, throttleMs: number) {
    const now = Date.now()
    const lastRefresh = this.lastDataRefresh.get(dataType) || 0

    if (now - lastRefresh >= throttleMs) {
      this.requestDashboardRefresh(dataType as any)
      this.lastDataRefresh.set(dataType, now)
    }
  }

  private reestablishSubscriptions() {
    // Re-establish all subscriptions after reconnection
    for (const subscription of this.subscriptions) {
      this.emit(subscription, {})
    }

    // Process any pending refresh requests
    for (const request of this.pendingRefreshRequests) {
      this.emit('dashboard.request_refresh', { type: request })
    }
    this.pendingRefreshRequests.clear()
  }

  private queuePendingRequest(event: string, data: unknown) {
    if (event === 'dashboard.request_refresh' && typeof data === 'object' && data !== null && 'type' in data) {
      this.pendingRefreshRequests.add((data as any).type)
    }
  }

  // Public API methods

  isSocketConnected(): boolean {
    return this.isConnected
  }

  ping() {
    this.emit('ping', { timestamp: new Date().toISOString() })
  }

  // Enhanced Dashboard-specific methods with WebSocket-first patterns

  /**
   * Subscribe to dashboard updates for a specific user role
   */
  subscribeToDashboardUpdates(userRole: 'team_member' | 'manager' | 'SLT') {
    const subscription = 'dashboard.subscribe'
    this.subscriptions.add(subscription)
    this.emit(subscription, { role: userRole })
  }

  /**
   * Unsubscribe from dashboard updates
   */
  unsubscribeFromDashboardUpdates() {
    const subscription = 'dashboard.subscribe'
    this.subscriptions.delete(subscription)
    this.emit('dashboard.unsubscribe', {})
  }

  /**
   * Request immediate dashboard data refresh with intelligent caching
   */
  requestDashboardRefresh(dataType?: 'metrics' | 'team_data' | 'client_data' | 'active_timers' | 'comprehensive') {
    const type = dataType || 'comprehensive'
    
    // Check if we have recent cached data
    const cachedData = this.getCachedData(`dashboard.${type}`)
    if (cachedData && type !== 'active_timers') {
      // Return cached data immediately for non-critical updates
      this.notifyListeners('dashboard.data_updated', {
        type,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      })
    }

    // Always request fresh data from server
    this.emit('dashboard.request_refresh', { type })
  }

  /**
   * Get cached dashboard data without triggering refresh
   */
  getCachedDashboardData(dataType: string): unknown | null {
    return this.getCachedData(`dashboard.${dataType}`)
  }

  /**
   * Optimistic update - immediately update UI with expected result
   */
  optimisticUpdate(type: string, data: unknown, requestId: string) {
    // Emit optimistic update immediately
    this.notifyListeners('dashboard.optimistic_update', { type, data, requestId })
    
    // Send to server for confirmation
    this.emit('dashboard.optimistic_update', { type, data, requestId })
  }

  /**
   * Check connection health and data freshness
   */
  getConnectionHealth(): {
    connected: boolean
    cacheSize: number
    subscriptions: number
    lastRefresh: Record<string, number>
  } {
    return {
      connected: this.isConnected,
      cacheSize: this.dashboardDataCache.size,
      subscriptions: this.subscriptions.size,
      lastRefresh: Object.fromEntries(this.lastDataRefresh)
    }
  }

  /**
   * Force cache cleanup
   */
  clearCache() {
    this.dashboardDataCache.clear()
    this.lastDataRefresh.clear()
  }

  /**
   * Subscribe to multiple dashboard data types with single connection
   */
  subscribeToMultipleDashboardTypes(
    userRole: 'team_member' | 'manager' | 'SLT',
    dataTypes: Array<'metrics' | 'team_data' | 'client_data' | 'active_timers'>
  ) {
    // Subscribe to general dashboard updates
    this.subscribeToDashboardUpdates(userRole)
    
    // Subscribe to specific data types
    for (const dataType of dataTypes) {
      const subscription = `dashboard.subscribe.${dataType}`
      this.subscriptions.add(subscription)
      this.emit(subscription, { role: userRole })
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
/**
 * WebSocket-first Dashboard Data Hook
 * 
 * This hook provides a WebSocket-first approach to dashboard data management:
 * - Prioritizes real-time updates over API polling
 * - Intelligently caches data with automatic expiration
 * - Provides optimistic updates for immediate UI feedback
 * - Integrates seamlessly with the unified DashboardAPI
 * - Handles connection failures gracefully with cached data
 */
export function useWebSocketDashboard<T = unknown>(
  dataType: 'comprehensive' | 'today' | 'clientHealth',
  options: {
    userRole: 'team_member' | 'manager' | 'SLT'
    selectedWeek?: string // For client health data
    enableOptimisticUpdates?: boolean
    fallbackToAPI?: boolean
    autoRefresh?: boolean
    refreshInterval?: number
  }
): {
  data: T | null
  loading: boolean
  error: string | null
  isConnected: boolean
  lastUpdate: Date | null
  refresh: () => void
  optimisticUpdate: (updates: Partial<T>) => string | null
  connectionHealth: ReturnType<typeof websocketService.getConnectionHealth>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<T>>>(new Map())

  // WebSocket dashboard connection
  const {
    isConnected,
    connectionHealth,
    requestRefresh,
    getCachedData,
    optimisticUpdate: wsOptimisticUpdate,
    clearCache
  } = useDashboardWebSocket(
    options.userRole,
    {
      onDataUpdate: (updateData) => {
        if (updateData.type === dataType || updateData.type === 'comprehensive') {
          setData(updateData.data as T)
          setLastUpdate(new Date())
          setLoading(false)
          setError(null)
          
          // Clear any optimistic updates that are now confirmed
          setOptimisticUpdates(new Map())
        }
      },
      onOptimisticUpdate: (optimisticData) => {
        if (optimisticData.type === dataType) {
          setOptimisticUpdates(prev => new Map(prev.set(optimisticData.requestId, optimisticData.data as Partial<T>)))
        }
      },
      onUpdateConfirmed: (confirmation) => {
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(confirmation.requestId)
          return newMap
        })
        
        if (confirmation.success && confirmation.data) {
          setData(confirmation.data as T)
          setLastUpdate(new Date())
        }
      }
    },
    {
      enableOptimisticUpdates: options.enableOptimisticUpdates,
      autoRefresh: options.autoRefresh,
      refreshInterval: options.refreshInterval
    }
  )

  // Initialize data - WebSocket-first approach
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      setError(null)

      // First, try to get cached data from WebSocket service
      const cachedData = getCachedData(dataType)
      if (cachedData) {
        setData(cachedData as T)
        setLastUpdate(new Date())
        setLoading(false)
      }

      // Then request fresh data via WebSocket
      if (isConnected) {
        requestRefresh(dataType === 'comprehensive' ? 'comprehensive' : 
                     dataType === 'today' ? 'metrics' :
                     'client_data')
      } else if (options.fallbackToAPI && !cachedData) {
        // Fallback to direct API call if WebSocket is not connected and no cache
        try {
          const { dashboardAPI } = await import('./dashboardService')
          let apiData: T
          
          switch (dataType) {
            case 'comprehensive':
              apiData = await dashboardAPI.getComprehensiveData() as T
              break
            case 'today':
              apiData = await dashboardAPI.getTodayData() as T
              break
            case 'clientHealth':
              if (!options.selectedWeek) {
                throw new Error('selectedWeek is required for clientHealth data')
              }
              apiData = await dashboardAPI.getClientHealthData(options.selectedWeek) as T
              break
            default:
              throw new Error(`Unknown data type: ${dataType}`)
          }
          
          setData(apiData)
          setLastUpdate(new Date())
          setLoading(false)
        } catch (apiError) {
          setError(apiError instanceof Error ? apiError.message : 'Failed to fetch data')
          setLoading(false)
        }
      } else {
        // No WebSocket connection and no fallback - show connection error
        setError('Not connected to real-time updates')
        setLoading(false)
      }
    }

    initializeData()
  }, [dataType, options.selectedWeek, isConnected, options.fallbackToAPI])

  // Manual refresh function
  const refresh = useCallback(() => {
    if (isConnected) {
      requestRefresh(dataType === 'comprehensive' ? 'comprehensive' : 
                   dataType === 'today' ? 'metrics' :
                   'client_data')
    } else if (options.fallbackToAPI) {
      // Trigger re-initialization which will use API fallback
      setLoading(true)
    }
  }, [dataType, isConnected, requestRefresh, options.fallbackToAPI])

  // Optimistic update function
  const optimisticUpdateFn = useCallback((updates: Partial<T>): string | null => {
    if (!options.enableOptimisticUpdates || !isConnected) {
      return null
    }

    return wsOptimisticUpdate(dataType, updates)
  }, [dataType, options.enableOptimisticUpdates, isConnected, wsOptimisticUpdate])

  // Merge data with optimistic updates
  const finalData = useMemo(() => {
    if (!data) return null

    // Apply optimistic updates to current data
    let mergedData = { ...data }
    for (const update of optimisticUpdates.values()) {
      mergedData = { ...mergedData, ...update }
    }

    return mergedData
  }, [data, optimisticUpdates])

  return {
    data: finalData,
    loading,
    error,
    isConnected,
    lastUpdate,
    refresh,
    optimisticUpdate: optimisticUpdateFn,
    connectionHealth
  }
}

/**
 * Unified Dashboard Data Provider Hook
 * 
 * Provides all dashboard data types in a single hook with WebSocket-first architecture
 */
export function useUnifiedDashboard(
  userRole: 'team_member' | 'manager' | 'SLT',
  options?: {
    selectedWeek?: string
    enableOptimisticUpdates?: boolean
    fallbackToAPI?: boolean
    autoRefresh?: boolean
    refreshInterval?: number
  }
) {
  const comprehensive = useWebSocketDashboard('comprehensive', {
    userRole,
    ...options
  })

  const today = useWebSocketDashboard('today', {
    userRole,
    ...options
  })

  const clientHealth = useWebSocketDashboard('clientHealth', {
    userRole,
    selectedWeek: options?.selectedWeek,
    ...options
  })

  const refreshAll = useCallback(() => {
    comprehensive.refresh()
    today.refresh()
    if (options?.selectedWeek) {
      clientHealth.refresh()
    }
  }, [comprehensive.refresh, today.refresh, clientHealth.refresh, options?.selectedWeek])

  return {
    comprehensive: comprehensive.data,
    today: today.data,
    clientHealth: options?.selectedWeek ? clientHealth.data : null,
    
    loading: {
      comprehensive: comprehensive.loading,
      today: today.loading,
      clientHealth: clientHealth.loading
    },
    
    error: {
      comprehensive: comprehensive.error,
      today: today.error,
      clientHealth: clientHealth.error
    },
    
    lastUpdate: {
      comprehensive: comprehensive.lastUpdate,
      today: today.lastUpdate,
      clientHealth: clientHealth.lastUpdate
    },
    
    isConnected: comprehensive.isConnected,
    connectionHealth: comprehensive.connectionHealth,
    
    refresh: {
      all: refreshAll,
      comprehensive: comprehensive.refresh,
      today: today.refresh,
      clientHealth: clientHealth.refresh
    },
    
    optimisticUpdate: {
      comprehensive: comprehensive.optimisticUpdate,
      today: today.optimisticUpdate,
      clientHealth: clientHealth.optimisticUpdate
    }
  }
}

// React hook for WebSocket events

export function useWebSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  // Use useRef to store the handler to avoid re-registering on every render
  const savedHandler = useRef(handler)

  // Update ref.current value if handler changes
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  // Create a stable callback that always calls the latest handler
  const stableHandler = useCallback((data: unknown) => {
    savedHandler.current(data as T)
  }, [])

  useEffect(() => {
    websocketService.on(event, stableHandler)

    return () => {
      websocketService.off(event, stableHandler)
    }
  }, [event, stableHandler])
}

// Dashboard-specific WebSocket hook - Step 11: WebSocket Integration
export function useDashboardWebSocket(
  userRole: 'team_member' | 'manager' | 'SLT',
  callbacks?: {
    onDataUpdate?: (data: DashboardDataUpdatedEvent & { cached?: boolean }) => void
    onTeamHealthUpdate?: (data: TeamHealthUpdatedEvent) => void
    onNotificationCreated?: (data: NotificationCreatedEvent) => void
    onOptimisticUpdate?: (data: { type: string; data: unknown; requestId: string }) => void
    onUpdateConfirmed?: (data: { requestId: string; success: boolean; data?: unknown }) => void
  },
  options?: {
    autoRefresh?: boolean
    refreshInterval?: number
    subscribeToDataTypes?: Array<'metrics' | 'team_data' | 'client_data' | 'active_timers'>
    enableOptimisticUpdates?: boolean
  }
) {
  const isConnected = websocketService.isSocketConnected()
  const [connectionHealth, setConnectionHealth] = useState(websocketService.getConnectionHealth())
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null)
  
  // Auto-refresh functionality
  useEffect(() => {
    if (!options?.autoRefresh || !isConnected) return

    const interval = setInterval(() => {
      websocketService.requestDashboardRefresh('comprehensive')
    }, options.refreshInterval || 300000) // Default 5 minutes

    return () => clearInterval(interval)
  }, [isConnected, options?.autoRefresh, options?.refreshInterval])

  // Subscribe to dashboard updates when connected
  useEffect(() => {
    if (isConnected) {
      if (options?.subscribeToDataTypes?.length) {
        // Subscribe to specific data types
        websocketService.subscribeToMultipleDashboardTypes(userRole, options.subscribeToDataTypes)
      } else {
        // Subscribe to general dashboard updates
        websocketService.subscribeToDashboardUpdates(userRole)
      }
      
      return () => {
        websocketService.unsubscribeFromDashboardUpdates()
      }
    }
  }, [isConnected, userRole, options?.subscribeToDataTypes])

  // Update connection health periodically
  useEffect(() => {
    const updateHealth = () => {
      setConnectionHealth(websocketService.getConnectionHealth())
    }

    const interval = setInterval(updateHealth, 5000)
    updateHealth() // Initial update

    return () => clearInterval(interval)
  }, [])

  // Enhanced data update handler
  const handleDataUpdate = useCallback((data: DashboardDataUpdatedEvent & { cached?: boolean }) => {
    setLastDataUpdate(new Date())
    callbacks?.onDataUpdate?.(data)
  }, [callbacks])

  // Optimistic update handlers
  const handleOptimisticUpdate = useCallback((data: { type: string; data: unknown; requestId: string }) => {
    callbacks?.onOptimisticUpdate?.(data)
  }, [callbacks])

  const handleUpdateConfirmed = useCallback((data: { requestId: string; success: boolean; data?: unknown }) => {
    callbacks?.onUpdateConfirmed?.(data)
  }, [callbacks])

  // Set up event listeners
  useWebSocketEvent('dashboard.data_updated', handleDataUpdate)
  useWebSocketEvent('dashboard.team_health_updated', callbacks?.onTeamHealthUpdate || (() => {}))
  useWebSocketEvent('dashboard.notification_created', callbacks?.onNotificationCreated || (() => {}))
  
  // Optimistic update event listeners
  if (options?.enableOptimisticUpdates) {
    useWebSocketEvent('dashboard.optimistic_update', handleOptimisticUpdate)
    useWebSocketEvent('dashboard.update_confirmed', handleUpdateConfirmed)
  }

  // WebSocket-first utility functions
  const requestRefresh = useCallback((dataType?: 'metrics' | 'team_data' | 'client_data' | 'active_timers' | 'comprehensive') => {
    websocketService.requestDashboardRefresh(dataType)
  }, [])

  const getCachedData = useCallback((dataType: string) => {
    return websocketService.getCachedDashboardData(dataType)
  }, [])

  const optimisticUpdate = useCallback((type: string, data: unknown) => {
    if (!options?.enableOptimisticUpdates) {
      console.warn('Optimistic updates are disabled. Enable them in options to use this feature.')
      return
    }
    
    const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    websocketService.optimisticUpdate(type, data, requestId)
    return requestId
  }, [options?.enableOptimisticUpdates])

  const clearCache = useCallback(() => {
    websocketService.clearCache()
  }, [])

  // Return enhanced utility functions and state
  return {
    // Connection state
    isConnected,
    connectionHealth,
    lastDataUpdate,
    
    // Basic WebSocket operations
    connect: websocketService.connect,
    disconnect: websocketService.disconnect,
    
    // Dashboard-specific operations
    requestRefresh,
    getCachedData,
    clearCache,
    
    // WebSocket-first enhancements
    optimisticUpdate,
    
    // Utility functions
    refreshNow: () => requestRefresh('comprehensive'),
    refreshMetrics: () => requestRefresh('metrics'),
    refreshTeamData: () => requestRefresh('team_data'),
    refreshClientData: () => requestRefresh('client_data'),
    refreshActiveTimers: () => requestRefresh('active_timers'),
    
    // Health monitoring
    isHealthy: connectionHealth.connected && connectionHealth.cacheSize >= 0,
    cacheSize: connectionHealth.cacheSize,
    subscriptionCount: connectionHealth.subscriptions
  }
}
