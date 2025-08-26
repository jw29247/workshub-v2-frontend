import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { websocketService, useWebSocketEvent } from '../services/websocketService'
import type { TimerStartedEvent, TimerStoppedEvent, TimeEntryUpdatedEvent, ActiveTimersUpdateEvent } from '../services/websocketService'
import { timeTrackingService, timeHelpers } from '../services/timeTrackingService'
import type { ActiveTimer, TodayTimeData, TimerServiceStatus } from '../services/timeTrackingService'
import { settingsService } from '../services/settingsService'
import type { UserSettings } from '../services/settingsService'

// Context types
interface TimeTrackingContextType {
  // Data
  activeTimers: ActiveTimer[]
  todayTimeData: TodayTimeData | null
  userSettings: UserSettings[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
  serviceStatus: TimerServiceStatus | null

  // Actions
  refreshActiveTimers: () => Promise<void>
  refreshTodayTimeData: () => Promise<void>
  refreshUserSettings: () => Promise<void>
  refreshServiceStatus: () => Promise<void>
  startTimer: (taskId?: string, description?: string) => Promise<void>
  stopTimer: () => Promise<void>
  updateUserSettings: (email: string, updates: Partial<UserSettings>) => Promise<void>

  // Computed values
  getVisibleTimers: () => ActiveTimer[]
  getUserTodayHours: (email: string) => number
  getWorkDayProgress: () => ReturnType<typeof timeHelpers.calculateWorkDayProgress>
}

// Create context
const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined)

// Team ID - hardcoded for now, should come from config
const TEAM_ID = '6618875' // From CLAUDE.md

