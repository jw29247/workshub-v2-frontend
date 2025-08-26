import { apiGet } from '../utils/api'

// New BFF response types
export interface DashboardUser {
  id: string
  email: string
  name: string
  role: 'team_member' | 'manager' | 'SLT'
}

export interface DashboardMetrics {
  // Legacy fields for backward compatibility
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
  
  // New calculated fields from backend
  calculated_at?: string
  hours?: {
    today: {
      total: number
      change_percent: number
      change_absolute: number
      vs_yesterday: number
    }
    week: {
      total: number
      average_per_day: number
      change_percent: number
      change_absolute: number
    }
    month: {
      total: number
      average_per_day: number
      change_percent: number
      projected_total: number
    }
  }
  progress?: {
    daily_target: number
    actual_hours: number
    expected_hours: number
    actual_progress_percent: number
    expected_progress_percent: number
    on_track: boolean
    remaining_hours: number
    time_remaining_hours: number
    required_hourly_pace: number
    projected_total: number
  }
  team?: {
    total_members: number
    active_today: number
    utilization_percent: number
    average_hours_per_member: number
    highest_hours: number
    lowest_hours: number
    total_team_hours: number
  }
  utilization?: {
    hourly_distribution: Array<{
      hour: number
      hours_logged: number
      formatted: string
    }>
    peak_hour: number
    peak_hour_value: number
    average_hourly: number
  }
  trends?: {
    daily_trend: Array<{
      date: string
      hours: number
      day_name: string
    }>
    trend_direction: string
    trend_change_percent: number
    seven_day_average: number
  }
}

export interface ActiveTimer {
  id: string
  user_id: string
  user_email: string
  user_name?: string
  task_id?: string
  task_name?: string
  client_name?: string
  description?: string
  start_time: string
  duration_ms?: number
}

export interface ClientSummary {
  total_clients: number
  active_clients: number
  total_available_hours: number
  total_used_hours: number
  average_utilization: number
  project_breakdown?: Array<{
    clientName: string
    totalHours: number
    taskCount: number
  }>
}

export interface TeamData {
  active_members: number
  total_members: number
  utilization_percentage: number
  team_health?: {
    average_pulse_score: number
    recent_pulse_checks: number
    health_status: 'excellent' | 'good' | 'concerning' | 'critical'
  }
}

export interface HourlyBreakdown {
  date: string
  hourlyBreakdown: Array<{
    hour: number
    duration: number
  }>
}

export interface WeeklyComparison {
  current_week: number
  previous_week: number
  change_percentage: number
}

export interface TimeData {
  hourly_breakdown?: HourlyBreakdown
  weekly_comparison?: WeeklyComparison
}

// Comprehensive dashboard response
export interface ComprehensiveDashboardData {
  timestamp: string
  user: DashboardUser
  metrics: DashboardMetrics
  time_data: TimeData
  client_data: ClientSummary
  team_data: TeamData
  active_timers: ActiveTimer[]
  
  // New calculated data from backend
  user_progress?: {
    user_id: number
    calculated_at: string
    daily: {
      actual_hours: number
      target_hours: number
      progress_percent: number
      expected_progress_percent: number
      on_track: boolean
      ahead_behind_hours: number
      remaining_hours: number
      time_remaining_hours: number
      required_hourly_pace: number
      projected_total: number
      will_meet_target: boolean
    }
    weekly: {
      actual_hours: number
      target_hours: number
      progress_percent: number
      expected_progress_percent: number
      on_track: boolean
      daily_average: number
      workdays_completed: number
      workdays_remaining: number
      projected_total: number
      will_meet_target: boolean
    }
    monthly: {
      actual_hours: number
      target_hours: number
      progress_percent: number
      expected_progress_percent: number
      on_track: boolean
      daily_average: number
      days_elapsed: number
      days_remaining: number
      projected_total: number
      will_meet_target: boolean
    }
    pace: {
      seven_day_average: number
      seven_day_max: number
      seven_day_min: number
      trend: string
      trend_percent: number
    }
  }
  
