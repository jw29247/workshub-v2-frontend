/**
 * Comprehensive billing service for all billing operations
 */

import { apiService } from './apiService'

// Types
export interface ClientMonthlyDetail {
  client_id: number
  client_name: string
  client_type: string | null
  monthly_retainer_hours: number
  reset_date: number
  
  current_month_start: string
  current_month_end: string
  
  total_logged_hours: number
  logged_hours_entries: number
  
  retainer_credit_hours: number
  credit_applied_hours: number
  reconciliation_positive_hours: number
  total_credits_received: number
  
  refund_hours: number
  reconciliation_negative_hours: number
  total_adjustments: number
  
  previous_month_end_balance: number
  rollover_hours: number
  
  total_available_hours: number
  net_hours_used: number
  current_balance: number
  utilization_percentage: number
  is_over_allocation: boolean
}

interface TimeEntryStatement {
  id: string
  date: string
  type: string
  description: string
  duration_hours: number
  user_name: string | null
  task_name: string | null
  tags: string[]
  billable: boolean
  source: string
  running_balance?: number
}

export interface ClientStatement {
  client_id: number
  client_name: string
  client_email: string
  
  statement_period_start: string
  statement_period_end: string
  
  opening_balance: number
  total_logged_hours: number
  total_credits: number
  total_adjustments: number
  closing_balance: number
  
  entries: TimeEntryStatement[]
  summary_by_type: Record<string, {
    count: number
    total_hours: number
    billable_hours: number
  }>
}

export interface ClientHoursSummary {
  client_id: number
  client_name: string
  client_type: string | null
  is_active: boolean
  monthly_allocation: number
  reset_date: number
  
  logged_hours: number
  credit_hours: number
  retainer_credits: number
  refund_hours: number
  reconciliation_hours: number
  
  total_hours_used: number
  hours_remaining: number
  utilization_percentage: number
  
  current_period_start: string
  current_period_end: string
}

export interface ClientUtilizationTrend {
  client_id: number
  client_name: string
  month: string
  hours_allocated: number
  hours_used: number
  utilization_percentage: number
  trend_direction: 'up' | 'down' | 'stable'
  projected_monthly_usage: number
}

export interface ClientRevenueRisk {
  client_id: number
  client_name: string
  client_type: string | null
  current_usage_hours: number
  monthly_allocation: number
  days_remaining: number
  projected_overage_hours: number
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  recommended_action: string
  potential_overage_revenue: number
}

export interface RecentTimeEntry {
  id: number
  start: string
  end: string | null
  duration: number
  description: string | null
  task_name: string | null
  user_id: number | null
  user_name: string | null
  type: string
  billable: boolean
  tags: string[] | null
}

export interface RetainerClientUsage {
  client_id: number
  client_name: string
  client_type: string | null
  is_active: boolean
  monthly_allocation: number
  reset_date: number
  
  current_period_start: string
  current_period_end: string
  
  logged_hours: number
  credit_hours: number
  retainer_credits: number
  refund_hours: number
  reconciliation_hours: number
  total_hours_used: number
  hours_remaining: number
  utilization_percentage: number
  
  total_logged_hours: number
  logged_hours_entries: number
  retainer_credit_hours: number
  credit_applied_hours: number
  reconciliation_positive_hours: number
  total_credits_received: number
  reconciliation_negative_hours: number
  total_adjustments: number
  previous_month_end_balance: number
  rollover_hours: number
  total_available_hours: number  // CRITICAL: Total hours available (retainer + credits + rollover)
  net_hours_used: number  // CRITICAL: Actual hours consumed after adjustments
  current_balance: number  // CRITICAL: Hours remaining (same as hours_remaining)
  is_over_allocation: boolean  // Whether client is over their allocation
  
  recent_entries: RecentTimeEntry[]
  recent_entries_count: number
}

export interface BulkRetainerUsageResponse {
  clients: RetainerClientUsage[]
  total_clients: number
  generated_at: string
  cache_expires_at: string
}

export interface BillingPeriodCloseRequest {
  client_id?: number
  period_end_date?: string
  generate_statements: boolean
  send_notifications: boolean
  apply_rollovers: boolean
}

