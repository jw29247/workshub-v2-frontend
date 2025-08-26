import { apiService } from './apiService'

export interface PulseCheck {
  id: number
  user_id: string
  score: number
  date: string
  created_at: string
  updated_at: string
}

export interface PulseCreate {
  score: number
  date?: string
}

export interface UserPulseCheck extends PulseCheck {
  user_name?: string
  user_email?: string
}

export interface AllPulsesResponse {
  pulse_checks: UserPulseCheck[]
  total: number
  pulses: UserPulseCheck[]
  total_responses: number
  average_score: number
  date: string
}

export const pulseCheckService = {
  // Submit or update today's pulse check
  async submitPulseCheck(score: number, date?: string): Promise<PulseCheck> {
    const response = await apiService.post('/api/pulse-checks/', { score, date })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Get my recent pulse checks
  async getMyPulseChecks(limit: number = 30): Promise<PulseCheck[]> {
    const response = await apiService.get(`/api/pulse-checks/me?limit=${limit}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Get today's pulse check if it exists
  async getTodaysPulseCheck(): Promise<PulseCheck | null> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const pulseChecks = await this.getMyPulseChecks(7) // Get last 7 days

      // Ensure pulseChecks is an array before calling find
      if (!Array.isArray(pulseChecks)) {
        return null
      }

      const todaysPulse = pulseChecks.find(pc => pc.date === today)
      return todaysPulse || null
    } catch {
      return null
    }
  },

  // Get all pulse checks (admin only)
  async getAllPulseChecks(startDate?: string, endDate?: string): Promise<AllPulsesResponse> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const queryString = params.toString()
    const url = queryString ? `/api/pulse-checks/all?${queryString}` : '/api/pulse-checks/all'

    const response = await apiService.get(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  // Get pulse checks within a date range (admin only)
  async getPulseChecksRange(startDate: string, endDate: string): Promise<UserPulseCheck[]> {
    const response = await this.getAllPulseChecks(startDate, endDate)
    return response.pulse_checks
  }
}
