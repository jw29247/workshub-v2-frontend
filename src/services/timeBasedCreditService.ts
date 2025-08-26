import { apiService } from './apiService'

// Types for time-based credit system
export interface ClientBalance {
  client_id: number
  client_name: string
  initial_hours: number
  contract_start_date: string
  current_balance: number
  total_time_logged: number
  monthly_allocation: number
  this_month_usage: number
  last_updated: string
}

export interface AddCreditsRequest {
  hours: number
  description: string
}

// Time-based Credit API service
export const timeBasedCreditService = {
  // Get single client balance
  async getClientBalance(clientId: number, forceRefresh: boolean = false): Promise<ClientBalance> {
    const params = new URLSearchParams()
    if (forceRefresh) {
      params.set('force_refresh', 'true')
    }
    
    const response = await apiService.get(
      `/api/time-credits/clients/${clientId}/balance?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch client balance: ${response.statusText}`)
    }

    return response.json()
  },

  // Get all client balances
  async getAllClientBalances(forceRefresh: boolean = false): Promise<ClientBalance[]> {
    const params = new URLSearchParams()
    if (forceRefresh) {
      params.set('force_refresh', 'true')
    }
    
    const response = await apiService.get(
      `/api/time-credits/clients/balances?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch client balances: ${response.statusText}`)
    }

    return response.json()
  },

  // Add manual credits
  async addManualCredits(clientId: number, request: AddCreditsRequest): Promise<{ message: string; client_id: number }> {
    const response = await apiService.post(
      `/api/time-credits/clients/${clientId}/add-credits`,
      request
    )

    if (!response.ok) {
      throw new Error(`Failed to add credits: ${response.statusText}`)
    }

    return response.json()
  },

  // Invalidate cache for a client
  async invalidateClientCache(clientId: number): Promise<{ message: string }> {
    const response = await apiService.post(
      `/api/time-credits/cache/invalidate/${clientId}`,
      {}
    )

    if (!response.ok) {
      throw new Error(`Failed to invalidate cache: ${response.statusText}`)
    }

    return response.json()
  },

  // Invalidate all caches
  async invalidateAllCache(): Promise<{ message: string }> {
    const response = await apiService.post(
      `/api/time-credits/cache/invalidate-all`,
      {}
    )

    if (!response.ok) {
      throw new Error(`Failed to invalidate all caches: ${response.statusText}`)
    }

    return response.json()
  },
}