  team_progress?: {
    calculated_at: string
    team_members: Array<{
      user_id: number
      user_name: string
      user_email: string
      daily_progress: number
      weekly_progress: number
      on_track: boolean
      hours_today: number
      hours_week: number
    }>
    aggregates: {
      average_daily_progress: number
      average_weekly_progress: number
      members_on_track: number
      total_members: number
      on_track_percentage: number
      total_hours_today: number
      total_hours_week: number
    }
  }
  
  team_analytics?: {
    calculated_at: string
    overview: {
      total_members: number
      active_today: number
      inactive_today: number
      team_utilization_percent: number
      total_hours_today: number
      total_hours_week: number
      avg_hours_per_member_today: number
      avg_hours_per_member_week: number
      target_hours_today: number
      target_achievement_percent: number
    }
    utilization: {
      periods: {
        today: {
          active_users: number
          total_users: number
          utilization_percent: number
          total_hours: number
          avg_hours_per_active_user: number
        }
        yesterday: {
          active_users: number
          total_users: number
          utilization_percent: number
          total_hours: number
          avg_hours_per_active_user: number
        }
        this_week: {
          active_users: number
          total_users: number
          utilization_percent: number
          total_hours: number
          avg_hours_per_active_user: number
        }
      }
      trends: {
        daily_change: number
        weekly_change: number
        trend_direction: string
      }
    }
    performance: {
      individual_performance: Array<{
        user_id: number
        user_name: string
        user_email: string
        user_role: string
        hours: number
        task_count: number
        client_count: number
        hours_per_task: number
        tasks_per_hour: number
        rank: number
      }>
      team_aggregates: {
        total_hours: number
        total_tasks: number
        average_hours: number
        active_members: number
      }
      performance_distribution: {
        high_performers: number
        medium_performers: number
        low_performers: number
        high_performer_percentage: number
      }
      top_performers: Array<{
        user_id: number
        user_name: string
        user_email: string
        user_role: string
        hours: number
        task_count: number
        rank: number
      }>
    }
  }
  
  trends?: {
    calculated_at: string
    user_id?: number
    daily: {
      data: Array<{
        date: string
        day_name: string
        hours: number
        task_count: number
        active_users: number
        avg_hours_per_user: number
        avg_hours_per_task: number
      }>
      trend_direction: string
      trend_strength: number
      trend_change_percent: number
      average_daily_hours: number
      best_day: any
      worst_day: any
    }
    weekly: {
      data: Array<{
        week_starting: string
        week_ending: string
        hours: number
        task_count: number
        active_users: number
        workdays: number
        avg_hours_per_day: number
        avg_hours_per_user: number
        is_current_week: boolean
      }>
      trend_direction: string
      trend_strength: number
      trend_change_percent: number
      average_weekly_hours: number
      best_week: any
      current_week: any
    }
    monthly: {
      data: Array<{
        month: string
        month_name: string
        hours: number
        task_count: number
        active_users: number
        workdays: number
        total_days: number
        avg_hours_per_day: number
        avg_hours_per_workday: number
        is_current_month: boolean
      }>
      trend_direction: string
      trend_strength: number
      trend_change_percent: number
      average_monthly_hours: number
      best_month: any
      current_month: any
    }
    hourly: {
      hourly_data: Array<{
        hour: number
        formatted_hour: string
        total_hours: number
        average_hours: number
        days_with_activity: number
        activity_frequency: number
      }>
      peak_hour: any
      most_consistent_hour: any
      work_pattern: {
        work_hours_total: number
        after_hours_total: number
        work_hours_percentage: number
        after_hours_percentage: number
      }
      analysis_period_days: number
    }
    productivity: {
      data: Array<{
        week_starting: string
        hours: number
        task_count: number
        unique_clients: number
        hours_per_task: number
        tasks_per_hour: number
        client_diversity: number
      }>
      efficiency_trend: {
        direction: string
        strength: number
        change_percent: number
      }
      complexity_trend: {
        direction: string
        strength: number
        change_percent: number
      }
      averages: {
        hours_per_task: number
        tasks_per_hour: number
        client_diversity: number
      }
    }
  }
}

