import { apiService } from './apiService'

export interface PresentationSchedule {
  id: number
  week_starting: string
  manager_id: string
  presentation_order: number
  created_at: string
  updated_at: string
  created_by_id: string | null
  manager_name?: string | null
}

export interface WeeklyPresentationSchedule {
  week_starting: string
  schedules: PresentationSchedule[]
}

export interface PresentationHistoryStats {
  manager_id: string
  manager_name: string
  position_counts: Record<number, number>
  total_presentations: number
  recent_positions: number[]
}

export interface GenerateScheduleRequest {
  week_starting: string
  manager_ids: string[]
}

export interface UpdateScheduleRequest {
  presentation_order: number
}

export const presentationScheduleService = {
  // Get weekly schedule
  async getWeeklySchedule(weekDate: string): Promise<WeeklyPresentationSchedule> {
    const response = await apiService.get(`/api/presentation-schedule/week/${weekDate}`)
    return response.json()
  },

  // Generate round-robin schedule
  async generateSchedule(request: GenerateScheduleRequest): Promise<WeeklyPresentationSchedule> {
    const response = await apiService.post('/api/presentation-schedule/generate', request)
    return response.json()
  },

  // Update schedule position
  async updateSchedulePosition(scheduleId: number, newPosition: number): Promise<PresentationSchedule> {
    const response = await apiService.put(
      `/api/presentation-schedule/${scheduleId}`,
      { presentation_order: newPosition }
    )
    return response.json()
  },

  // Delete schedule entry
  async deleteScheduleEntry(scheduleId: number): Promise<void> {
    await apiService.delete(`/api/presentation-schedule/${scheduleId}`)
  },

  // Get manager presentation history
  async getManagerHistory(managerId: string): Promise<PresentationHistoryStats> {
    const response = await apiService.get(`/api/presentation-schedule/history/${managerId}`)
    return response.json()
  }
}