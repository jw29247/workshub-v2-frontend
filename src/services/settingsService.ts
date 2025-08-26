import { API_URL } from '../config'
import { backendAuthService } from './backendAuthService'

// Types
export interface UserSettings {
  user_email: string
  role?: 'designer' | 'developer' | 'manager' | 'SLT' | 'other'
  show_in_dashboard: boolean
  display_name?: string
  dashboard_theme: string
  time_format: string
  timezone: string
  email_notifications: boolean
  task_updates: boolean
  time_tracking: boolean
  weekly_reports: boolean
  created_at?: string
  updated_at?: string
}

// API headers with JWT authentication
const getHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    ...backendAuthService.getAuthHeaders()
  }
}

// Settings API service
export const settingsService = {
  // Get all user settings
  async getAllUserSettings(filters?: {
    role?: string
    show_in_dashboard?: boolean
  }): Promise<{ users: UserSettings[]; total: number }> {
    const params = new URLSearchParams()

    if (filters?.role) {
      params.append('role', filters.role)
    }
    if (filters?.show_in_dashboard !== undefined) {
      params.append('show_in_dashboard', filters.show_in_dashboard.toString())
    }

    const url = params.toString()
      ? `${API_URL}/api/settings/users?${params}`
      : `${API_URL}/api/settings/users`

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.statusText}`)
    }

    return response.json()
  },

  // Get settings for a specific user
  async getUserSettings(userEmail: string): Promise<UserSettings> {
    const response = await fetch(`${API_URL}/api/settings/users/${encodeURIComponent(userEmail)}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.statusText}`)
    }

    return response.json()
  },

  // Update user settings
  async updateUserSettings(userEmail: string, updates: {
    role?: 'designer' | 'developer' | 'manager' | 'SLT' | 'other' | null
    show_in_dashboard?: boolean
    display_name?: string
    dashboard_theme?: string
    time_format?: string
    timezone?: string
    email_notifications?: boolean
    task_updates?: boolean
    time_tracking?: boolean
    weekly_reports?: boolean
  }): Promise<UserSettings> {
    const response = await fetch(`${API_URL}/api/settings/users/${encodeURIComponent(userEmail)}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `Failed to update user settings: ${response.statusText}`)
    }

    return response.json()
  },

  // Batch update multiple users
  async batchUpdateUserSettings(updates: Array<{
    user_email: string
    role?: 'designer' | 'developer' | 'manager' | 'SLT' | 'other' | null
    show_in_dashboard?: boolean
    display_name?: string
    dashboard_theme?: string
    time_format?: string
    timezone?: string
    email_notifications?: boolean
    task_updates?: boolean
    time_tracking?: boolean
    weekly_reports?: boolean
  }>): Promise<{ updated: number; errors: Array<{ user_email: string; error: string }> }> {
    const results = {
      updated: 0,
      errors: [] as Array<{ user_email: string; error: string }>
    }

    // Process updates in parallel with error handling
    await Promise.all(
      updates.map(async (update) => {
        try {
          await this.updateUserSettings(update.user_email, {
            ...(update.role !== undefined && { role: update.role }),
            ...(update.show_in_dashboard !== undefined && { show_in_dashboard: update.show_in_dashboard }),
            ...(update.display_name !== undefined && { display_name: update.display_name }),
            ...(update.dashboard_theme !== undefined && { dashboard_theme: update.dashboard_theme }),
            ...(update.time_format !== undefined && { time_format: update.time_format }),
            ...(update.timezone !== undefined && { timezone: update.timezone }),
            ...(update.email_notifications !== undefined && { email_notifications: update.email_notifications }),
            ...(update.task_updates !== undefined && { task_updates: update.task_updates }),
            ...(update.time_tracking !== undefined && { time_tracking: update.time_tracking }),
            ...(update.weekly_reports !== undefined && { weekly_reports: update.weekly_reports })
          })
          results.updated++
        } catch (error) {
          results.errors.push({
            user_email: update.user_email,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
    )

    return results
  }
}
