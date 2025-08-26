import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  FileText, 
  TrendingUp, 
  Settings,
  Download,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { billingService, type ClientMonthlyDetail, type ClientStatement } from '../../services/billingService'
import { clientService, type Client } from '../../services/clientService'
import { ManualTimeEntryModal } from '../ManualTimeEntryModal'
import { SetRolloverModal } from '../SetRolloverModal'
import { ClientEditModal } from '../ClientEditModal'
import { EmailConfigModal } from '../EmailConfigModal'
import { BillingPeriodCloseModal } from '../BillingPeriodCloseModal'
import { LoadingSpinner } from '../LoadingSpinner'
import { Button } from '../Button'
import { PageHeader } from '../PageHeader'
import { toast } from 'sonner'

type TabType = 'overview' | 'statement' | 'analytics' | 'management'

// Use Client type from clientService instead of custom interface

export const ClientDetailEnhanced: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [monthlyDetail, setMonthlyDetail] = useState<ClientMonthlyDetail | null>(null)
  const [statement, setStatement] = useState<ClientStatement | null>(null)
  const [utilizationTrends, setUtilizationTrends] = useState<any[]>([])
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false)
  const [showRolloverModal, setShowRolloverModal] = useState(false)
  const [showClientEditModal, setShowClientEditModal] = useState(false)
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false)
  const [showBillingPeriodCloseModal, setShowBillingPeriodCloseModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    if (clientId) {
      fetchClientData()
    }
  }, [clientId])

  useEffect(() => {
    if (activeTab === 'statement' && !statement && client) {
      fetchStatement()
    }
    if (activeTab === 'analytics' && utilizationTrends.length === 0 && client) {
      fetchAnalytics()
    }
  }, [activeTab, client])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const id = Number(clientId)
      
      // Fetch client info and monthly detail in parallel
      const [clientData, detailData] = await Promise.all([
        clientService.getClient(id),
        billingService.getClientMonthlyDetail(id)
      ])
      
      setClient(clientData)
      setMonthlyDetail(detailData)
    } catch (error) {
      console.error('Failed to fetch client data:', error)
      toast.error('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatement = async () => {
    if (!client) return
    try {
      const data = await billingService.getClientStatement(client.id)
      setStatement(data)
    } catch (error) {
      console.error('Failed to fetch statement:', error)
      toast.error('Failed to load statement')
    }
  }

  const fetchAnalytics = async () => {
    if (!client) return
    try {
      const trends = await billingService.getUtilizationTrends(6, client.id)
      
      // Format data for charts
      const formattedTrends = trends.trends.map(trend => ({
        month: format(parseISO(trend.month + '-01'), 'MMM yyyy'),
        allocated: trend.hours_allocated,
        used: trend.hours_used,
        utilization: trend.utilization_percentage,
        projected: trend.projected_monthly_usage
      }))
      
      setUtilizationTrends(formattedTrends)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchClientData()
    if (activeTab === 'statement') await fetchStatement()
    if (activeTab === 'analytics') await fetchAnalytics()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const handleDownloadPDF = async () => {
    if (!client) return
    try {
      setDownloadingPDF(true)
      await billingService.downloadStatementPDF(client.id)
      toast.success('Statement downloaded')
    } catch (error) {
      console.error('Failed to download PDF:', error)
      toast.error('Failed to download statement')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleExportCSV = async () => {
    if (!client) return
    try {
      await billingService.exportTimeEntriesCSV(client.id)
      toast.success('CSV exported')
    } catch (error) {
      console.error('Failed to export CSV:', error)
      toast.error('Failed to export data')
    }
  }

  const handleClientUpdate = (updatedClient: Client) => {
    setClient(updatedClient)
    fetchClientData() // Refresh all data after client update
  }

  const handleEmailConfigSuccess = () => {
    toast.success('Email configuration updated')
  }

  const handleBillingPeriodCloseSuccess = () => {
    fetchClientData() // Refresh data after period close
    if (activeTab === 'statement') fetchStatement()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!client || !monthlyDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 dark:text-neutral-400">Client not found</p>
        <Button 
          variant="primary" 
          onClick={() => navigate('/app/billing')} 
          className="mt-4"
        >
          Back to Billing
        </Button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Clock },
    { id: 'statement' as TabType, label: 'Statement', icon: FileText },
    { id: 'analytics' as TabType, label: 'Analytics', icon: TrendingUp },
    { id: 'management' as TabType, label: 'Management', icon: Settings }
  ]

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title={client.name}
        description={`${client.client_type || 'Standard'} Client • ${client.monthly_hours}h monthly allocation`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/billing')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowTimeEntryModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Month Summary */}
            <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Current Billing Period
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {format(parseISO(monthlyDetail.current_month_start), 'MMM dd, yyyy')} - {' '}
                {format(parseISO(monthlyDetail.current_month_end), 'MMM dd, yyyy')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hours Used */}
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Hours Used</p>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    {monthlyDetail.total_logged_hours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {monthlyDetail.logged_hours_entries} entries
                  </p>
                </div>

                {/* Available Hours */}
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Available Hours</p>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    {monthlyDetail.total_available_hours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Including {monthlyDetail.rollover_hours.toFixed(1)}h rollover
                  </p>
                </div>

                {/* Current Balance */}
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Current Balance</p>
                  <p className={`text-2xl font-semibold ${
                    monthlyDetail.current_balance < 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {monthlyDetail.current_balance.toFixed(1)}h
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {monthlyDetail.utilization_percentage.toFixed(0)}% utilized
                  </p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                  <span>Utilization</span>
                  <span>{monthlyDetail.utilization_percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      monthlyDetail.utilization_percentage >= 90 
                        ? 'bg-red-500' 
                        : monthlyDetail.utilization_percentage >= 75 
                        ? 'bg-amber-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, monthlyDetail.utilization_percentage)}%` }}
                  />
                </div>
              </div>

              {monthlyDetail.is_over_allocation && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Client has exceeded their monthly allocation by {Math.abs(monthlyDetail.current_balance).toFixed(1)} hours
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Credits and Adjustments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
                <h4 className="text-md font-semibold text-neutral-900 dark:text-white mb-4">
                  Credits Received
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Monthly Retainer</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.retainer_credit_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Additional Credits</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.credit_applied_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Positive Reconciliation</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.reconciliation_positive_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">Total Credits</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{monthlyDetail.total_credits_received.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
                <h4 className="text-md font-semibold text-neutral-900 dark:text-white mb-4">
                  Adjustments
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Refunds</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.refund_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Negative Reconciliation</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.reconciliation_negative_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Previous Month Rollover</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {monthlyDetail.rollover_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">Total Adjustments</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {monthlyDetail.total_adjustments.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statement' && (
          <div className="space-y-6">
            <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Statement Details
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {statement ? (
                <>
                  {/* Statement Summary */}
                  <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Opening Balance</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {statement.opening_balance.toFixed(2)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Logged</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {statement.total_logged_hours.toFixed(2)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Credits</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                          +{statement.total_credits.toFixed(2)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Closing Balance</p>
                        <p className={`text-sm font-semibold ${
                          statement.closing_balance < 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-neutral-900 dark:text-white'
                        }`}>
                          {statement.closing_balance.toFixed(2)}h
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                      <thead className="bg-neutral-50 dark:bg-neutral-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-neutral-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {statement.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                              {format(parseISO(entry.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${entry.type === 'logged_time' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  entry.type === 'credit_applied' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  entry.type === 'retainer_credit' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                  entry.type === 'refund' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                                  'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'
                                }`}>
                                {entry.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                              {entry.description || entry.task_name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <span className={
                                entry.type === 'logged_time' ? 'text-red-600 dark:text-red-400' :
                                entry.type === 'credit_applied' || entry.type === 'retainer_credit' ? 'text-green-600 dark:text-green-400' :
                                'text-neutral-900 dark:text-white'
                              }>
                                {entry.type === 'logged_time' ? '-' : '+'}
                                {Math.abs(entry.duration_hours).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-neutral-900 dark:text-white">
                              {entry.running_balance?.toFixed(2)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">Loading statement...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Utilization Trend Chart */}
            <div className="bg-neutral-white dark:bg-neutral-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Utilization Trend (6 Months)
              </h3>
              {utilizationTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={utilizationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="used" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      name="Hours Used"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="allocated" 
                      stackId="2"
                      stroke="#e5e7eb" 
                      fill="#e5e7eb" 
                      name="Hours Allocated"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>

            {/* Usage Projections */}
            <div className="bg-neutral-white dark:bg-neutral-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Usage Projections
              </h3>
              {utilizationTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={utilizationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="used" 
                      stroke="#3b82f6" 
                      name="Actual Usage"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#f59e0b" 
                      name="Projected Usage"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'management' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-neutral-white dark:bg-neutral-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTimeEntryModal(true)}
                  className="justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual Time Entry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRolloverModal(true)}
                  className="justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Set Rollover Hours
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Statement PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Time Entries CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBillingPeriodCloseModal(true)}
                  className="justify-start"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Close Billing Period
                </Button>
              </div>
            </div>

            {/* Client Settings */}
            <div className="bg-neutral-white dark:bg-neutral-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Client Settings
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Monthly Allocation</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{client.monthly_hours} hours per month</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowClientEditModal(true)}
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Reset Date</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Day {client.reset_date} of each month</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowClientEditModal(true)}
                  >
                    Edit
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">Email Notifications</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Monthly statements to {client.email}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEmailConfigModal(true)}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Entry Modal */}
      <ManualTimeEntryModal
        isOpen={showTimeEntryModal}
        onClose={() => setShowTimeEntryModal(false)}
        onSuccess={() => {
          fetchClientData()
          if (activeTab === 'statement') fetchStatement()
        }}
        clientName={client.name}
      />

      {/* Rollover Modal */}
      {client && (
        <SetRolloverModal
          isOpen={showRolloverModal}
          onClose={() => setShowRolloverModal(false)}
          onSuccess={() => {
            fetchClientData()
            if (activeTab === 'statement') fetchStatement()
          }}
          clientId={client.id}
          clientName={client.name}
          resetDate={client.reset_date}
        />
      )}

      {/* Client Edit Modal */}
      {client && (
        <ClientEditModal
          client={client}
          isOpen={showClientEditModal}
          onClose={() => setShowClientEditModal(false)}
          onSuccess={handleClientUpdate}
        />
      )}

      {/* Email Config Modal */}
      {client && (
        <EmailConfigModal
          clientId={client.id}
          clientName={client.name}
          clientEmail={client.email}
          isOpen={showEmailConfigModal}
          onClose={() => setShowEmailConfigModal(false)}
          onSuccess={handleEmailConfigSuccess}
        />
      )}

      {/* Billing Period Close Modal */}
      {client && monthlyDetail && (
        <BillingPeriodCloseModal
          clientId={client.id}
          clientName={client.name}
          currentBalance={monthlyDetail.current_balance}
          currentPeriodEnd={monthlyDetail.current_month_end}
          isOpen={showBillingPeriodCloseModal}
          onClose={() => setShowBillingPeriodCloseModal(false)}
          onSuccess={handleBillingPeriodCloseSuccess}
        />
      )}
    </div>
  )
}