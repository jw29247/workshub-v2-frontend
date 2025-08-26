import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import { Button } from './Button'
import { Calendar, Users, Clock, AlertCircle, CheckCircle, Loader2, Info, Wifi } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { API_URL } from '../config'
import { websocketService } from '../services/websocketService'
import type { SyncProgressEvent, SyncCompletedEvent } from '../services/websocketService'

interface SyncStatus {
  time_entries?: {
    total: number
    from_clickup: number
    date_range?: {
      earliest: string | null
      latest: string | null
    }
  }
  users?: {
    total: number
  }
  ready_to_sync: boolean
}

interface SyncResult {
  success: boolean
  message: string
  time_logs?: {
    created: number
    updated: number
    deleted: number
    unchanged: number
    skipped: number
    total_from_clickup: number
    total_in_db_before: number
    total_in_db_after: number
  }
  users?: {
    created: number
    updated: number
    total: number
  }
  duration_seconds: number
  synced_at: string
  sync_summary?: {
    date_range: {
      start: string
      end: string
    }
    statistics: {
      total_from_clickup: number
      total_in_db_before: number
      total_in_db_after: number
      net_change: number
    }
    actions_taken: {
      created: number
      updated: number
      deleted: number
      unchanged: number
      skipped: number
    }
    sync_method: string
    preserve_manual_entries: boolean
  }
}

