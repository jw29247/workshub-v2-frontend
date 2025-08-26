import { apiService } from './apiService'

// Types for simplified credit ledger system
export interface SimplifiedBalanceSummary {
  client_id: number
  client_name: string
  current_balance: number // In hours
  monthly_allocation: number // In hours
  month_usage: number // In hours
  total_credits_added: number // In hours
  total_credits_used: number // In hours
  reset_date: number
  contract_end_date?: string
  overage_hours: number
  overage_amount: number
  hourly_rate?: number
  calculation_date: string
}

export interface SimplifiedTransaction {
  id: number
  client_id: number
  amount: number // In hours
  entry_type: 'credit_allocation' | 'manual_credit' | 'manual_debit' | 'time_deduction' | 'rollover' | 'adjustment' | 'legacy_opening'
  transaction_date: string
  description: string
  notes?: string
  reference_id?: string
  created_by_id?: string
  created_at: string
  updated_at: string
}

export interface AddCreditRequest {
  client_id: number
  amount: number // In hours
  description: string
  notes?: string
  transaction_date?: string
}

export interface MonthlyStatement {
  client_id: number
  year: number
  month: number
  month_name: string
  opening_balance: number
  credits: number
  debits: number
  net_change: number
  closing_balance: number
  transactions: SimplifiedTransaction[]
}

// Simplified Credit Ledger API service
export const simplifiedCreditLedgerService = {
  // Balance Management
  async getClientBalance(clientId: number, asOfDate?: string): Promise<SimplifiedBalanceSummary> {
    const params = new URLSearchParams()
    if (asOfDate) {
      params.set('as_of_date', asOfDate)
    }
    
    const response = await apiService.get(`/api/simplified-credit-ledger/balance/${clientId}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch client balance: ${response.statusText}`)
    }
    
    return response.json()
  },

  async getAllClientBalances(asOfDate?: string): Promise<SimplifiedBalanceSummary[]> {
    const params = new URLSearchParams()
    if (asOfDate) {
      params.set('as_of_date', asOfDate)
    }
    
    const response = await apiService.get(`/api/simplified-credit-ledger/balances?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all balances: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Transaction Management
  async addManualCredit(request: AddCreditRequest): Promise<SimplifiedTransaction> {
    const response = await apiService.post('/api/simplified-credit-ledger/credits/add', request)
    
    if (!response.ok) {
      throw new Error(`Failed to add credit: ${response.statusText}`)
    }
    
    return response.json()
  },

  async getClientTransactions(
    clientId: number,
    options?: {
      limit?: number
      offset?: number
      entry_type?: string
      start_date?: string
      end_date?: string
    }
  ): Promise<SimplifiedTransaction[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.offset) params.set('offset', String(options.offset))
    if (options?.entry_type) params.set('entry_type', options.entry_type)
    if (options?.start_date) params.set('start_date', options.start_date)
    if (options?.end_date) params.set('end_date', options.end_date)
    
    const response = await apiService.get(
      `/api/simplified-credit-ledger/transactions/${clientId}?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Monthly Statements
  async getMonthlyStatement(
    clientId: number,
    year: number,
    month: number
  ): Promise<MonthlyStatement> {
    const response = await apiService.get(
      `/api/simplified-credit-ledger/statements/${clientId}/${year}/${month}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monthly statement: ${response.statusText}`)
    }
    
    return response.json()
  },

  async getClientStatements(
    clientId: number,
    startDate?: string,
    endDate?: string
  ): Promise<MonthlyStatement[]> {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    
    const response = await apiService.get(
      `/api/simplified-credit-ledger/statements/${clientId}?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch statements: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Automated Processing
  async processMonthlyAllocations(): Promise<{ message: string; processed: number }> {
    const response = await apiService.post('/api/simplified-credit-ledger/process/monthly-allocations')
    
    if (!response.ok) {
      throw new Error(`Failed to process monthly allocations: ${response.statusText}`)
    }
    
    return response.json()
  },

  async processTimeEntries(
    startDate?: string,
    endDate?: string,
    clientId?: number
  ): Promise<{ message: string; processed: number; errors: number }> {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    if (clientId) params.set('client_id', String(clientId))
    
    const response = await apiService.post(
      `/api/simplified-credit-ledger/process/time-entries?${params.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to process time entries: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Helper functions
  formatHours(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  },

  getEntryTypeLabel(entryType: string): string {
    const labels: Record<string, string> = {
      'credit_allocation': 'Monthly Allocation',
      'manual_credit': 'Manual Credit',
      'manual_debit': 'Manual Debit',
      'time_deduction': 'Time Entry',
      'rollover': 'Rollover',
      'adjustment': 'Adjustment',
      'legacy_opening': 'Opening Balance'
    }
    return labels[entryType] || entryType
  },

  getEntryTypeColor(entryType: string): string {
    const colors: Record<string, string> = {
      'credit_allocation': 'text-green-600',
      'manual_credit': 'text-blue-600',
      'manual_debit': 'text-orange-600',
      'time_deduction': 'text-red-600',
      'rollover': 'text-purple-600',
      'adjustment': 'text-gray-600',
      'legacy_opening': 'text-indigo-600'
    }
    return colors[entryType] || 'text-gray-500'
  }
}