// Summary dashboard response (lightweight)
export interface SummaryDashboardData {
  timestamp: string
  user: DashboardUser
  metrics: Pick<DashboardMetrics, 'totalHoursToday' | 'teamUtilization' | 'activeUsersCount' | 'totalUsersCount'>
  active_timers: ActiveTimer[]
  team_health?: {
    average_pulse_score: number
    health_status: string
  }
}

// Legacy types for backward compatibility
export interface ProjectBreakdown {
  period: string
  projects: Array<{
    clientName: string
    totalHours: number
    taskCount: number
  }>
}

class DashboardService {
  /**
   * Get comprehensive dashboard data using the new BFF endpoint.
   * This replaces multiple API calls with a single optimized request.
   */
  async getComprehensiveData(options: {
    includeHourly?: boolean
    includeProjects?: boolean
    includeWeeklyComparison?: boolean
    daysLookback?: number
  } = {}): Promise<ComprehensiveDashboardData> {
    const {
      includeHourly = true,
      includeProjects = true,
      includeWeeklyComparison = true,
      daysLookback = 30
    } = options

    const params = new URLSearchParams({
      include_hourly: String(includeHourly),
      include_projects: String(includeProjects),
      include_weekly_comparison: String(includeWeeklyComparison),
      days_lookback: String(daysLookback)
    })

    return await apiGet<ComprehensiveDashboardData>(`/api/dashboard-bff/comprehensive?${params}`)
  }

  /**
   * Get lightweight summary data for mobile/quick views.
   */
  async getSummaryData(): Promise<SummaryDashboardData> {
    return await apiGet<SummaryDashboardData>('/api/dashboard-bff/summary')
  }

  // Legacy methods - maintained for backward compatibility during migration
  async getMetrics(): Promise<DashboardMetrics> {
    console.warn('dashboardService.getMetrics() is deprecated. Use getComprehensiveData() instead.')
    const data = await this.getComprehensiveData()
    
    // Transform new calculated data to legacy format for compatibility
    const newMetrics = data.metrics
    
    // Map backend calculated fields to legacy fields for backward compatibility
    if (newMetrics.hours && newMetrics.progress && newMetrics.team) {
      return {
        // Map new calculated values to legacy structure
        totalHoursToday: newMetrics.hours.today.total,
        totalHoursTodayChange: newMetrics.hours.today.change_percent,
        totalHoursWeek: newMetrics.hours.week.total,
        totalHoursWeekChange: newMetrics.hours.week.change_percent,
        totalHoursMonth: newMetrics.hours.month.total,
        completedTasksToday: 0, // Will be provided by backend if needed
        taskChangePercentage: 0, // Will be provided by backend if needed
        teamUtilization: newMetrics.team.utilization_percent,
        activeUsersCount: newMetrics.team.active_today,
        totalUsersCount: newMetrics.team.total_members,
        retainerUsage: {
          total: newMetrics.progress.daily_target * newMetrics.team.total_members,
          used: newMetrics.team.total_team_hours,
          remaining: Math.max(0, (newMetrics.progress.daily_target * newMetrics.team.total_members) - newMetrics.team.total_team_hours),
          percentage: newMetrics.progress.actual_progress_percent
        },
        // Include new calculated fields as well
        ...newMetrics
      }
    }
    
    // Fallback to original structure if new data not available
    return data.metrics
  }

  async getHourlyBreakdown(date?: string): Promise<HourlyBreakdown> {
    console.warn('dashboardService.getHourlyBreakdown() is deprecated. Use getComprehensiveData() instead.')
    const data = await this.getComprehensiveData({ includeHourly: true })
    return data.time_data.hourly_breakdown || { date: date || new Date().toISOString().split('T')[0], hourlyBreakdown: [] }
  }

