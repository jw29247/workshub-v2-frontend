import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'
import {
  Building,
  Search,
  Edit,
  RefreshCw,
  X,
  Trash2,
  Plus,
  Eye
} from 'lucide-react'
import { clientService } from '../services/clientService'
import type { Client, ClientType } from '../services/clientService'
import ClientFormModal from './billing/ClientFormModal'
import { LoadingSpinner } from './LoadingSpinner'
import { toast } from 'sonner'
import { adminService, type UserManagement } from '../services/adminService'

interface ClientManagementProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const ClientManagement: React.FC<ClientManagementProps> = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usersMap, setUsersMap] = useState<Map<string, UserManagement>>(new Map())

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ClientType | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active')

  // Modal states
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  useEffect(() => {
    loadClients()
  }, [selectedStatus, selectedType]) // Reload when filters change

  // Fetch users to map manager IDs to names
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await adminService.getUsers()
        const map = new Map<string, UserManagement>()
        allUsers.forEach(user => {
          map.set(user.id, user)
        })
        setUsersMap(map)
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const clientsData = await clientService.getClients(
        selectedStatus !== 'inactive',
        selectedType || undefined
      )
      setClients(clientsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && client.is_active) ||
      (selectedStatus === 'inactive' && !client.is_active)

    return matchesSearch && matchesStatus
  })


  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedType('')
    setSelectedStatus('active')
  }

  const handleCreateClient = () => {
    setEditingClient(null)
    setShowClientModal(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setShowClientModal(true)
  }

  const handleSaveClient = () => {
    setShowClientModal(false)
    setEditingClient(null)
    loadClients() // Refresh the list
    toast.success('Client saved successfully')
  }

  const handleDeleteClient = async (clientId: number, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"? This action cannot be undone and will remove all related data including balances and transactions.`)) {
      return
    }

    try {
      setLoading(true)
      await clientService.deleteClient(clientId)
      toast.success(`Client "${clientName}" has been deleted successfully`)
      loadClients() // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete client')
    } finally {
      setLoading(false)
    }
  }

  const getClientTypeLabel = (type: ClientType | undefined) => {
    switch (type) {
      case 'project':
        return { label: 'Project', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' }
      case 'cro':
        return { label: 'CRO', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' }
      case 'retainer':
        return { label: 'Retainer', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' }
      default:
        return { label: 'Retainer', color: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300' }
    }
  }

  const getStatusLabel = (active: boolean) => {
    return active 
      ? { label: 'Active', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' }
      : { label: 'Inactive', color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' }
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <PageHeader
          title="Client Management"
          subtitle="Manage your clients, their settings, and billing configuration"
        />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <Button variant="secondary" onClick={loadClients}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Client Management"
        subtitle="Manage your clients, their settings, and billing configuration"
      >
        <Button onClick={handleCreateClient}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search clients by name, email, company, or contact..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          {/* Client Type Filter */}
          <div className="lg:w-48">
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as ClientType | ''); }}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="retainer">Retainer</option>
              <option value="project">Project</option>
              <option value="cro">CRO</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive'); }}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
            >
              <option value="active">Active Only</option>
              <option value="all">All Clients</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="secondary" onClick={loadClients}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner message="Loading clients..." />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No clients found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {searchTerm || selectedType || selectedStatus !== 'active' 
                ? "No clients match your current filters."
                : "Get started by creating your first client."}
            </p>
            {(!searchTerm && !selectedType && selectedStatus === 'active') && (
              <Button onClick={handleCreateClient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white">Client</th>
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white">Type</th>
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white">Status</th>
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white">Manager</th>
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white">Monthly Hours</th>
                  <th className="text-right p-4 font-semibold text-neutral-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, index) => {
                  const typeInfo = getClientTypeLabel(client.client_type)
                  const statusInfo = getStatusLabel(client.is_active)
                  
                  return (
                    <tr key={client.id} className={`border-b border-neutral-100 dark:border-neutral-800 ${
                      index % 2 === 0 ? '' : 'bg-neutral-50/50 dark:bg-neutral-800/25'
                    }`}>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {client.name}
                          </p>
                          {client.company && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {client.company}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-neutral-600 dark:text-neutral-400 text-sm">
                          {client.manager_id && usersMap.get(client.manager_id) 
                            ? (usersMap.get(client.manager_id)?.display_name || usersMap.get(client.manager_id)?.username)
                            : 'Unassigned'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-neutral-900 dark:text-white">
                          {client.monthly_hours}h
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/app/admin/clients/${client.id}`)}
                            disabled={loading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { handleEditClient(client); }}
                            disabled={loading}
                            title="Edit Client"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            disabled={loading}
                            title="Delete Client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Client Form Modal */}
      {showClientModal && (
        <ClientFormModal
          clientId={editingClient?.id || null}
          onClose={() => {
            setShowClientModal(false)
            setEditingClient(null)
          }}
          onSuccess={handleSaveClient}
        />
      )}
    </div>
  )
}