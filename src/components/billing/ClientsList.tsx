import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store'
import { fetchClients, setSelectedClient } from '../../store/slices/billingSlice'
import { Plus, Search, Building2, Mail, Phone, Clock, TrendingUp, TrendingDown, Edit, Filter, SortAsc, ArrowUpDown, DollarSign, User } from 'lucide-react'
import ClientFormModal from './ClientFormModal'
import CreditAdjustmentModal from './CreditAdjustmentModal'
import { PageHeader } from '../PageHeader'
import { LoadingSpinner } from '../LoadingSpinner'
import { Button } from '../Button'
import { adminService, type UserManagement } from '../../services/adminService'

const ClientsList: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { clients, loading, error } = useAppSelector(state => state.billing)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClient, setEditingClient] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'reset' | 'created'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [creditModalClient, setCreditModalClient] = useState<{ id: number; name: string } | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [usersMap, setUsersMap] = useState<Map<string, UserManagement>>(new Map())

  useEffect(() => {
    // Fetch active-only when filtering by active; otherwise fetch all and filter client-side
    dispatch(fetchClients(filterStatus === 'active'))
  }, [dispatch, filterStatus])

  // Fetch users to map manager IDs to names
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await adminService.getUsers()
        // Create a map for quick lookup
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

  // Keyboard shortcuts: "/" to focus search, "n" to open new client
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if ((e.key === 'n' || e.key === 'N') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowAddModal(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); }
  }, [])

  const derivedClients = useMemo(() => {
    const lower = searchTerm.toLowerCase()
    let list = clients
    if (filterStatus === 'inactive') {
      list = list.filter(c => !c.is_active)
    } else if (filterStatus === 'active') {
      list = list.filter(c => c.is_active)
    }
    // Search by name, company, email
    list = list.filter(client =>
      client.name.toLowerCase().includes(lower) ||
      client.company?.toLowerCase().includes(lower) ||
      client.email.toLowerCase().includes(lower)
    )

    // Sort
    const compare = (a: typeof clients[number], b: typeof clients[number]) => {
      let res = 0
      if (sortBy === 'name') {
        res = a.name.localeCompare(b.name)
      } else if (sortBy === 'hours') {
        res = a.monthly_hours - b.monthly_hours
      } else if (sortBy === 'reset') {
        res = a.reset_date - b.reset_date
      } else if (sortBy === 'created') {
        res = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortDir === 'asc' ? res : -res
    }
    return [...list].sort(compare)
  }, [clients, filterStatus, searchTerm, sortBy, sortDir])

  const handleClientClick = (clientId: number) => {
    dispatch(setSelectedClient(clientId))
    navigate(`/app/billing/clients/${clientId}`)
  }

  const handleEditClick = (e: React.MouseEvent, clientId: number) => {
    e.stopPropagation()
    setEditingClient(clientId)
  }

  const getHealthIndicator = (monthlyHours: number) => {
    if (monthlyHours === 0) return null
    if (monthlyHours >= 40) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (monthlyHours >= 20) {
      return <TrendingUp className="w-4 h-4 text-yellow-500" />
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
  }

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading clients..." size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Clients"
        subtitle="Manage client accounts and billing"
      />

      {/* Toolbar */}
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Filter className="w-4 h-4" />
            <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <button
                onClick={() => { setFilterStatus('all'); }}
                className={`px-3 py-1.5 text-sm ${filterStatus === 'all' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
                aria-pressed={filterStatus === 'all'}
              >
                All
              </button>
              <button
                onClick={() => { setFilterStatus('active'); }}
                className={`px-3 py-1.5 text-sm ${filterStatus === 'active' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
                aria-pressed={filterStatus === 'active'}
              >
                Active
              </button>
              <button
                onClick={() => { setFilterStatus('inactive'); }}
                className={`px-3 py-1.5 text-sm ${filterStatus === 'inactive' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
                aria-pressed={filterStatus === 'inactive'}
              >
                Inactive
              </button>
            </div>
            <span className="ml-2 text-xs">{derivedClients.length} shown</span>
          </div>

          <div className="flex flex-1 items-center gap-3 md:flex-none">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, company, or email… (/ to focus)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-brand-purple-strong focus:border-brand-purple-strong"
              />
            </div>
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-neutral-400" />
              <select
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [by, dir] = e.target.value.split(':') as [typeof sortBy, typeof sortDir]
                  setSortBy(by)
                  setSortDir(dir)
                }}
                className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 px-2 py-2 text-neutral-900 dark:text-white focus:ring-brand-purple-strong focus:border-brand-purple-strong"
                aria-label="Sort clients"
              >
                <option value="name:asc">Name A–Z</option>
                <option value="name:desc">Name Z–A</option>
                <option value="hours:desc">Hours high → low</option>
                <option value="hours:asc">Hours low → high</option>
                <option value="reset:asc">Reset date 1 → 28</option>
                <option value="reset:desc">Reset date 28 → 1</option>
                <option value="created:desc">Newest first</option>
                <option value="created:asc">Oldest first</option>
              </select>
            </div>
            <Button onClick={() => { setShowAddModal(true); }} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-cro-loss-strong/10 dark:bg-red-900/20 border border-cro-loss-strong/20 dark:border-red-700 rounded-lg p-4">
          <p className="text-sm text-cro-loss-strong dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {derivedClients.map(client => (
          <div
            key={client.id}
            onClick={() => { handleClientClick(client.id); }}
            className="group bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <Building2 className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{client.name}</h3>
                  {client.company && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{client.company}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getHealthIndicator(client.monthly_hours)}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreditModalClient({ id: client.id, name: client.name })
                    }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label={`Adjust credits for ${client.name}`}
                    title="Adjust credits"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { handleEditClick(e, client.id); }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label={`Edit ${client.name}`}
                    title="Edit client"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                <Mail className="w-4 h-4 mr-2" />
                {client.email}
              </div>
              {client.phone && (
                <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                  <Phone className="w-4 h-4 mr-2" />
                  {client.phone}
                </div>
              )}
              <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                <Clock className="w-4 h-4 mr-2" />
                {client.monthly_hours} hours/month
              </div>
              {client.manager_id && usersMap.get(client.manager_id) && (
                <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                  <User className="w-4 h-4 mr-2" />
                  {usersMap.get(client.manager_id)?.display_name || usersMap.get(client.manager_id)?.username}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.is_active ? 'bg-cro-win-strong/10 dark:bg-green-900/20 text-cro-win-strong dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Reset: Day {client.reset_date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {derivedClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-600" />
          <h3 className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">No clients found</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating a new client'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => { setShowAddModal(true); }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-purple-strong hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple-strong transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingClient) && (
        <ClientFormModal
          clientId={editingClient}
          onClose={() => {
            setShowAddModal(false)
            setEditingClient(null)
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setEditingClient(null)
            dispatch(fetchClients(filterStatus === 'active'))
          }}
        />
      )}

      {/* Credit Adjustment Modal */}
      {creditModalClient && (
        <CreditAdjustmentModal
          clientId={creditModalClient.id}
          clientName={creditModalClient.name}
          client={clients.find(c => c.id === creditModalClient.id)}
          onClose={() => { setCreditModalClient(null); }}
          onSuccess={() => { setCreditModalClient(null); }}
        />
      )}
    </div>
  )
}

export default ClientsList