class BillingService {
  // Client Hours Summary
  async getClientHoursSummary(activeOnly = true, clientId?: number): Promise<{
    period_start: string
    period_end: string
    total_clients: number
    active_clients: number
    summaries: ClientHoursSummary[]
    total_hours_allocated: number
    total_hours_used: number
    total_hours_remaining: number
    average_utilization: number
  }> {
    const params = new URLSearchParams()
    params.append('active_only', activeOnly.toString())
    if (clientId) params.append('client_id', clientId.toString())
    
    const response = await apiService.get(`/api/client-hours/summary?${params}`)
    
    // Handle 404 gracefully - no clients found
    if (response.status === 404) {
      return {
        summaries: [],
        total_clients: 0,
        active_clients: 0,
        total_hours_allocated: 0,
        total_hours_used: 0,
        total_hours_remaining: 0,
        average_utilization: 0,
      }
    }
    
    if (!response.ok) throw new Error('Failed to fetch client hours summary')
    return response.json()
  }

  async getSingleClientHoursSummary(clientId: number): Promise<ClientHoursSummary> {
    const response = await apiService.get(`/api/client-hours/summary/${clientId}`)
    
    // Handle 404 gracefully - client not found
    if (response.status === 404) {
      return {
        client_id: clientId,
        client_name: 'Unknown Client',
        client_type: null,
        is_active: false,
        monthly_allocation: 0,
        reset_date: 1,
        logged_hours: 0,
        credit_hours: 0,
        hours_remaining: 0,
        utilization_percentage: 0,
        billable_hours: 0,
        non_billable_hours: 0,
        total_allocated: 0,
        last_activity: null,
        billing_period: {
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
        },
        entries_breakdown: []
      }
    }
    
    if (!response.ok) throw new Error('Failed to fetch client hours')
    return response.json()
  }

  // Bulk Retainer Usage - optimized endpoint for retainer page
  async getBulkRetainerUsage(options: {
    active_only?: boolean
    include_recent_entries?: boolean
    recent_entries_limit?: number
    reference_date?: string
  } = {}): Promise<BulkRetainerUsageResponse> {
    const params = new URLSearchParams()
    if (options.active_only !== undefined) params.append('active_only', options.active_only.toString())
    if (options.include_recent_entries !== undefined) params.append('include_recent_entries', options.include_recent_entries.toString())
    if (options.recent_entries_limit !== undefined) params.append('recent_entries_limit', options.recent_entries_limit.toString())
    if (options.reference_date) params.append('reference_date', options.reference_date)
    
    const response = await apiService.get(`/api/retainer-usage/bulk?${params}`)
    if (!response.ok) throw new Error('Failed to fetch bulk retainer usage')
    return response.json()
  }

