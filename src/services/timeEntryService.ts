/**
 * Time Entry service for manual time entry management
 */

import { apiService } from './apiService'

export type TimeEntryType = 
  | 'logged_time'
  | 'credit_applied'
  | 'retainer_credit'
  | 'refund'
  | 'reconciliation'

export interface ManualTimeEntry {
  client_name: string
  duration_ms: number
  type: TimeEntryType
  description?: string
  start_time?: string
  end_time?: string
  billable?: boolean
  task_name?: string
  tags?: string[]
}

export interface TimeEntryResponse {
  id: string
  client_id: number | null
  client_name: string
  user_id: number
  task_id: string | null
  task_name: string | null
  description: string | null
  start: string
  end: string
  duration: number
  billable: boolean
  tags: string[]
  source: string
  type: TimeEntryType
  created_at: string
  updated_at: string | null
}

export interface TimeEntryListResponse {
  entries: TimeEntryResponse[]
  total: number
  page: number
  per_page: number
}

class TimeEntryService {
  // Create manual time entry
  async createManualEntry(entry: ManualTimeEntry): Promise<TimeEntryResponse> {
    const response = await apiService.post('/api/time-entries/manual', entry)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create time entry')
    }
    return response.json()
  }

  // Get manual time entry by ID
  async getManualEntry(entryId: string): Promise<TimeEntryResponse> {
    const response = await apiService.get(`/api/time-entries/manual/${entryId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch time entry')
    }
    return response.json()
  }

  // Update manual time entry
  async updateManualEntry(entryId: string, updates: Partial<ManualTimeEntry>): Promise<TimeEntryResponse> {
    const response = await apiService.patch(`/api/time-entries/manual/${entryId}`, updates)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update time entry')
    }
    return response.json()
  }

  // Delete manual time entry
  async deleteManualEntry(entryId: string): Promise<void> {
    const response = await apiService.delete(`/api/time-entries/manual/${entryId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete time entry')
    }
  }

  // List manual time entries
  async listManualEntries(
    page = 1,
    perPage = 50,
    clientName?: string,
    type?: TimeEntryType,
    startDate?: string,
    endDate?: string
  ): Promise<TimeEntryListResponse> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('per_page', perPage.toString())
    if (clientName) params.append('client_name', clientName)
    if (type) params.append('type', type)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await apiService.get(`/api/time-entries/manual?${params}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch time entries')
    }
    return response.json()
  }

  // Helper to convert hours to milliseconds
  hoursToMilliseconds(hours: number): number {
    return Math.round(hours * 60 * 60 * 1000)
  }

  // Helper to convert milliseconds to hours
  millisecondsToHours(ms: number): number {
    return ms / (60 * 60 * 1000)
  }

  // Helper to format duration for display
  formatDuration(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    
    if (hours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  // Helper to get type display name
  getTypeDisplayName(type: TimeEntryType): string {
    const displayNames: Record<TimeEntryType, string> = {
      logged_time: 'Logged Time',
      credit_applied: 'Credit Applied',
      retainer_credit: 'Retainer Credit',
      refund: 'Refund',
      reconciliation: 'Reconciliation'
    }
    return displayNames[type] || type
  }

  // Helper to get type color
  getTypeColor(type: TimeEntryType): string {
    const colors: Record<TimeEntryType, string> = {
      logged_time: '#3b82f6',      // blue
      credit_applied: '#10b981',   // green
      retainer_credit: '#8b5cf6',  // purple
      refund: '#f59e0b',           // amber
      reconciliation: '#6b7280'    // gray
    }
    return colors[type] || '#6b7280'
  }

  // Helper to get type icon
  getTypeIcon(type: TimeEntryType): string {
    const icons: Record<TimeEntryType, string> = {
      logged_time: '⏱️',
      credit_applied: '➕',
      retainer_credit: '💰',
      refund: '↩️',
      reconciliation: '⚖️'
    }
    return icons[type] || '📝'
  }
}

export const timeEntryService = new TimeEntryService()