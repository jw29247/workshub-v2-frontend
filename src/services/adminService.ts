import { API_URL } from '../config'
import { backendAuthService } from './backendAuthService'

// Types for admin user management
export interface Pod {
  id: number
  name: string
  type: 'design' | 'development' | 'mixed'
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  member_count: number
}

export interface PodCreate {
  name: string
  type: 'design' | 'development' | 'mixed'
  description?: string
  is_active?: boolean
}

export interface PodUpdate {
  name?: string
  type?: 'design' | 'development' | 'mixed'
  description?: string
  is_active?: boolean
}

export interface UserProfile {
  first_name?: string
  last_name?: string
  display_name?: string
  bio?: string
  phone?: string
  profile_picture_url?: string
  pod_id?: number
  department?: string
  job_title?: string
  hire_date?: string
}

export interface UserManagement {
  id: string
  username?: string
  email?: string
  initials?: string
  role?: string
  pod?: string  // Legacy pod field
  is_active: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
  // Profile fields
  first_name?: string
  last_name?: string
  display_name?: string
  bio?: string
  phone?: string
  profile_picture_url?: string
  pod_id?: number
  pod_name?: string
  department?: string
  job_title?: string
  hire_date?: string
  show_in_dashboard?: boolean
}

export interface UserManagementUpdate {
  username?: string
  email?: string
  initials?: string
  role?: string
  pod?: string  // Legacy pod field
  is_active?: boolean
  is_hidden?: boolean
  profile?: UserProfile
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...backendAuthService.getAuthHeaders()
})

// Admin API service
export const adminService = {
  // Pod Management
  async getPods(includeInactive: boolean = false): Promise<Pod[]> {
    const params = includeInactive ? '?include_inactive=true' : ''
    const response = await fetch(`${API_URL}/api/admin/pods${params}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch pods: ${response.statusText}`)
    }

    return response.json()
  },

  async createPod(podData: PodCreate): Promise<Pod> {
    const response = await fetch(`${API_URL}/api/admin/pods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(podData)
    })

    if (!response.ok) {
      throw new Error(`Failed to create pod: ${response.statusText}`)
    }

    return response.json()
  },

  async updatePod(podId: number, podData: PodUpdate): Promise<Pod> {
    const response = await fetch(`${API_URL}/api/admin/pods/${podId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(podData)
    })

    if (!response.ok) {
      throw new Error(`Failed to update pod: ${response.statusText}`)
    }

    return response.json()
  },

  async deletePod(podId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/admin/pods/${podId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to delete pod: ${response.statusText}`)
    }

    return response.json()
  },

  // User Management
  async getUsers(params?: {
    search?: string
    pod_id?: number
    role?: string
    skip?: number
    limit?: number
  }): Promise<UserManagement[]> {
    const searchParams = new URLSearchParams()

    if (params?.search) searchParams.append('search', params.search)
    if (params?.pod_id) searchParams.append('pod_id', params.pod_id.toString())
    if (params?.role) searchParams.append('role', params.role)
    if (params?.skip) searchParams.append('skip', params.skip.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const url = searchParams.toString()
      ? `${API_URL}/api/admin/users?${searchParams}`
      : `${API_URL}/api/admin/users`

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }

    return response.json()
  },

  async getUser(userId: string): Promise<UserManagement> {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }

    return response.json()
  },

  async updateUser(userId: string, userData: UserManagementUpdate): Promise<UserManagement> {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`)
    }

    return response.json()
  },

  async resetUserPassword(userId: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `Failed to reset password: ${response.statusText}`)
    }

    return response.json()
  },

  async uploadProfilePicture(userId: string, file: File): Promise<{ message: string; profile_picture_url: string; filename: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/api/admin/users/${userId}/profile-picture`, {
      method: 'POST',
      headers: {
        ...backendAuthService.getAuthHeaders()
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to upload profile picture: ${response.statusText}`)
    }

    return response.json()
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`)
    }

    return response.json()
  },

  async sendWelcomeEmail(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}/send-welcome-email`, {
      method: 'POST',
      headers: getHeaders()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `Failed to send welcome email: ${response.statusText}`)
    }

    return response.json()
  }

  // Sync functionality has been removed from the application
}