  // Client Monthly Detail
  async getClientMonthlyDetail(
    clientId: number, 
    referenceDate?: string, 
    includeRollover = true
  ): Promise<ClientMonthlyDetail> {
    const params = new URLSearchParams()
    params.append('include_rollover', includeRollover.toString())
    if (referenceDate) params.append('reference_date', referenceDate)
    
    const response = await apiService.get(`/api/client-billing/detail/${clientId}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch client monthly detail')
    return response.json()
  }

  // Client Statement
  async getClientStatement(
    clientId: number,
    startDate?: string,
    endDate?: string,
    includeNonBillable = true
  ): Promise<ClientStatement> {
    const params = new URLSearchParams()
    params.append('include_non_billable', includeNonBillable.toString())
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await apiService.get(`/api/client-billing/statement/${clientId}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch client statement')
    return response.json()
  }

  // Analytics
  async getUtilizationTrends(months = 3, clientId?: number): Promise<{
    period_start: string
    period_end: string
    trends: ClientUtilizationTrend[]
    average_utilization: number
    total_clients: number
  }> {
    const params = new URLSearchParams()
    params.append('months', months.toString())
    if (clientId) params.append('client_id', clientId.toString())
    
    const response = await apiService.get(`/api/analytics/utilization-trends?${params}`)
    if (!response.ok) throw new Error('Failed to fetch utilization trends')
    return response.json()
  }

  async getRevenueAtRisk(thresholdPercentage = 75, overageRate = 150): Promise<{
    analysis_date: string
    total_at_risk_clients: number
    potential_overage_revenue: number
    clients_at_risk: ClientRevenueRisk[]
    recommendations: string[]
  }> {
    const params = new URLSearchParams()
    params.append('threshold_percentage', thresholdPercentage.toString())
    params.append('overage_rate', overageRate.toString())
    
    const response = await apiService.get(`/api/analytics/revenue-at-risk?${params}`)
    if (!response.ok) throw new Error('Failed to fetch revenue at risk')
    return response.json()
  }

  // Billing Operations
  async closeBillingPeriod(request: BillingPeriodCloseRequest): Promise<{
    operation_date: string
    total_clients_processed: number
    successful_closures: number
    failed_closures: number
    results: Array<{
      client_id: number
      client_name: string
      period_start: string
      period_end: string
      hours_used: number
      hours_allocated: number
      hours_remaining: number
      rollover_applied: number
      statement_generated: boolean
      notification_sent: boolean
      status: string
      message?: string
    }>
  }> {
    const response = await apiService.post('/api/billing-operations/period-close', request)
    if (!response.ok) throw new Error('Failed to close billing period')
    return response.json()
  }

  async exportTimeEntriesCSV(clientId?: number, startDate?: string, endDate?: string): Promise<void> {
    const params = new URLSearchParams()
    if (clientId) params.append('client_id', clientId.toString())
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await apiService.get(`/api/billing-operations/export/csv?${params}`)
    if (!response.ok) throw new Error('Failed to export CSV')
    
    // Trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time_entries_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  async downloadStatementPDF(clientId: number, startDate?: string, endDate?: string): Promise<void> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await apiService.get(`/api/billing-operations/statement/pdf/${clientId}?${params}`)
    if (!response.ok) throw new Error('Failed to generate PDF')
    
    // Trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_client_${clientId}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Credit Ledger Operations
  async setRolloverHours(request: {
    client_id: number
    rollover_hours: number
    target_date: string
    reason: string
  }): Promise<{
    success: boolean
    client_id: number
    client_name: string
    rollover_hours: number
    period_start: string
    period_end: string
    transaction_id: string
    message: string
  }> {
    const response = await apiService.post('/api/credit-ledger/credits/set-rollover', request)
    if (!response.ok) throw new Error('Failed to set rollover hours')
    return response.json()
  }

  async getRolloverHours(clientId: number, targetDate: string): Promise<{
    client_id: number
    client_name: string
    period_start: string
    period_end: string
    rollover_hours: number
    has_rollover: boolean
    rollover_entries: Array<{
      id: string
      description: string
      hours: number
      created_at: string
    }>
  }> {
    const params = new URLSearchParams()
    params.append('target_date', targetDate)
    
    const response = await apiService.get(`/api/credit-ledger/credits/rollover/${clientId}?${params}`)
    if (!response.ok) throw new Error('Failed to get rollover hours')
    return response.json()
  }

  // Notifications
  async sendUsageThresholdAlerts(threshold = 75): Promise<{
    alerts_sent: number
    alerts_failed: number
    recipients: string[]
    message: string
  }> {
    const response = await apiService.post(`/api/billing-notifications/alerts/usage-threshold?threshold=${threshold}`)
    if (!response.ok) throw new Error('Failed to send usage alerts')
    return response.json()
  }

  async sendWeeklySummary(): Promise<{
    alerts_sent: number
    alerts_failed: number
    recipients: string[]
    message: string
  }> {
    const response = await apiService.post('/api/billing-notifications/alerts/weekly-summary')
    if (!response.ok) throw new Error('Failed to send weekly summary')
    return response.json()
  }

  async getAlertPreferences(userId: number): Promise<{
    user_id: number
    email: string
    usage_threshold_alerts: boolean
    threshold_percentage: number
    weekly_summary: boolean
    monthly_statements: boolean
    overage_alerts: boolean
    period_close_notifications: boolean
  }> {
    const response = await apiService.get(`/api/billing-notifications/alerts/preferences/${userId}`)
    if (!response.ok) throw new Error('Failed to fetch alert preferences')
    return response.json()
  }
}

export const billingService = new BillingService()