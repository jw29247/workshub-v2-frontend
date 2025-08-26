import { API_URL, getHeaders } from '../utils/api'
import { formatUKTime, toUKTime } from '../utils/dateFormatting'

// Types
export interface ActiveTimer {
  id: string
  user_id: string
  user_email: string
  user_name: string
  task_id: string
  task_name: string
  task_status?: string
  description: string
  start_time: string | null
  duration: number  // Duration in milliseconds
  billable: boolean
  tags: string[]
  source: string
  client_name: string
  project_name?: string
  space_name?: string
}

export interface TodayTimeEntry {
  user_id: string
  user_email: string
  user_name: string
  total_duration: number
  total_hours: number
  entries: Array<{
    id: string
    task_id: string | null
    task_name: string | null
    duration: number
    start: string
    end: string
    description: string
  }>
}

export interface TodayTimeData {
  date: string
  timezone: string
  users: TodayTimeEntry[]
  total_users: number
}

export interface TaskTimeAggregation {
  task_id: string
  total_duration: number
  total_duration_hours: number
  total_entries: number
  first_entry: string | null
  last_entry: string | null
  user_breakdown?: Array<{
    user: {
      id: string
      username: string
      email: string
      initials?: string
      profile_picture?: string
    }
    total_duration: number
    total_duration_hours: number
    entry_count: number
    entries: Array<{
      id: string
      start: string | null
      end: string | null
      duration: number
      duration_hours: number
      description: string
      billable: boolean
      tags: string[]
    }>
  }>
}

export interface TimeRangeSummary {
  start_date: string
  end_date: string
  total_duration: number
  total_duration_hours: number
  total_entries: number
  unique_users: number
  unique_tasks: number
  billable_duration: number
  billable_duration_hours: number
  billable_percentage: number
  daily_breakdown?: Array<{
    date: string
    total_duration: number
    total_duration_hours: number
    entry_count: number
    user_count: number
    task_count: number
  }>
  user_breakdown?: Array<{
    user: {
      id: string
      username: string
      email: string
    }
    total_duration: number
    total_duration_hours: number
    entry_count: number
    task_count: number
    billable_duration: number
    billable_duration_hours: number
    average_entry_duration: number
  }>
  task_breakdown?: Array<{
    task_id: string
    task_name: string | null
    total_duration: number
    total_duration_hours: number
    entry_count: number
    user_count: number
    first_entry_date: string | null
    last_entry_date: string | null
  }>
}

export interface TimeLogsHistoryResponse {
  time_entries: Array<{
    id: string
    user_id: string
    user_name: string
    user_email: string
    task_id: string | null
    task_name: string | null
    client_name: string | null
    duration: number
    duration_hours: number
    start_time: string
    end_time: string | null
    description: string | null
    billable: boolean
    tags: string[]
    created_at: string
    updated_at: string
  }>
  pagination: {
    total: number
    offset: number
    limit: number
    has_more: boolean
  }
}

export interface TimeLogsSummaryResponse {
  summary: {
    total_duration: number
    total_duration_hours: number
    total_entries: number
    unique_users: number
    unique_clients: number
    unique_tasks: number
    billable_duration: number
    billable_duration_hours: number
    billable_percentage: number
    average_entry_duration: number
    average_entry_duration_hours: number
    date_range: {
      start: string | null
      end: string | null
    }
  }
}

export interface WeeklyTimeLogsResponse {
  weeks: Array<{
    week_start: string
    week_end: string
    week_number: number
    year: number
    groups: Array<{
      id: string
      name: string
      email?: string
      total_duration: number
      total_duration_hours: number
      entry_count: number
      billable_duration: number
      billable_duration_hours: number
      days: {
        [key: string]: {
          duration: number
          duration_hours: number
          entries: number
        }
      }
    }>
    totals: {
      duration: number
      duration_hours: number
      entries: number
      billable_duration: number
      billable_duration_hours: number
    }
  }>
  summary: {
    total_weeks: number
    total_duration: number
    total_duration_hours: number
    total_entries: number
    average_weekly_duration: number
    average_weekly_duration_hours: number
  }
}

