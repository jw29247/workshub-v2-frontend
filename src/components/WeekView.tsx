import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { formatUKDate } from '../utils/dateFormatting'
import {
  CalendarDays,
  Users,
  User,
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react'
import { timeTrackingService, type WeeklyTimeLogsResponse } from '../services/timeTrackingService'
import { PageHeader } from './PageHeader'
import { LoadingSpinner } from './LoadingSpinner'

interface WeekViewProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const WeekView: React.FC<WeekViewProps> = ({ currentUser }) => {

  // State
  const [groupBy, setGroupBy] = useState<'user' | 'client'>('user')
  const [selectedWeek, setSelectedWeek] = useState(getStartOfWeek(new Date()))
  const [weeklyData, setWeeklyData] = useState<WeeklyTimeLogsResponse | null>(null)
  const [previousWeekData, setPreviousWeekData] = useState<WeeklyTimeLogsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Constants
  const DAILY_TARGET = 6 // 6 hours per day
  const WORKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Helper function to get start of week (Monday)
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  // Helper function to get end of week (Sunday)
  function getEndOfWeek(startOfWeek: Date): Date {
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    return endOfWeek
  }

  // Helper function to format date for display
  function formatDateRange(startDate: Date): string {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const start = formatUKDate(startDate, formatOptions)
    const end = formatUKDate(endDate, formatOptions)
    const year = startDate.getFullYear()

    return `${start} - ${end}, ${year}`
  }

  // Calculate which workday we're currently on (for intelligent averaging)
  const currentWorkday = useMemo(() => {
    const today = new Date()
    const todayDay = today.getDay()
    
    // If it's Monday-Friday
    if (todayDay >= 1 && todayDay <= 5) {
      // Check if we're looking at current week
      const weekStart = getStartOfWeek(today)
      if (weekStart.toDateString() === selectedWeek.toDateString()) {
        return todayDay // 1 = Monday, 5 = Friday
      }
    }
    
    // For past weeks or weekends, use Friday (5 days)
    if (selectedWeek < getStartOfWeek(today)) {
      return 5
    }
    
    // For future weeks, return 0
    return 0
  }, [selectedWeek])

  // Load weekly data
  const loadWeeklyData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Format dates as YYYY-MM-DD without timezone conversion
      const startYear = selectedWeek.getFullYear()
      const startMonth = String(selectedWeek.getMonth() + 1).padStart(2, '0')
      const startDay = String(selectedWeek.getDate()).padStart(2, '0')
      const startDate = `${startYear}-${startMonth}-${startDay}`
      
      const endWeek = getEndOfWeek(selectedWeek)
      const endYear = endWeek.getFullYear()
      const endMonth = String(endWeek.getMonth() + 1).padStart(2, '0')
      const endDay = String(endWeek.getDate()).padStart(2, '0')
      const endDate = `${endYear}-${endMonth}-${endDay}`

      
      // Load current week data
      const response = await timeTrackingService.getWeeklyTimeLogs({
        startDate,
        endDate,
        groupBy
      })

      setWeeklyData(response)

      // Load previous week data for comparison
      const prevWeek = new Date(selectedWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      const prevStartYear = prevWeek.getFullYear()
      const prevStartMonth = String(prevWeek.getMonth() + 1).padStart(2, '0')
      const prevStartDay = String(prevWeek.getDate()).padStart(2, '0')
      const prevStartDate = `${prevStartYear}-${prevStartMonth}-${prevStartDay}`
      
      const prevEndWeek = getEndOfWeek(prevWeek)
      const prevEndYear = prevEndWeek.getFullYear()
      const prevEndMonth = String(prevEndWeek.getMonth() + 1).padStart(2, '0')
      const prevEndDay = String(prevEndWeek.getDate()).padStart(2, '0')
      const prevEndDate = `${prevEndYear}-${prevEndMonth}-${prevEndDay}`

      try {
        const prevResponse = await timeTrackingService.getWeeklyTimeLogs({
          startDate: prevStartDate,
          endDate: prevEndDate,
          groupBy
        })
        setPreviousWeekData(prevResponse)
      } catch {
        // If previous week fails, just continue without comparison
        setPreviousWeekData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly data')
    } finally {
      setLoading(false)
    }
  }, [selectedWeek, groupBy])

  // Load data when component mounts or filters change
  useEffect(() => {
    loadWeeklyData()
  }, [loadWeeklyData])

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedWeek(newWeek)
  }

  // Go to current week
  const goToCurrentWeek = () => {
    setSelectedWeek(getStartOfWeek(new Date()))
  }

  // Use backend-calculated totals and comparisons (no more frontend calculations)
  const weeklyTotalHours = calculatedWeekData?.weekly_data?.totals?.total_hours || 0
  const previousWeekTotalHours = calculatedWeekData?.previous_week_data?.totals?.total_hours || 0
  const hoursChange = calculatedWeekData?.comparison?.hours_change || 0
  const hoursChangePercent = calculatedWeekData?.comparison?.hours_change_percent || 0
  
  // Use backend-calculated averages and changes
  const averagePerDay = calculatedWeekData?.weekly_data?.totals?.average_per_day || 0
  const previousAveragePerDay = calculatedWeekData?.previous_week_data?.totals?.average_per_day || 0
  const averageChange = calculatedWeekData?.comparison?.average_change || 0
  const averageChangePercent = calculatedWeekData?.comparison?.average_change_percent || 0

  // Use backend-calculated data (no more frontend calculations needed)
  const processedWeekData = useMemo(() => {
    // Prioritize backend-calculated data
    if (calculatedWeekData?.weekly_data?.groups) {
      let groups = calculatedWeekData.weekly_data.groups
      
      // Filter data for team members - only show their own data
      if (currentUser?.role === 'team_member' && currentUser?.email && groupBy === 'user') {
        groups = groups.filter(group => group.email === currentUser.email)
      }
      
      return groups
    }
    
    // Fallback to legacy data processing (simplified for migration period)
    if (!weeklyData || weeklyData.weeks.length === 0) return null

    const week = weeklyData.weeks[0]
    if (!week) return null

    // Simplified legacy processing - minimal calculations
    const groupsData = week.groups.map(group => {
      // Extract daily hours
      const dailyHours: { [key: string]: number } = {}
      let totalHours = 0
      let metDailyTargets = 0
      
      if (group.days && typeof group.days === 'object') {
        Object.entries(group.days).forEach(([dateStr, dayData]) => {
          if (dayData && typeof dayData === 'object' && 'duration_hours' in dayData) {
            const date = new Date(dateStr + 'T12:00:00Z')
            const dayOfWeek = date.getDay()
            
            // Only count Monday-Friday (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              dailyHours[dateStr] = dayData.duration_hours
              totalHours += dayData.duration_hours
              
              if (dayData.duration_hours >= DAILY_TARGET) {
                metDailyTargets++
              }
            }
          }
        })
      }
      
      // Basic calculations for legacy fallback
      const weeklyAverage = groupBy === 'user' 
        ? totalHours / (currentWorkday > 0 ? currentWorkday : 5)
        : 0
      const onTrack = groupBy === 'user' ? weeklyAverage >= DAILY_TARGET : false
      
      return {
        id: group.id,
        name: group.name,
        ...(group.email ? { email: group.email } : {}),
        dailyHours,
        totalHours,
        metDailyTargets,
        weeklyAverage,
        onTrack,
        type: groupBy
      }
    })

    // Filter data for team members
    if (currentUser?.role === 'team_member' && currentUser?.email && groupBy === 'user') {
      return groupsData.filter(group => group.email === currentUser.email)
    }
    
    return groupsData
  }, [calculatedWeekData, weeklyData, selectedWeek, currentWorkday, currentUser, groupBy])

  // Generate weekday dates for headers
  const weekDates = useMemo(() => {
    const dates = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(selectedWeek)
      date.setDate(date.getDate() + i)
      // Format as YYYY-MM-DD in local timezone to match our data processing
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      dates.push({
        day: WORKDAYS[i],
        date: date.getDate(),
        dateKey: dateKey,
        isToday: date.toDateString() === new Date().toDateString(),
        isPast: date < new Date()
      })
    }
    return dates
  }, [selectedWeek])

  // Get status color for hours
  const getHoursColor = (hours: number, isToday: boolean = false) => {
    // Only apply target-based colors for users
    if (groupBy === 'user') {
      if (hours >= DAILY_TARGET) return 'text-cro-win-strong' // Green for 6+ hours
      if (hours >= DAILY_TARGET * 0.8) return 'text-cro-no-impact-strong' // Orange for 4.8-5.9 hours  
      if (hours > 0) return 'text-cro-loss-strong' // Red for anything below 4.8 hours
    }
    // For clients or zero hours
    if (hours > 0) return 'text-neutral-700 dark:text-neutral-300'
    if (isToday) return 'text-neutral-400'
    return 'text-neutral-300'
  }

  // Get background color for hours cell
  const getCellBackground = (hours: number, isToday: boolean = false) => {
    // Only apply target-based colors for users
    if (groupBy === 'user') {
      if (hours >= DAILY_TARGET) return 'bg-cro-win-strong/10' // Green background for 6+ hours
      if (hours >= DAILY_TARGET * 0.8) return 'bg-cro-no-impact-strong/10' // Orange background for 4.8-5.9 hours
      if (hours > 0) return 'bg-cro-loss-strong/10' // Red background for anything below 4.8 hours
    }
    if (isToday) return 'bg-brand-purple-strong/5'
    return ''
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Weekly Time View"
        subtitle="Track daily progress and weekly targets"
      />

      {/* Error Display */}
      {error && (
        <div className="bg-cro-loss-strong/10 border border-cro-loss-strong/20 text-cro-loss-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => { setError(null); }} className="text-cro-loss-strong/60 hover:text-cro-loss-strong">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Controls and Summary */}
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
        <div className="p-4 lg:p-6">
          {/* Week Navigation and Group Toggle */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { navigateWeek('prev'); }}
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-4 py-2 text-center min-w-[200px]">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Week of</div>
                <div className="font-medium text-neutral-900 dark:text-white">{formatDateRange(selectedWeek)}</div>
              </div>
              <button
                onClick={() => { navigateWeek('next'); }}
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="ml-2 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Current Week
              </button>
            </div>

            {/* Group By Toggle and Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-700">
                <button
                  onClick={() => { setGroupBy('user'); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-l-lg transition-colors ${
                    groupBy === 'user'
                      ? 'bg-brand-purple-strong text-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  By User
                </button>
                <button
                  onClick={() => { setGroupBy('client'); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-r-lg transition-colors ${
                    groupBy === 'client'
                      ? 'bg-brand-purple-strong text-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  By Client
                </button>
              </div>
              <button
                onClick={loadWeeklyData}
                disabled={loading}
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Week Summary Stats */}
          <div className={`grid gap-4 mb-6 ${groupBy === 'user' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-brand-purple-strong" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Total Hours</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {weeklyTotalHours.toFixed(1)}h
                </div>
                {previousWeekData && hoursChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${
                    hoursChange > 0 ? 'text-cro-win-strong' : 'text-cro-loss-strong'
                  }`}>
                    {hoursChange > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {hoursChangePercent === 'infinite' 
                        ? '—' 
                        : `${Math.abs(hoursChangePercent).toFixed(0)}%`
                      }
                    </span>
                  </div>
                )}
              </div>
              {previousWeekData && (
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {hoursChange > 0 ? '+' : ''}{hoursChange.toFixed(1)}h from last week
                  {hoursChangePercent === 'infinite' && ' (new activity)'}
                </div>
              )}
            </div>

            {groupBy === 'user' ? (
              <>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-brand-purple-strong" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Weekly Target</span>
                  </div>
                  <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    {currentWorkday > 0 ? `${(currentWorkday * DAILY_TARGET)}h` : '30h'}
                  </div>
                  {currentWorkday > 0 && currentWorkday < 5 && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {currentWorkday} of 5 days
                    </div>
                  )}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-brand-purple-strong" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Average/Day</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className={`text-2xl font-semibold ${
                      averagePerDay >= DAILY_TARGET
                        ? 'text-cro-win-strong'
                        : 'text-neutral-900 dark:text-white'
                    }`}>
                      {averagePerDay.toFixed(1)}h
                    </div>
                    {previousWeekData && averageChange !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${
                        averageChange > 0 ? 'text-cro-win-strong' : 'text-cro-loss-strong'
                      }`}>
                        {averageChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>
                          {averageChangePercent === 'infinite' 
                            ? '—' 
                            : `${Math.abs(averageChangePercent).toFixed(0)}%`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  {previousWeekData && averageChange !== 0 && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {averageChange > 0 ? '+' : ''}{averageChange.toFixed(1)}h from last week
                      {averageChangePercent === 'infinite' && ' (new activity)'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-brand-purple-strong" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Active Clients</span>
                </div>
                <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {processedWeekData?.length || 0}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Display */}
        {loading ? (
          <div className="text-center py-12">
            <LoadingSpinner message="Loading week view..." size="lg" />
            <p className="text-neutral-600 dark:text-neutral-300">Loading weekly data...</p>
          </div>
        ) : processedWeekData && processedWeekData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {groupBy === 'user' ? 'Team Member' : 'Client'}
                  </th>
                  {weekDates.map(({ day, date, isToday }) => (
                    <th key={day} className="text-center px-3 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <div>{day?.slice(0, 3) || day}</div>
                      <div className={`text-xs ${isToday ? 'text-brand-purple-strong font-semibold' : 'text-neutral-500'}`}>
                        {date}
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Total
                  </th>
                  {groupBy === 'user' && (
                    <th className="text-center px-3 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Status
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {processedWeekData.map((group, index) => (
                  <tr key={`${group.id}-${index}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                          {groupBy === 'user' ? (
                            <User className="h-4 w-4 text-brand-purple-strong" />
                          ) : (
                            <Briefcase className="h-4 w-4 text-brand-purple-strong" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">
                            {group.name}
                          </div>
                          {group.email && (
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">
                              {group.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDates.map(({ dateKey, isToday }) => {
                      const hours = dateKey ? ((group.dailyHours as Record<string, number>)[dateKey] || 0) : 0
                      return (
                        <td 
                          key={dateKey} 
                          className={`text-center px-3 py-4 ${getCellBackground(hours, isToday)}`}
                        >
                          <div className={`font-medium ${getHoursColor(hours, isToday)}`}>
                            {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                          </div>
                          {groupBy === 'user' && hours >= DAILY_TARGET && (
                            <CheckCircle className="h-3 w-3 text-cro-win-strong mx-auto mt-1" />
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center px-3 py-4">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {group.totalHours.toFixed(1)}h
                      </div>
                    </td>
                    {groupBy === 'user' && (
                      <td className="text-center px-3 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            group.onTrack 
                              ? 'bg-cro-win-strong/10 text-cro-win-strong' 
                              : 'bg-cro-loss-strong/10 text-cro-loss-strong'
                          }`}>
                            {group.onTrack ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                <span>On Track</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                <span>Behind</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            Avg: {group.weeklyAverage.toFixed(1)}h/day
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-600 dark:text-neutral-300">No time entries found for this week</p>
          </div>
        )}

        {/* Legend */}
        {processedWeekData && processedWeekData.length > 0 && (
          <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {groupBy === 'user' ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-cro-win-strong" />
                    <span className="text-neutral-600 dark:text-neutral-400">6h+ (Target met)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cro-no-impact-strong/10 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">4.8h - 5.9h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cro-loss-strong/10 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">Below 4.8h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-brand-purple-strong/5 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">Today</span>
                  </div>
                  {currentWorkday > 0 && currentWorkday < 5 && (
                    <div className="ml-auto text-neutral-600 dark:text-neutral-400">
                      * Averages calculated for {currentWorkday} worked day{currentWorkday !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-brand-purple-strong/5 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">Today</span>
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 ml-auto">
                    Showing total hours by client for Monday-Friday
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}