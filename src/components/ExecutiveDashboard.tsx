import React, { useEffect, useState } from 'react'
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Clock,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Download,
  Send
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { format } from 'date-fns'
import { billingService, type ClientHoursSummary, type ClientRevenueRisk } from '../services/billingService'
import { LoadingSpinner } from './LoadingSpinner'
import { Button } from './Button'
import { PageHeader } from './PageHeader'
import { toast } from 'sonner'

interface ExecutiveDashboardProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

interface DashboardMetrics {
  totalClients: number
  activeClients: number
  totalHoursAllocated: number
  totalHoursUsed: number
  totalHoursRemaining: number
  averageUtilization: number
  clientsAtRisk: number
  potentialOverageRevenue: number
}

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#22c55e'
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [clientSummaries, setClientSummaries] = useState<ClientHoursSummary[]>([])
  const [clientsAtRisk, setClientsAtRisk] = useState<ClientRevenueRisk[]>([])
  const [utilizationTrends, setUtilizationTrends] = useState<any[]>([])
  const [exportingData, setExportingData] = useState(false)
  const [sendingAlerts, setSendingAlerts] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [hoursData, riskData, trendsData] = await Promise.all([
        billingService.getClientHoursSummary(),
        billingService.getRevenueAtRisk(),
        billingService.getUtilizationTrends(3)
      ])

      // Process metrics
      setMetrics({
        totalClients: hoursData.total_clients,
        activeClients: hoursData.active_clients,
        totalHoursAllocated: hoursData.total_hours_allocated,
        totalHoursUsed: hoursData.total_hours_used,
        totalHoursRemaining: hoursData.total_hours_remaining,
        averageUtilization: hoursData.average_utilization,
        clientsAtRisk: riskData.total_at_risk_clients,
        potentialOverageRevenue: riskData.potential_overage_revenue
      })

      setClientSummaries(hoursData.summaries)
      setClientsAtRisk(riskData.clients_at_risk)
      
      // Format trends for chart
      const formattedTrends = hoursData.summaries.map(summary => ({
        name: summary.client_name.length > 15 
          ? summary.client_name.substring(0, 15) + '...' 
          : summary.client_name,
        allocated: summary.monthly_allocation,
        used: summary.total_hours_used,
        utilization: summary.utilization_percentage
      }))
      setUtilizationTrends(formattedTrends)

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      setExportingData(true)
      await billingService.exportTimeEntriesCSV()
      toast.success('CSV export started - check your downloads')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export data')
    } finally {
      setExportingData(false)
    }
  }

  const handleSendAlerts = async () => {
    try {
      setSendingAlerts(true)
      const result = await billingService.sendUsageThresholdAlerts(75)
      toast.success(`Sent ${result.alerts_sent} usage alerts to ${result.recipients.length} recipients`)
    } catch (error) {
      console.error('Failed to send alerts:', error)
      toast.error('Failed to send usage alerts')
    } finally {
      setSendingAlerts(false)
    }
  }

  const handleSendWeeklySummary = async () => {
    try {
      setSendingAlerts(true)
      const result = await billingService.sendWeeklySummary()
      toast.success(`Weekly summary sent to ${result.recipients.length} recipients`)
    } catch (error) {
      console.error('Failed to send summary:', error)
      toast.error('Failed to send weekly summary')
    } finally {
      setSendingAlerts(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  // Prepare pie chart data for client distribution
  const riskDistribution = [
    { name: 'Critical', value: clientsAtRisk.filter(c => c.risk_level === 'critical').length, color: RISK_COLORS.critical },
    { name: 'High', value: clientsAtRisk.filter(c => c.risk_level === 'high').length, color: RISK_COLORS.high },
    { name: 'Medium', value: clientsAtRisk.filter(c => c.risk_level === 'medium').length, color: RISK_COLORS.medium },
    { name: 'Low', value: metrics.totalClients - clientsAtRisk.length, color: RISK_COLORS.low }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Agency-wide billing and utilization metrics"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exportingData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendWeeklySummary}
              disabled={sendingAlerts}
            >
              <Send className="h-4 w-4 mr-2" />
              Weekly Summary
            </Button>
            {currentUser?.role === 'SLT' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendAlerts}
                disabled={sendingAlerts}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Send Alerts
              </Button>
            )}
          </div>
        }
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {metrics.totalClients}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.activeClients} active
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Utilization</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {metrics.averageUtilization.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {metrics.totalHoursUsed.toFixed(0)} / {metrics.totalHoursAllocated.toFixed(0)} hrs
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients at Risk</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {metrics.clientsAtRisk}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Above 75% usage
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Potential Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${metrics.potentialOverageRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                From overages
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Client Utilization
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationTrends.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="used" fill="#3b82f6" name="Hours Used" />
              <Bar dataKey="allocated" fill="#e5e7eb" name="Hours Allocated" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-Risk Clients Table */}
      {clientsAtRisk.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Clients Requiring Attention
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Projected Overage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action Required
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {clientsAtRisk.slice(0, 5).map((client) => (
                  <tr key={client.client_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {client.client_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {client.days_remaining} days remaining
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {client.current_usage_hours.toFixed(1)} / {client.monthly_allocation.toFixed(0)} hrs
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (client.current_usage_hours / client.monthly_allocation) * 100)}%`,
                            backgroundColor: RISK_COLORS[client.risk_level]
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        style={{
                          backgroundColor: `${RISK_COLORS[client.risk_level]}20`,
                          color: RISK_COLORS[client.risk_level]
                        }}
                      >
                        {client.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {client.projected_overage_hours > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          +{client.projected_overage_hours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {client.recommended_action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}