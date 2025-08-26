import React, { useState, useEffect } from 'react'
import { formatUKTime } from '../utils/dateFormatting'
import { LoadingCentered } from './LoadingState'
import { PageHeader } from './PageHeader'
import {
  Clock,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react'
import { dashboardService, type TodayDashboardData } from '../services/dashboardService'
import { timeHelpers } from '../services/timeTrackingService'

interface TodayViewProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}


export const TodayView: React.FC<TodayViewProps> = () => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [todayData, setTodayData] = useState<TodayDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch today's data from backend BFF endpoint
  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await dashboardService.getTodayData()
        setTodayData(response)
      } catch (err) {
        console.error('Failed to fetch today data:', err)
        setError('Failed to load today data')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchTodayData()
    // Refresh every 3 minutes to match backend cache TTL
    const interval = setInterval(() => {
      void fetchTodayData()
    }, 3 * 60 * 1000)

    return () => { clearInterval(interval); }
  }, [])

  // Use backend-calculated data (no more frontend calculations!)
  const userTimeData = todayData?.user_data ?? []
  const teamSummary = todayData?.team_summary ?? {
    active_now: 0,
    total_hours: 0,
    team_members: 0,
    on_target_count: 0,
    on_target_percentage: 0
  }

  const toggleCardExpansion = (email: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(email)) {
        newSet.delete(email)
      } else {
        newSet.add(email)
      }
      return newSet
    })
  }

  // Calculate current user's active timer duration
  const getActiveTimerDuration = (timer: { start_time: string | null } | null) => {
    if (!timer?.start_time || timer.start_time.length === 0) return null
    return timeHelpers.formatDuration(timeHelpers.calculateDuration(timer.start_time))
  }

  // Check if timer has been running for more than 4 hours (likely left on)
  const isTimerLeftOn = (timer: { start_time: string | null } | null) => {
    if (!timer?.start_time || timer.start_time.length === 0) return false
    const durationMs = timeHelpers.calculateDuration(timer.start_time)
    const durationHours = durationMs / (1000 * 60 * 60) // Convert milliseconds to hours
    return durationHours > 4
  }

  // Format idle since time for inactive users
  const formatIdleSince = (lastLogTime: string | null) => {
    if (!lastLogTime || lastLogTime.length === 0) return null
    
    // IMPORTANT: All times from the backend are in UTC/ISO format
    // We must ensure consistent timezone handling regardless of user location
    
    // Parse the time string - expecting ISO format from backend
    let lastLog: Date
    
    // Check if the time string includes timezone info (ends with 'Z' or has timezone offset)
    if (lastLogTime.includes('Z') || lastLogTime.match(/[+-]\d{2}:\d{2}$/)) {
      // Already has timezone info, parse directly
      lastLog = new Date(lastLogTime)
    } else {
      // No timezone info, assume it's UTC (append 'Z')
      lastLog = new Date(lastLogTime + 'Z')
    }
    
    const now = new Date()
    
    // If the parsed date is invalid, return null
    if (isNaN(lastLog.getTime())) {
      console.warn('Invalid date for idle time:', lastLogTime)
      return null
    }
    
    // Calculate the difference in milliseconds
    // getTime() returns milliseconds since epoch in UTC, so this is timezone-agnostic
    const diffMs = now.getTime() - lastLog.getTime()
    
    // Check if the difference is negative (future time)
    if (diffMs < 0) {
      console.warn('Last log time is in the future:', { 
        lastLogTime, 
        lastLogUTC: lastLog.toISOString(),
        nowUTC: now.toISOString(),
        diffMs 
      })
      return 'Just now'
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const remainingMinutes = diffMinutes % 60

    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes === 1) {
      return '1 minute ago'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`
    } else if (diffHours === 1) {
      if (remainingMinutes === 0) {
        return '1 hour ago'
      }
      return `1 hour ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'} ago`
    } else if (diffHours < 24) {
      // Show hours and minutes for better precision when less than 3 hours
      if (diffHours < 3 && remainingMinutes > 0) {
        return `${diffHours} hours ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'} ago`
      }
      return `${diffHours} hours ago`
    } else {
      // For times over 24 hours, show the actual time in local timezone
      return formatUKTime(lastLog)
    }
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title="Today's Activity"
        subtitle="Real-time view of team time tracking and productivity"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cro-win-strong animate-pulse"></div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Active Now</span>
          </div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {teamSummary.active_now}
          </p>
        </div>
        
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-brand-purple-strong" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Hours</span>
          </div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {teamSummary.total_hours}h
          </p>
        </div>
        
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-brand-purple-strong" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Team Members</span>
          </div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {teamSummary.team_members}
          </p>
        </div>
        
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div 
                className="h-2 rounded-full bg-cro-win-strong transition-all duration-500"
                style={{ width: `${teamSummary.on_target_percentage}%` }}
              />
            </div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">On Target</span>
          </div>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {teamSummary.on_target_count}/{teamSummary.team_members}
          </p>
        </div>
      </div>

      {/* Team Activity Grid */}
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Team Activity</h2>
          <div className="flex items-center gap-2">
            {teamSummary.active_now > 0 && (
              <span className="flex items-center gap-1 text-xs text-cro-win-strong dark:text-green-400">
                <div className="w-2 h-2 rounded-full bg-cro-win-strong dark:bg-green-400 animate-pulse"></div>
                Live
              </span>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <LoadingCentered
            message="Loading time data..."
            size="lg"
            className="py-12"
          />
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-cro-loss-strong/10 dark:bg-red-900/20 border border-cro-loss-strong/20 dark:border-red-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-cro-loss-strong dark:text-red-400">{error}</p>
          </div>
        )}

        {/* User Cards Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {userTimeData.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Clock className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-300">No users found in the system</p>
              </div>
            ) : (
              userTimeData.map((user, index) => {
                const isExpanded = expandedCards.has(user.email)
                const activeTimerDuration = user.active_timer ? getActiveTimerDuration(user.active_timer) : null
                const timerLeftOn = user.is_active && user.active_timer ? isTimerLeftOn(user.active_timer) : false

                return (
                  <div key={`${user.email}-${index}`} className={`rounded-xl border p-4 transition-all duration-300 ${
                    timerLeftOn
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700 shadow-lg shadow-red-500/20'
                      : user.is_active
                        ? 'bg-cro-win-strong/5 dark:bg-green-900/10 border-cro-win-strong/20 dark:border-green-700'
                        : user.meets_target
                          ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                          : 'bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800'
                  }`}>
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Profile Picture */}
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-brand-purple-strong dark:text-purple-400" />
                          </div>
                          {user.is_active && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cro-win-strong dark:bg-green-400 animate-pulse border-2 border-white dark:border-neutral-900"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{user.name}</h3>
                            {user.is_active && activeTimerDuration && (
                              <span className="text-xs font-medium text-cro-win-strong dark:text-green-400">
                                {activeTimerDuration}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${user.status_color}`}>
                              {user.status}
                            </span>
                            {!user.is_active && user.logged_hours > 0 && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                • {formatIdleSince(user.last_log)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {user.entry_count > 0 && (
                        <button
                          onClick={() => { toggleCardExpansion(user.email); }}
                          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-neutral-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-neutral-500" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Current Task (for active users) */}
                    {user.is_active && user.active_timer?.task_name && (
                      <div className="mb-3 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Working on</div>
                        {user.active_timer.task_id ? (
                          <a
                            href={`https://app.clickup.com/t/${user.active_timer.task_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-neutral-900 dark:text-white hover:text-brand-purple-strong transition-colors truncate block"
                            title={user.active_timer.task_name}
                          >
                            {user.active_timer.task_name}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-neutral-900 dark:text-white truncate block" title={user.active_timer.task_name}>
                            {user.active_timer.task_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Timer Left On Warning */}
                    {timerLeftOn && (
                      <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                          <span className="text-xs font-medium text-red-700 dark:text-red-400">
                            Timer running for 4+ hours
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Time Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          Daily Progress
                        </span>
                        <span className="text-xs font-medium text-neutral-900 dark:text-white">
                          {user.logged_hours}h / {user.target_hours}h
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${user.progress_color}`}
                          style={{ width: `${Math.min(user.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && user.entry_count > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                          Today's Tasks ({user.entry_count})
                        </div>
                        <div className="space-y-1.5">
                          {user.entries.map((entry, entryIndex: number) => (
                            <div key={`${entry.id}-${entryIndex}`} className="flex items-center justify-between py-1.5 px-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                              <div className="flex-1 min-w-0">
                                {entry.task_name ? (
                                  entry.task_id ? (
                                    <a
                                      href={`https://app.clickup.com/t/${entry.task_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-brand-purple-strong transition-colors truncate block"
                                      title={entry.task_name}
                                    >
                                      {entry.task_name}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate block" title={entry.task_name}>
                                      {entry.task_name}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-neutral-500 dark:text-neutral-400 italic truncate block">
                                    {entry.description || 'No description'}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                                {entry.duration_formatted}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
