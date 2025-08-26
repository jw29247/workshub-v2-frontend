import { useEffect, useState } from 'react'
import { formatUKDate, formatUKDateTime } from '../../utils/dateFormatting'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchClient,
  fetchClientBalance,
  fetchClientTransactions,
  fetchClientStatements
} from '../../store/slices/billingSlice'

import {
  ArrowLeft,
  Clock,
  Plus,
  Minus,
  FileText,
  Edit,
  DollarSign,
  ListChecks,
  User
} from 'lucide-react'
import { apiService } from '../../services/apiService'
import { simplifiedCreditLedgerService } from '../../services/simplifiedCreditLedgerService'
import { adminService, type UserManagement } from '../../services/adminService'
import CreditAdjustmentModal from './CreditAdjustmentModal'
import ClientFormModal from './ClientFormModal'
import { LoadingSpinner } from '../LoadingSpinner'
import { Button } from '../Button'
import { toast } from 'sonner'

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statements' | 'thisweek'>('overview')
  const [weeklyTasks, setWeeklyTasks] = useState<Array<{ taskName: string; taskId: string; totalMinutes: number; totalHours: number }>>([])  
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(false)
  
  // New credit calculator states
  const [calculatedBalance, setCalculatedBalance] = useState<any>(null)
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null)
  const [calculatedStatements, setCalculatedStatements] = useState<any[]>([])
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [recentTimeEntries, setRecentTimeEntries] = useState<any[]>([])
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false)
  const [manager, setManager] = useState<UserManagement | null>(null)
  
  const { clients, transactions, statements, balances, loading } = useAppSelector(state => state.billing)
  
  const client = clients.find(c => c.id === Number(clientId))
  const clientTransactions = transactions[Number(clientId!)] || []
  const clientStatements = statements[Number(clientId!)] || []
  const clientBalance = balances[Number(clientId!)]
  
  useEffect(() => {
    if (clientId) {
      const id = Number(clientId)
      dispatch(fetchClient(id))
      // Still fetch old data for compatibility
      dispatch(fetchClientBalance(id))
      dispatch(fetchClientTransactions({ clientId: id }))
      dispatch(fetchClientStatements({ clientId: id }))
      
      // Fetch new calculator data
      fetchCalculatedData(id)
    }
  }, [dispatch, clientId])
  
  // Fetch manager data if client has a manager
  useEffect(() => {
    const fetchManager = async () => {
      if (client?.manager_id) {
        try {
          const users = await adminService.getUsers()
          const managerUser = users.find(u => u.id === client.manager_id)
          setManager(managerUser || null)
        } catch (error) {
          console.error('Failed to fetch manager:', error)
        }
      }
    }
    fetchManager()
  }, [client?.manager_id])
  
  const fetchCalculatedData = async (clientId: number) => {
    setBalanceLoading(true)
    try {
      // Use the new creditLedgerService which now uses time-based system
      const balance = await simplifiedCreditLedgerService.getClientBalance(clientId)

      setCalculatedBalance({
        current_balance_hours: balance.current_balance,
        monthly_allocation_hours: balance.monthly_allocation,
        breakdown: {
          monthly_allocations_minutes: balance.total_credits_added * 60,
          manual_adjustments_minutes: ((balance as any).additional_credits || 0) * 60,
          time_usage_minutes: balance.total_credits_used * 60
        }
      })
      
      // Set monthly usage from balance data
      setMonthlyUsage({
        entry_count: 0, // We don't have entry count from balance
        total_hours: balance.month_usage
      })
      
      // Generate monthly statements from the balance data
      const statements = generateMonthlyStatements({
        current_balance_hours: balance.current_balance,
        monthly_allocation_hours: balance.monthly_allocation
      }, {
        total_hours: balance.month_usage
      })
      setCalculatedStatements(statements)
    } catch (error) {
      console.error('Failed to fetch calculated data:', error)
      // Fall back to old data if new service fails
    } finally {
      setBalanceLoading(false)
    }
  }
  
  const generateMonthlyStatements = (balance: any, usage: any) => {
    // Generate last 6 months of statements
    const statements = []
    const now = new Date()
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = formatUKDate(date, { month: 'long', year: 'numeric' })
      
      // Calculate usage for this specific month if available
      const monthlyAllocation = balance?.monthly_allocation_hours || client?.monthly_hours || 0
      
      statements.push({
        month: monthName,
        month_date: date.toISOString(),
        opening_balance: 0, // Would need historical data
        monthly_allocation: monthlyAllocation,
        additional_credits: 0, // Would need to fetch from transactions
        usage: i === 0 ? (usage?.total_hours || 0) : 0, // Only show current month usage
        closing_balance: i === 0 ? (balance?.current_balance_hours || 0) : 0,
        transaction_count: i === 0 ? (usage?.entry_count || 0) : 0,
        net_change: i === 0 ? (monthlyAllocation - (usage?.total_hours || 0)) : monthlyAllocation
      })
    }
    
    return statements
  }

  // Fetch weekly tasks when tab is selected or client changes
  useEffect(() => {
    if (activeTab === 'thisweek' && client) {
      fetchWeeklyTasks()
    }
    if (activeTab === 'transactions' && client) {
      fetchRecentTimeEntries()
    }
  }, [activeTab, client])
  
  const fetchRecentTimeEntries = async () => {
    if (!client) return
    
    setTimeEntriesLoading(true)
    try {
      // Fetch last 30 days of time entries
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        client_name: client.name,
        limit: '50'
      })
      
      const response = await apiService.get(`/api/time-tracking/entries?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setRecentTimeEntries(data)
      }
    } catch (error) {
      console.error('Failed to fetch time entries:', error)
    } finally {
      setTimeEntriesLoading(false)
    }
  }

  const fetchWeeklyTasks = async () => {
    if (!client) return
    
    setWeeklyTasksLoading(true)
    try {
      // Get start of current week (Monday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - daysFromMonday)
      monday.setHours(0, 0, 0, 0)
      
      // Get end of current week (Sunday)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      
      // Fetch time entries for this week for this client
      const params = new URLSearchParams({
        start_date: monday.toISOString(),
        end_date: sunday.toISOString(),
        client_name: client.name,
        limit: '1000'
      })
      const response = await apiService.get(`/api/time-tracking/entries?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch weekly tasks')
      }
      const responseData = await response.json()
      
      // Aggregate by task
      const taskMap = new Map<string, { taskName: string; taskId: string; totalMinutes: number }>()
      
      responseData.forEach((entry: any) => {
        const taskId = entry.task_id || 'no-task'
        const taskName = entry.task_name || 'No Task Assigned'
        const duration = entry.duration || 0 // duration is in milliseconds
        const minutes = Math.round(duration / 60000) // Convert to minutes
        
        if (taskMap.has(taskId)) {
          const existing = taskMap.get(taskId)!
          existing.totalMinutes += minutes
        } else {
          taskMap.set(taskId, {
            taskName,
            taskId,
            totalMinutes: minutes
          })
        }
      })
      
      // Convert to array and calculate hours
      const tasks = Array.from(taskMap.values()).map(task => ({
        ...task,
        totalHours: task.totalMinutes / 60
      })).sort((a, b) => b.totalMinutes - a.totalMinutes) // Sort by time, highest first
      
      setWeeklyTasks(tasks)
    } catch (error) {
      console.error('Failed to fetch weekly tasks:', error)
      toast.error('Failed to load weekly tasks')
    } finally {
      setWeeklyTasksLoading(false)
    }
  }

  // Update time every second
  
  const formatDateTime = (dateString: string) => {
    return formatUKDateTime(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const formatDate = (dateString: string) => {
    return formatUKDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.abs(minutes) / 60
    return `${minutes < 0 ? '-' : ''}${hours.toFixed(2)} hrs`
  }
  
  const getTransactionIcon = (_type: string, amount: number) => {
    if (amount > 0) {
      return <Plus className="w-4 h-4 text-green-500" />
    } else {
      return <Minus className="w-4 h-4 text-red-500" />
    }
  }
  
  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600'
  }
  
  if (loading && !client) {
    return (
      <LoadingSpinner message="Loading client details..." size="lg" fullScreen />
    )
  }
  
  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Client not found</h3>
        <button
          onClick={() => navigate('/app/clients/retainer')}
          className="mt-4 text-brand-purple-strong dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          Back to Retainer Usage
        </button>
      </div>
    )
  }
  
  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Custom header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/clients/retainer')}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          aria-label="Back to retainer usage"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{client.name}</h1>
          {client.company && (
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{client.company}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => { setShowCreditModal(true); }}
          variant="secondary"
          size="sm"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Adjust Credits
        </Button>
        <Button
          onClick={() => { setShowEditClientModal(true); }}
          variant="secondary"
          size="sm"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Client
        </Button>
      </div>
      

      {/* Balance Card - Use calculated balance if available, fall back to old balance */}
      {(calculatedBalance || clientBalance) && (
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credit Balance</h2>
          {balanceLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : calculatedBalance ? (
            // Use new calculated balance
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Monthly Allocations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {((calculatedBalance.breakdown?.monthly_allocations_minutes || 0) / 60).toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Total allocated
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Manual Adjustments</p>
                <p className={`text-2xl font-bold ${(calculatedBalance.breakdown?.manual_adjustments_minutes || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(calculatedBalance.breakdown?.manual_adjustments_minutes || 0) >= 0 ? '+' : ''}{((calculatedBalance.breakdown?.manual_adjustments_minutes || 0) / 60).toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Credits added/removed
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Time Usage</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -{((calculatedBalance.breakdown?.time_usage_minutes || 0) / 60).toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Total time tracked
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Current Balance</p>
                <p className={`text-2xl font-bold ${(calculatedBalance.current_balance_hours || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(calculatedBalance.current_balance_hours || 0).toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Available hours
                </p>
              </div>
            </div>
          ) : clientBalance ? (
            // Fall back to old balance
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Monthly Allocation</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clientBalance.monthly_allocation} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Per month
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Additional Credits</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(clientBalance as any).additional_credits > 0 ? `+${(clientBalance as any).additional_credits.toFixed(2)}` : '0.00'} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Manual adjustments
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Time Usage</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -{clientBalance.month_usage.toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  This month
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">Current Balance</p>
                <p className={`text-2xl font-bold ${clientBalance.current_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {clientBalance.current_balance.toFixed(2)} hrs
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500">
                  Available hours
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('overview'); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => { setActiveTab('transactions'); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            Transactions ({clientTransactions.length})
          </button>
          <button
            onClick={() => { setActiveTab('statements'); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statements'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            Monthly Statements ({calculatedStatements.length || clientStatements.length})
          </button>
          <button
            onClick={() => { setActiveTab('thisweek'); }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'thisweek'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            This Week
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Client Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Client Information</h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Monthly Hours</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.monthly_hours} hours</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Reset Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">Day {client.reset_date} of each month</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Contract End Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">
                    {client.contract_end_date ? formatDate(client.contract_end_date) : 'No end date'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Contact Person</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.contact_person || 'Not specified'}</dd>
                </div>
                {client.company && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Company</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.company}</dd>
                  </div>
                )}
                {client.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.email}</dd>
                  </div>
                )}
                {client.address && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.address}</dd>
                  </div>
                )}
                {client.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100">{client.notes}</dd>
                  </div>
                )}
                {manager && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">Manager</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-neutral-100 flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {manager.display_name || manager.username}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Usage Statistics Section */}
            {monthlyUsage && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Month Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Time Entries</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {monthlyUsage.entry_count || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                      This month
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Hours Used</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(monthlyUsage.total_hours || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                      Of {client.monthly_hours} allocated
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Utilization</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {client.monthly_hours > 0 
                        ? ((monthlyUsage.total_hours || 0) / client.monthly_hours * 100).toFixed(0)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                      Of monthly allocation
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Days Remaining</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(() => {
                        const now = new Date()
                        const resetDate = client.reset_date
                        const nextReset = new Date(now.getFullYear(), now.getMonth(), resetDate)
                        if (nextReset <= now) {
                          nextReset.setMonth(nextReset.getMonth() + 1)
                        }
                        const daysRemaining = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        return daysRemaining
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                      Until next reset
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'transactions' && (
          <div className="p-6 space-y-6">
            {/* Recent Time Entries */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Time Entries (Last 30 Days)</h3>
              {timeEntriesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentTimeEntries.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-neutral-900 rounded-lg">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No time entries</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Time logged will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                    <thead className="bg-gray-50 dark:bg-neutral-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                      {recentTimeEntries.slice(0, 10).map((entry: any) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                            {formatUKDate(entry.start || entry.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-neutral-100">
                            <div className="truncate max-w-xs">
                              {entry.task_name || entry.description || 'No task'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                            {entry.user_name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-neutral-100">
                            {((entry.duration || 0) / 3600000).toFixed(2)} hrs
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-neutral-400">
                            <div className="truncate max-w-md">
                              {entry.description || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recentTimeEntries.length > 10 && (
                    <div className="text-center py-2 text-sm text-gray-500 dark:text-neutral-400">
                      Showing 10 of {recentTimeEntries.length} entries
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Credit Transactions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credit Adjustments</h3>
              {clientTransactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-neutral-900 rounded-lg">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No credit adjustments</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Manual credit adjustments will appear here.</p>
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                  <thead className="bg-gray-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Balance Before
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Balance After
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                    {clientTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                          {formatDateTime(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                          <div className="flex items-center">
                            {getTransactionIcon(transaction.transaction_type, transaction.amount)}
                            <span className="ml-2">{transaction.transaction_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-neutral-100">
                          {transaction.description}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getTransactionColor(transaction.amount)}`}>
                          {formatMinutesToHours(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-neutral-100">
                          {formatMinutesToHours(transaction.balance_after - transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-neutral-100">
                          {formatMinutesToHours(transaction.balance_after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        )}
        
        {activeTab === 'statements' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Statements</h3>
            
            {(calculatedStatements.length === 0 && clientStatements.length === 0) ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No statements available</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Monthly statements will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                  <thead className="bg-gray-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Opening Balance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Monthly Allocation
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Additional Credits
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Closing Balance
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Net Change
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Transactions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                    {(calculatedStatements.length > 0 ? calculatedStatements : clientStatements).map((statement) => (
                      <tr key={statement.month_date}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-neutral-100">
                          {statement.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-neutral-100">
                          {statement.opening_balance.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                          +{statement.monthly_allocation.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 dark:text-blue-400">
                          {statement.additional_credits > 0 ? '+' : ''}{statement.additional_credits.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                          -{statement.usage.toFixed(2)} hrs
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          statement.closing_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {statement.closing_balance.toFixed(2)} hrs
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          statement.net_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {statement.net_change >= 0 ? '+' : ''}{statement.net_change.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-neutral-400">
                          {statement.transaction_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'thisweek' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">This Week's Activity</h3>
            
            {weeklyTasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            ) : weeklyTasks.length === 0 ? (
              <div className="text-center py-8">
                <ListChecks className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No activity this week</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Time tracked for tasks will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Week Summary */}
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-neutral-400">Total Time This Week</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {weeklyTasks.reduce((acc: number, task) => acc + task.totalHours, 0).toFixed(2)} hours
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-neutral-400">Tasks Worked On</p>
                      <p className="text-2xl font-bold text-brand-purple-strong dark:text-purple-400">
                        {weeklyTasks.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Task List */}
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                    <thead className="bg-gray-50 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          Time Spent
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                          % of Week
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                      {weeklyTasks.map((task) => {
                        const weekTotal = weeklyTasks.reduce((acc: number, t) => acc + t.totalHours, 0)
                        const percentage = weekTotal > 0 ? (task.totalHours / weekTotal) * 100 : 0
                        
                        return (
                          <tr key={task.taskId} className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-neutral-100">
                              <div>
                                <p className="font-medium">{task.taskName}</p>
                                {task.taskId !== 'no-task' && (
                                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                                    ID: {task.taskId}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-neutral-100">
                              <span className="font-medium">{task.totalHours.toFixed(2)} hrs</span>
                              <span className="text-xs text-gray-500 dark:text-neutral-400 ml-2">
                                ({task.totalMinutes} min)
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                                  <div 
                                    className="bg-brand-purple-strong dark:bg-purple-400 h-2 rounded-full"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-gray-900 dark:text-neutral-100 w-12 text-right">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showCreditModal && client && (
        <CreditAdjustmentModal
          clientId={Number(clientId)}
          clientName={client.name}
          client={client}
          onClose={() => { setShowCreditModal(false); }}
          onSuccess={() => {
            setShowCreditModal(false)
            dispatch(fetchClientBalance(Number(clientId)))
            dispatch(fetchClientTransactions({ clientId: Number(clientId) }))
            // Refresh calculated data
            fetchCalculatedData(Number(clientId))
          }}
        />
      )}
      
      {showEditClientModal && client && (
        <ClientFormModal
          clientId={Number(clientId)}
          onClose={() => { setShowEditClientModal(false); }}
          onSuccess={() => {
            setShowEditClientModal(false)
            dispatch(fetchClient(Number(clientId)))
          }}
        />
      )}
    </div>
  )
}

export default ClientDetail