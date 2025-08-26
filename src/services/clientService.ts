import { apiService } from './apiService'

// Client type enum
export type ClientType = 'project' | 'cro' | 'retainer'

// Types for client management
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
  is_active: boolean
  notes?: string
  monthly_hours: number
  reset_date: number
  contract_end_date?: string
  contract_start_date?: string
  initial_hours?: number
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
  contract_start_date?: string
  initial_hours?: number
  hourly_rate?: number // In pence/cents
  client_type?: ClientType
  manager_id?: string
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
  is_active?: boolean
  notes?: string
  monthly_hours?: number
  reset_date?: number
  contract_end_date?: string
  contract_start_date?: string
  initial_hours?: number
  hourly_rate?: number // In pence/cents
  client_type?: ClientType
  manager_id?: string
}

// Client Management API service
export const clientService = {
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
  }
}