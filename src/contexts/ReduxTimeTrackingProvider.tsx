import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchActiveTimers,
  refreshActiveTimers,
  fetchTodayTimeData,
  startTimer,
  stopTimer,
  updateActiveTimer,
  removeActiveTimer,
} from '../store/slices/timeEntriesSlice'
import {
  fetchAllUserSettings,
  updateUserSettings as updateSettingsAction,
} from '../store/slices/settingsSlice'
import { websocketService, useWebSocketEvent } from '../services/websocketService'
import type { TimerStartedEvent, TimerStoppedEvent, ActiveTimersUpdateEvent } from '../services/websocketService'
import { timeHelpers, timeTrackingService } from '../services/timeTrackingService'
import type { ActiveTimer, TodayTimeData, TimerServiceStatus } from '../services/timeTrackingService'
import type { UserSettings } from '../services/settingsService'

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
  forceRefreshActiveTimers: () => Promise<void>
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

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined)

export const TimeTrackingProvider: React.FC<{
  children: React.ReactNode
  userEmail?: string
}> = ({ children, userEmail }) => {
  const dispatch = useAppDispatch()
  const { activeTimers, todayTimeData, loading: timeLoading, error: timeError } = useAppSelector((state) => state.timeEntries)
  const { userSettings, loading: settingsLoading, error: settingsError } = useAppSelector((state) => state.settings)

  const [isConnected, setIsConnected] = React.useState(false)
  const [serviceStatus, setServiceStatus] = React.useState<TimerServiceStatus | null>(null)
  const durationUpdateIntervalRef = useRef<number | null>(null)
  const activeTimersPollingRef = useRef<number | null>(null)
  const isComponentMountedRef = useRef(true)

  // WebSocket event handlers - using correct event names from WebSocket service
  useWebSocketEvent('timer.started', (data: TimerStartedEvent) => {
    const activeTimer = {
      ...data.timer,
      duration: 0,
      billable: true,
      tags: [],
      source: 'webapp',
      client_name: ''
    }
    dispatch(updateActiveTimer(activeTimer as any))
    dispatch(fetchTodayTimeData())
  })

  useWebSocketEvent('timer.stopped', (data: TimerStoppedEvent) => {
    // Fix: TimerStoppedEvent doesn't have timer_id, it has time_entry
    dispatch(removeActiveTimer(data.time_entry.id))
    dispatch(fetchTodayTimeData())
  })

  useWebSocketEvent('time_entry.updated', () => {
    dispatch(fetchTodayTimeData())
  })

  useWebSocketEvent('active_timers.update', (data: ActiveTimersUpdateEvent) => {
    // Replace all active timers with the new list
    data.active_timers.forEach(timer => {
      const activeTimer: ActiveTimer = {
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
      }
      dispatch(updateActiveTimer(activeTimer as any))
    })
  })

  // Initial data load
  useEffect(() => {
    isComponentMountedRef.current = true

    // Load initial data
    dispatch(fetchActiveTimers())
    dispatch(fetchTodayTimeData())
    dispatch(fetchAllUserSettings())
    refreshServiceStatus()

    // Connect WebSocket with user email if available
    websocketService.connect(userEmail)
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected)
      if (connected) {
        dispatch(fetchActiveTimers())
        dispatch(fetchTodayTimeData())
      }
    }

    // Set up WebSocket connection handlers
    const onConnected = () => { handleConnectionChange(true); }
    const onDisconnected = () => { handleConnectionChange(false); }

    websocketService.on('connected', onConnected)
    websocketService.on('disconnected', onDisconnected)

    // Set up polling for active timers
    activeTimersPollingRef.current = window.setInterval(() => {
      if (isComponentMountedRef.current) {
        dispatch(fetchActiveTimers())
      }
    }, 30000) // Poll every 30 seconds

    // Note: Duration updates now handled in UI components via real-time calculation
    // Removed timer interval to prevent unnecessary re-renders

    return () => {
      isComponentMountedRef.current = false
      if (durationUpdateIntervalRef.current) {
        clearInterval(durationUpdateIntervalRef.current)
      }
      if (activeTimersPollingRef.current) {
        clearInterval(activeTimersPollingRef.current)
      }
      // Clean up WebSocket event listeners
      websocketService.off('connected', onConnected)
      websocketService.off('disconnected', onDisconnected)
      websocketService.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userEmail])

  const handleRefreshActiveTimers = async () => {
    await dispatch(fetchActiveTimers()).unwrap()
  }

  const handleForceRefreshActiveTimers = async () => {
    await dispatch(refreshActiveTimers()).unwrap()
  }

  const refreshTodayTimeData = async () => {
    await dispatch(fetchTodayTimeData()).unwrap()
  }

  const refreshUserSettings = async () => {
    await dispatch(fetchAllUserSettings()).unwrap()
  }

  const refreshServiceStatus = async () => {
    try {
      const status = await timeTrackingService.getTimerServiceStatus()
      setServiceStatus(status)
    } catch (error) {
      console.warn('Failed to fetch service status:', error)
      // Don't set error for service status as it's not critical
    }
  }

  const handleStartTimer = async (taskId?: string, description?: string) => {
    await dispatch(startTimer({ 
      ...(taskId && { taskId }),
      ...(description && { description })
    })).unwrap()
  }

  const handleStopTimer = async () => {
    await dispatch(stopTimer()).unwrap()
  }

  const handleUpdateUserSettings = async (email: string, updates: Partial<UserSettings>) => {
    await dispatch(updateSettingsAction({ email, settings: updates })).unwrap()
  }

  const getVisibleTimers = () => {
    return activeTimers.filter(timer => {
      const userSetting = userSettings.find(s => s.user_email === timer.user_email)
      return userSetting?.show_in_dashboard !== false
    })
  }

  const getUserTodayHours = (email: string) => {
    if (!todayTimeData) return 0
    const userEntry = todayTimeData.users.find(u => u.user_email === email)
    return userEntry?.total_hours || 0
  }

  const getWorkDayProgress = () => {
    return timeHelpers.calculateWorkDayProgress()
  }

  const isLoading = timeLoading || settingsLoading
  const error = timeError || settingsError

  return (
    <TimeTrackingContext.Provider
      value={{
        activeTimers,
        todayTimeData,
        userSettings,
        isLoading,
        error,
        isConnected,
        serviceStatus,
        refreshActiveTimers: handleRefreshActiveTimers,
        forceRefreshActiveTimers: handleForceRefreshActiveTimers,
        refreshTodayTimeData,
        refreshUserSettings,
        refreshServiceStatus,
        startTimer: handleStartTimer,
        stopTimer: handleStopTimer,
        updateUserSettings: handleUpdateUserSettings,
        getVisibleTimers,
        getUserTodayHours,
        getWorkDayProgress,
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  )
}

// Export the hook to use the context
// eslint-disable-next-line react-refresh/only-export-components
export function useTimeTracking() {
  const context = useContext(TimeTrackingContext)
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider')
  }
  return context
}
