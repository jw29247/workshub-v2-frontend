import { apiService } from './apiService'

export interface DailyNotification {
  id: number
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  display_date: string
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  button_text?: string | null
  button_url?: string | null
}

export interface NotificationCreate {
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  display_date: string
  button_text?: string | null
  button_url?: string | null
}

export const notificationService = {
  // Get today's notification if exists
  async getTodaysNotification(): Promise<DailyNotification | null> {
    try {
      const response = await apiService.get('/api/notifications/today')

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      // Handle fetch errors gracefully - if network fails, just return null
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return null
      }
      throw error
    }
  },

  // Get all notifications (for admin)
  async getAllNotifications(): Promise<DailyNotification[]> {
    const response = await apiService.get('/api/notifications/')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Create a new notification (admin only)
  async createNotification(data: NotificationCreate): Promise<DailyNotification> {
    const response = await apiService.post('/api/notifications/', data)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Update a notification (admin only)
  async updateNotification(id: number, data: Partial<NotificationCreate>): Promise<DailyNotification> {
    const response = await apiService.put(`/api/notifications/${id}`, data)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Delete a notification (admin only)
  async deleteNotification(id: number): Promise<void> {
    const response = await apiService.delete(`/api/notifications/${id}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  },

  // Toggle notification active status (admin only)
  async toggleNotificationStatus(id: number): Promise<DailyNotification> {
    const response = await apiService.post(`/api/notifications/${id}/toggle`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
}
