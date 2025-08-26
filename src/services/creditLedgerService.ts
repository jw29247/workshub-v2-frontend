import { apiService } from './apiService'

// Client type enum
export type ClientType = 'project' | 'cro' | 'retainer'

// Types for credit ledger management
export interface Client {
  id: number
  name: string
  email: string
  company?: string
  contact_person?: string
  phone?: string
  address?: string
  timezone: string
  currency: string
  active: boolean
  notes?: string
  monthly_hours: number
  reset_date: number
  contract_end_date?: string
  contract_start_date?: string  // New field
  initial_hours?: number  // New field
  hourly_rate?: number // In pence/cents
  client_type?: ClientType
  manager_id?: string  // Manager assignment
  created_at: string
  updated_at: string
}

export interface ClientCreate {
  name: string
  email: string
  company?: string
  contact_person?: string
  phone?: string
  address?: string
  timezone?: string
  currency?: string
  notes?: string
  monthly_hours?: number
  reset_date?: number
  contract_end_date?: string
  contract_start_date?: string  // New field
  initial_hours?: number  // New field
  hourly_rate?: number // In pence/cents
  client_type?: ClientType
  manager_id?: string  // Manager assignment
}

export interface ClientUpdate {
  name?: string
  email?: string
  company?: string
  contact_person?: string
  phone?: string
  address?: string
  timezone?: string
  currency?: string
  active?: boolean
  notes?: string
  monthly_hours?: number
  reset_date?: number
  contract_end_date?: string
  contract_start_date?: string  // New field
  initial_hours?: number  // New field
  hourly_rate?: number // In pence/cents
  client_type?: ClientType
  manager_id?: string  // Manager assignment
}

export interface AddCreditsRequest {
  client_id: number
  amount: number // In hours, will be converted to minutes
  description: string
  notes?: string
}

export interface Transaction {
  id: number
  client_id: number
  amount: number // In minutes
  balance_after: number // In minutes
  transaction_type: string
  description: string
  notes?: string
  created_by_id?: string
  created_at: string
  time_entry_id?: string
  hours_deducted?: number
  billing_period_start?: string
  billing_period_end?: string
}

export interface BalanceSummary {
  client_id: number
  client_name: string
  current_balance: number // In hours
  monthly_allocation: number // In hours
  month_usage: number // In hours
  total_credits_added: number // In hours
  total_credits_used: number // In hours
  rolled_over: number // In hours - rolled over from previous month
  additional_credits: number // In hours - manual credits added this month
  reset_date: number
  contract_end_date?: string
  overage_hours: number // Hours over allocation (0 if positive balance)
  overage_amount: number // Monetary value of overage
  hourly_rate?: number // Hourly rate in pence/cents
}

// Credit Ledger API service
export const creditLedgerService = {
  // Client Management
  async getClients(activeOnly: boolean = true, clientType?: ClientType): Promise<Client[]> {
    const params = new URLSearchParams()
    params.set('active_only', String(activeOnly))
    if (clientType) {
      params.set('client_type', clientType)
    }
    
    const response = await apiService.get(`/api/clients?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.statusText}`)
    }

    return response.json()
  },

  async getClient(clientId: number): Promise<Client> {
    const response = await apiService.get(`/api/clients/${clientId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch client: ${response.statusText}`)
    }

    return response.json()
  },

  async createClient(clientData: ClientCreate): Promise<Client> {
    const response = await apiService.post('/api/clients', clientData)

    if (!response.ok) {
      throw new Error(`Failed to create client: ${response.statusText}`)
    }

    return response.json()
  },

  async updateClient(clientId: number, clientData: ClientUpdate): Promise<Client> {
    const response = await apiService.patch(
      `/api/clients/${clientId}`,
      clientData
    )

    if (!response.ok) {
      throw new Error(`Failed to update client: ${response.statusText}`)
    }

    return response.json()
  },

  async deleteClient(clientId: number): Promise<{ message: string }> {
    const response = await apiService.delete(`/api/clients/${clientId}`)

    if (!response.ok) {
      throw new Error(`Failed to delete client: ${response.statusText}`)
    }

    return response.json()
  },

  // Credit Management
  async addCredits(request: AddCreditsRequest): Promise<Transaction> {
    const response = await apiService.post('/api/credit-ledger/credits/add', request)

    if (!response.ok) {
      throw new Error(`Failed to add credits: ${response.statusText}`)
    }

    return response.json()
  },

  async getClientBalance(clientId: number): Promise<BalanceSummary> {
    const response = await apiService.get(`/api/clients/${clientId}/balance`)

    if (!response.ok) {
      throw new Error(`Failed to fetch client balance: ${response.statusText}`)
    }

    return response.json()
  },

  async getClientTransactions(clientId: number, limit: number = 100): Promise<Transaction[]> {
    const response = await apiService.get(
      `/api/clients/${clientId}/transactions?limit=${limit}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch client transactions: ${response.statusText}`)
    }

    return response.json()
  },

  // Admin Functions
  async processMonthlyCredits(): Promise<{ message: string; transaction_count: number }> {
    const response = await apiService.post('/api/credit-ledger/credits/process-monthly')

    if (!response.ok) {
      throw new Error(`Failed to process monthly credits: ${response.statusText}`)
    }

    return response.json()
  },

  // Helper function to convert minutes to hours
  minutesToHours(minutes: number): number {
    return minutes / 60
  },

  // Helper function to convert hours to minutes
  hoursToMinutes(hours: number): number {
    return hours * 60
  }
}
