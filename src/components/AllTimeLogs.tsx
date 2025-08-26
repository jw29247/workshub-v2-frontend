import React, { useState, useEffect, useCallback } from 'react'
import { LoadingCentered, LoadingInline } from './LoadingState'
import { formatUKDate, formatUKTime } from '../utils/dateFormatting'
import {
  FileText,
  Search,
  Calendar,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Briefcase,
  Edit,
  Trash2,
  Save
} from 'lucide-react'
import { timeTrackingService, type TimeLogsHistoryResponse, type TimeLogsSummaryResponse } from '../services/timeTrackingService'
import { useTimeTracking } from '../contexts/ReduxTimeTrackingProvider'
import { ConfirmationModal } from './ConfirmationModal'
import { Button } from './Button'
import { PageHeader } from './PageHeader'

type TimeLogEntry = TimeLogsHistoryResponse['time_entries'][0]

interface AllTimeLogsProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const AllTimeLogs: React.FC<AllTimeLogsProps> = ({ currentUser }) => {
  const { userSettings } = useTimeTracking()

  // State for filters - For team members, default to their own email
  const [selectedUser, setSelectedUser] = useState(
    currentUser?.role === 'team_member' && currentUser?.email ? currentUser.email : ''
  )
  const [selectedClient, setSelectedClient] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'start' | 'end' | 'duration'>('start')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // State for data
  const [logs, setLogs] = useState<TimeLogEntry[]>([])
  const [summary, setSummary] = useState<TimeLogsSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)

  // Edit/Delete state
  const [editingEntry, setEditingEntry] = useState<TimeLogEntry | null>(null)
  const [editFormData, setEditFormData] = useState({
    duration: '',
    description: '',
    billable: true
  })
  const [deletingEntry, setDeletingEntry] = useState<TimeLogEntry | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const offset = (currentPage - 1) * itemsPerPage

      // Fetch logs
      const [logsResponse, summaryResponse] = await Promise.all([
        timeTrackingService.getTimeLogsHistory({
          startDate,
          endDate,
          userId: selectedUser,
          clientName: selectedClient,
          limit: itemsPerPage,
          offset,
          sortBy,
          sortOrder
        }),
        timeTrackingService.getTimeLogsSummary({
          startDate,
          endDate,
          userId: selectedUser,
          clientName: selectedClient
        })
      ])

      setLogs(logsResponse.time_entries)
      setTotalItems(logsResponse.pagination.total)
      setSummary(summaryResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time logs')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, startDate, endDate, selectedUser, selectedClient, sortBy, sortOrder])

  // Load data on mount and when filters change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate, selectedUser, selectedClient, sortBy, sortOrder])

  const handleSearch = () => {
    // For now, search is handled by reloading with filters
    loadData()
  }

  const handleClearFilters = () => {
    // For team members, keep their user filter but clear the rest
    if (currentUser?.role === 'team_member' && currentUser?.email) {
      setSelectedUser(currentUser.email)
    } else {
      setSelectedUser('')
    }
    setSelectedClient('')
    setStartDate('')
    setEndDate('')
    setSortBy('start')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const handleSort = (field: 'start' | 'end' | 'duration') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleEditStart = (entry: TimeLogEntry) => {
    setEditingEntry(entry)
    setEditFormData({
      duration: entry.duration_hours.toString(),
      description: entry.description || '',
      billable: entry.billable
    })
  }

  const handleEditCancel = () => {
    setEditingEntry(null)
    setEditFormData({
      duration: '',
      description: '',
      billable: true
    })
  }

  const handleEditSave = async () => {
    if (!editingEntry) return

    try {
      setActionLoading(editingEntry.id)

      // Convert hours to milliseconds
      const durationInMs = Math.round(parseFloat(editFormData.duration) * 3600000)

      await timeTrackingService.updateTimeAdjustment(editingEntry.id, {
        duration: durationInMs,
        description: editFormData.description,
        billable: editFormData.billable
      })

      // Refresh data
      await loadData()
      handleEditCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time entry')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteStart = (entry: TimeLogEntry) => {
    setDeletingEntry(entry)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return

    try {
      setActionLoading(deletingEntry.id)

      await timeTrackingService.deleteTimeAdjustment(deletingEntry.id)

      // Refresh data
      await loadData()
      setDeletingEntry(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time entry')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingEntry(null)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Get unique users for filter dropdown
  const visibleUsers = userSettings.filter(s => s.show_in_dashboard)

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="All Time Logs"
        subtitle="Browse and search through all your time entries"
      />

      {/* Error Display */}
      {error && (
        <div className="bg-cro-loss-strong/10 border border-cro-loss-strong/20 text-cro-loss-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => { setError(null); }} className="text-cro-loss-strong/60 hover:text-cro-loss-strong">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-brand-purple-strong" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Hours</span>
            </div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {summary?.summary?.total_duration_hours?.toFixed(1) || 0}h
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-brand-purple-strong" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Entries</span>
            </div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {summary?.summary?.total_entries?.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-brand-purple-strong" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Unique Users</span>
            </div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {summary?.summary?.unique_users || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-brand-purple-strong" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Billable</span>
            </div>
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {summary?.summary?.billable_percentage?.toFixed(0) || 0}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Date Range */}
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); }}
                  className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  placeholder="Start date"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); }}
                  className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* User Filter - Disabled for team members */}
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); }}
              disabled={currentUser?.role === 'team_member'}
              className={`px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent ${
                currentUser?.role === 'team_member' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {currentUser?.role === 'team_member' ? (
                <option value={selectedUser}>
                  {visibleUsers.find(u => u.user_email === selectedUser)?.display_name || selectedUser || 'My Logs'}
                </option>
              ) : (
                <>
                  <option value="">All Users</option>
                  {visibleUsers.map((user) => (
                    <option key={user.user_email} value={user.user_email}>
                      {user.display_name || user.user_email}
                    </option>
                  ))}
                </>
              )}
            </select>

            {/* Client Filter */}
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by client..."
                value={selectedClient}
                onChange={(e) => { setSelectedClient(e.target.value); }}
                className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={loading}
              loading={loading}
              variant="primary"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              {loading ? (
                <LoadingInline
                  icon="refresh"
                  message="Refresh"
                  size="sm"
                  theme="neutral"
                  showMessage={true}
                />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Time Entries</h3>
        </div>

        {loading ? (
          <LoadingCentered
            message="Loading time logs..."
            size="lg"
            theme="neutral"
            className="p-8"
          />
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-500">No time logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => { handleSort('start'); }}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === 'start' && (
                          <span className="text-brand-purple-strong">
                            {sortOrder === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Client</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => { handleSort('duration'); }}
                    >
                      <div className="flex items-center gap-1">
                        Duration
                        {sortBy === 'duration' && (
                          <span className="text-brand-purple-strong">
                            {sortOrder === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                        {log.start_time ? formatUKDate(log.start_time) : '-'}
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {log.start_time ? formatUKTime(log.start_time) : ''}
                          {log.end_time && log.start_time && ' - '}
                          {log.end_time ? formatUKTime(log.end_time) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-purple-strong/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-brand-purple-strong">
                              {log.user_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                              {log.user_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {log.user_email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-900 dark:text-white">
                          {log.task_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                        {log.client_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                        {editingEntry?.id === log.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={editFormData.duration}
                                onChange={(e) => { setEditFormData(prev => ({ ...prev, duration: e.target.value })); }}
                                className="w-20 px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 focus:ring-1 focus:ring-brand-purple-strong"
                              />
                              <span className="text-xs">h</span>
                            </div>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={editFormData.billable}
                                onChange={(e) => { setEditFormData(prev => ({ ...prev, billable: e.target.checked })); }}
                                className="text-brand-purple-strong focus:ring-brand-purple-strong"
                              />
                              Billable
                            </label>
                          </div>
                        ) : (
                          <>
                            {log.duration_hours.toFixed(2)}h
                            {log.billable && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-brand-green-strong/10 text-brand-green-strong">
                                Billable
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingEntry?.id === log.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleEditSave}
                              disabled={actionLoading === log.id}
                              className="p-1 text-brand-green-strong hover:bg-brand-green-strong/10 rounded disabled:opacity-50"
                            >
                              {actionLoading === log.id ? (
                                <LoadingInline icon="default" message="" size="sm" theme="primary" showMessage={false} />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={handleEditCancel}
                              disabled={actionLoading === log.id}
                              className="p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { handleEditStart(log); }}
                              disabled={actionLoading === log.id || editingEntry !== null}
                              className="p-1 text-brand-purple-strong hover:bg-brand-purple-strong/10 rounded disabled:opacity-50"
                              title="Edit time entry"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { handleDeleteStart(log); }}
                              disabled={actionLoading === log.id || editingEntry !== null}
                              className="p-1 text-cro-loss-strong hover:bg-cro-loss-strong/10 rounded disabled:opacity-50"
                              title="Delete time entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCurrentPage(currentPage - 1); }}
                      disabled={currentPage === 1}
                      className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-neutral-900 dark:text-white">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => { setCurrentPage(currentPage + 1); }}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <ConfirmationModal
          isOpen={!!deletingEntry}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          title="Delete Time Entry"
          message={`Are you sure you want to delete this time entry? This action cannot be undone.

Duration: ${deletingEntry.duration_hours.toFixed(2)}h
Task: ${deletingEntry.task_name || 'No task'}
Client: ${deletingEntry.client_name || 'No client'}
Date: ${deletingEntry.start_time ? formatUKDate(deletingEntry.start_time) : 'Unknown'}`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
                  />
      )}
    </div>
  )
}
