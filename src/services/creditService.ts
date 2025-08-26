/**
 * Credit-based retainer system service
 */

import { apiService } from './apiService'

export interface CreditSummary {
  client_id: number
  client_name: string
  is_active: boolean
  client_type: string | null
  balance_hours: number
  is_overdrawn: boolean
  last_updated: string | null
  list_id: string | null
  total_transactions: number
}

export interface BulkCreditSummaryResponse {
  clients: CreditSummary[]
  total_clients: number
  overdrawn_clients: number
  total_balance: number
  generated_at: string
}

export interface CreditTransaction {
  id: number
  client_id: number
  list_id: string
  transaction_type: string
  amount_hours: number
  description: string
  time_entry_id: string | null
  created_by: string | null
  created_at: string
}

export interface UsageStats {
  period_days: number
  hours_spent: number
  credits_added: number
  current_balance: number
  net_usage: number
  average_daily_usage: number
}

export interface AddCreditsRequest {
  client_id: number
  hours: number
  description: string
}

export interface AdjustCreditsRequest {
  client_id: number
  hours: number
  description: string
}

class CreditService {
  /**
   * Get credit balance summary for all retainer clients
   */
  async getCreditsSummary(activeOnly = true): Promise<BulkCreditSummaryResponse> {
    const params = new URLSearchParams()
    params.append('active_only', activeOnly.toString())
    
    const response = await apiService.get(`/api/credits/summary?${params}`)
    if (!response.ok) throw new Error('Failed to fetch credits summary')
    return response.json()
  }

  /**
   * Add credits to a client account
   */
  async addCredits(request: AddCreditsRequest): Promise<CreditTransaction> {
    const response = await apiService.post('/api/credits/add', request)
    if (!response.ok) throw new Error('Failed to add credits')
    return response.json()
  }

  /**
   * Make manual adjustment to client credits
   */
  async adjustCredits(request: AdjustCreditsRequest): Promise<CreditTransaction> {
    const response = await apiService.post('/api/credits/adjust', request)
    if (!response.ok) throw new Error('Failed to adjust credits')
    return response.json()
  }

  /**
   * Get current balance for a specific client
   */
  async getClientBalance(clientId: number): Promise<{
    client_id: number
    balance_hours: number
    is_overdrawn: boolean
  }> {
    const response = await apiService.get(`/api/credits/${clientId}/balance`)
    if (!response.ok) throw new Error('Failed to fetch client balance')
    return response.json()
  }

  /**
   * Get transaction history for a client
   */
  async getClientTransactions(
    clientId: number, 
    limit = 50, 
    transactionType?: string
  ): Promise<CreditTransaction[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (transactionType) params.append('transaction_type', transactionType)
    
    const response = await apiService.get(`/api/credits/${clientId}/transactions?${params}`)
    if (!response.ok) throw new Error('Failed to fetch client transactions')
    return response.json()
  }

  /**
   * Get usage statistics for a client
   */
  async getClientUsageStats(clientId: number, days = 30): Promise<UsageStats> {
    const params = new URLSearchParams()
    params.append('days', days.toString())
    
    const response = await apiService.get(`/api/credits/${clientId}/usage-stats?${params}`)
    if (!response.ok) throw new Error('Failed to fetch usage stats')
    return response.json()
  }
}

export const creditService = new CreditService()