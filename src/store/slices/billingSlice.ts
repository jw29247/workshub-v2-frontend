import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api'

// Types
export interface Client {
  id: number
  name: string
  email: string
  company?: string
  contact_person?: string
  phone?: string
  address?: string
  is_active: boolean
  notes?: string
  monthly_hours: number
  reset_date: number
  contract_end_date?: string
  contract_start_date?: string
  initial_hours?: number
  hourly_rate?: number
  client_type?: 'project' | 'cro' | 'retainer'
  manager_id?: string
  created_at: string
  updated_at: string
}

export interface MonthlyStatement {
  month: string
  month_date: string
  opening_balance: number
  monthly_allocation: number
  additional_credits: number
  usage: number
  closing_balance: number
  transaction_count: number
  net_change: number
}

export interface CreditTransaction {
  id: number
  client_id: number
  amount: number // in minutes
  balance_after: number // in minutes
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

export interface ClientBalance {
  client_id: number
  client_name: string
  current_balance: number // in hours
  monthly_allocation: number
  month_usage: number
  total_credits_added: number
  total_credits_used: number
  reset_date: number
  contract_end_date?: string
}

export interface CreditSummary {
  period_start?: string
  period_end?: string
  total_transactions: number
  total_credits_added_hours: number
  total_credits_used_hours: number
  active_clients: number
  total_balance_hours: number
}

interface BillingState {
  clients: Client[]
  transactions: Record<number, CreditTransaction[]> // Keyed by client_id
  statements: Record<number, MonthlyStatement[]> // Keyed by client_id
  balances: Record<number, ClientBalance> // Keyed by client_id
  creditSummary: CreditSummary | null
  loading: boolean
  error: string | null
  selectedClientId: number | null
}

const initialState: BillingState = {
  clients: [],
  transactions: {},
  statements: {},
  balances: {},
  creditSummary: null,
  loading: false,
  error: null,
  selectedClientId: null
}

// Async thunks
export const fetchClients = createAsyncThunk<Client[], boolean>(
  'billing/fetchClients',
  async (activeOnly: boolean = true, { rejectWithValue }) => {
    try {
      // Use the client-hours summary endpoint to get client list
      const response = await apiGet('/api/client-hours/summary')
      // Transform the response to match Client[] structure
      if (response?.summaries) {
        return response.summaries.map((summary: any) => ({
          id: summary.client_id,
          name: summary.client_name,
          type: summary.client_type,
          is_active: summary.is_active,
          monthly_allocation: summary.monthly_allocation,
          reset_date: summary.reset_date,
          hours_remaining: summary.hours_remaining,
          utilization_percentage: summary.utilization_percentage
        }))
      }
      return []
    } catch (error: any) {
      // Handle 404 gracefully - no clients found
      if (error?.status === 404) {
        return []
      }
      return rejectWithValue(error.message || 'Failed to fetch clients')
    }
  }
)

export const fetchClient = createAsyncThunk<Client, number>(
  'billing/fetchClient',
  async (clientId: number) => {
    // Use the client-hours summary endpoint for single client
    const summary = await apiGet(`/api/client-hours/summary/${clientId}`)
    return {
      id: summary.client_id,
      name: summary.client_name,
      type: summary.client_type,
      is_active: summary.is_active,
      monthly_allocation: summary.monthly_allocation,
      reset_date: summary.reset_date,
      hours_remaining: summary.hours_remaining,
      utilization_percentage: summary.utilization_percentage
    }
  }
)

// Client CRUD operations are not available in the new system
// These operations should be handled through ClickUp or admin interfaces
/*
export const createClient = createAsyncThunk<Client, Partial<Client>>(
  'billing/createClient',
  async (clientData: Partial<Client>) => {
    return await apiPost('/api/clients', clientData)
  }
)

export const updateClient = createAsyncThunk<Client, { clientId: number; updates: Partial<Client> }>(
  'billing/updateClient',
  async ({ clientId, updates }: { clientId: number; updates: Partial<Client> }) => {
    return await apiPut(`/api/clients/${clientId}`, updates)
  }
)

export const deleteClient = createAsyncThunk<number, number>(
  'billing/deleteClient',
  async (clientId: number) => {
    await apiDelete(`/api/clients/${clientId}`)
    return clientId
  }
)
*/


export const fetchClientBalance = createAsyncThunk<{ clientId: number; balance: ClientBalance }, number>(
  'billing/fetchClientBalance',
  async (clientId: number) => {
    // Use the client-hours summary for balance info
    const summary = await apiGet(`/api/client-hours/summary/${clientId}`)
    const balance: ClientBalance = {
      current_balance: summary.hours_remaining || 0,
      pending_charges: 0,
      available_balance: summary.hours_remaining || 0
    }
    return { clientId, balance }
  }
)

// Fetch monthly statements for a client
export const fetchClientStatements = createAsyncThunk<
  { clientId: number; statements: MonthlyStatement[] },
  { clientId: number; startDate?: string; endDate?: string }
>(
  'billing/fetchClientStatements',
  async ({ clientId, startDate, endDate }) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    // Use the client-billing statement endpoint
    const response = await fetch(`/api/client-billing/statement/${clientId}?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch monthly statements')
    }
    
    const statements = await response.json()
    return { clientId, statements }
  }
)

// Transaction fetching is not available in the new system
// Use the statement endpoint for transaction history
export const fetchClientTransactions = createAsyncThunk<{ clientId: number; transactions: CreditTransaction[] }, { clientId: number; limit?: number }>(
  'billing/fetchClientTransactions',
  async ({ clientId, limit = 100 }: { clientId: number; limit?: number }) => {
    // Return empty transactions for now
    return { clientId, transactions: [] }
  }
)

// Credit operations are not available in the new system
/*
export const addCredits = createAsyncThunk<CreditTransaction, { client_id: number; amount: number; description: string; notes?: string }>(
  'billing/addCredits',
  async (creditData: { client_id: number; amount: number; description: string; notes?: string }) => {
    return await apiPost('/api/credit-ledger/credits/add', creditData)
  }
)
*/

export const fetchCreditSummary = createAsyncThunk<CreditSummary, { start_date?: string; end_date?: string } | undefined>(
  'billing/fetchCreditSummary',
  async (params?: { start_date?: string; end_date?: string }) => {
    // Use the client-hours summary endpoint
    const response = await apiGet('/api/client-hours/summary')
    
    // Transform to CreditSummary structure
    return {
      total_allocated_hours: response.total_hours_allocated || 0,
      total_used_hours: response.total_hours_used || 0,
      total_remaining_hours: response.total_hours_remaining || 0,
      average_utilization: response.average_utilization || 0,
      period_start: response.period_start,
      period_end: response.period_end,
      client_count: response.total_clients || 0,
      active_client_count: response.active_clients || 0
    }
  }
)

export const processMonthlyCredits = createAsyncThunk<any>(
  'billing/processMonthlyCredits',
  async () => {
    return await apiPost('/api/credit-ledger/credits/process-monthly')
  }
)

// Slice
const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setSelectedClient: (state, action: PayloadAction<number | null>) => {
      state.selectedClientId = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch clients
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false
        state.clients = action.payload
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch clients'
      })
    
    // Fetch single client
    builder
      .addCase(fetchClient.fulfilled, (state, action) => {
        const client = action.payload
        const index = state.clients.findIndex(c => c.id === client.id)
        if (index >= 0) {
          state.clients[index] = client
        } else {
          state.clients.push(client)
        }
      })
    
    // Client CRUD operations are disabled in the new system
    /* 
    // Create client
    builder
      .addCase(createClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.loading = false
        state.clients.push(action.payload)
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create client'
      })
    
    // Update client
    builder
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(c => c.id === action.payload.id)
        if (index >= 0) {
          state.clients[index] = action.payload
        }
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(c => c.id !== action.payload)
        delete state.transactions[action.payload]
        delete state.statements[action.payload]
        delete state.balances[action.payload]
        if (state.selectedClientId === action.payload) state.selectedClientId = null
      })
    */
    
    
    // Fetch client balance
    builder
      .addCase(fetchClientBalance.fulfilled, (state, action) => {
        state.balances[action.payload.clientId] = action.payload.balance
      })
    
    // Fetch client transactions
    builder
      .addCase(fetchClientTransactions.fulfilled, (state, action) => {
        state.transactions[action.payload.clientId] = action.payload.transactions
      })
    
    // Fetch client statements
    builder
      .addCase(fetchClientStatements.fulfilled, (state, action) => {
        state.statements[action.payload.clientId] = action.payload.statements
      })
    
    // Add credits - disabled in the new system
    /*
    builder
      .addCase(addCredits.fulfilled, (state, action) => {
        const transaction = action.payload
        if (state.transactions[transaction.client_id]) {
          state.transactions[transaction.client_id]!.unshift(transaction)
        }
      })
    */
    
    // Fetch credit summary
    builder
      .addCase(fetchCreditSummary.fulfilled, (state, action) => {
        state.creditSummary = action.payload
      })
  }
})

export const { setSelectedClient, clearError } = billingSlice.actions
export default billingSlice.reducer