  async getProjectBreakdown(period: 'today' | 'week' | 'month' = 'today'): Promise<ProjectBreakdown> {
    console.warn('dashboardService.getProjectBreakdown() is deprecated. Use getComprehensiveData() instead.')
    const data = await this.getComprehensiveData({ includeProjects: true })
    return {
      period,
      projects: data.client_data.project_breakdown || []
    }
  }

  /**
   * Get today's dashboard data with all calculations done server-side.
   * This replaces all frontend calculations in TodayView.tsx.
   */
  async getTodayData(): Promise<TodayDashboardData> {
    return await apiGet<TodayDashboardData>('/api/dashboard-bff/today')
  }

  /**
   * Get client health dashboard data with all calculations done server-side.
   * This replaces all frontend calculations in ClientHealthMetrics.tsx.
   */
  async getClientHealthData(selectedWeek: string): Promise<ClientHealthDashboardData> {
    return await apiGet<ClientHealthDashboardData>(`/api/dashboard-bff/client-health?selected_week=${selectedWeek}`)
  }
}

// Today Dashboard Types
export interface TodayUserData {
  email: string
  name: string
  role: string
  logged_hours: number
  target_hours: number
  expected_hours: number
  percentage: number
  progress_color: string
  status: string
  status_color: string
  is_active: boolean
  active_timer: {
    id: string
    user_email: string
    task_id?: string
    task_name?: string
    description?: string
    start_time: string
    duration_ms: number
  } | null
  first_log: string | null
  last_log: string | null
  entry_count: number
  entries: Array<{
    id: string
    task_id?: string
    task_name?: string
    description?: string
    duration: number
    duration_formatted: string
    start: string
    end: string | null
  }>
  meets_target: boolean
  on_track: boolean
}

export interface TodayTeamSummary {
  active_now: number
  total_hours: number
  team_members: number
  on_target_count: number
  on_target_percentage: number
}

export interface TodayDashboardData {
  date: string
  uk_time: string
  expected_hours: number
  team_summary: TodayTeamSummary
  user_data: TodayUserData[]
  active_timers: Array<{
    id: string
    user_email: string
    task_id?: string
    task_name?: string
    description?: string
    start_time: string
    duration_ms: number
  }>
  calculated_at: string
}

// Client Health Dashboard Types
export interface ClientHealthWeekOption {
  value: string
  label: string
}

export interface ClientHealthOverview {
  green: number
  amber: number
  red: number
}

export interface ClientHealthTrackingStats {
  clients_with_scores: number
  total_clients: number
}

export interface ClientHealthMetric {
  id: number
  display_name: string
  description: string
  order_index: number
  service_applicability: string
  is_active: boolean
}

export interface ClientHealthScore {
  id: number
  client_id: number
  metric_id: number
  score: 'green' | 'amber' | 'red'
  week_starting: string
  notes: string
  created_by_id: number | null
  created_at: string
  updated_at: string
  metric: ClientHealthMetric | null
}

export interface ClientHealthReport {
  client_id: number
  client_name: string
  week_starting: string
  scores: ClientHealthScore[]
  status_summary: {
    green: number
    amber: number
    red: number
  }
}

export interface ClientHealthClient {
  id: number
  name: string
  contact_person: string
  manager_id: string | null
  client_type: string
  is_active: boolean
  report: ClientHealthReport | null
  previous_report: ClientHealthReport | null
  overall_status: 'green' | 'amber' | 'red'
  has_scores: boolean
  has_previous_scores: boolean
  scores_count: number
}

export interface ClientHealthManagerGroup {
  key: string
  manager: string
  manager_id: string
  presentation_order: number | null
  clients: ClientHealthClient[]
}

export interface ClientHealthDashboardData {
  selected_week: string
  previous_week: string
  week_options: ClientHealthWeekOption[]
  health_overview: ClientHealthOverview
  tracking_stats: ClientHealthTrackingStats
  at_risk_count: number
  clients_by_manager: ClientHealthManagerGroup[]
  metrics: ClientHealthMetric[]
  weekly_reports: ClientHealthReport[]
  previous_week_reports: ClientHealthReport[]
  calculated_at: string
}