export default function TimeLogSync() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [syncUsers, setSyncUsers] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    stage: string
    message: string
    progress?: number
    current_count?: number
    total_count?: number
    rate_limit_delay?: number
    error?: string
  } | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  
  // Task sync state
  const [isTaskSyncing, setIsTaskSyncing] = useState(false)
  const [taskSyncProgress, setTaskSyncProgress] = useState<{
    current_page: number
    total_pages?: number
    tasks_fetched: number
    tasks_created: number
    tasks_updated: number
    message: string
  } | null>(null)
  const [includeClosedTasks, setIncludeClosedTasks] = useState(false)
  const [includeSubtasks, setIncludeSubtasks] = useState(true)
  const [incrementalSync, setIncrementalSync] = useState(false)
  
  // WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false)

  // Fetch current sync status
  const fetchStatus = async () => {
    setLoadingStatus(true)
    setAuthError(null)
    try {
      const token = localStorage.getItem('workshub_auth_token')
      if (!token) {
        setAuthError('No authentication token found. Please log in again.')
        setLoadingStatus(false)
        return
      }
      
      const response = await fetch(`${API_URL}/api/sync/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        setAuthError('Authentication failed. Please log in again.')
        toast.error('Authentication failed - please log in again')
      } else if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setAuthError(null)
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        toast.error(`Failed to fetch sync status: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
      toast.error('Failed to connect to server')
    } finally {
      setLoadingStatus(false)
    }
  }

  // Preview sync operation
  const previewSync = async () => {
    try {
      const token = localStorage.getItem('workshub_auth_token')
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      })

      const response = await fetch(`${API_URL}/api/sync/preview?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        toast.info(
          <div>
            <p className="font-semibold">Sync Preview</p>
            <p className="text-sm mt-1">Date range: {data.days_to_sync} days</p>
            <p className="text-sm">Team ID: {data.team_id}</p>
          </div>
        )
      }
    } catch (error) {
      console.error('Error previewing sync:', error)
    }
  }

  // Perform the sync operation
  const performSync = async () => {
    setIsSyncing(true)
    setLastSync(null)
    setSyncProgress(null) // Clear any previous progress
    setAuthError(null)
    setSyncError(null)

    try {
      const token = localStorage.getItem('workshub_auth_token')
      if (!token) {
        setAuthError('No authentication token found. Please log in again.')
        toast.error('Please log in again to perform sync')
        setIsSyncing(false)
        return
      }

      // Start sync - progress will be received via WebSocket
      const response = await fetch(`${API_URL}/api/sync/time-logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          sync_users: syncUsers
        })
      })

      if (response.status === 401) {
        setAuthError('Authentication failed. Please log in again.')
        toast.error('Authentication failed - please log in again')
        setIsSyncing(false)
        return
      }

      if (response.ok) {
        const result: SyncResult = await response.json()
        setLastSync(result)
        // Note: Success handling is now done via WebSocket events
      } else {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        const errorMessage = error.detail || 'Unknown error'
        setSyncError(`Sync failed (${response.status}): ${errorMessage}`)
        toast.error(
          <div>
            <p className="font-semibold">Sync Failed!</p>
            <p className="text-sm mt-1">Status: {response.status}</p>
            <p className="text-sm">Error: {errorMessage}</p>
          </div>
        )
        setSyncProgress(null)
        setIsSyncing(false)
      }
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network or connection error'
      setSyncError(`Connection failed: ${errorMessage}`)
      toast.error(
        <div>
          <p className="font-semibold">Connection Failed!</p>
          <p className="text-sm mt-1">{errorMessage}</p>
        </div>
      )
      setSyncProgress(null)
      setIsSyncing(false)
    }
  }

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const today = new Date()

    switch (preset) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'yesterday': {
        const yesterday = subDays(today, 1)
        setStartDate(format(yesterday, 'yyyy-MM-dd'))
        setEndDate(format(yesterday, 'yyyy-MM-dd'))
        break
      }
      case 'last7days':
        setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'last30days':
        setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'thisMonth':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
        break
      case 'lastMonth': {
        const lastMonth = subDays(startOfMonth(today), 1)
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))
        break
      }
    }
  }

  React.useEffect(() => {
    fetchStatus()
    
    // Set up WebSocket connection for real-time sync progress
    const setupWebSocket = async () => {
      try {
        const token = localStorage.getItem('workshub_auth_token')
        if (!token) {
          console.warn('No auth token found for WebSocket connection')
          return
        }

        // Get user email from token payload (assuming it's a JWT)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userEmail = payload.email
          
          if (userEmail) {
            await websocketService.connect(userEmail)
            setWsConnected(true)

            // Listen for sync progress events
            websocketService.on('sync.progress', (data: SyncProgressEvent) => {
              console.log('Sync progress:', data)
              setSyncProgress({
                stage: data.stage,
                message: data.message,
                progress: data.progress,
                current_count: data.current_count,
                total_count: data.total_count,
                rate_limit_delay: data.rate_limit_delay,
                error: data.error
              })
            })

            // Listen for sync completion events  
            websocketService.on('sync.completed', (data: SyncCompletedEvent) => {
              console.log('Sync completed:', data)
              setSyncProgress(null)
              setIsSyncing(false)
              
              if (data.success) {
                toast.success(
                  <div>
                    <p className="font-semibold">Sync Completed Successfully!</p>
                    <p className="text-sm mt-1">{data.message}</p>
                    {data.stats && (
                      <p className="text-sm">
                        {data.stats.created} created, {data.stats.updated} updated, {data.stats.deleted} deleted
                      </p>
                    )}
                  </div>
                )
                // Refresh status after successful sync
                fetchStatus()
              } else {
                setSyncError(`Sync failed: ${data.message}`)
                toast.error(
                  <div>
                    <p className="font-semibold">Sync Failed!</p>
                    <p className="text-sm mt-1">{data.message}</p>
                  </div>
                )
              }
            })
          }
        } catch (e) {
          console.warn('Failed to parse auth token for WebSocket:', e)
        }
      } catch (error) {
        console.error('Failed to setup WebSocket connection:', error)
        setWsConnected(false)
      }
    }

    setupWebSocket()

    // Cleanup WebSocket on unmount
    return () => {
      websocketService.off('sync.progress')
      websocketService.off('sync.completed')
      // Note: We don't disconnect the socket here as it might be used by other components
    }
  }, [])

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Time Log Sync"
        subtitle="Sync time entries from ClickUp to your local database"
      />

      {/* WebSocket Connection Status */}
      <div className={`mb-4 px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${
        wsConnected 
          ? 'bg-status-success-weak border-status-success text-status-success'
          : 'bg-status-warning-weak border-status-warning text-status-warning'
      }`}>
        <Wifi className="h-4 w-4" />
        <span>
          {wsConnected 
            ? 'Real-time sync updates connected' 
            : 'Real-time updates disconnected - you\'ll see basic progress only'
          }
        </span>
      </div>

      {/* Authentication Error Alert */}
      {authError && (
        <div className="bg-status-error-weak border border-status-error rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-status-error">Authentication Error</h3>
              <p className="text-sm text-status-error mt-1">{authError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Error Alert */}
      {syncError && (
        <div className="bg-status-error-weak border border-status-error rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-status-error">Sync Error</h3>
                <p className="text-sm text-status-error mt-1">{syncError}</p>
                <p className="text-xs text-status-error/80 mt-2">Check the console logs for more details</p>
              </div>
            </div>
            <button
              onClick={() => { setSyncError(null); }}
              className="text-status-error/60 hover:text-status-error text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Current Status Card */}
      <div className="bg-surface-primary rounded-lg shadow-sm border border-default p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-content-primary flex items-center gap-2">
            <Info className="h-5 w-5 text-brand-primary" />
            Current Database Status
          </h2>
          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="text-sm text-brand-primary hover:text-brand-primary/80 flex items-center gap-1"
          >
            {loadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-content-tertiary" />
                <span className="text-sm font-medium text-content-secondary">Time Entries</span>
              </div>
              <p className="text-2xl font-bold text-content-primary">
                {status.time_entries?.total || 0}
              </p>
              <p className="text-xs text-content-tertiary mt-1">
                {status.time_entries?.from_clickup || 0} from ClickUp
              </p>
            </div>

            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-content-tertiary" />
                <span className="text-sm font-medium text-content-secondary">Users</span>
              </div>
              <p className="text-2xl font-bold text-content-primary">
                {status.users?.total || 0}
              </p>
            </div>

            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-content-tertiary" />
                <span className="text-sm font-medium text-content-secondary">Date Range</span>
              </div>
              {status.time_entries?.date_range?.earliest ? (
                <div className="text-xs text-content-secondary">
                  <p>{format(new Date(status.time_entries.date_range.earliest), 'MMM d, yyyy')}</p>
                  <p>to</p>
                  <p>{status.time_entries?.date_range?.latest ?
                    format(new Date(status.time_entries.date_range.latest), 'MMM d, yyyy') :
                    'Now'}</p>
                </div>
              ) : (
                <p className="text-sm text-content-tertiary">No data</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Sync Section */}
      <div className="bg-surface-primary rounded-lg shadow-sm border border-default p-6 mb-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-primary" />
          Task Sync
        </h2>
        
        <p className="text-sm text-content-secondary mb-4">
          Sync all tasks from ClickUp workspace. Run this before syncing time logs to ensure all task references are valid.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeClosedTasks}
                onChange={(e) => { setIncludeClosedTasks(e.target.checked); }}
                disabled={isTaskSyncing}
                className="rounded border-default text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-content-secondary">Include closed tasks</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeSubtasks}
                onChange={(e) => { setIncludeSubtasks(e.target.checked); }}
                disabled={isTaskSyncing}
                className="rounded border-default text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-content-secondary">Include subtasks</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={incrementalSync}
                onChange={(e) => { setIncrementalSync(e.target.checked); }}
                disabled={isTaskSyncing}
                className="rounded border-default text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-content-secondary">Incremental sync (only recent changes)</span>
            </label>
          </div>
          
          {/* Task Sync Progress */}
          {taskSyncProgress && (
            <div className="bg-surface-secondary border border-brand-primary rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-brand-primary animate-spin flex-shrink-0" />
                <div className="flex-grow">
                  <p className="text-sm font-medium text-brand-primary">
                    Syncing Tasks - Page {taskSyncProgress.current_page}
                    {taskSyncProgress.total_pages && ` of ${taskSyncProgress.total_pages}`}
                  </p>
                  <p className="text-sm text-content-primary mt-1">{taskSyncProgress.message}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <span>Fetched: {taskSyncProgress.tasks_fetched}</span>
                    <span className="text-status-success">Created: {taskSyncProgress.tasks_created}</span>
                    <span className="text-brand-primary">Updated: {taskSyncProgress.tasks_updated}</span>
                  </div>
                  {taskSyncProgress.tasks_fetched > 0 && (
                    <div className="mt-2 bg-surface-tertiary rounded-full h-2">
                      <div 
                        className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(
                            100,
                            taskSyncProgress.total_pages 
                              ? (taskSyncProgress.current_page / taskSyncProgress.total_pages) * 100
                              : (taskSyncProgress.current_page / 10) * 100
                          )}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={async () => {
                setIsTaskSyncing(true)
                setTaskSyncProgress({
                  current_page: 0,
                  tasks_fetched: 0,
                  tasks_created: 0,
                  tasks_updated: 0,
                  message: 'Starting task sync...'
                })
                
                try {
                  const token = localStorage.getItem('workshub_auth_token')
                  
                  // Start the sync
                  const response = await fetch(`${API_URL}/api/sync/tasks`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      include_closed: includeClosedTasks,
                      include_subtasks: includeSubtasks,
                      incremental: incrementalSync
                    })
                  })
                  
                  // Poll for progress
                  const pollInterval = setInterval(async () => {
                    try {
                      const progressResponse = await fetch(`${API_URL}/api/sync/tasks/progress`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      })
                      
                      if (progressResponse.ok) {
                        const progress = await progressResponse.json()
                        setTaskSyncProgress(progress)
                        
                        // Check if sync is complete
                        if (progress.complete) {
                          clearInterval(pollInterval)
                          setIsTaskSyncing(false)
                          setTaskSyncProgress(null)
                          toast.success(`Tasks synced: ${progress.tasks_created} created, ${progress.tasks_updated} updated`)
                        }
                      }
                    } catch (error) {
                      console.error('Error polling progress:', error)
                    }
                  }, 1000) // Poll every second
                  
                  // Clean up on timeout (10 minutes max)
                  setTimeout(() => {
                    clearInterval(pollInterval)
                    setIsTaskSyncing(false)
                    setTaskSyncProgress(null)
                  }, 600000)
                  
                  if (!response.ok) {
                    clearInterval(pollInterval)
                    setIsTaskSyncing(false)
                    setTaskSyncProgress(null)
                    toast.error('Task sync failed')
                  }
                } catch (error) {
                  setIsTaskSyncing(false)
                  setTaskSyncProgress(null)
                  toast.error('Failed to sync tasks')
                }
              }}
              disabled={isTaskSyncing}
              loading={isTaskSyncing}
              variant="primary"
            >
              {isTaskSyncing ? 'Syncing...' : 'Sync All Tasks'}
            </Button>
            
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('workshub_auth_token')
                  const response = await fetch(`${API_URL}/api/sync/tasks/status`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  })
                  
                  if (response.ok) {
                    const status = await response.json()
                    toast.info(`Tasks in database: ${status.total_tasks}`)
                  }
                } catch (error) {
                  toast.error('Failed to get task status')
                }
              }}
              variant="secondary"
            >
              Check Status
            </Button>
          </div>
        </div>
      </div>

      {/* Time Log Sync Configuration */}
      <div className="bg-surface-primary rounded-lg shadow-sm border border-default p-6 mb-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">Time Log Sync Configuration</h2>

        {/* Date Presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-content-secondary mb-2">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setDatePreset('today'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => { setDatePreset('yesterday'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => { setDatePreset('last7days'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => { setDatePreset('last30days'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => { setDatePreset('thisMonth'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => { setDatePreset('lastMonth'); }}
              className="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-tertiary text-content-primary rounded-md transition-colors"
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-content-secondary mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); }}
              className="w-full px-3 py-2 border border-default rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-content-secondary mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); }}
              className="w-full px-3 py-2 border border-default rounded-md bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200"
            />
          </div>
        </div>

        {/* Options */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={syncUsers}
              onChange={(e) => { setSyncUsers(e.target.checked); }}
              className="rounded border-default text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-content-secondary">
              Sync users before time logs (recommended)
            </span>
          </label>
        </div>

        {/* Sync Progress */}
        {syncProgress && (
          <div className={`mb-6 rounded-lg p-4 border ${
            syncProgress.error 
              ? 'bg-status-error-weak border-status-error' 
              : syncProgress.rate_limit_delay 
                ? 'bg-status-warning-weak border-status-warning'
                : 'bg-surface-secondary border-brand-primary'
          }`}>
            <div className="flex items-start gap-3">
              {syncProgress.error ? (
                <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
              ) : syncProgress.rate_limit_delay ? (
                <Wifi className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="h-5 w-5 text-brand-primary animate-spin flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium capitalize ${
                    syncProgress.error 
                      ? 'text-status-error' 
                      : syncProgress.rate_limit_delay 
                        ? 'text-status-warning'
                        : 'text-brand-primary'
                  }`}>
                    {syncProgress.stage}
                    {syncProgress.rate_limit_delay && ' (Rate Limited)'}
                  </p>
                  {wsConnected && (
                    <Wifi className="h-3 w-3 text-status-success" title="Real-time updates connected" />
                  )}
                </div>
                
                <p className="text-sm text-content-primary mt-1">{syncProgress.message}</p>
                
                {/* Progress counts */}
                {(syncProgress.current_count !== undefined && syncProgress.total_count !== undefined) && (
                  <div className="flex items-center gap-4 mt-2 text-xs text-content-secondary">
                    <span>Progress: {syncProgress.current_count}/{syncProgress.total_count}</span>
                    {syncProgress.progress !== undefined && (
                      <span>{syncProgress.progress}% complete</span>
                    )}
                  </div>
                )}
                
                {/* Rate limit warning */}
                {syncProgress.rate_limit_delay && (
                  <div className="mt-2 text-xs text-status-warning">
                    <p>⚠️ ClickUp API rate limit hit - waiting {syncProgress.rate_limit_delay}s before retry</p>
                  </div>
                )}
                
                {/* Error message */}
                {syncProgress.error && (
                  <div className="mt-2 text-xs text-status-error">
                    <p>❌ {syncProgress.error}</p>
                  </div>
                )}
                
                {/* Progress bar */}
                {syncProgress.progress !== undefined && (
                  <div className="mt-3 bg-surface-tertiary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        syncProgress.error 
                          ? 'bg-status-error' 
                          : syncProgress.rate_limit_delay 
                            ? 'bg-status-warning'
                            : 'bg-brand-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, syncProgress.progress))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={previewSync}
            disabled={isSyncing || !!authError}
            variant="secondary"
          >
            Preview
          </Button>
          <Button
            onClick={performSync}
            disabled={isSyncing || !!authError}
            loading={isSyncing}
            variant="primary"
          >
            <Clock className="h-4 w-4" />
            {isSyncing ? 'Syncing...' : 'Start Sync'}
          </Button>
        </div>
      </div>

      {/* Last Sync Results */}
      {lastSync && (
        <div className="bg-surface-primary rounded-lg shadow-sm border border-default p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-status-success" />
            <h2 className="text-lg font-semibold text-content-primary">Last Sync Results</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lastSync.time_logs && (
              <div className="bg-status-success-weak rounded-lg p-4">
                <h3 className="text-sm font-medium text-content-secondary mb-2">Time Logs</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium text-status-success">{lastSync.time_logs.created}</span> created</p>
                  <p><span className="font-medium text-brand-primary">{lastSync.time_logs.updated}</span> updated</p>
                  <p><span className="font-medium text-status-error">{lastSync.time_logs.deleted}</span> deleted</p>
                  <p><span className="font-medium text-content-secondary">{lastSync.time_logs.unchanged}</span> unchanged</p>
                  {lastSync.time_logs.skipped > 0 && (
                    <p><span className="font-medium text-status-warning">{lastSync.time_logs.skipped}</span> skipped</p>
                  )}
                  <div className="pt-2 mt-2 border-t border-status-success text-xs text-content-secondary">
                    <p>ClickUp entries: {lastSync.time_logs.total_from_clickup}</p>
                    <p>Database before: {lastSync.time_logs.total_in_db_before}</p>
                    <p>Database after: {lastSync.time_logs.total_in_db_after}</p>
                    <p className="font-medium">
                      Net change: {lastSync.time_logs.total_in_db_after - lastSync.time_logs.total_in_db_before > 0 ? '+' : ''}
                      {lastSync.time_logs.total_in_db_after - lastSync.time_logs.total_in_db_before}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {lastSync.users && (
              <div className="bg-surface-secondary rounded-lg p-4">
                <h3 className="text-sm font-medium text-content-secondary mb-2">Users</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium text-brand-primary">{lastSync.users.created}</span> created</p>
                  <p><span className="font-medium text-brand-primary">{lastSync.users.updated}</span> updated</p>
                  <p className="text-xs text-content-tertiary mt-2">
                    Total processed: {lastSync.users.total}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-default">
            <p className="text-sm text-content-secondary">
              Completed at {format(new Date(lastSync.synced_at), 'MMM d, yyyy HH:mm:ss')}
              {' • '}
              Duration: {lastSync?.duration_seconds?.toFixed(2) || 0} seconds
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-surface-secondary border border-brand-primary rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-brand-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-content-primary">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Time entries are fetched from ClickUp in UTC timezone</li>
              <li>List names from ClickUp are mapped to client names in our system</li>
              <li>The sync process may take several minutes for large date ranges</li>
              <li>Rate limits: 100 requests/minute for standard plans</li>
              <li className="font-medium text-brand-primary">Manual adjustments (entries not from ClickUp) are always preserved</li>
              <li className="font-medium text-brand-primary">Only ClickUp-sourced entries within the date range will be deleted if missing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
