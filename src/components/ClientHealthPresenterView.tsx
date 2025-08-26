import React, { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Users,

  RefreshCw,
  Copy,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { type Client } from '../services/clientService'
import { type HealthMetric, type WeeklyReport, type HealthScoreStatus } from '../services/clientHealthService'
import { type UserManagement } from '../services/adminService'
import { type PresentationSchedule } from '../services/presentationScheduleService'
import { ActionButton } from './ActionButton'

interface ClientHealthPresenterViewProps {
  clients: Client[]
  metrics: HealthMetric[]
  weeklyReports: WeeklyReport[]
  previousWeekReports: WeeklyReport[]
  presentationSchedule: PresentationSchedule[]
  usersMap: Map<string, UserManagement>
  selectedWeek: string
  onScoreChange: (clientId: number, metricId: number, score: HealthScoreStatus) => Promise<void>
  savingCells: Set<string>
  onClose: () => void
}

export const ClientHealthPresenterView: React.FC<ClientHealthPresenterViewProps> = ({
  clients,
  metrics,
  weeklyReports,
  previousWeekReports,
  presentationSchedule,
  usersMap,
  selectedWeek,
  onScoreChange,
  savingCells,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [copiedFromLastWeek, setCopiedFromLastWeek] = useState(false)
  const [showManagerSummary, setShowManagerSummary] = useState(false)

  // Group and sort clients by manager presentation order and alphabetically
  const { sortedClients } = useMemo(() => {
    // Group clients by manager
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

    // Add presentation order to groups
    presentationSchedule.forEach(schedule => {
      const key = schedule.manager_id
      if (groups[key]) {
        groups[key].presentationOrder = schedule.presentation_order
      }
    })

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

    // Flatten the sorted groups into a single array of clients with manager info
    const flattenedClients: Array<Client & { managerName: string, managerId: string, presentationOrder?: number, isLastInGroup?: boolean, groupStartIndex?: number, groupEndIndex?: number }> = []
    let currentIdx = 0
    
    sortedGroups.forEach(([key, group]) => {
      const groupStartIndex = currentIdx
      group.clients.forEach((client, index) => {
        flattenedClients.push({
          ...client,
          managerName: group.manager,
          managerId: group.managerId,
          presentationOrder: group.presentationOrder,
          isLastInGroup: index === group.clients.length - 1,
          groupStartIndex,
          groupEndIndex: groupStartIndex + group.clients.length - 1
        })
        currentIdx++
      })
    })

    return { sortedClients: flattenedClients }
  }, [clients, usersMap, presentationSchedule])

  const currentClient = sortedClients[currentIndex]
  const currentReport = currentClient ? weeklyReports.find(r => r.client_id === currentClient.id) : null
  const previousReport = currentClient ? previousWeekReports.find(r => r.client_id === currentClient.id) : null

  const handleNext = () => {
    // Check if current client is last in their group and we should show summary
    if (currentClient?.isLastInGroup && !showManagerSummary) {
      setShowManagerSummary(true)
    } else if (showManagerSummary) {
      // Move to next client after summary
      if (currentIndex < sortedClients.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowManagerSummary(false)
        setCopiedFromLastWeek(false)
      }
    } else if (currentIndex < sortedClients.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setCopiedFromLastWeek(false)
    }
  }

  const handlePrevious = () => {
    if (showManagerSummary) {
      // Go back to the last client of the group
      setShowManagerSummary(false)
    } else if (currentIndex > 0) {
      // Check if we're moving to the last client of previous group
      const prevClient = sortedClients[currentIndex - 1]
      if (prevClient?.isLastInGroup) {
        setCurrentIndex(currentIndex - 1)
        setShowManagerSummary(true)
      } else {
        setCurrentIndex(currentIndex - 1)
      }
      setCopiedFromLastWeek(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrevious()
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex])

  const copyFromLastWeek = async () => {
    if (!currentClient || !previousReport || previousReport.scores.length === 0) return
    
    for (const prevScore of previousReport.scores) {
      const metric = metrics.find(m => m.id === prevScore.metric_id)
      // Skip metrics not applicable to this client type
      if (metric?.service_applicability === 'cro_only' && currentClient.client_type !== 'cro') continue
      if (metric?.service_applicability === 'non_cro_only' && currentClient.client_type === 'cro') continue
      
      await onScoreChange(currentClient.id, prevScore.metric_id, prevScore.score)
    }
    setCopiedFromLastWeek(true)
    
    // Reset after 2 seconds
    setTimeout(() => setCopiedFromLastWeek(false), 2000)
  }

  if (!currentClient) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl">
          <p className="text-neutral-600 dark:text-neutral-400">No clients available</p>
          <ActionButton variant="secondary" onClick={onClose} className="mt-4">
            Close
          </ActionButton>
        </div>
      </div>
    )
  }

  // Calculate overall status
  let overallStatus: HealthScoreStatus = 'green'
  if (currentReport) {
    if (currentReport.status_summary.red > 0) overallStatus = 'red'
    else if (currentReport.status_summary.amber > 0) overallStatus = 'amber'
  }

  // If showing manager summary, render the summary slide
  if (showManagerSummary && currentClient) {
    const managerClients = sortedClients.filter(c => c.managerId === currentClient.managerId)
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Summary Header */}
          <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-6 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {currentClient.presentationOrder && (
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                    currentClient.presentationOrder === 1 ? 'bg-green-500' :
                    currentClient.presentationOrder === 2 ? 'bg-blue-500' :
                    currentClient.presentationOrder === 3 ? 'bg-orange-500' :
                    'bg-neutral-500'
                  }`}>
                    {currentClient.presentationOrder}
                  </div>
                )}
                
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {currentClient.managerName} - Summary
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {managerClients.length} client{managerClients.length !== 1 ? 's' : ''} reviewed
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Summary Content */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left p-3 font-semibold text-neutral-900 dark:text-white">
                      Client
                    </th>
                    {metrics.map(metric => (
                      <th key={metric.id} className="text-center p-3 min-w-[100px]">
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {metric.display_name}
                          </p>
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-3 font-semibold text-neutral-900 dark:text-white">
                      Overall
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {managerClients.map((client, idx) => {
                    const report = weeklyReports.find(r => r.client_id === client.id)
                    let clientOverallStatus: HealthScoreStatus = 'green'
                    if (report) {
                      if (report.status_summary.red > 0) clientOverallStatus = 'red'
                      else if (report.status_summary.amber > 0) clientOverallStatus = 'amber'
                    }
                    
                    return (
                      <tr key={client.id} className={`border-b border-neutral-100 dark:border-neutral-800 ${
                        idx % 2 === 0 ? '' : 'bg-neutral-50 dark:bg-neutral-800/50'
                      }`}>
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {client.name}
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              {client.contact_person}
                            </p>
                          </div>
                        </td>
                        {metrics.map(metric => {
                          const score = report?.scores.find(s => s.metric_id === metric.id)
                          const isDisabled = 
                            (metric.service_applicability === 'cro_only' && client.client_type !== 'cro') ||
                            (metric.service_applicability === 'non_cro_only' && client.client_type === 'cro')
                          
                          return (
                            <td key={metric.id} className="p-3 text-center">
                              {isDisabled ? (
                                <span className="text-xs text-neutral-400">N/A</span>
                              ) : score ? (
                                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                                  score.score === 'green' ? 'bg-green-500' :
                                  score.score === 'amber' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}>
                                  <span className="text-white text-xs font-bold">
                                    {score.score.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700">
                                  <span className="text-neutral-400 text-xs">-</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                        <td className="p-3 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            clientOverallStatus === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                            clientOverallStatus === 'amber' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            clientOverallStatus === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                            'bg-neutral-100 dark:bg-neutral-700'
                          }`}>
                            <div className={`w-5 h-5 rounded-full ${
                              clientOverallStatus === 'green' ? 'bg-green-500' :
                              clientOverallStatus === 'amber' ? 'bg-yellow-500' :
                              clientOverallStatus === 'red' ? 'bg-red-500' :
                              'bg-neutral-300 dark:bg-neutral-600'
                            }`} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {['green', 'amber', 'red'].map(status => {
                const count = managerClients.reduce((sum, client) => {
                  const report = weeklyReports.find(r => r.client_id === client.id)
                  return sum + (report?.status_summary[status as HealthScoreStatus] || 0)
                }, 0)
                
                return (
                  <div key={status} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      status === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                      status === 'amber' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <div className={`w-8 h-8 rounded-full ${
                        status === 'green' ? 'bg-green-500' :
                        status === 'amber' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{count}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                      {status} Scores
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between">
              <ActionButton
                variant="secondary"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-5 w-5" />
                Back to Last Client
              </ActionButton>

              <ActionButton
                variant="primary"
                onClick={handleNext}
                disabled={currentIndex === sortedClients.length - 1}
              >
                Continue to Next Manager
                <ChevronRight className="h-5 w-5" />
              </ActionButton>
            </div>

            <div className="text-center mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              Manager Summary • Use arrow keys to navigate
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-8">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Manager Badge */}
              {currentClient.presentationOrder && (
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                  currentClient.presentationOrder === 1 ? 'bg-green-500' :
                  currentClient.presentationOrder === 2 ? 'bg-blue-500' :
                  currentClient.presentationOrder === 3 ? 'bg-orange-500' :
                  'bg-neutral-500'
                }`}>
                  {currentClient.presentationOrder}
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Users className="h-4 w-4" />
                  <span>{currentClient.managerName}</span>
                  <span className="text-neutral-400">•</span>
                  <span>Client {currentIndex + 1} of {sortedClients.length}</span>
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {currentClient.name}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {currentClient.contact_person}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Overall Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Overall:</span>
                <div className={`w-8 h-8 rounded-full ${
                  overallStatus === 'green' ? 'bg-green-500' :
                  overallStatus === 'amber' ? 'bg-yellow-500' :
                  overallStatus === 'red' ? 'bg-red-500' :
                  'bg-neutral-300 dark:bg-neutral-600'
                }`} />
              </div>

              {/* Copy from last week button */}
              {previousReport && previousReport.scores.length > 0 && (
                <ActionButton
                  variant="secondary"
                  onClick={copyFromLastWeek}
                  disabled={copiedFromLastWeek}
                  className="text-sm"
                >
                  {copiedFromLastWeek ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Last Week
                    </>
                  )}
                </ActionButton>
              )}

              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map(metric => {
              const score = currentReport?.scores.find(s => s.metric_id === metric.id)
              const previousScore = previousReport?.scores.find(s => s.metric_id === metric.id)
              const currentScore = score?.score
              const previousScoreValue = previousScore?.score
              const cellKey = `${currentClient.id}-${metric.id}`
              const isSaving = savingCells.has(cellKey)
              
              // Check if metric is applicable to this client type
              const isDisabled = 
                (metric.service_applicability === 'cro_only' && currentClient.client_type !== 'cro') ||
                (metric.service_applicability === 'non_cro_only' && currentClient.client_type === 'cro')

              // Determine trend
              let trend = null
              if (currentScore && previousScoreValue) {
                const scoreOrder = { 'green': 3, 'amber': 2, 'red': 1 }
                const currentValue = scoreOrder[currentScore]
                const previousValue = scoreOrder[previousScoreValue]
                if (currentValue > previousValue) trend = 'up'
                else if (currentValue < previousValue) trend = 'down'
                else trend = 'same'
              }

              return (
                <div 
                  key={metric.id} 
                  className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {metric.display_name}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {metric.description}
                      </p>
                    </div>
                    {trend && (
                      <div className="ml-3">
                        {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                        {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                        {trend === 'same' && <Minus className="h-5 w-5 text-neutral-400" />}
                      </div>
                    )}
                  </div>

                  {isSaving ? (
                    <div className="flex justify-center py-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
                    </div>
                  ) : isDisabled ? (
                    <div className="text-center py-3 text-neutral-400 dark:text-neutral-500">
                      N/A
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      {(['green', 'amber', 'red'] as HealthScoreStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => onScoreChange(currentClient.id, metric.id, status)}
                          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all hover:scale-105 relative ${
                            currentScore === status
                              ? status === 'green' ? 'bg-green-500 text-white shadow-lg' :
                                status === 'amber' ? 'bg-yellow-500 text-white shadow-lg' :
                                'bg-red-500 text-white shadow-lg'
                              : `bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-600`
                          } ${
                            // Show previous week's score as a ring
                            previousScoreValue === status && !currentScore
                              ? status === 'green' ? 'ring-2 ring-green-400 ring-offset-2' :
                                status === 'amber' ? 'ring-2 ring-yellow-400 ring-offset-2' :
                                'ring-2 ring-red-400 ring-offset-2'
                              : ''
                          }`}
                          title={`${status.charAt(0).toUpperCase() + status.slice(1)}${
                            previousScoreValue === status ? ' (same as last week)' : ''
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Previous week indicator */}
                  {previousScoreValue && !currentScore && (
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last week: {previousScoreValue}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between">
            <ActionButton
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </ActionButton>

            <div className="flex items-center gap-2">
              {sortedClients.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index)
                    setCopiedFromLastWeek(false)
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'w-8 bg-brand-primary' 
                      : 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400'
                  }`}
                />
              ))}
            </div>

            <ActionButton
              variant="secondary"
              onClick={handleNext}
              disabled={currentIndex === sortedClients.length - 1}
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </ActionButton>
          </div>

          <div className="text-center mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Use arrow keys to navigate • Press ESC to exit
          </div>
        </div>
      </div>
    </div>
  )
}