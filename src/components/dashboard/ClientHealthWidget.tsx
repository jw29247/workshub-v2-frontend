import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { clientService } from '../../services/clientService'
import { timeTrackingService } from '../../services/timeTrackingService'
import { 
  Building2, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Activity,
  DollarSign,
  AlertCircle,
  Users
} from 'lucide-react'

interface ClientMetrics {
  id: number
  name: string
  balance: number
  monthlyHours: number
  usagePercent: number
  lastActivityDays: number | null
  trend: 'up' | 'down' | 'stable'
  category: 'critical' | 'underutilized' | 'at-risk' | 'healthy'
  prevMonthUsage?: number
}

const ClientHealthWidget: React.FC = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  
  // Detect dark mode
  const isDarkMode = useMemo(() => {
    const htmlElement = document.documentElement
    return htmlElement.classList.contains('dark') || 
           (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch all clients
        const clientsData = await clientService.getClients()
        
        // Filter for active clients with monthly allocations (retainer clients)
        const retainerClients = clientsData.filter((client: any) => 
          client.is_active && client.monthly_hours > 0
        )
        
        // Get current month date range
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const startDate = startOfMonth.toISOString().split('T')[0]
        const endDate = endOfMonth.toISOString().split('T')[0]
        
        // Fetch time logs for each client and calculate usage
        const clientsWithUsage = []
        for (const client of retainerClients) {
          try {
            // Fetch time logs for this client for the current month
            const timeLogsResponse = await timeTrackingService.getTimeLogsHistory({
              clientName: client.name,
              startDate,
              endDate,
              limit: 100,
              sortBy: 'start',
              sortOrder: 'desc'
            })
            
            // Calculate total time logged for this month
            const monthlyUsage = timeLogsResponse.time_entries.reduce(
              (sum: number, entry: any) => sum + (entry.duration_hours || 0), 
              0
            )
            
            // Fetch all-time logs for total calculation
            let totalTimeLogged = monthlyUsage
            if (client.contract_start_date) {
              const contractStartDate = typeof client.contract_start_date === 'string' 
                ? client.contract_start_date 
                : client.contract_start_date.toISOString().split('T')[0]
              const allTimeResponse = await timeTrackingService.getTimeLogsHistory({
                clientName: client.name,
                startDate: contractStartDate,
                limit: 1000
              })
              totalTimeLogged = allTimeResponse.time_entries.reduce(
                (sum: number, entry: any) => sum + (entry.duration_hours || 0), 
                0
              )
            }
            
            // Use initial_hours if set, otherwise use monthly_hours as initial allocation
            const initialHours = client.initial_hours || client.monthly_hours || 0
            const currentBalance = initialHours - totalTimeLogged
            
            clientsWithUsage.push({
              ...client,
              balance: currentBalance,
              monthlyHours: client.monthly_hours,
              monthUsage: monthlyUsage,
              totalTimeLogged
            })
          } catch (err) {
            console.error(`Error fetching time logs for client ${client.name}:`, err)
            // Still add the client with zero usage if there's an error
            clientsWithUsage.push({
              ...client,
              balance: client.initial_hours || client.monthly_hours || 0,
              monthlyHours: client.monthly_hours,
              monthUsage: 0,
              totalTimeLogged: 0
            })
          }
        }
        
        setClients(clientsWithUsage)
      } catch (err) {
        console.error('Failed to load retainer data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  // Process and categorize clients
  const categorizedClients = useMemo(() => {
    const processed: ClientMetrics[] = clients
      .map(client => {
        const balanceHours = client.balance || 0
        const monthlyHours = client.monthlyHours || 0
        const monthUsage = client.monthUsage || 0
        const usagePercent = monthlyHours > 0
          ? ((monthUsage / monthlyHours) * 100) 
          : 0
        
        // Calculate days in current month to determine expected usage
        const now = new Date()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const dayOfMonth = now.getDate()
        const monthProgress = (dayOfMonth / daysInMonth) * 100
        
        // For now, we'll estimate last activity based on usage patterns
        // In production, this should come from actual time entry data
        let lastActivityDays: number | null = null
        if (monthUsage === 0) {
          // No usage this month - estimate as inactive for half the month
          lastActivityDays = Math.floor(dayOfMonth / 2)
        } else if (usagePercent < monthProgress - 20) {
          // Usage significantly behind schedule
          lastActivityDays = Math.floor((monthProgress - usagePercent) / 3)
        }
        
        // Determine trend based on usage vs month progress
        const trend: 'up' | 'down' | 'stable' = 
          usagePercent > monthProgress + 10 ? 'up' : 
          usagePercent < monthProgress - 10 ? 'down' : 'stable'
        
        // Categorize based on balance and usage patterns
        let category: 'critical' | 'underutilized' | 'at-risk' | 'healthy'
        if (balanceHours < 0) {
          category = 'critical'
        } else if (usagePercent < 25 && monthProgress > 40) {
          // Underutilized if less than 25% used and we're well into the month
          category = 'underutilized'
        } else if (balanceHours < monthlyHours * 0.2 || 
                  (usagePercent > 90 && monthProgress < 80)) {
          // At risk if low balance or burning through hours too fast
          category = 'at-risk'
        } else {
          category = 'healthy'
        }
        
        return {
          id: client.id,
          name: client.name,
          balance: balanceHours,
          monthlyHours,
          usagePercent,
          lastActivityDays,
          trend,
          category
        }
      })
    
    const critical = processed.filter(c => c.category === 'critical')
      .sort((a, b) => a.balance - b.balance)
    
    const underutilized = processed.filter(c => c.category === 'underutilized')
      .sort((a, b) => a.usagePercent - b.usagePercent)
    
    const atRisk = processed.filter(c => c.category === 'at-risk')
      .sort((a, b) => a.balance - b.balance)
    
    const healthy = processed.filter(c => c.category === 'healthy')
      .sort((a, b) => b.usagePercent - a.usagePercent)
    
    return { critical, underutilized, atRisk, healthy, total: processed.length }
  }, [clients])
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }
  
  const handleClientClick = (clientId: number) => {
    navigate(`/app/billing/clients/${clientId}`)
  }
  
  if (loading && clients.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple-strong dark:border-purple-400"></div>
        </div>
      </div>
    )
  }
  
  const ClientRow: React.FC<{ client: ClientMetrics; showLastActivity?: boolean }> = ({ client, showLastActivity = false }) => (
    <div
      onClick={() => { handleClientClick(client.id); }}
      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors group"
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {client.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {client.usagePercent.toFixed(0)}% used
            </span>
            {showLastActivity && client.lastActivityDays !== null && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                • Est. {client.lastActivityDays}d inactive
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-sm font-semibold ${
            client.balance >= 0 ? 'text-neutral-900 dark:text-white' : 'text-red-600 dark:text-red-400'
          }`}>
            {client.balance.toFixed(1)}h
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            of {client.monthlyHours}h
          </p>
        </div>
        {client.trend === 'up' && (
          <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ChevronUp className="h-3 w-3 text-green-600 dark:text-green-400" />
          </div>
        )}
        {client.trend === 'down' && (
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ChevronDown className="h-3 w-3 text-red-600 dark:text-red-400" />
          </div>
        )}
      </div>
    </div>
  )
  
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Client Retainer Overview
            </h3>
            <span className="ml-2 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {categorizedClients.total} active
            </span>
          </div>
          <button
            onClick={() => navigate('/app/billing/clients')}
            className="text-sm text-brand-purple-strong dark:text-purple-400 hover:text-brand-purple-strong/80 dark:hover:text-purple-300 font-medium"
          >
            View all →
          </button>
        </div>
      </div>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800">
        <div className="bg-white dark:bg-neutral-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {categorizedClients.critical.length}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Critical</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {categorizedClients.underutilized.length}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Underused</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {categorizedClients.atRisk.length}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">At Risk</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {categorizedClients.healthy.length}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Healthy</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {/* Critical Section - Always visible if has items */}
        {categorizedClients.critical.length > 0 && (
          <div className="px-6 py-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => { toggleSection('critical'); }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Critical - Negative Balance
                </h4>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Immediate attention required
                </span>
              </div>
              {expandedSection === 'critical' ? 
                <ChevronUp className="h-4 w-4 text-neutral-400" /> : 
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              }
            </div>
            {(expandedSection === 'critical' || categorizedClients.critical.length <= 3) && (
              <div className="space-y-1">
                {categorizedClients.critical.slice(0, expandedSection === 'critical' ? undefined : 3).map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Underutilized Section */}
        {categorizedClients.underutilized.length > 0 && (
          <div className="px-6 py-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => { toggleSection('underutilized'); }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-yellow-400"></div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Underutilized Retainers
                </h4>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  {categorizedClients.underutilized.length} clients using &lt;25%
                </span>
              </div>
              {expandedSection === 'underutilized' ? 
                <ChevronUp className="h-4 w-4 text-neutral-400" /> : 
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              }
            </div>
            {expandedSection === 'underutilized' && (
              <div className="space-y-1">
                {categorizedClients.underutilized.slice(0, 5).map(client => (
                  <ClientRow key={client.id} client={client} showLastActivity />
                ))}
                {categorizedClients.underutilized.length > 5 && (
                  <button
                    onClick={() => navigate('/app/billing/clients')}
                    className="w-full text-center py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-purple-strong dark:hover:text-purple-400"
                  >
                    +{categorizedClients.underutilized.length - 5} more underutilized clients
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* At Risk Section */}
        {categorizedClients.atRisk.length > 0 && (
          <div className="px-6 py-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => { toggleSection('at-risk'); }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400"></div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  At Risk
                </h4>
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  Low balance or high usage
                </span>
              </div>
              {expandedSection === 'at-risk' ? 
                <ChevronUp className="h-4 w-4 text-neutral-400" /> : 
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              }
            </div>
            {expandedSection === 'at-risk' && (
              <div className="space-y-1">
                {categorizedClients.atRisk.slice(0, 5).map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
                {categorizedClients.atRisk.length > 5 && (
                  <button
                    onClick={() => navigate('/app/billing/clients')}
                    className="w-full text-center py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-purple-strong dark:hover:text-purple-400"
                  >
                    +{categorizedClients.atRisk.length - 5} more at-risk clients
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Healthy Section - Collapsed by default */}
        {categorizedClients.healthy.length > 0 && (
          <div className="px-6 py-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => { toggleSection('healthy'); }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Healthy Clients
                </h4>
                <span className="text-xs text-green-600 dark:text-green-400">
                  {categorizedClients.healthy.length} on track
                </span>
              </div>
              {expandedSection === 'healthy' ? 
                <ChevronUp className="h-4 w-4 text-neutral-400" /> : 
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              }
            </div>
            {expandedSection === 'healthy' && (
              <div className="space-y-1">
                {categorizedClients.healthy.slice(0, 5).map(client => (
                  <ClientRow key={client.id} client={client} />
                ))}
                {categorizedClients.healthy.length > 5 && (
                  <button
                    onClick={() => navigate('/app/billing/clients')}
                    className="w-full text-center py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-purple-strong dark:hover:text-purple-400"
                  >
                    View all {categorizedClients.healthy.length} healthy clients
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Empty State */}
      {categorizedClients.total === 0 && (
        <div className="px-6 py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" />
          <h3 className="mt-2 text-sm font-medium text-neutral-900 dark:text-white">
            No Active Retainer Clients
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Start by adding clients with monthly retainer allocations
          </p>
          <button
            onClick={() => navigate('/app/billing/clients')}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-purple-strong dark:bg-purple-600 hover:bg-brand-purple-strong/90 dark:hover:bg-purple-700"
          >
            Manage Clients
          </button>
        </div>
      )}
    </div>
  )
}

export default ClientHealthWidget