// Individual service instances for backward compatibility
export const dashboardService = new DashboardService()

/**
 * Unified Dashboard API Service - Consolidates all dashboard-related API calls
 * 
 * This service serves as a central hub for all dashboard data operations,
 * providing a single interface for components to access backend-calculated data.
 * 
 * Key Features:
 * - Single endpoint calls with comprehensive data
 * - Backend-calculated metrics, trends, and summaries
 * - Real-time WebSocket integration
 * - Unified caching strategy
 * - Type-safe interfaces for all data structures
 */
class DashboardAPIService {
  private dashboardService = new DashboardService()

  // === Main Dashboard Data ===
  
  /**
   * Get comprehensive dashboard data with all calculations done server-side.
   * Replaces multiple service calls with a single optimized request.
   */
  async getComprehensiveData(options: {
    includeHourly?: boolean
    includeProjects?: boolean
    includeWeeklyComparison?: boolean
    daysLookback?: number
  } = {}): Promise<ComprehensiveDashboardData> {
    return this.dashboardService.getComprehensiveData(options)
  }

  /**
   * Get lightweight summary data for mobile/quick views.
   */
  async getSummaryData(): Promise<SummaryDashboardData> {
    return this.dashboardService.getSummaryData()
  }

  /**
   * Get today's dashboard data with all calculations done server-side.
   * This replaces all frontend calculations in TodayView.tsx.
   */
  async getTodayData(): Promise<TodayDashboardData> {
    return this.dashboardService.getTodayData()
  }

  /**
   * Get client health dashboard data with all calculations done server-side.
   * This replaces all frontend calculations in ClientHealthMetrics.tsx.
   */
  async getClientHealthData(selectedWeek: string): Promise<ClientHealthDashboardData> {
    return this.dashboardService.getClientHealthData(selectedWeek)
  }

  // === Legacy Compatibility Methods ===
  // These methods provide backward compatibility during the migration period

  /**
   * @deprecated Use getComprehensiveData() instead
   */
  async getMetrics(): Promise<DashboardMetrics> {
    console.warn('DashboardAPIService.getMetrics() is deprecated. Use getComprehensiveData() instead.')
    return this.dashboardService.getMetrics()
  }

  /**
   * @deprecated Use getComprehensiveData() with includeHourly option instead
   */
  async getHourlyBreakdown(date?: string): Promise<HourlyBreakdown> {
    console.warn('DashboardAPIService.getHourlyBreakdown() is deprecated. Use getComprehensiveData() instead.')
    return this.dashboardService.getHourlyBreakdown(date)
  }

  /**
   * @deprecated Use getComprehensiveData() with includeProjects option instead
   */
  async getProjectBreakdown(period: 'today' | 'week' | 'month' = 'today'): Promise<ProjectBreakdown> {
    console.warn('DashboardAPIService.getProjectBreakdown() is deprecated. Use getComprehensiveData() instead.')
    return this.dashboardService.getProjectBreakdown(period)
  }

  // === Data Refresh and Real-time Updates ===

  /**
   * Request immediate refresh of all dashboard data.
   * Integrates with WebSocket service for real-time updates.
   */
  requestDataRefresh(dataType?: 'metrics' | 'team_data' | 'client_data' | 'active_timers'): void {
    // Import websocketService dynamically to avoid circular dependencies
    import('./websocketService').then(({ websocketService }) => {
      websocketService.requestDashboardRefresh(dataType)
    }).catch(console.error)
  }