export const TimeTrackingProvider: React.FC<{
  children: React.ReactNode
  userEmail?: string
}> = ({ children, userEmail }) => {
  // State
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([])
  const [todayTimeData, setTodayTimeData] = useState<TodayTimeData | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<TimerServiceStatus | null>(null)

  // Refs for interval management
  const durationUpdateIntervalRef = useRef<number | null>(null)
  const activeTimersPollingRef = useRef<number | null>(null)
  const isComponentMountedRef = useRef(true)

  // Refresh active timers
  const refreshActiveTimers = useCallback(async () => {
    try {
      const response = await timeTrackingService.getActiveTimers()
      setActiveTimers(response.active_timers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch active timers')
    }
  }, [])

  // Refresh today's time data
  const refreshTodayTimeData = useCallback(async () => {
    try {
      const response = await timeTrackingService.getTodayTimeEntries(TEAM_ID)
      setTodayTimeData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time data')
    }
  }, [])

  // Refresh user settings
  const refreshUserSettings = useCallback(async () => {
    try {
      const response = await settingsService.getAllUserSettings()
      setUserSettings(response.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user settings')
    }
  }, [])

  // Refresh service status
  const refreshServiceStatus = useCallback(async () => {
    try {
      const status = await timeTrackingService.getTimerServiceStatus()
      setServiceStatus(status)
    } catch (err) {
      console.warn('Failed to fetch service status:', err)
      // Don't set error for service status as it's not critical
    }
  }, [])

  // Start timer
  const startTimer = useCallback(async (taskId?: string, description?: string) => {
    try {
      await timeTrackingService.startTimer(TEAM_ID, {
        ...(taskId && { tid: taskId }),
        ...(description && { description })
      })
      // WebSocket will handle the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer')
      throw err
    }
  }, [])

  // Stop timer
  const stopTimer = useCallback(async () => {
    try {
      await timeTrackingService.stopTimer(TEAM_ID)
      // WebSocket will handle the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer')
      throw err
    }
  }, [])

  // Update user settings
  const updateUserSettings = useCallback(async (email: string, updates: Partial<UserSettings>) => {
    try {
      const updatedSettings = await settingsService.updateUserSettings(email, updates)
      setUserSettings(prev => prev.map(s => s.user_email === email ? updatedSettings : s))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user settings')
      throw err
    }
  }, [])

  // Get visible timers based on user settings
  const getVisibleTimers = useCallback(() => {
    // If no user settings exist at all, show all timers
    if (userSettings.length === 0) {
      return activeTimers
    }

    const visibleEmails = new Set(
      userSettings
        .filter(s => s.show_in_dashboard)
        .map(s => s.user_email)
    )

    // Show timers for users who have settings AND are set to visible,
    // OR users who don't have settings at all (default to visible)
    return activeTimers.filter(timer => {
      const hasSettings = userSettings.some(s => s.user_email === timer.user_email)
      if (!hasSettings) {
        // User has no settings, show by default
        return true
      }
      // User has settings, check if they should be visible
      return visibleEmails.has(timer.user_email)
    })
  }, [activeTimers, userSettings])

  // Get user's today hours
  const getUserTodayHours = useCallback((email: string) => {
    if (!todayTimeData) return 0

    const userData = todayTimeData.users.find(u => u.user_email === email)
    return userData?.total_hours || 0
  }, [todayTimeData])

  // Get work day progress
  const getWorkDayProgress = useCallback(() => {
    return timeHelpers.calculateWorkDayProgress()
  }, [])

  // Recursive polling function for active timers
  const pollActiveTimers = useCallback(async () => {
    // Only continue if component is still mounted
    if (!isComponentMountedRef.current) return

    try {
      // Check service status first
      await refreshServiceStatus()
      
      // Only fetch active timers if service is active
      const currentStatus = serviceStatus
      if (currentStatus?.service_active !== false) {
        await refreshActiveTimers()
      } else {
        // Service is offline - clear active timers
        setActiveTimers([])
      }
    } catch {
        // Ignore errors
    } finally {
      // Schedule next poll only if component is still mounted
      // Use shorter interval when service might be coming back online
      const nextPollInterval = serviceStatus?.service_active === false ? 30000 : 60000 // 30s when offline, 60s when online
      if (isComponentMountedRef.current) {
        activeTimersPollingRef.current = setTimeout(pollActiveTimers, nextPollInterval)
      }
    }
  }, [refreshActiveTimers, refreshServiceStatus, serviceStatus])

  // WebSocket event handlers
  useWebSocketEvent<TimerStartedEvent>('timer.started', (data) => {
    // Convert WebSocket timer data to ActiveTimer with required properties
    const activeTimer: ActiveTimer = {
      id: data.timer.id,
      user_id: data.timer.user_id,
      user_email: data.timer.user_email,
      user_name: data.timer.user_name || '',
      task_id: data.timer.task_id || '',
      task_name: data.timer.task_name || '',
      description: data.timer.description || '',
      start_time: data.timer.start_time,
      duration: 0, // Will be calculated based on start_time
      billable: true, // Default to billable
      tags: [], // Empty tags by default
      source: 'webapp', // Default source
      client_name: '' // Empty client name by default
    }

    // Add or update timer in state
    setActiveTimers(prev => {
      const existing = prev.findIndex(t => t.user_email === data.user_email)
      if (existing >= 0) {
        // Update existing
        const updated = [...prev]
        updated[existing] = activeTimer
        return updated
      } else {
        // Add new
        return [...prev, activeTimer]
      }
    })
  })

  useWebSocketEvent<TimerStoppedEvent>('timer.stopped', (data) => {
    // Remove timer from active timers
    setActiveTimers(prev => prev.filter(t => t.user_email !== data.user_email))
    // Refresh today's data to get updated totals
    refreshTodayTimeData()
  })

  useWebSocketEvent<TimeEntryUpdatedEvent>('time_entry.updated', () => {
    // Refresh today's data when time entries are updated
    refreshTodayTimeData()
  })

  useWebSocketEvent('time_entry.created', () => {
    // Refresh today's data when new time entries are created
    refreshTodayTimeData()
  })

  useWebSocketEvent<{ time_entry_id: string }>('time_entry.deleted', () => {
    // Refresh today's data when time entries are deleted
    refreshTodayTimeData()
  })

  useWebSocketEvent<ActiveTimersUpdateEvent>('active_timers.update', (data) => {
    // Convert WebSocket timer data to ActiveTimer format with all required properties
    const activeTimers = data.active_timers.map(timer => ({
      id: timer.id,
      user_id: timer.user_id,
      user_email: timer.user_email,
      user_name: timer.user_name || '',
      task_id: timer.task_id || '',
      task_name: timer.task_name || '',
      description: timer.description || '',
      start_time: timer.start_time,
      duration: 0, // Will be calculated based on start_time
      billable: true,
      tags: [],
      source: 'webapp',
      client_name: ''
    }))
    setActiveTimers(activeTimers)
  })

  useWebSocketEvent('connected', () => {
    setIsConnected(true)
    // Refresh data on reconnect
    refreshActiveTimers()
    refreshTodayTimeData()
  })

  useWebSocketEvent('disconnected', () => {
    setIsConnected(false)
  })

  // Initialize on mount
  useEffect(() => {
    // Mark component as mounted
    isComponentMountedRef.current = true

    const init = async () => {
      setIsLoading(true)

      try {
        // Connect WebSocket with user email
        websocketService.connect(userEmail || 'user@thatworks.agency')

        // Initial data fetch
        await Promise.all([
          refreshActiveTimers(),
          refreshTodayTimeData(),
          refreshUserSettings(),
          refreshServiceStatus()
        ])

        // Start polling after initial fetch succeeds
        pollActiveTimers()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      } finally {
        setIsLoading(false)
      }
    }

    init()

    // Note: Duration updates now handled in UI components via real-time calculation
    // Removed forced re-render interval to prevent page flashing

    // Cleanup
    return () => {
      // Mark component as unmounted
      isComponentMountedRef.current = false

      websocketService.disconnect()

      if (durationUpdateIntervalRef.current) {
        clearInterval(durationUpdateIntervalRef.current)
      }

      if (activeTimersPollingRef.current) {
        clearTimeout(activeTimersPollingRef.current)
      }
    }
  }, [refreshActiveTimers, refreshTodayTimeData, refreshUserSettings, refreshServiceStatus, pollActiveTimers, userEmail])

  const value: TimeTrackingContextType = {
    activeTimers,
    todayTimeData,
    userSettings,
    isLoading,
    error,
    isConnected,
    serviceStatus,
    refreshActiveTimers,
    refreshTodayTimeData,
    refreshUserSettings,
    refreshServiceStatus,
    startTimer,
    stopTimer,
    updateUserSettings,
    getVisibleTimers,
    getUserTodayHours,
    getWorkDayProgress
  }

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  )
}

// Hook to use time tracking context
// eslint-disable-next-line react-refresh/only-export-components
export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext)
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider')
  }
  return context
}
