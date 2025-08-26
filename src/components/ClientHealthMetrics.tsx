import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { clientHealthService, type WeeklyReport, type HealthMetric, type HealthScoreStatus } from '../services/clientHealthService'
import { clientService, type Client } from '../services/clientService'
import { adminService, type UserManagement } from '../services/adminService'
import { presentationScheduleService, type PresentationSchedule } from '../services/presentationScheduleService'
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
  const [clients, setClients] = useState<Client[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [previousWeekReports, setPreviousWeekReports] = useState<WeeklyReport[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>(getMonday(new Date()).toISOString().split('T')[0] ?? '')
  const [loading, setLoading] = useState(true)
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'scorecard' | 'trends' | 'metrics' | 'schedule'>('scorecard')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [usersMap, setUsersMap] = useState<Map<string, UserManagement>>(new Map())
  const [recentlyUpdatedCells, setRecentlyUpdatedCells] = useState<Set<string>>(new Set())
  const [presentationSchedule, setPresentationSchedule] = useState<PresentationSchedule[]>([])
  const [showPresenterView, setShowPresenterView] = useState(false)

  // Get Monday of the week for a given date
  function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Generate week options (last 12 weeks)
  const weekOptions = Array.from({ length: 12 }, (_, i) => {
    const monday = new Date()
    monday.setDate(monday.getDate() - (i * 7))
    const weekStart = getMonday(monday)
    return {
      value: weekStart.toISOString().split('T')[0],
      label: weekStart.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
  })

  // Group clients by manager
  const clientsByManager = useMemo(() => {
    const groups: Record<string, { manager: string, managerId: string, clients: Client[], presentationOrder?: number }> = {}
    
    clients.forEach(client => {
      const managerId = client.manager_id
      const managerUser = managerId ? usersMap.get(managerId) : null
      const managerName = managerUser ? (managerUser.display_name || managerUser.username || 'Manager') : 'Unassigned'
      const key = managerId ?? 'unassigned'
      
      if (!groups[key]) {
        groups[key] = { 
          manager: managerName, 
          managerId: managerId ?? 'unassigned',
          clients: [] 
        }
      }
      groups[key]?.clients.push(client)
    })

    // Sort clients alphabetically within each group
    Object.values(groups).forEach(group => {
      group.clients.sort((a, b) => a.name.localeCompare(b.name))
    })

    // Debug: Log the presentation schedule

    
    // Add presentation order to groups and update manager names from schedule if available
    presentationSchedule.forEach(schedule => {
      const key = schedule.manager_id
      if (groups[key]) {
        groups[key].presentationOrder = schedule.presentation_order
        // Update manager name from schedule if it's more complete
        if (schedule.manager_name && schedule.manager_name !== 'Manager') {
          groups[key].manager = schedule.manager_name
        }
      } else {
        // Manager in schedule but no clients assigned to them yet

      }
    })

    // Group managers for presentation
    
    // Sort groups by presentation order first, then unassigned, then alphabetically by name
    const sortedGroups = Object.entries(groups)
      .sort(([keyA, a], [keyB, b]) => {
        // Unassigned always goes last
        if (keyA === 'unassigned') return 1
        if (keyB === 'unassigned') return -1
        
        // Sort by presentation order if both have one
        if (a.presentationOrder !== undefined && b.presentationOrder !== undefined) {
          return a.presentationOrder - b.presentationOrder
        }
        
        // Managers with presentation order come before those without
        if (a.presentationOrder !== undefined && b.presentationOrder === undefined) return -1
        if (a.presentationOrder === undefined && b.presentationOrder !== undefined) return 1
        
        // Otherwise sort alphabetically by manager name
        return a.manager.localeCompare(b.manager)
      })

    return sortedGroups.map(([key, group]) => ({ key, ...group }))
  }, [clients, usersMap, presentationSchedule])

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Calculate previous week
      const currentWeekDate = new Date(selectedWeek)
      const previousWeekDate = new Date(currentWeekDate)
      previousWeekDate.setDate(previousWeekDate.getDate() - 7)
      const previousWeek = previousWeekDate.toISOString().split('T')[0]
      
      const [clientsData, metricsData, reportsData, previousReportsData, scheduleData] = await Promise.all([
        clientService.getClients(true), // Get all active clients
        clientHealthService.getMetrics(true),
        clientHealthService.getAllClientsWeeklyReports(selectedWeek, true),
        clientHealthService.getAllClientsWeeklyReports(previousWeek, true),
        presentationScheduleService.getWeeklySchedule(selectedWeek).catch(() => ({ week_starting: selectedWeek, schedules: [] }))
      ])
      setClients(clientsData ?? [])
      setMetrics(metricsData ?? [])
      setWeeklyReports(reportsData ?? [])
      setPreviousWeekReports(previousReportsData ?? [])
      setPresentationSchedule(scheduleData?.schedules ?? [])
    } catch {
      setError('Failed to load data. Please try again.')
      // Set empty arrays on error to prevent TypeError
      setClients([])
      setMetrics([])
      setWeeklyReports([])
      setPreviousWeekReports([])
    } finally {
      setLoading(false)
    }
  }, [selectedWeek])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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


  const fetchMetrics = async () => {
    try {
      const metricsData = await clientHealthService.getMetrics(true)
      setMetrics(metricsData)
    } catch {
      // Ignore fetch errors
    }
  }

  // Handle real-time client health score updates from WebSocket
  useWebSocketEvent<ClientHealthScoreUpdatedEvent>('client_health.score_updated', (event) => {
    // Only update if it's for the current week
    if (event.week_starting !== selectedWeek) {
      return
    }

    // Update the weeklyReports state with the new scores
    setWeeklyReports(prevReports => {
      const updatedReports = [...prevReports]
      const reportIndex = updatedReports.findIndex(r => r.client_id === event.client_id)
      
      if (reportIndex >= 0) {
        // Update existing report
        const report = updatedReports[reportIndex]
        if (report) {
          // Update scores for this client
          event.scores.forEach(newScore => {
            const scoreIndex = report.scores.findIndex(s => s.metric_id === newScore.metric_id)
            const metric = metrics.find(m => m.id === newScore.metric_id)
            
            if (scoreIndex >= 0 && report.scores[scoreIndex]) {
              // Update existing score
              report.scores[scoreIndex] = {
                ...report.scores[scoreIndex],
                score: newScore.score as HealthScoreStatus,
                notes: newScore.notes ?? '',
                updated_at: newScore.updated_at ?? new Date().toISOString()
              }
            } else if (metric) {
              // Add new score
              report.scores.push({
                id: newScore.id,
                client_id: event.client_id,
                metric_id: newScore.metric_id,
                score: newScore.score as HealthScoreStatus,
                week_starting: newScore.week_starting,
                notes: newScore.notes ?? '',
                created_by_id: newScore.created_by_id ?? null,
                created_at: new Date().toISOString(),
                updated_at: newScore.updated_at ?? new Date().toISOString(),
                metric: metric
              })
            }
          })
          
          // Recalculate status summary
          const statusSummary = { green: 0, amber: 0, red: 0 }
          report.scores.forEach(s => {
            statusSummary[s.score]++
          })
          report.status_summary = statusSummary
        }
      } else {
        // Create a new report for this client if we have the client info
        const client = clients.find(c => c.id === event.client_id)
        if (client) {
          const newReport: WeeklyReport = {
            client_id: event.client_id,
            client_name: client.name,
            week_starting: event.week_starting,
            scores: event.scores.map(score => {
              const metric = metrics.find(m => m.id === score.metric_id)
              return {
                id: score.id,
                client_id: event.client_id,
                metric_id: score.metric_id,
                score: score.score as HealthScoreStatus,
                week_starting: score.week_starting,
                notes: score.notes ?? '',
                created_by_id: score.created_by_id ?? null,
                created_at: new Date().toISOString(),
                updated_at: score.updated_at ?? new Date().toISOString(),
                metric: metric!
              }
            }).filter(s => s.metric),
            status_summary: { green: 0, amber: 0, red: 0 }
          }
          
          // Calculate status summary
          newReport.scores.forEach(s => {
            newReport.status_summary[s.score]++
          })
          
          updatedReports.push(newReport)
        }
      }
      
      return updatedReports
    })
    
    // Show a subtle notification if the update was from another user
    if (event.updated_by !== currentUser?.email) {
      const client = clients.find(c => c.id === event.client_id)
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
  })

  // Handle real-time metric updates from WebSocket
  useWebSocketEvent<ClientHealthMetricUpdatedEvent>('client_health.metric_updated', (event) => {
    setMetrics(prevMetrics => {
      const updatedMetrics = [...prevMetrics]
      const metricIndex = updatedMetrics.findIndex(m => m.id === event.metric.id)
      
      if (metricIndex >= 0 && updatedMetrics[metricIndex]) {
        // Update existing metric
        updatedMetrics[metricIndex] = {
          ...updatedMetrics[metricIndex],
          ...event.metric,
          created_at: updatedMetrics[metricIndex].created_at,
          updated_at: updatedMetrics[metricIndex].updated_at
        }
      } else {
        // Add new metric with defaults for missing properties
        updatedMetrics.push({
          ...event.metric,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as HealthMetric)
      }
      
      // Sort by order_index
      return updatedMetrics.sort((a, b) => a.order_index - b.order_index)
    })
  })

  const handleScoreChange = async (clientId: number, metricId: number, score: HealthScoreStatus) => {
    const cellKey = `${clientId}-${metricId}`
    
    // Check if metric is disabled for this client
    const metric = metrics.find(m => m.id === metricId)
    const client = clients.find(c => c.id === clientId)
    
    if (
      (metric?.service_applicability === 'cro_only' && client?.client_type !== 'cro') ||
      (metric?.service_applicability === 'non_cro_only' && client?.client_type === 'cro')
    ) {
      return // Don't allow changes for disabled metrics
    }
    
    // Update UI immediately
    setWeeklyReports(prevReports => {
      // If no report exists for this client, create one
      const existingReport = prevReports.find(r => r.client_id === clientId)
      
      if (!existingReport) {
        // Create a new report for this client
        const client = clients.find(c => c.id === clientId)
        const metric = metrics.find(m => m.id === metricId)
        
        if (client == null || metric == null) return prevReports
        
        const newReport: WeeklyReport = {
          client_id: clientId,
          client_name: client.name,
          week_starting: selectedWeek,
          scores: [{
            id: Date.now(), // Temporary ID
            client_id: clientId,
            metric_id: metricId,
            score: score,
            week_starting: selectedWeek,
            notes: '',
            created_by_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metric: metric
          }],
          status_summary: {
            green: score === 'green' ? 1 : 0,
            amber: score === 'amber' ? 1 : 0,
            red: score === 'red' ? 1 : 0
          }
        }
        return [...prevReports, newReport]
      }
      
      return prevReports.map(report => {
        if (report.client_id === clientId) {
          const existingScoreIndex = report.scores.findIndex(s => s.metric_id === metricId)
          const updatedScores = [...report.scores]
          
          if (existingScoreIndex >= 0) {
            // Update existing score
            const existingScore = updatedScores[existingScoreIndex]
            if (existingScore) {
              updatedScores[existingScoreIndex] = {
                ...existingScore,
                score,
                notes: existingScore.notes ?? ''
              }
            }
          } else {
            // Add new score
            const metric = metrics.find(m => m.id === metricId)
            if (metric) {
              updatedScores.push({
                id: Date.now(), // Temporary ID
                client_id: clientId,
                metric_id: metricId,
                score: score,
                week_starting: selectedWeek,
                notes: '',
                created_by_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metric: metric
              })
            }
          }
          
          // Recalculate status summary
          const statusSummary = { green: 0, amber: 0, red: 0 }
          updatedScores.forEach(s => {
            statusSummary[s.score]++
          })
          
          return { ...report, scores: updatedScores, status_summary: statusSummary }
        }
        return report
      })
    })

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
      
      // Refresh the specific client's data
      const currentWeekDate = new Date(selectedWeek)
      const previousWeekDate = new Date(currentWeekDate)
      previousWeekDate.setDate(previousWeekDate.getDate() - 7)
      const previousWeek = previousWeekDate.toISOString().split('T')[0]
      
      const [reportsData, previousReportsData] = await Promise.all([
        clientHealthService.getAllClientsWeeklyReports(selectedWeek, true),
        clientHealthService.getAllClientsWeeklyReports(previousWeek, true)
      ])
      setWeeklyReports(reportsData ?? [])
      setPreviousWeekReports(previousReportsData ?? [])
    } catch (error) {
      setError('Failed to save score. Please try again.')
      // Revert on error
      await fetchData()
    } finally {
      // Remove saving indicator
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
          <ActionButton variant="secondary" onClick={fetchData} className="ml-auto">
            Retry
          </ActionButton>
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
                {weekOptions.map(option => (
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
              <ActionButton variant="secondary" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </ActionButton>
          </div>
        )}
      </div>

      {/* Conditional Content Rendering */}
      {view === 'scorecard' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Health Overview
              </h3>
              <div className="mt-4 flex items-center gap-4">
                {['green', 'amber', 'red'].map(status => {
                  const count = weeklyReports.length > 0 ? weeklyReports.reduce((sum, r) => sum + (r.status_summary[status as HealthScoreStatus] ?? 0), 0) : 0
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        status === 'green' ? 'bg-green-500' :
                        status === 'amber' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-neutral-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-900 p-4 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Clients Tracked
              </h3>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">
                {weeklyReports.filter(r => r.scores.length > 0).length} / {clients.length}
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
                {weeklyReports.filter(r => r.status_summary.red > 0).length}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Clients with red scores
              </p>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <th className="text-left p-4 font-semibold text-neutral-900 dark:text-white sticky left-0 bg-white dark:bg-neutral-900 z-30">
                      Client
                    </th>
                    {metrics.map(metric => (
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
                  {clientsByManager.map((group, groupIndex) => {
                    const isCollapsed = collapsedGroups.has(group.key)
                    
                    return (
                      <React.Fragment key={group.key}>
                        {/* Manager Group Header */}
                        <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                          <td 
                            className="p-4 sticky left-0 z-10 bg-neutral-100 dark:bg-neutral-800"
                            colSpan={metrics.length + 2}
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
                                {group.presentationOrder !== undefined && (
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                                    group.presentationOrder === 1 ? 'bg-green-500' :
                                    group.presentationOrder === 2 ? 'bg-blue-500' :
                                    group.presentationOrder === 3 ? 'bg-orange-500' :
                                    'bg-neutral-500'
                                  }`}>
                                    {group.presentationOrder}
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
                          const report = weeklyReports.find(r => r.client_id === client.id)
                          const previousReport = previousWeekReports.find(r => r.client_id === client.id)
                          
                          // Determine overall status
                          let overallStatus: HealthScoreStatus = 'green'
                          if (report) {
                            if (report.status_summary.red > 0) overallStatus = 'red'
                            else if (report.status_summary.amber > 0) overallStatus = 'amber'
                          }
                          
                          // Function to copy all scores from previous week
                          const copyFromLastWeek = async () => {
                            if (previousReport == null || previousReport.scores.length === 0) return
                            
                            // Copy all scores from previous week, filtering out disabled metrics
                            const scoresToCopy = previousReport.scores
                              .filter(prevScore => {
                                const metric = metrics.find(m => m.id === prevScore.metric_id)
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
                            
                            setSavingCells(new Set([`${client.id}-all`]))
                            
                            try {
                              await clientHealthService.createScoresBulk({
                                client_id: client.id,
                                week_starting: selectedWeek,
                                scores: scoresToCopy
                              })
                              
                              // Refresh data
                              await fetchData()
                            } catch {
                              setError('Failed to copy scores. Please try again.')
                            } finally {
                              setSavingCells(new Set())
                            }
                          }

                          const rowIndex = groupIndex * 1000 + clientIndex // Unique index for styling
                          
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
                                    {previousReport != null && previousReport.scores.length > 0 && (
                                      <button
                                        onClick={copyFromLastWeek}
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
                              {metrics.map(metric => {
                                const score = report?.scores.find(s => s.metric_id === metric.id)
                                const previousScore = previousReport?.scores.find(s => s.metric_id === metric.id)
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
                                              onClick={() => handleScoreChange(client.id, metric.id, status)}
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
                                  overallStatus === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                                  overallStatus === 'amber' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                  overallStatus === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                                  'bg-neutral-100 dark:bg-neutral-700'
                                }`}>
                                  <div className={`w-6 h-6 rounded-full ${
                                    overallStatus === 'green' ? 'bg-green-500' :
                                    overallStatus === 'amber' ? 'bg-yellow-500' :
                                    overallStatus === 'red' ? 'bg-red-500' :
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
      {showPresenterView && (
        <ClientHealthPresenterView
          clients={clients}
          metrics={metrics}
          weeklyReports={weeklyReports}
          previousWeekReports={previousWeekReports}
          presentationSchedule={presentationSchedule}
          usersMap={usersMap}
          selectedWeek={selectedWeek}
          onScoreChange={handleScoreChange}
          savingCells={savingCells}
          onClose={() => setShowPresenterView(false)}
        />
      )}
    </div>
  )
}
