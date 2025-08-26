import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  AlertCircle,
  BarChart3,
  LineChart,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  Presentation
} from 'lucide-react'
import { clientHealthService, type HealthScoreStatus } from '../services/clientHealthService'
import { dashboardService, type ClientHealthDashboardData } from '../services/dashboardService'

import { ActionButton } from './ActionButton'
import { ClientHealthTrends } from './ClientHealthTrends'
import { ClientHealthMetricManager } from './ClientHealthMetricManager'
import { PresentationScheduleManager } from './PresentationScheduleManager'
import { ClientHealthPresenterView } from './ClientHealthPresenterView'
import { PageHeader } from './PageHeader'
import { LoadingSpinner } from './LoadingSpinner'
import { useWebSocketEvent, type ClientHealthScoreUpdatedEvent, type ClientHealthMetricUpdatedEvent } from '../services/websocketService'
import { toast } from 'sonner'

interface ClientHealthMetricsProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const ClientHealthMetrics: React.FC<ClientHealthMetricsProps> = ({ currentUser }) => {
  const [dashboardData, setDashboardData] = useState<ClientHealthDashboardData | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'scorecard' | 'trends' | 'metrics' | 'schedule'>('scorecard')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [recentlyUpdatedCells, setRecentlyUpdatedCells] = useState<Set<string>>(new Set())
  const [showPresenterView, setShowPresenterView] = useState(false)