  /**
   * Subscribe to real-time dashboard updates.
   * Returns unsubscribe function.
   */
  subscribeToUpdates(
    userRole: 'team_member' | 'manager' | 'SLT',
    callbacks: {
      onDataUpdate?: (data: any) => void
      onTeamHealthUpdate?: (data: any) => void
      onNotificationCreated?: (data: any) => void
    }
  ): (() => void) {
    // Import websocketService dynamically to avoid circular dependencies
    import('./websocketService').then(({ websocketService }) => {
      websocketService.subscribeToDashboardUpdates(userRole)
      
      // Set up event listeners
      if (callbacks.onDataUpdate) {
        websocketService.addEventListener('dashboard.data_updated', callbacks.onDataUpdate)
      }
      if (callbacks.onTeamHealthUpdate) {
        websocketService.addEventListener('dashboard.team_health_updated', callbacks.onTeamHealthUpdate)
      }
      if (callbacks.onNotificationCreated) {
        websocketService.addEventListener('dashboard.notification_created', callbacks.onNotificationCreated)
      }
    }).catch(console.error)

    // Return unsubscribe function
    return () => {
      import('./websocketService').then(({ websocketService }) => {
        websocketService.unsubscribeFromDashboardUpdates()
      }).catch(console.error)
    }
  }

  // === Unified Data Management ===

  /**
   * Get all dashboard data in a single call.
   * Optimized for components that need comprehensive dashboard state.
   */
  async getAllDashboardData(options: {
    selectedWeek?: string
    includeClientHealth?: boolean
    includeTodayData?: boolean
    includeHourly?: boolean
    includeProjects?: boolean
  } = {}): Promise<{
    comprehensive?: ComprehensiveDashboardData
    today?: TodayDashboardData
    clientHealth?: ClientHealthDashboardData
  }> {
    const results: {
      comprehensive?: ComprehensiveDashboardData
      today?: TodayDashboardData
      clientHealth?: ClientHealthDashboardData
    } = {}

    const promises: Promise<void>[] = []

    // Always get comprehensive data as baseline
    promises.push(
      this.getComprehensiveData({
        includeHourly: options.includeHourly ?? true,
        includeProjects: options.includeProjects ?? true
      }).then(data => {
        results.comprehensive = data
      })
    )

    if (options.includeTodayData) {
      promises.push(
        this.getTodayData().then(data => {
          results.today = data
        })
      )
    }

    if (options.includeClientHealth && options.selectedWeek) {
      promises.push(
        this.getClientHealthData(options.selectedWeek).then(data => {
          results.clientHealth = data
        })
      )
    }

    await Promise.all(promises)
    return results
  }

  // === Health and Status Checks ===

  /**
   * Check if dashboard services are healthy and responding.
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: {
      comprehensive: boolean
      today: boolean
      clientHealth: boolean
      websocket: boolean
    }
    timestamp: string
  }> {
    const results = {
      status: 'healthy' as const,
      services: {
        comprehensive: false,
        today: false,
        clientHealth: false,
        websocket: false
      },
      timestamp: new Date().toISOString()
    }

    // Test comprehensive endpoint
    try {
      await this.getSummaryData() // Use lightweight call for health check
      results.services.comprehensive = true
    } catch {
      results.services.comprehensive = false
    }

    // Test today endpoint
    try {
      await this.getTodayData()
      results.services.today = true
    } catch {
      results.services.today = false
    }

    // Test client health endpoint (use current week)
    try {
      const currentWeek = new Date()
      const monday = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1))
      const weekString = monday.toISOString().split('T')[0] ?? ''
      await this.getClientHealthData(weekString)
      results.services.clientHealth = true
    } catch {
      results.services.clientHealth = false
    }

    // Check WebSocket status
    try {
      const { websocketService } = await import('./websocketService')
      results.services.websocket = websocketService.isSocketConnected()
    } catch {
      results.services.websocket = false
    }

    // Determine overall status
    const serviceCount = Object.values(results.services).filter(Boolean).length
    if (serviceCount === Object.keys(results.services).length) {
      results.status = 'healthy'
    } else if (serviceCount >= 2) {
      results.status = 'degraded'
    } else {
      results.status = 'unhealthy'
    }

    return results
  }
}

// Export unified service instance
export const dashboardAPI = new DashboardAPIService()

// Export both for flexibility during migration
export { DashboardAPIService }