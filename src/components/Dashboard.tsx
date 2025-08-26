import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ClientHealthWidget from './dashboard/ClientHealthWidget'
import PulseCheckWidget from './dashboard/PulseCheckWidget'
import { PageHeader } from './PageHeader'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchCreditSummary } from '../store/slices/billingSlice'
import { billingService } from '../services/billingService'
import { creditService } from '../services/creditService'
import { clientService } from '../services/clientService'
import {
  Clock,
  Play,
  User,
  TrendingUp,
  Activity,
  Calendar,
  // Bell, // TODO: Re-enable when notification service is implemented
  DollarSign,
  Target,
  Users,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import { useTimeTracking } from '../contexts/ReduxTimeTrackingProvider'
import ServiceStatusIndicator from './ServiceStatusIndicator'
import { timeHelpers, timeTrackingService } from '../services/timeTrackingService'
import type { WeeklyTimeLogsResponse } from '../services/timeTrackingService'
import { 
  dashboardService, 
  type DashboardMetrics as ApiDashboardMetrics,
  type ComprehensiveDashboardData,
  type ActiveTimer as BFFActiveTimer
} from '../services/dashboardService'
import { 
  websocketService, 
  useDashboardWebSocket,
  useWebSocketEvent,
  type DashboardDataUpdatedEvent,
  type TeamHealthUpdatedEvent,
  type NotificationCreatedEvent
} from '../services/websocketService'

interface DashboardProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface DashboardMetrics {
  totalHoursToday: number
  totalHoursTodayChange: number
  totalHoursWeek: number
  totalHoursWeekChange: number
  totalHoursMonth: number
  completedTasksToday: number
  taskChangePercentage: number
  teamUtilization: number
  activeUsersCount: number
  totalUsersCount: number
  retainerUsage: {
    total: number
    used: number
    remaining: number
    percentage: number
  }
}

/**
 * Dashboard Component - REFACTORED for BFF + WebSocket Architecture (Steps 10 & 11)
 * 
 * This component has been refactored to use:
 * 1. Backend for Frontend (BFF) endpoint at /api/dashboard-bff/comprehensive
 * 2. WebSocket real-time updates to minimize polling
 * 
 * Key improvements from Step 10 (BFF):
 * - Single optimized API call instead of 3-5 separate calls
 * - Role-based data fetching (team members get less data)
 * - Faster response times due to server-side data aggregation
 * - Better error handling and loading states
 * 
 * Key improvements from Step 11 (WebSocket Integration):
 * - Real-time dashboard updates via WebSocket events
 * - Drastically reduced polling intervals (10-15min vs 1-5min)
 * - Only polls when WebSocket is disconnected (graceful degradation)
 * - Manual refresh button that uses WebSocket when connected
 * - WebSocket-aware connection status indicators
 * 
 * Legacy fallback logic is maintained during migration period and will be removed.
 */
export const Dashboard: React.FC<DashboardProps> = ({
  currentUser = { name: 'Jacob', role: 'SLT' }
}) => {
  const dispatch = useAppDispatch()
  const { creditSummary } = useAppSelector(state => state.billing)
  const [timerUpdateTick, setTimerUpdateTick] = useState(0)
  const [, setNotifications] = useState<Notification[]>([])
  // const [showNotifications, setShowNotifications] = useState(false)
  const [bffData, setBffData] = useState<ComprehensiveDashboardData | null>(null)
  const [bffLoading, setBffLoading] = useState(true)
  const [bffError, setBffError] = useState<string | null>(null)
  // Legacy state - will be removed after migration
  const [apiMetrics, setApiMetrics] = useState<ApiDashboardMetrics | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_metricsLoading, setMetricsLoading] = useState(true)
  const [todayWeeklyData, setTodayWeeklyData] = useState<WeeklyTimeLogsResponse | null>(null)
  const [fadingOutUsers, setFadingOutUsers] = useState<Set<string>>(new Set())
  const [clientHoursSummary, setClientHoursSummary] = useState<any | null>(null)
  const [previousActiveUsers, setPreviousActiveUsers] = useState<Array<{
    id: string
    name: string
    email: string
    task: string
    task_id: string
    client: string
    duration: string
    role: string
    status: string
    statusColor: string
    activeTimer: any
  }>>([])

  // Get data from time tracking context
  const {
    activeTimers,
    todayTimeData,
    userSettings,
    isLoading,
    error,
    isConnected,
    serviceStatus,
    getVisibleTimers,
    getWorkDayProgress
  } = useTimeTracking()

  // WebSocket integration - Step 11: Real-time updates
  const handleDashboardDataUpdate = useCallback((data: DashboardDataUpdatedEvent) => {
    console.log('Dashboard data update received:', data)
    
    // Update BFF data based on the type of update
    if (data.type === 'comprehensive') {
      setBffData(prevData => ({ 
        ...prevData, 
        ...data.data,
        timestamp: data.timestamp 
      } as ComprehensiveDashboardData))
    } else if (data.type === 'metrics') {
      setBffData(prevData => {
        if (!prevData) return prevData
        return {
          ...prevData, 
          metrics: { ...prevData.metrics, ...data.data },
          timestamp: data.timestamp 
        }
      })
    } else if (data.type === 'team_data') {
      setBffData(prevData => {
        if (!prevData) return prevData
        return {
          ...prevData, 
          team_data: { ...prevData.team_data, ...data.data },
          timestamp: data.timestamp 
        }
      })
    } else if (data.type === 'client_data') {
      setBffData(prevData => {
        if (!prevData) return prevData
        return {
          ...prevData, 
          client_data: { ...prevData.client_data, ...data.data },
          timestamp: data.timestamp 
        }
      })
    } else if (data.type === 'active_timers') {
      setBffData(prevData => ({ 
        ...prevData, 
        active_timers: data.data,
        timestamp: data.timestamp 
      } as ComprehensiveDashboardData))
    }
  }, []) // Remove bffData dependency to prevent stale closures

  const handleTeamHealthUpdate = useCallback((data: TeamHealthUpdatedEvent) => {
    console.log('Team health update received:', data)
    // Update team health data
    setBffData(prevData => {
      if (!prevData) return prevData
      return {
        ...prevData,
        team_data: {
          ...prevData.team_data,
          team_health: data.data
        },
        timestamp: data.timestamp
      }
    })
  }, [])

  const handleNotificationCreated = useCallback((data: NotificationCreatedEvent) => {
    console.log('Notification created:', data)
    // Add notification to the notifications list
    setNotifications(prev => [{
      id: data.notification.id.toString(),
      type: data.notification.type,
      title: data.notification.title,
      message: data.notification.message,
      timestamp: new Date(data.timestamp),
      read: false
    }, ...prev].slice(0, 10)) // Keep only last 10
  }, [])

  // Use the dashboard WebSocket hook
  const { 
    isConnected: wsConnected, 
    requestRefresh, 
    connect: wsConnect 
  } = useDashboardWebSocket(
    currentUser.role,
    handleDashboardDataUpdate,
    handleTeamHealthUpdate,
    handleNotificationCreated
  )

  // Fetch dashboard data function - moved before usage to avoid hoisting issues
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      setBffLoading(true)
      setBffError(null)
      
      // Fetch comprehensive data based on user role
      const includeOptions = {
        includeHourly: currentUser.role !== 'team_member', // Team members don't need hourly data
        includeProjects: currentUser.role === 'SLT', // Only SLT needs project breakdown
        includeWeeklyComparison: true,
        daysLookback: currentUser.role === 'SLT' ? 30 : 7 // SLT gets more history
      }
      
      const data = await dashboardService.getComprehensiveData(includeOptions)
      setBffData(data)
      
      // Also set legacy metrics for backward compatibility during transition
      setApiMetrics(data.metrics)
      
      // Log successful refresh
      console.log('Dashboard data refreshed successfully:', { 
        timestamp: data.timestamp, 
        forceRefresh,
        wsConnected 
      })
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setBffError('Failed to load dashboard data')
    } finally {
      setBffLoading(false)
      setMetricsLoading(false)
    }
  }, [currentUser.role, wsConnected])

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    if (wsConnected) {
      // Use WebSocket to request refresh (no parameter = comprehensive)
      requestRefresh()
    } else {
      // Fallback to direct API call instead of page reload
      fetchDashboardData(true)
    }
  }, [wsConnected, requestRefresh, fetchDashboardData])

  // Check if current user has an active timer
  const currentUserTimer = useMemo(() => {
    return activeTimers.find(timer => timer.user_email === currentUser?.email)
  }, [activeTimers, currentUser])

  // Note: Timer duration updates now handled via real-time calculation in components
  // Removed 1-second interval to prevent page flashing
  // Exception: Team members get 1-second updates for their timer display
  useEffect(() => {
    if (currentUser.role === 'team_member' && currentUserTimer) {
      const interval = setInterval(() => {
        setTimerUpdateTick(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [currentUser.role, currentUserTimer])


  // Add WebSocket reconnection event handler to force data refresh
  useWebSocketEvent('connected', useCallback(() => {
    console.log('WebSocket reconnected - forcing dashboard data refresh')
    fetchDashboardData(true) // Force refresh on reconnection
  }, [fetchDashboardData]))

  // Fetch initial dashboard data and set up WebSocket connection
  useEffect(() => {
    // Connect to WebSocket with user email
    if (currentUser?.email && !wsConnected) {
      wsConnect(currentUser.email)
    }

    // Initial data fetch
    fetchDashboardData()

    // Set up a fallback refresh interval (much longer now that we have WebSocket updates)
    // This serves as a backup in case WebSocket events are missed
    const fallbackInterval = setInterval(() => {
      if (!wsConnected) {
        // Only poll if WebSocket is disconnected
        fetchDashboardData()
      }
    }, 10 * 60 * 1000) // 10 minutes fallback polling

    return () => { 
      clearInterval(fallbackInterval)
    }
  }, [currentUser.role, currentUser.email, wsConnected, wsConnect, fetchDashboardData]) // Re-fetch when user role/email changes or WebSocket connects

  // Legacy data fetching - kept for fallback during migration (REDUCED FREQUENCY)
  // TODO: Remove after BFF migration is complete and WebSocket coverage is verified
  useEffect(() => {
    // Only fetch legacy data if BFF data is not available AND WebSocket is disconnected
    if (bffData || wsConnected) return
    
    const fetchTodayData = async () => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const todayStr = `${year}-${month}-${day}`
        
        const response = await timeTrackingService.getWeeklyTimeLogs({
          startDate: todayStr,
          endDate: todayStr,
          groupBy: 'user'
        })
        
        setTodayWeeklyData(response)
      } catch (err) {
        console.error('Failed to fetch today data from weekly endpoint:', err)
      }
    }

    fetchTodayData()
    // Reduced frequency - only runs when WebSocket is disconnected and no BFF data
    const interval = setInterval(fetchTodayData, 5 * 60 * 1000) // 5 minutes instead of 1 minute

    return () => { clearInterval(interval); }
  }, [bffData, wsConnected])

  // Fetch credit summary periodically for SLT/Managers (REDUCED FREQUENCY with WebSocket)
  useEffect(() => {
    if (currentUser.role === 'SLT' || currentUser.role === 'manager') {
      dispatch(fetchCreditSummary())
      
      // Reduced frequency when WebSocket is connected (15 min vs 5 min)
      const intervalTime = wsConnected ? 15 * 60 * 1000 : 5 * 60 * 1000
      const interval = setInterval(() => dispatch(fetchCreditSummary()), intervalTime)
      return () => { clearInterval(interval); }
    }
  }, [currentUser.role, dispatch, wsConnected])

  // Legacy client hours summary - kept for fallback during migration (REDUCED FREQUENCY)
  // TODO: Remove after BFF migration is complete
  useEffect(() => {
    // Only fetch legacy data if BFF data is not available AND WebSocket is disconnected
    if (bffData?.client_data || currentUser.role !== 'SLT' || wsConnected) return
      const fetchClientHours = async () => {
        try {
          // Use the new credit system endpoint for simplified data
          const bulkResponse = await creditService.getCreditsSummary(true)

          let totalHoursAllocated = 0
          let totalHoursUsed = 0
          let totalHoursRemaining = 0
          let totalUtilization = 0
          let clientCount = 0

          // Process credit data - simplified structure
          for (const clientData of bulkResponse.clients) {
            // Credit system has balance_hours (remaining) - no complex calculations needed
            const remainingBalance = Math.max(0, clientData.balance_hours)
            const isOverdrawn = clientData.is_overdrawn
            
            // For dashboard metrics, we'll estimate usage from balance
            // In a full implementation, you might want additional fields from the API
            totalHoursRemaining += remainingBalance
            clientCount++
            
            // Note: The new credit system simplifies this - no complex utilization calculations
            // totalHoursAllocated and totalHoursUsed would need additional API calls if needed
          }

          // Simplified metrics for the new credit system
          setClientHoursSummary({
            total_hours_allocated: 0, // Not calculated in simplified system
            total_hours_used: 0, // Not calculated in simplified system  
            total_hours_remaining: totalHoursRemaining,
            average_utilization: 0, // Not calculated in simplified system
            total_clients: clientCount
          })
        } catch (err) {
          console.error('Failed to fetch client hours summary:', err)
        }
      }
      
      fetchClientHours()
      // Reduced frequency - only runs when WebSocket is disconnected and no BFF client data
      const interval = setInterval(fetchClientHours, 10 * 60 * 1000) // 10 minutes instead of 5
      return () => { clearInterval(interval); }
  }, [currentUser.role, bffData?.client_data, wsConnected])

  // Get appropriate greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }
  // Process timers data for display
  const visibleTimers = useMemo(() => getVisibleTimers(), [getVisibleTimers])

  // Process active users for condensed display like TodayView
  const activeUsers = useMemo(() => {
    // Filter timers based on user role
    // Team members only see their own timer, others see all visible timers
    const filteredTimers = currentUser.role === 'team_member' && currentUser.email
      ? visibleTimers.filter(timer => timer.user_email === currentUser.email)
      : visibleTimers

    const currentActiveUsers = filteredTimers.map(timer => {
      // Get user settings
      const userSetting = userSettings.find(s => s.user_email === timer.user_email)
      const displayName = userSetting?.display_name || timer.user_name || timer.user_email
      const role = userSetting?.role || 'other'

      // Calculate duration
      const duration = timer.start_time ? timeHelpers.calculateDuration(timer.start_time) : 0
      const durationStr = timeHelpers.formatDuration(duration)

      // Determine status based on task content (same as TodayView)
      let status = 'Working'
      let statusColor = 'text-cro-win-strong dark:text-green-400'

      const taskInfo = timer.task_name || timer.description || ''
      if (taskInfo.toLowerCase().includes('meeting') || taskInfo.toLowerCase().includes('call')) {
        status = 'In Meeting / Admin Time'
        statusColor = 'text-cro-no-impact-strong dark:text-yellow-400'
      } else if (taskInfo.toLowerCase().includes('review') || taskInfo.toLowerCase().includes('testing') || taskInfo.toLowerCase().includes('qa') || taskInfo.toLowerCase().includes('peer')) {
        status = 'Reviewing'
        statusColor = 'text-cro-no-impact-strong dark:text-blue-400'
      } else if (taskInfo.toLowerCase().includes('design')) {
        status = 'Designing'
        statusColor = 'text-brand-purple-strong dark:text-purple-400'
      } else if (taskInfo.toLowerCase().includes('develop')) {
        status = 'Developing'
        statusColor = 'text-cro-win-strong dark:text-green-400'
      }

      return {
        id: timer.id,
        name: displayName,
        email: timer.user_email,
        task: timer.task_name || timer.description || 'No task',
        task_id: timer.task_id,
        client: timer.client_name,
        duration: durationStr,
        role: role.charAt(0).toUpperCase() + role.slice(1),
        status,
        statusColor,
        activeTimer: timer,
        isFadingOut: false
      }
    })

    // Add users that are fading out from previous state
    // For team members, only include their own fading timer
    const fadingUsers = previousActiveUsers
      .filter(user => {
        if (currentUser.role === 'team_member' && currentUser.email) {
          return fadingOutUsers.has(user.email) && user.email === currentUser.email
        }
        return fadingOutUsers.has(user.email)
      })
      .map(user => ({
        ...user,
        isFadingOut: true,
        statusColor: user.statusColor || 'text-neutral-500 dark:text-neutral-400'
      }))

    // Combine current and fading users, removing duplicates
    const allUsers = [...currentActiveUsers]
    fadingUsers.forEach(fadingUser => {
      if (!allUsers.find(user => user.email === fadingUser.email)) {
        allUsers.push(fadingUser)
      }
    })

    return allUsers
  }, [visibleTimers, userSettings, timerUpdateTick, fadingOutUsers, currentUser.role, currentUser.email]) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to handle fade-out animation when users are removed
  useEffect(() => {
    // Filter timers based on user role (same logic as activeUsers)
    const filteredTimers = currentUser.role === 'team_member' && currentUser.email
      ? visibleTimers.filter(timer => timer.user_email === currentUser.email)
      : visibleTimers
    
    const currentActiveEmails = new Set(filteredTimers.map(timer => timer.user_email))
    // Find users who were active but are no longer active

    // Find users who were active but are no longer active
    const removedUsers = previousActiveUsers.filter(user =>
      !currentActiveEmails.has(user.email)
    )

    if (removedUsers.length > 0) {
      // Add removed users to fading out set
      const newFadingOutUsers = new Set(fadingOutUsers)
      removedUsers.forEach(user => {
        newFadingOutUsers.add(user.email)
      })
      setFadingOutUsers(newFadingOutUsers)

      // Remove them from fading out set after animation completes
      // Remove them from fading out set after animation completes
      setTimeout(() => {
        setFadingOutUsers(prev => {
          const updated = new Set(prev)
          removedUsers.forEach(user => {
            updated.delete(user.email)
          })
          return updated
        })
      }, 500) // Match the animation duration
    }

    // Update previous active users (only when visibleTimers changes, not on every render)
    const currentUsers = visibleTimers.map(timer => {
      const userSetting = userSettings.find(s => s.user_email === timer.user_email)
      const displayName = userSetting?.display_name || timer.user_name || timer.user_email
      const role = userSetting?.role || 'other'
      const duration = timer.start_time ? timeHelpers.calculateDuration(timer.start_time) : 0
      const durationStr = timeHelpers.formatDuration(duration)

      let status = 'Working'
      let statusColor = 'text-cro-win-strong dark:text-green-400'
      const taskInfo = timer.task_name || timer.description || ''
      if (taskInfo.toLowerCase().includes('meeting') || taskInfo.toLowerCase().includes('call')) {
        status = 'In Meeting / Admin Time'
        statusColor = 'text-cro-no-impact-strong dark:text-yellow-400'
      } else if (taskInfo.toLowerCase().includes('review') || taskInfo.toLowerCase().includes('testing') || taskInfo.toLowerCase().includes('qa') || taskInfo.toLowerCase().includes('peer')) {
        status = 'Reviewing'
        statusColor = 'text-cro-no-impact-strong dark:text-blue-400'
      } else if (taskInfo.toLowerCase().includes('design')) {
        status = 'Designing'
        statusColor = 'text-brand-purple-strong dark:text-purple-400'
      } else if (taskInfo.toLowerCase().includes('develop')) {
        status = 'Developing'
        statusColor = 'text-cro-win-strong dark:text-green-400'
      }

      return {
        id: timer.id,
        name: displayName,
        email: timer.user_email,
        task: timer.task_name || timer.description || 'No task',
        task_id: timer.task_id,
        client: timer.client_name,
        duration: durationStr,
        role: role.charAt(0).toUpperCase() + role.slice(1),
        status,
        statusColor,
        activeTimer: timer
      }
    })

    setPreviousActiveUsers(currentUsers)
  }, [visibleTimers, userSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate totals for summary - count unique active users, only those visible on dashboard
  const activeCount = useMemo(() => {
    const activeUserEmails = new Set(visibleTimers.map(timer => timer.user_email))
    const visibleUserEmails = new Set(userSettings.filter(s => s.show_in_dashboard).map(s => s.user_email))
    return [...activeUserEmails].filter(email => visibleUserEmails.has(email)).length
  }, [visibleTimers, userSettings])
  const pausedCount = 0 // No paused state in current implementation

  // Calculate idle count: users set to show in dashboard but not currently active
  const idleCount = useMemo(() => {
    // Get all users who should be visible on dashboard
    const dashboardUsers = userSettings.filter(s => s.show_in_dashboard)

    // Get emails of users with active timers
    const activeUserEmails = new Set(visibleTimers.map(timer => timer.user_email))

    // Count users who should be visible but don't have active timers
    return dashboardUsers.filter(user => !activeUserEmails.has(user.user_email)).length
  }, [userSettings, visibleTimers])

  // Get work day progress
  const workDayProgress = useMemo(() => getWorkDayProgress(), [getWorkDayProgress])

  // Calculate current user's timer duration (updates every minute)
  const currentUserTimerDuration = useMemo(() => {
    if (!currentUserTimer?.start_time) return null
    return timeHelpers.formatDuration(timeHelpers.calculateDuration(currentUserTimer.start_time))
  }, [currentUserTimer, timerUpdateTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Use BFF metrics exclusively - all calculations are now done on the backend
  const metrics = useMemo<DashboardMetrics>(() => {
    // BFF data contains all pre-calculated metrics - no frontend calculations needed
    if (bffData?.metrics) {
      // Update client hours summary from BFF data if available
      if (bffData.client_data && !clientHoursSummary) {
        setClientHoursSummary({
          total_hours_allocated: bffData.client_data.total_available_hours,
          total_hours_used: bffData.client_data.total_used_hours,
          total_hours_remaining: bffData.client_data.total_available_hours - bffData.client_data.total_used_hours,
          average_utilization: bffData.client_data.average_utilization,
          total_clients: bffData.client_data.total_clients
        })
      }
      
      // Convert backend calculated data to dashboard metrics format
      const backendMetrics = bffData.metrics
      
      return {
        // Use backend-calculated values instead of frontend calculations
        totalHoursToday: backendMetrics.hours?.today?.total || 0,
        totalHoursTodayChange: backendMetrics.hours?.today?.change_percent || 0,
        totalHoursWeek: backendMetrics.hours?.week?.total || 0,
        totalHoursWeekChange: backendMetrics.hours?.week?.change_percent || 0,
        totalHoursMonth: backendMetrics.hours?.month?.total || 0,
        completedTasksToday: 0, // TODO: Add to backend calculation if needed
        taskChangePercentage: 0, // TODO: Add to backend calculation if needed
        teamUtilization: backendMetrics.team?.utilization_percent || 0,
        activeUsersCount: backendMetrics.team?.active_today || 0,
        totalUsersCount: backendMetrics.team?.total_members || 0,
        retainerUsage: {
          total: (backendMetrics.progress?.daily_target || 6) * (backendMetrics.team?.total_members || 1),
          used: backendMetrics.team?.total_team_hours || 0,
          remaining: Math.max(0, ((backendMetrics.progress?.daily_target || 6) * (backendMetrics.team?.total_members || 1)) - (backendMetrics.team?.total_team_hours || 0)),
          percentage: backendMetrics.progress?.actual_progress_percent || 0
        },
        // Include all backend calculated fields for future use
        ...backendMetrics
      }
    }
    
    // Fallback to legacy API metrics if BFF not available (during migration)
    if (apiMetrics) {
      return apiMetrics
    }

    // Basic fallback if no data available
    return {
      totalHoursToday: 0,
      totalHoursTodayChange: 0,
      totalHoursWeek: 0,
      totalHoursWeekChange: 0,
      totalHoursMonth: 0,
      completedTasksToday: 0,
      taskChangePercentage: 0,
      teamUtilization: 0,
      activeUsersCount: 0,
      totalUsersCount: 0,
      retainerUsage: {
        total: 0,
        used: 0,
        remaining: 0,
        percentage: 0
      }
    }
  }, [bffData, apiMetrics, clientHoursSummary])

  // Generate notifications based on metrics and activity
  useEffect(() => {
    const newNotifications: Notification[] = []

    // Idle user alerts have been removed per operational requirements

    // Check for high retainer usage
    if (metrics?.retainerUsage?.percentage > 80 && currentUser.role === 'SLT') {
      newNotifications.push({
        id: 'retainer-high',
        type: 'warning',
        title: 'High Retainer Usage',
        message: `Monthly retainer is ${(metrics?.retainerUsage?.percentage || 0).toFixed(0)}% consumed with ${Math.floor((new Date().getDate() / 30) * 100)}% of month elapsed`,
        timestamp: new Date(),
        read: false
      })
    }

    const currentHour = new Date().getHours()
    // Check for low daily hours
    if (metrics.totalHoursToday < 20 && currentHour >= 14 && currentUser.role !== 'team_member') {
      newNotifications.push({
        id: 'low-hours',
        type: 'info',
        title: 'Below Target Hours',
        message: `Team has logged ${(metrics?.totalHoursToday || 0).toFixed(1)} hours today, below the ${((userSettings?.length || 0) * 6).toFixed(0)} hour target`,
        timestamp: new Date(),
        read: false
      })
    }

    setNotifications(prev => {
      // Keep existing notifications and add new ones if they don't exist
      const existingIds = new Set(prev.map(n => n.id))
      const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id))
      return [...prev, ...uniqueNew].slice(-10) // Keep only last 10 notifications
    })
  }, [metrics, userSettings, visibleTimers, currentUser.role])


  // Get today's team progress data from backend (no more frontend calculations)
  const todayHours = useMemo(() => {
    // Use backend-calculated team progress data
    if (bffData?.team_progress?.team_members) {
      const visibleEmails = new Set(
        userSettings
          .filter(s => s.show_in_dashboard)
          .map(s => s.user_email)
      )
      
      return bffData.team_progress.team_members
        .filter(member => visibleEmails.size === 0 || visibleEmails.has(member.user_email))
        .map(member => {
          const userSetting = userSettings.find(s => s.user_email === member.user_email)
          const displayName = userSetting?.display_name || member.user_name || member.user_email
          
          return {
            name: displayName,
            email: member.user_email,
            logged: member.hours_today,
            target: 6, // Standard daily target
            percentage: member.daily_progress
          }
        })
        .sort((a, b) => b.logged - a.logged) // Sort by hours logged
    }
    
    // Fallback for team analytics individual metrics if team_progress not available
    if (bffData?.team_analytics?.individual_metrics) {
      const visibleEmails = new Set(
        userSettings
          .filter(s => s.show_in_dashboard)
          .map(s => s.user_email)
      )
      
      return bffData.team_analytics.individual_metrics
        .filter(member => visibleEmails.size === 0 || visibleEmails.has(member.user_email))
        .map(member => {
          const userSetting = userSettings.find(s => s.user_email === member.user_email)
          const displayName = userSetting?.display_name || member.user_name || member.user_email
          
          return {
            name: displayName,
            email: member.user_email,
            logged: member.today.hours,
            target: 6, // Standard daily target
            percentage: member.today.progress_percent
          }
        })
        .sort((a, b) => b.logged - a.logged) // Sort by hours logged
    }
    
    // Legacy fallback during migration - keep minimal calculation
    if (todayTimeData) {
      const visibleEmails = new Set(
        userSettings
          .filter(s => s.show_in_dashboard)
          .map(s => s.user_email)
      )
      const currentTarget = workDayProgress.isWorkingHours 
        ? workDayProgress.hoursIntoDay 
        : (workDayProgress.progressPercentage >= 100 ? 6 : 0)
      
      return todayTimeData.users
        .filter(user => visibleEmails.size === 0 || visibleEmails.has(user.user_email))
        .map(user => {
          const userSetting = userSettings.find(s => s.user_email === user.user_email)
          const displayName = userSetting?.display_name || user.user_name || user.user_email
          const percentage = currentTarget > 0 ? (user.total_hours / currentTarget) * 100 : 0

          return {
            name: displayName,
            email: user.user_email,
            logged: user.total_hours,
            target: currentTarget,
            percentage
          }
        })
        .sort((a, b) => b.logged - a.logged) // Sort by hours logged
    }
    
    return []
  }, [bffData, todayTimeData, userSettings, workDayProgress])


  const getHoursStatus = (hours: number) => {
    if (hours >= 6) return 'text-cro-win-strong dark:text-green-400'
    if (hours >= 4.8) return 'text-cro-no-impact-strong dark:text-yellow-400'
    return 'text-cro-loss-strong dark:text-red-400'
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Working':
      case 'Developing':
        return 'bg-cro-win-strong/10 dark:bg-green-900/20 text-cro-win-strong dark:text-green-400'
      case 'In Meeting / Admin Time':
        return 'bg-cro-no-impact-strong/10 dark:bg-yellow-900/20 text-cro-no-impact-strong dark:text-yellow-400'
      case 'Designing':
        return 'bg-brand-purple-strong/10 dark:bg-purple-900/20 text-brand-purple-strong dark:text-purple-400'
      case 'Reviewing':
        return 'bg-blue-500/10 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
    }
  }


  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title={`${getGreeting()} ${currentUser.name.split(' ')[0]}`}
        subtitle={
          currentUser.role === 'SLT'
            ? "Executive overview and team performance"
            : currentUser.role === 'manager'
            ? "Team management and project tracking"
            : "Your personal dashboard and time tracking"
        }
      >
        {/* Refresh Button - WebSocket Integration */}
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          title={wsConnected ? "Request data refresh via WebSocket" : "Refresh page (WebSocket disconnected)"}
        >
          <RefreshCw className={`h-4 w-4 ${bffLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {wsConnected ? 'Refresh' : 'Reload'}
          </span>
        </button>

        {/* Notifications Button - Hidden for now until notification service is built */}
        {/* TODO: Reintroduce once comprehensive notification service is implemented
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cro-loss-strong text-white text-xs rounded-full flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-medium text-neutral-900 dark:text-white">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-neutral-600 dark:text-neutral-300">
                    No notifications
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                      onClick={() => {
                        setNotifications(prev => prev.map(n =>
                          n.id === notification.id ? { ...n, read: true } : n
                        ))
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${
                          notification.type === 'error' ? 'text-cro-loss-strong' :
                          notification.type === 'warning' ? 'text-cro-no-impact-strong' :
                          notification.type === 'success' ? 'text-cro-win-strong' :
                          'text-blue-600'
                        }`}>
                          {notification.type === 'error' ? <XCircle className="h-4 w-4" /> :
                           notification.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                           notification.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                           <Info className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{notification.title}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                            {formatUKTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        */}
      </PageHeader>

      {/* Pulse Check Widget - Show if user hasn't submitted today */}
      <PulseCheckWidget currentUser={currentUser} />

      {/* Connection Status Banner - Updated for WebSocket */}
      {(!isConnected && !isLoading) || bffError || (!wsConnected && !bffLoading) ? (
        <div className="relative bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-xl p-4 mb-6 overflow-hidden">
          {/* Animated shimmer effect */}
          <div 
            className="absolute inset-0 -translate-x-full"
            style={{
              animation: 'shimmer 2s infinite'
            }}
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent skew-x-[-20deg]"></div>
          </div>
          
          {/* Content */}
          <div className="relative flex items-center gap-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '400ms' }}></div>
            </div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {bffError ? `Dashboard data error: ${bffError}` : 
               !wsConnected ? 'Real-time updates unavailable • WebSocket disconnected' :
               !isConnected ? 'Timer data unavailable • Connecting to server...' :
               'Connecting to server...'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Service Status Indicator - Show when timer service is offline */}
      <ServiceStatusIndicator serviceStatus={serviceStatus} className="mb-6" />

      {/* Key Metrics Cards - Show for SLT and Managers */}
      {(currentUser.role === 'SLT' || currentUser.role === 'manager') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Hours */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Clock className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <span className={`text-xs ${
                !isConnected || bffLoading ? 'text-neutral-400' :
                metrics.totalHoursTodayChange > 0 ? 'text-cro-win-strong' :
                metrics.totalHoursTodayChange < 0 ? 'text-cro-loss-strong' :
                'text-neutral-500'
              }` } title="vs last working day">
                {!isConnected || bffLoading ? '—' : 
                 metrics.totalHoursTodayChange !== undefined ? 
                   `${(metrics?.totalHoursTodayChange || 0) > 0 ? '+' : ''}${(metrics?.totalHoursTodayChange || 0) === Infinity ? '∞' : (metrics?.totalHoursTodayChange || 0).toFixed(0)}%` : 
                   '—'}
              </span>
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected && !bffLoading ? `${(metrics?.totalHoursToday || 0).toFixed(1)}h` : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Today's Hours</p>
          </div>

          {/* Week Hours */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Calendar className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <span className={`text-xs ${
                !isConnected || bffLoading ? 'text-neutral-400' :
                metrics.totalHoursWeekChange > 0 ? 'text-cro-win-strong' :
                metrics.totalHoursWeekChange < 0 ? 'text-cro-loss-strong' :
                'text-neutral-500'
              }` } title="vs last 7 days">
                {!isConnected || bffLoading ? '—' :
                 metrics.totalHoursWeekChange !== undefined ?
                   `${(metrics?.totalHoursWeekChange || 0) > 0 ? '+' : ''}${(metrics?.totalHoursWeekChange || 0) === Infinity ? '∞' : (metrics?.totalHoursWeekChange || 0).toFixed(0)}%` :
                   '—'}
              </span>
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected && !bffLoading ? `${(metrics?.totalHoursWeek || 0).toFixed(0)}h` : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Week Total</p>
          </div>

          {/* Team Utilization */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Users className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <span className={`text-xs ${
                !isConnected || bffLoading ? 'text-neutral-400' :
                metrics.teamUtilization > 70 ? 'text-cro-win-strong' : 'text-cro-no-impact-strong'
              }`}>
                {isConnected ? `${(metrics?.teamUtilization || 0).toFixed(0)}%` : '—'}
              </span>
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected && !bffLoading ? (
                metrics.activeUsersCount !== undefined && metrics.totalUsersCount !== undefined 
                  ? `${metrics.activeUsersCount}/${metrics.totalUsersCount}`
                  : `${activeCount}/${userSettings.filter(s => s.show_in_dashboard).length}`
              ) : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Team Active</p>
          </div>

          {/* Retainer Overview - Only for SLT */}
          {currentUser.role === 'SLT' && (
            <>
              <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
                !isConnected || bffLoading ? 'opacity-50' : ''
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
                  <span className={`text-xs ${
                    !isConnected ? 'text-neutral-400' :
                    clientHoursSummary?.average_utilization > 80 ? 'text-cro-loss-strong' :
                    clientHoursSummary?.average_utilization > 60 ? 'text-cro-no-impact-strong' :
                    'text-cro-win-strong'
                  }`}>
                    {isConnected && !bffLoading && clientHoursSummary?.average_utilization != null 
                      ? `${(clientHoursSummary.average_utilization || 0).toFixed(0)}% used` 
                      : '—'}
                  </span>
                </div>
                <div className="flex flex-col items-start justify-center h/full py-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Retainer Hours</p>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {isConnected && !bffLoading && clientHoursSummary?.total_hours_remaining != null 
                      ? `${(clientHoursSummary.total_hours_remaining || 0).toFixed(0)}h` 
                      : '—'}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 w-full">
                    <div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Allocated</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {isConnected && !bffLoading && clientHoursSummary?.total_hours_allocated != null 
                          ? `${(clientHoursSummary.total_hours_allocated || 0).toFixed(0)}h` 
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Used</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {isConnected && !bffLoading && clientHoursSummary?.total_hours_used != null 
                          ? `${(clientHoursSummary.total_hours_used || 0).toFixed(0)}h` 
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      )}

      {/* Personal Metrics for Team Members */}
      {currentUser.role === 'team_member' && currentUser.email && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* My Hours Today */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Clock className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected 
                ? `${(todayTimeData?.users.find(u => u.user_email === currentUser.email)?.total_hours || 0).toFixed(1)}h`
                : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">My Hours Today</p>
          </div>

          {/* Daily Minimum Progress */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Target className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <span className={`text-xs ${
                !isConnected || bffLoading ? 'text-neutral-400' :
                (todayTimeData?.users.find(u => u.user_email === currentUser.email)?.total_hours || 0) >= 6
                  ? 'text-cro-win-strong'
                  : 'text-cro-no-impact-strong'
              }`}>
                {isConnected 
                  ? `${((todayTimeData?.users.find(u => u.user_email === currentUser.email)?.total_hours || 0) / 6 * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected 
                ? `${Math.max(0, 6 - (todayTimeData?.users.find(u => u.user_email === currentUser.email)?.total_hours || 0)).toFixed(1)}h`
                : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">To Daily Minimum</p>
          </div>

          {/* Active Timer */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Activity className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              {isConnected && currentUserTimer && (
                <div className="w-2 h-2 rounded-full bg-cro-win-strong animate-pulse"></div>
              )}
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected ? (currentUserTimer ? '1' : '0') : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Active Timers</p>
          </div>

          {/* Week Progress */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm ${
            !isConnected || bffLoading ? 'opacity-50' : ''
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Calendar className={`h-4 w-4 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isConnected 
                ? `${((todayTimeData?.users.find(u => u.user_email === currentUser.email)?.total_hours || 0) * 4).toFixed(0)}h`
                : '—'}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Week Estimate</p>
          </div>
        </div>
      )}

      {/* Current Work */}
      <div className={`bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm ${
        !isConnected ? 'opacity-50' : ''
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Play className={`h-5 w-5 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Current Work</h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-4 text-xs overflow-x-auto">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${!isConnected ? 'bg-neutral-400 dark:bg-neutral-500' : 'bg-cro-win-strong dark:bg-green-400'}`} />
              <span className={!isConnected ? 'text-neutral-400' : 'text-neutral-600 dark:text-neutral-300'}>
                {isConnected ? `${activeCount} active` : '— active'}
              </span>
            </div>
            {isConnected && pausedCount > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                <span className="text-neutral-600 dark:text-neutral-300">{pausedCount} paused</span>
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${!isConnected ? 'bg-neutral-400 dark:bg-neutral-500' : 'bg-cro-loss-strong dark:bg-red-400'}`} />
              <span className={!isConnected ? 'text-neutral-400' : 'text-neutral-600 dark:text-neutral-300'}>
                {isConnected && idleCount > 0 ? `${idleCount} idle` : '— idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-cro-loss-strong/10 dark:bg-red-900/20 border border-cro-loss-strong/20 dark:border-red-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-cro-loss-strong dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Active Users */}
        <div
          className="transition-all duration-700 ease-out overflow-hidden"
          style={{
            maxHeight: isLoading ? '400px' : '2000px'
          }}
        >
          <div className={`grid gap-4 ${
            currentUser.role === 'team_member' 
              ? 'grid-cols-1' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {!isConnected ? (
              <div className="col-span-full text-center py-12">
                <div className="flex justify-center gap-1 mb-4">
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <p className="text-neutral-400 dark:text-neutral-500 text-sm">
                  Waiting for real-time data
                </p>
              </div>
            ) : activeUsers.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Clock className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  {isLoading ? "Loading current timers..." : "No active timers at the moment"}
                </p>
              </div>
            ) : (
              activeUsers.map((user, index) => (
                <div
                  key={`${user.email}-${index}`}
                  className={`rounded-xl border transition-all duration-500 transform ${
                    currentUser.role === 'team_member' ? 'p-6' : 'p-4'
                  } ${
                    user.isFadingOut
                      ? 'opacity-0 scale-95 pointer-events-none'
                      : 'opacity-100 scale-100'
                  } ${
                    user.email === currentUser?.email
                      ? 'bg-brand-purple-strong/5 dark:bg-purple-900/10 border-brand-purple-strong/20 dark:border-purple-700'
                      : 'bg-cro-win-strong/5 dark:bg-green-900/10 border-cro-win-strong/20 dark:border-green-700'
                  }`}
                  style={{
                    transitionProperty: 'opacity, transform',
                    transitionDuration: user.isFadingOut ? '500ms' : '300ms',
                    transitionTimingFunction: 'ease-out'
                  }}
                >
                  {/* User Header */}
                  <div className={`flex items-center justify-between ${currentUser.role === 'team_member' ? 'mb-4' : 'mb-3'}`}>
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        <div className={`bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center ${
                          currentUser.role === 'team_member' ? 'w-12 h-12' : 'w-8 h-8'
                        }`}>
                          <User className={`text-brand-purple-strong dark:text-purple-400 ${
                            currentUser.role === 'team_member' ? 'h-6 w-6' : 'h-4 w-4'
                          }`} />
                        </div>
                        <div className={`absolute -top-1 -right-1 rounded-full bg-cro-win-strong dark:bg-green-400 animate-pulse border-2 border-white dark:border-neutral-900 ${
                          currentUser.role === 'team_member' ? 'w-4 h-4' : 'w-3 h-3'
                        }`}></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold text-neutral-900 dark:text-white truncate ${
                            currentUser.role === 'team_member' ? 'text-lg' : 'text-sm'
                          }`}>{user.name}</h3>
                          {user.email === currentUser?.email && (
                            <span className={`bg-brand-purple-strong/20 dark:bg-brand-purple-strong/30 text-brand-purple-strong dark:text-purple-300 rounded-full font-medium flex-shrink-0 ${
                              currentUser.role === 'team_member' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
                            }`}>
                              You
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 flex-wrap ${currentUser.role === 'team_member' ? 'mt-2' : 'mt-1'}`}>
                          <span className={`rounded-full font-medium flex-shrink-0 ${
                            currentUser.role === 'team_member' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'
                          } ${getStatusBadgeColor(user.status)}`}>
                            {user.status}
                          </span>
                          <span className={`font-medium text-cro-win-strong dark:text-green-400 flex-shrink-0 ${
                            currentUser.role === 'team_member' ? 'text-lg' : 'text-xs'
                          }`}>
                            ⏱ {user.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Information */}
                  {user.task && (
                    <div className={currentUser.role === 'team_member' ? 'mt-3' : 'mt-2'}>
                      {user.task_id ? (
                        <a
                          href={`https://app.clickup.com/t/${user.task_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-neutral-600 dark:text-neutral-400 hover:text-brand-purple-strong dark:hover:text-brand-purple-light truncate underline-offset-2 hover:underline transition-colors block ${
                            currentUser.role === 'team_member' ? 'text-sm' : 'text-xs'
                          }`}
                        >
                          {user.client ? `${user.client} • ${user.task}` : user.task}
                        </a>
                      ) : (
                        <span className={`text-neutral-600 dark:text-neutral-400 truncate block ${
                          currentUser.role === 'team_member' ? 'text-sm' : 'text-xs'
                        }`}>
                          {user.client ? `${user.client} • ${user.task}` : user.task}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Client Health Widget for SLT/Managers */}
      {(currentUser.role === 'SLT' || currentUser.role === 'manager') && (
        <div className="mb-6 lg:mb-8">
          <ClientHealthWidget />
        </div>
      )}

      {/* Role-based bottom section */}
      {currentUser.role === 'SLT' || currentUser.role === 'manager' ? (
        // Leadership view: Team Hours Progress - Full Width
        <div className={`bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm ${
          !isConnected ? 'opacity-50' : ''
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Team Hours Progress</h2>
              {isConnected && todayHours.length > 0 && (
                <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full text-xs font-medium">
                  {todayHours.length} members
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              {isConnected && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cro-win-strong dark:bg-green-400"></div>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {!workDayProgress.isWorkingHours ? 'Met target' : 'On target'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cro-no-impact-strong dark:bg-yellow-400"></div>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {!workDayProgress.isWorkingHours ? 'Nearly met target' : 'Near target'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cro-loss-strong dark:bg-red-400"></div>
                    <span className="text-neutral-600 dark:text-neutral-300">Below target</span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 border-l border-neutral-300 dark:border-neutral-700 pl-4">
                    {workDayProgress.isWorkingHours 
                      ? `Target: ${(workDayProgress?.hoursIntoDay || 0).toFixed(1)}h by now`
                      : 'After hours - Daily target: 6.0h'}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {!isConnected ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <p className="text-neutral-400 dark:text-neutral-500">Waiting for team data...</p>
              </div>
            </div>
          ) : todayHours.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-600 dark:text-neutral-300">No time logged today yet</p>
            </div>
          ) : (
            <div className={todayHours.length > 10 ? 'max-h-[600px] overflow-y-auto scrollbar-custom pr-2' : ''}>
              <div className={`grid ${todayHours.length > 10 ? 'grid-cols-1 lg:grid-cols-2 gap-x-8' : 'grid-cols-1'} gap-y-4`}>
                {todayHours.map((person, index) => (
                  <div key={`${person.email}-${index}`} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          person.logged >= 6 ? 'bg-cro-win-strong/10 text-cro-win-strong dark:bg-green-900/20 dark:text-green-400' :
                          person.logged >= 4.8 ? 'bg-cro-no-impact-strong/10 text-cro-no-impact-strong dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-cro-loss-strong/10 text-cro-loss-strong dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{person.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-sm font-medium ${getHoursStatus(person.logged)}`}>
                          {person.logged.toFixed(1)}h
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          / {person.target.toFixed(1)}h
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          person.logged >= 6 ? 'bg-cro-win-strong/10 text-cro-win-strong dark:bg-green-900/20 dark:text-green-400' :
                          person.logged >= 4.8 ? 'bg-cro-no-impact-strong/10 text-cro-no-impact-strong dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-cro-loss-strong/10 text-cro-loss-strong dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {((person.logged / 6) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                      {/* Progress bar - now shows actual hours vs full day target */}
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          person.logged >= 6 ? 'bg-cro-win-strong dark:bg-green-600' :
                          person.logged >= 4.8 ? 'bg-cro-no-impact-strong dark:bg-yellow-600' :
                          'bg-cro-loss-strong dark:bg-red-600'
                        }`}
                        style={{ width: `${Math.min((person.logged / 6) * 100, 100)}%` }}
                      />
                      {/* Target line (where they should be based on UK time) */}
                      {workDayProgress.isWorkingHours && workDayProgress.progressPercentage > 0 && (
                        <div
                          className="absolute top-0 w-0.5 h-2 bg-neutral-900 dark:bg-white opacity-50"
                          style={{ left: `${workDayProgress.progressPercentage}%` }}
                          title={`Expected progress: ${(workDayProgress?.hoursIntoDay || 0).toFixed(1)}h`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Summary Stats */}
          {isConnected && todayHours.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Team Average</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {(todayHours.reduce((sum, p) => sum + p.logged, 0) / todayHours.length).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Hours</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {todayHours.reduce((sum, p) => sum + p.logged, 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">On Target</p>
                  <p className="text-lg font-semibold text-cro-win-strong dark:text-green-400">
                    {todayHours.filter(p => p.logged >= 6).length}/{todayHours.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Team Progress</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {todayHours.length > 0
                      ? ((todayHours.reduce((sum, p) => sum + p.logged, 0) / (todayHours.length * 6)) * 100).toFixed(0)
                      : '0'}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Team Member view: Personal progress and recent activity
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Personal Progress */}
          <div className={`bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm ${
            !isConnected ? 'opacity-75' : ''
          }`}>
            <div className="flex items-center gap-2 mb-6">
              <Target className={`h-5 w-5 ${!isConnected ? 'text-neutral-400' : 'text-brand-purple-strong'}`} />
              <h2 className="text-xl font-medium text-neutral-900 dark:text-white">My Progress Today</h2>
              {!isConnected && (
                <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full text-xs font-medium">
                  Offline
                </span>
              )}
            </div>
            <div className="space-y-6">
              {/* Daily Progress Bar */}
              {!isConnected ? (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Waiting for connection...</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">Daily Minimum</span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {(todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0).toFixed(1)}h / 6h
                    </span>
                  </div>
                  <div className="relative w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        ((todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) / 6 * 100) >= 100
                          ? 'bg-cro-win-strong dark:bg-green-600'
                          : ((todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) / 6 * 100) >= 80
                          ? 'bg-cro-no-impact-strong dark:bg-yellow-600'
                          : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(((todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) / 6 * 100), 100)}%`
                      }}
                    />
                    {/* Current time marker */}
                    {workDayProgress.isWorkingHours && workDayProgress.progressPercentage > 0 && (
                      <div
                        className="absolute top-0 w-0.5 h-3 bg-neutral-900 dark:bg-white opacity-50"
                        style={{ left: `${workDayProgress.progressPercentage}%` }}
                        title={`Work day progress: ${(workDayProgress?.hoursIntoDay || 0).toFixed(1)}h of 6h`}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Timer Status */}
              {currentUserTimer ? (
                <div className="p-4 bg-cro-win-strong/10 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">Timer Running</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {currentUserTimer.task_name || currentUserTimer.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cro-win-strong dark:bg-green-400 animate-pulse"></div>
                      <span className="text-sm font-medium text-cro-win-strong dark:text-green-400">
                        {currentUserTimerDuration}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">No active timer</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Start tracking your time to see progress</p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Week Total</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                    {((todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) * 4).toFixed(0)}h
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Avg Daily</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">
                    {(todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity / Tips */}
          <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Info className="h-5 w-5 text-brand-purple-strong" />
              <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Tips & Reminders</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Track your time accurately</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      Remember to start timers when beginning work and stop them during breaks
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-brand-purple-strong dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Daily minimum: 6 hours</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      Aim to log at least 6 productive hours each day
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${
                (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 6
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 3
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-start gap-3">
                  <TrendingUp className={`h-4 w-4 mt-0.5 ${
                    (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 6
                      ? 'text-cro-win-strong dark:text-green-400'
                      : (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 3
                      ? 'text-cro-no-impact-strong dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {(todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 6
                        ? "You're on track!"
                        : (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 3
                        ? "Halfway there!"
                        : "Let's get started!"}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {(todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0) >= 6
                        ? "Great job! You've met your daily minimum"
                        : `Keep going! ${Math.max(0, 6 - (todayTimeData?.users.find(u => u.user_email === currentUser?.email)?.total_hours || 0)).toFixed(1)} hours to reach your minimum`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