  // Initialize with current Monday
  useEffect(() => {
    const getMonday = (date: Date): string => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      return monday.toISOString().split('T')[0] ?? ''
    }

    setSelectedWeek(getMonday(new Date()))
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedWeek) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getClientHealthData(selectedWeek)
      setDashboardData(data)
    } catch {
      setError('Failed to load data. Please try again.')
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedWeek])

  useEffect(() => {
    if (selectedWeek) {
      void fetchData()
    }
  }, [fetchData])

  const fetchMetrics = async () => {
    try {
      await clientHealthService.getMetrics(true)
      // Refresh the entire dashboard to get updated metrics
      await fetchData()
    } catch {
      // Ignore fetch errors
    }
  }

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Handle real-time client health score updates from WebSocket
  useWebSocketEvent<ClientHealthScoreUpdatedEvent>('client_health.score_updated', (event) => {
    // Only update if it's for the current week
    if (event.week_starting !== selectedWeek) {
      return
    }

    // Show notification if update from another user
    if (event.updated_by !== currentUser?.email) {
      const client = dashboardData?.clients_by_manager
        .flatMap(group => group.clients)
        .find(c => c.id === event.client_id)
      
      if (client) {
        toast.info(`${client.name} scores updated by ${event.updated_by}`, {
          duration: 3000,
          position: 'bottom-right'
        })
      }
      
      // Add animation effect to updated cells
      event.scores.forEach(score => {
        const cellKey = `${event.client_id}-${score.metric_id}`
        setRecentlyUpdatedCells(prev => new Set(prev).add(cellKey))
        
        // Remove the animation after 2 seconds
        setTimeout(() => {
          setRecentlyUpdatedCells(prev => {
            const newSet = new Set(prev)
            newSet.delete(cellKey)
            return newSet
          })
        }, 2000)
      })
    }

    // Refresh data to get updated scores
    void fetchData()
  })

  // Handle real-time metric updates from WebSocket
  useWebSocketEvent<ClientHealthMetricUpdatedEvent>('client_health.metric_updated', () => {
    // Refresh data to get updated metrics
    void fetchData()
  })

  const handleScoreChange = async (clientId: number, metricId: number, score: HealthScoreStatus) => {
    const cellKey = `${clientId}-${metricId}`
    
    if (!dashboardData) return
    
    // Check if metric is disabled for this client
    const metric = dashboardData.metrics.find(m => m.id === metricId)
    const client = dashboardData.clients_by_manager
      .flatMap(group => group.clients)
      .find(c => c.id === clientId)
    
    if (
      (metric?.service_applicability === 'cro_only' && client?.client_type !== 'cro') ||
      (metric?.service_applicability === 'non_cro_only' && client?.client_type === 'cro')
    ) {
      return // Don't allow changes for disabled metrics
    }
    
    // Mark cell as saving
    setSavingCells(prev => new Set(prev).add(cellKey))

    try {
      // Save to backend
      await clientHealthService.createScoresBulk({
        client_id: clientId,
        week_starting: selectedWeek,
        scores: [{
          metric_id: metricId,
          score: score,
          notes: ''
        }]
      })

      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Refresh data from backend
      await fetchData()
    } catch (error) {
      setError('Failed to save score. Please try again.')
    } finally {
      // Remove saving indicator
      setSavingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
    }
  }

  const copyFromLastWeek = async (clientId: number) => {
    if (!dashboardData) return
    
    const client = dashboardData.clients_by_manager
      .flatMap(group => group.clients)
      .find(c => c.id === clientId)
    
    if (!client?.has_previous_scores) return
    
    const cellKey = `${clientId}-all`
    setSavingCells(prev => new Set(prev).add(cellKey))
    
    try {
      const previousReport = client.previous_report
      if (!previousReport) return
      
      // Copy all scores from previous week, filtering out disabled metrics
      const scoresToCopy = previousReport.scores
        .filter(prevScore => {
          const metric = dashboardData.metrics.find(m => m.id === prevScore.metric_id)
          // Skip metrics not applicable to this client type
          if (metric?.service_applicability === 'cro_only' && client.client_type !== 'cro') return false
          if (metric?.service_applicability === 'non_cro_only' && client.client_type === 'cro') return false
          return true
        })
        .map(prevScore => ({
          metric_id: prevScore.metric_id,
          score: prevScore.score,
          notes: ''
        }))
      
      await clientHealthService.createScoresBulk({
        client_id: clientId,
        week_starting: selectedWeek,
        scores: scoresToCopy
      })
      
      // Refresh data
      await fetchData()
    } catch {
      setError('Failed to copy scores. Please try again.')
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <LoadingSpinner message="Loading health metrics..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <ActionButton variant="secondary" onClick={() => void fetchData()} className="ml-auto">
            Retry
          </ActionButton>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-neutral-300">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Client Health Metrics"
        subtitle="Track and monitor client satisfaction across key metrics"
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => { setView('scorecard'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'scorecard'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Scorecard
            </button>
            <button
              onClick={() => { setView('trends'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'trends'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <LineChart className="h-4 w-4" />
              Trends
            </button>
            <button
              onClick={() => { setView('metrics'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'metrics'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Settings className="h-4 w-4" />
              Metrics
            </button>
            <button
              onClick={() => { setView('schedule'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'schedule'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </button>
          </div>
        </div>
        {view === 'scorecard' && (
          <div className="flex items-center gap-4">
            <select
              value={selectedWeek}
              onChange={(e) => { setSelectedWeek(e.target.value); }}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              {dashboardData.week_options.map(option => (
                <option key={option.value} value={option.value}>
                  Week of {option.label}
                </option>
              ))}
            </select>
            <ActionButton 
              variant="primary" 
              onClick={() => setShowPresenterView(true)}
            >
              <Presentation className="h-4 w-4" />
              Presenter View
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => void fetchData()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </ActionButton>
          </div>
        )}
      </div>

      {/* Conditional Content Rendering */}
      {view === 'scorecard' ? (
        <>
          {/* Summary Cards - Now using backend-calculated data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Health Overview
              </h3>
              <div className="mt-4 flex items-center gap-4">
                {['green', 'amber', 'red'].map(status => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'green' ? 'bg-green-500' :
                      status === 'amber' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {dashboardData.health_overview[status as keyof typeof dashboardData.health_overview]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Clients Tracked
              </h3>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">
                {dashboardData.tracking_stats.clients_with_scores} / {dashboardData.tracking_stats.total_clients}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                With health scores
              </p>
            </div>

            <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                At Risk
              </h3>
              <p className="text-3xl font-bold text-cro-loss-strong dark:text-red-400 mt-2">
                {dashboardData.at_risk_count}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Clients with red scores
              </p>
            </div>
          </div>

          {/* Metrics Table - Now using backend-grouped data */}
          <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white sticky left-0 bg-white dark:bg-neutral-900 z-30">
                      Client
                    </th>
                    {dashboardData.metrics.map(metric => (
                      <th key={metric.id} className="text-center p-4 min-w-[120px] bg-white dark:bg-neutral-900">
                        <div>
                          <p className="font-semibold text-sm text-neutral-900 dark:text-white">
                            {metric.display_name}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-normal">
                            {metric.description}
                          </p>
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-4 font-semibold text-neutral-900 dark:text-white bg-white dark:bg-neutral-900">
                      Overall
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.clients_by_manager.map((group, groupIndex) => {
                    const isCollapsed = collapsedGroups.has(group.key)
                    
                    return (
                      <React.Fragment key={group.key}>
                        {/* Manager Group Header */}
                        <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                          <td 
                            className="p-4 sticky left-0 z-10 bg-neutral-100 dark:bg-neutral-800"
                            colSpan={dashboardData.metrics.length + 2}
                          >
                            <button
                              onClick={() => { toggleGroupCollapse(group.key); }}
                              className="flex items-center gap-3 w-full text-left hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg p-2 transition-colors"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                  )}
                                </div>
                                
                                {/* Presentation Order Badge */}
                                {group.presentation_order !== null && (
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                                    group.presentation_order === 1 ? 'bg-green-500' :
                                    group.presentation_order === 2 ? 'bg-blue-500' :
                                    group.presentation_order === 3 ? 'bg-orange-500' :
                                    'bg-neutral-500'
                                  }`}>
                                    {group.presentation_order}
                                  </div>
                                )}
                                
                                <Users className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                
                                <div className="flex-1">
                                  <span className="font-semibold text-lg text-neutral-900 dark:text-white">
                                    {group.manager}
                                  </span>
                                  <span className="ml-3 text-sm text-neutral-600 dark:text-neutral-400">
                                    ({group.clients.length} client{group.clients.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                            </button>
                          </td>
                        </tr>

                        {/* Group Clients */}
                        {!isCollapsed && group.clients.map((client, clientIndex) => {
                          const rowIndex = groupIndex * 1000 + clientIndex
                          
                          return (
                            <tr key={client.id} className={`border-b border-neutral-100 dark:border-neutral-800 ${
                              rowIndex % 2 === 0 ? '' : 'bg-neutral-50 dark:bg-neutral-800/50'
                            }`}>
                              <td className={`p-4 sticky left-0 z-10 ${
                                rowIndex % 2 === 0 ? 'bg-neutral-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'
                              }`}>
                                <div className="pl-8">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-neutral-900 dark:text-white">
                                        {client.name}
                                      </p>
                                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {client.contact_person}
                                      </p>
                                    </div>
                                    {client.has_previous_scores && (
                                      <button
                                        onClick={() => void copyFromLastWeek(client.id)}
                                        disabled={savingCells.has(`${client.id}-all`)}
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        title="Copy all scores from previous week"
                                      >
                                        {savingCells.has(`${client.id}-all`) ? (
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                        ) : (
                                          'Copy last week'
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {dashboardData.metrics.map(metric => {
                                const score = client.report?.scores.find(s => s.metric_id === metric.id)
                                const previousScore = client.previous_report?.scores.find(s => s.metric_id === metric.id)
                                const currentScore = score?.score
                                const previousScoreValue = previousScore?.score
                                const cellKey = `${client.id}-${metric.id}`
                                const isSaving = savingCells.has(cellKey)
                                const isRecentlyUpdated = recentlyUpdatedCells.has(cellKey)
                                // Check if metric is applicable to this client type
                                const isDisabled = 
                                  (metric.service_applicability === 'cro_only' && client.client_type !== 'cro') ||
                                  (metric.service_applicability === 'non_cro_only' && client.client_type === 'cro')

                                return (
                                  <td key={metric.id} className={`p-4 text-center ${isRecentlyUpdated ? 'animate-pulse bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <div className="flex items-center justify-center gap-1">
                                      {isSaving ? (
                                        <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                                      ) : isDisabled ? (
                                        <span className="text-xs text-neutral-400 dark:text-neutral-500">N/A</span>
                                      ) : (
                                        <div className="flex gap-1">
                                          {(['green', 'amber', 'red'] as HealthScoreStatus[]).map(status => (
                                            <button
                                              key={status}
                                              onClick={() => void handleScoreChange(client.id, metric.id, status)}
                                              className={`w-8 h-8 rounded-md text-xs font-bold transition-all hover:scale-110 relative ${
                                                currentScore === status
                                                  ? status === 'green' ? 'bg-green-500 text-white shadow-md' :
                                                    status === 'amber' ? 'bg-yellow-500 text-white shadow-md' :
                                                    'bg-red-500 text-white shadow-md'
                                                  : `bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-600`
                                              } ${
                                                // Color-coded glow for previous week's score
                                                previousScoreValue === status && !currentScore
                                                  ? status === 'green' ? 'ring-2 ring-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
                                                    status === 'amber' ? 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' :
                                                    'ring-2 ring-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                                                  : ''
                                              }`}
                                              title={`${status.charAt(0).toUpperCase() + status.slice(1)}${
                                                previousScoreValue === status ? ' (same as last week)' : ''
                                              }`}
                                            >
                                              {status.charAt(0).toUpperCase()}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="p-4 text-center">
                                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                                  client.overall_status === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                                  client.overall_status === 'amber' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                  client.overall_status === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                                  'bg-neutral-100 dark:bg-neutral-700'
                                }`}>
                                  <div className={`w-6 h-6 rounded-full ${
                                    client.overall_status === 'green' ? 'bg-green-500' :
                                    client.overall_status === 'amber' ? 'bg-yellow-500' :
                                    client.overall_status === 'red' ? 'bg-red-500' :
                                    'bg-neutral-300 dark:bg-neutral-600'
                                  }`} />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : view === 'trends' ? (
        <ClientHealthTrends {...(currentUser && { currentUser })} />
      ) : view === 'metrics' ? (
        <ClientHealthMetricManager onMetricsUpdated={fetchMetrics} />
      ) : view === 'schedule' ? (
        <PresentationScheduleManager weekStarting={selectedWeek} />
      ) : null}

      {/* Presenter View Modal */}
      {showPresenterView && dashboardData && (
        <ClientHealthPresenterView
          clients={dashboardData.clients_by_manager.flatMap(g => g.clients).map((client): Client => ({
            id: client.id,
            name: client.name,
            email: '', // Dashboard client doesn't have email
            timezone: 'Europe/London', // Default timezone
            currency: 'GBP', // Default currency
            is_active: client.is_active,
            notes: '',
            monthly_hours: 0, // Default value
            reset_date: 1, // Default reset date
            client_type: client.client_type as 'project' | 'cro' | 'retainer',
            manager_id: client.manager_id || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))}
          metrics={dashboardData.metrics.map((metric): HealthMetric => ({
            id: metric.id,
            name: metric.display_name,
            description: metric.description,
            order_index: metric.order_index,
            service_applicability: metric.service_applicability,
            is_active: metric.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))}
          weeklyReports={dashboardData.weekly_reports.map((report): WeeklyReport => ({
            client_id: report.client_id,
            client_name: report.client_name,
            week_starting: report.week_starting,
            scores: report.scores.map(score => ({
              id: score.id,
              client_id: score.client_id,
              metric_id: score.metric_id,
              score: score.score as HealthScoreStatus,
              week_starting: score.week_starting,
              notes: score.notes,
              created_by_id: score.created_by_id || undefined,
              created_at: score.created_at,
              updated_at: score.updated_at
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))}
          previousWeekReports={dashboardData.previous_week_reports.map((report): WeeklyReport => ({
            client_id: report.client_id,
            client_name: report.client_name,
            week_starting: report.week_starting,
            scores: report.scores.map(score => ({
              id: score.id,
              client_id: score.client_id,
              metric_id: score.metric_id,
              score: score.score as HealthScoreStatus,
              week_starting: score.week_starting,
              notes: score.notes,
              created_by_id: score.created_by_id || undefined,
              created_at: score.created_at,
              updated_at: score.updated_at
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))}
          presentationSchedule={dashboardData.clients_by_manager
            .filter(g => g.presentation_order !== null)
            .map((g): PresentationSchedule => ({
              id: 0, // Dashboard data doesn't have IDs
              manager_id: g.manager_id,
              manager_name: g.manager,
              presentation_order: g.presentation_order || 0,
              week_starting: selectedWeek,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by_id: null
            }))}
          usersMap={new Map()} // Legacy prop, not used with new data structure
          selectedWeek={selectedWeek}
          onScoreChange={handleScoreChange}
          savingCells={savingCells}
          onClose={() => setShowPresenterView(false)}
        />
      )}
    </div>
  )
}