export interface TimerServiceStatus {
  service_active: boolean
  business_hours: {
    enabled: boolean
    is_business_hours: boolean
    timezone: string
    current_time: string
    next_business_start?: string
    business_end_today?: string
  }
  cache_age_seconds?: number
}

// Time Tracking Service
// NOTE: ClickUp sync functionality has been removed from the application
// These functions return mock data or throw errors to maintain interface compatibility
export const timeTrackingService = {
  // Get all active timers - sync functionality removed
  async getActiveTimers(): Promise<{ active_timers: ActiveTimer[]; count: number }> {
    const response = await fetch(`${API_URL}/api/timers/active`, {
      method: 'GET',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch active timers')
    }

    return response.json()
  },

  async refreshActiveTimers(): Promise<{ success: boolean; active_count: number; message: string }> {
    const response = await fetch(`${API_URL}/api/timers/refresh`, {
      method: 'POST',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh active timers')
    }

    return response.json()
  },

  // Get today's time entries (UK timezone) - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTodayTimeEntries(_teamId: string): Promise<TodayTimeData> {
    // Get today's date in YYYY-MM-DD format in local timezone
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`
    
    try {
      // Fetch time entries for today using the new API
      const response = await this.getTimeLogsHistory({
        startDate: today,
        endDate: today,
        sortBy: 'start',
        sortOrder: 'desc',
        limit: 100 // Get up to 100 entries for today
      })
      
      // Group entries by user
      const userMap = new Map<string, {
        user_id: string
        user_email: string
        user_name: string
        total_duration: number
        entries: Array<{
          id: string
          task_id: string | null
          task_name: string | null
          duration: number
          start: string
          end: string
          description: string
        }>
      }>()
      
      response.time_entries.forEach(entry => {
        if (!userMap.has(entry.user_id)) {
          userMap.set(entry.user_id, {
            user_id: entry.user_id,
            user_email: entry.user_email,
            user_name: entry.user_name,
            total_duration: 0,
            entries: []
          })
        }
        
        const userData = userMap.get(entry.user_id)!
        userData.total_duration += entry.duration
        userData.entries.push({
          id: entry.id,
          task_id: entry.task_id,
          task_name: entry.task_name,
          duration: entry.duration,
          start: entry.start_time,
          end: entry.end_time || entry.start_time,
          description: entry.description || ''
        })
      })
      
      // Convert to array and add total_hours
      const users: TodayTimeEntry[] = Array.from(userMap.values()).map(user => ({
        ...user,
        total_hours: user.total_duration / 3600000 // Convert milliseconds to hours
      }))
      
      return {
        date: today,
        timezone: 'Europe/London',
        users,
        total_users: users.length
      }
    } catch (error) {
      console.error('Error fetching today time entries:', error)
      return {
        date: today,
        timezone: 'Europe/London',
        users: [],
        total_users: 0
      }
    }
  },

  // Start a timer - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startTimer(_teamId: string, _data: {
    description?: string
    billable?: boolean
    tid?: string // Task ID
  }): Promise<{ timer: ActiveTimer; status: string }> {
    // ClickUp sync functionality has been removed
    throw new Error('Timer sync functionality has been removed')
  },

  // Stop the current timer - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stopTimer(_teamId: string): Promise<{ time_entry: TodayTimeEntry['entries'][0] | null; status: string; synced?: boolean }> {
    // ClickUp sync functionality has been removed
    throw new Error('Timer sync functionality has been removed')
  },

  // Get time entries for a date range - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTimeEntries(_teamId: string, _startDate: number, _endDate: number, _assignee?: string[]): Promise<{
    time_entries: TodayTimeEntry['entries']
    total: number
  }> {
    // ClickUp sync functionality has been removed
    return { time_entries: [], total: 0 }
  },

  // Get aggregated time for a task - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTaskTimeAggregated: async (taskId: string, _includeUserBreakdown = true): Promise<TaskTimeAggregation> => {
    // ClickUp sync functionality has been removed
    return {
      task_id: taskId,
      total_duration: 0,
      total_duration_hours: 0,
      total_entries: 0,
      first_entry: null,
      last_entry: null,
      user_breakdown: []
    }
  },

  // Get aggregated time for multiple tasks - sync functionality removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMultipleTasksTimeAggregated: async (_taskIds: string[], _includeUserBreakdown = true): Promise<{ [key: string]: TaskTimeAggregation }> => {
    // ClickUp sync functionality has been removed
    return {}
  },

  // Get team time summary for a date range - sync functionality removed
  getTeamTimeSummary: async (
    _teamId: string,
    startDate: number,
    endDate: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: {
      includeDailyBreakdown?: boolean
      includeUserBreakdown?: boolean
      includeTaskBreakdown?: boolean
      taskLimit?: number
    }
  ): Promise<TimeRangeSummary> => {
    // ClickUp sync functionality has been removed
    return {
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      total_duration: 0,
      total_duration_hours: 0,
      total_entries: 0,
      unique_users: 0,
      unique_tasks: 0,
      billable_duration: 0,
      billable_duration_hours: 0,
      billable_percentage: 0
    }
  },

  // Get time logs history
  async getTimeLogsHistory(params?: {
    startDate?: string
    endDate?: string
    userId?: string
    clientName?: string
    limit?: number
    offset?: number
    sortBy?: 'start' | 'end' | 'duration'
    sortOrder?: 'asc' | 'desc'
  }): Promise<TimeLogsHistoryResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.startDate) queryParams.append('start_date', params.startDate)
    if (params?.endDate) queryParams.append('end_date', params.endDate)
    if (params?.userId) queryParams.append('user_id', params.userId)
    if (params?.clientName) queryParams.append('client_name', params.clientName)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.sortBy) queryParams.append('sort_by', params.sortBy)
    if (params?.sortOrder) queryParams.append('sort_order', params.sortOrder)

    const response = await fetch(
      `${API_URL}/api/time-entries/history?${queryParams}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch time logs history')
    }

    return response.json()
  },

  // Get time logs summary
  async getTimeLogsSummary(params?: {
    startDate?: string
    endDate?: string
    userId?: string
    clientName?: string
  }): Promise<TimeLogsSummaryResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.startDate) queryParams.append('start_date', params.startDate)
    if (params?.endDate) queryParams.append('end_date', params.endDate)
    if (params?.userId) queryParams.append('user_id', params.userId)
    if (params?.clientName) queryParams.append('client_name', params.clientName)

    const response = await fetch(
      `${API_URL}/api/time-entries/summary?${queryParams}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch time logs summary')
    }

    return response.json()
  },

  // Get weekly time logs - sync functionality removed
   
  async getWeeklyTimeLogs(params?: {
    startDate?: string
    endDate?: string
    groupBy?: 'user' | 'client'
    userId?: string
    clientName?: string
  }): Promise<WeeklyTimeLogsResponse> {
    // Build query parameters
    const queryParams = new URLSearchParams({
      start_date: params?.startDate || '',
      end_date: params?.endDate || '',
      group_by: params?.groupBy || 'user'
    })

    if (params?.userId) {
      queryParams.append('user_id', params.userId)
    }

    if (params?.clientName) {
      queryParams.append('client_name', params.clientName)
    }

    const response = await fetch(`${API_URL}/api/time-logs/weekly?${queryParams}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch weekly time logs')
    }

    return response.json()
  },

  // Get available clients (synced from ClickUp lists)
  // Each ClickUp list is automatically a client for billing purposes
  async getClientsAndLists(): Promise<{ clients: { id: string | number; name: string }[]; lists: { id: string | number; name: string }[] }> {
    const response = await fetch(`${API_URL}/api/time-adjustments/clients-lists`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch clients and lists: ${response.statusText}`)
    }

    return response.json()
  },

  // Create time adjustment
  async createTimeAdjustment(data: {
    taskId?: string
    userId?: string
    clientId?: number
    duration: number
    description?: string
    billable?: boolean
    start: string
    end?: string
    tags?: string[]
  }): Promise<{ success: boolean; message: string; time_entry_id: string | null; errors: string[] }> {
    const response = await fetch(`${API_URL}/api/time-adjustments/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        task_id: data.taskId,
        user_id: data.userId,
        client_id: data.clientId,
        duration: data.duration,
        description: data.description,
        billable: data.billable ?? true,
        start: data.start,
        end: data.end,
        tags: data.tags || []
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to create time adjustment: ${response.statusText}`)
    }

    return response.json()
  },

  // Update time adjustment
  async updateTimeAdjustment(entryId: string, data: {
    duration?: number
    description?: string
    billable?: boolean
    start?: string
    end?: string
    tags?: string[]
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/time-adjustments/${entryId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update time adjustment: ${response.statusText}`)
    }

    return response.json()
  },

  // Delete time adjustment
  async deleteTimeAdjustment(entryId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/time-adjustments/${entryId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to delete time adjustment: ${response.statusText}`)
    }

    return response.json()
  },

  // Get timer service status
  async getTimerServiceStatus(): Promise<TimerServiceStatus> {
    const response = await fetch(`${API_URL}/api/timers/status`, {
      method: 'GET',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch timer service status')
    }

    return response.json()
  }
}

// Time helper utilities
export const timeHelpers = {
  // Calculate duration in milliseconds from start time to now
  calculateDuration(startTime: string): number {
    const start = new Date(startTime).getTime()
    const now = Date.now()
    return now - start
  },

  // Format duration from milliseconds to human readable string
  formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  },

  // Calculate work day progress (UK timezone)
  calculateWorkDayProgress(): {
    currentTime: string
    workDayStart: string
    workDayEnd: string
    progressPercentage: number
    hoursIntoDay: number
    hoursRemaining: number
    isWorkingHours: boolean
  } {
    // Get UK time
    const now = toUKTime()

    // Define work day (9 AM to 5 PM UK time)
    const workDayStart = new Date(now)
    workDayStart.setHours(9, 0, 0, 0)

    const workDayEnd = new Date(now)
    workDayEnd.setHours(17, 0, 0, 0) // Changed from 17:30 to 17:00

    const totalWorkHours = 6 // Target is 6 hours by 5 PM
    const totalWorkMinutes = totalWorkHours * 60 // 6 hours in minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const workStartMinutes = 9 * 60 // 9 AM
    const workEndMinutes = 17 * 60 // 5 PM (changed from 17.5)

    let progressPercentage = 0
    let hoursIntoDay = 0
    let hoursRemaining = totalWorkHours
    let isWorkingHours = false

    if (currentMinutes >= workStartMinutes && currentMinutes <= workEndMinutes) {
      isWorkingHours = true
      const minutesIntoDay = currentMinutes - workStartMinutes
      // Calculate how many hours should be logged by now (proportional to 6 hours by 5 PM)
      hoursIntoDay = (minutesIntoDay / (workEndMinutes - workStartMinutes)) * totalWorkHours
      hoursRemaining = totalWorkHours - hoursIntoDay
      progressPercentage = (hoursIntoDay / totalWorkHours) * 100
    } else if (currentMinutes > workEndMinutes) {
      // After 5 PM, target remains at 6 hours
      progressPercentage = 100
      hoursIntoDay = totalWorkHours
      hoursRemaining = 0
    }

    return {
      currentTime: formatUKTime(now),
      workDayStart: '09:00',
      workDayEnd: '17:00', // Changed from 17:30
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      hoursIntoDay: Math.round(hoursIntoDay * 10) / 10,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      isWorkingHours
    }
  }
}
