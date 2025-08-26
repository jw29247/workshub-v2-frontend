import React, { useState, useEffect, useCallback } from 'react'
import { formatUKDate } from '../utils/dateFormatting'
import { apiService } from '../services/apiService'
import { PageHeader } from './PageHeader'
import { Button } from './Button'

interface Feedback {
  id: number
  user_email: string
  user_role: string
  feedback_type: string
  message: string
  page_url: string | null
  status: string
  priority: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface AdminFeedbackProps {
  currentUser?: {
    email?: string
    role?: string
  }
}

export const AdminFeedback: React.FC<AdminFeedbackProps> = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [updatePriority, setUpdatePriority] = useState<string>('')
  const [updateNotes, setUpdateNotes] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Intelligent prioritization function
  const prioritizeFeedback = (feedbackList: Feedback[]): Feedback[] => {
    return [...feedbackList].sort((a, b) => {
      // 1. Bug reports always come first
      if (a.feedback_type === 'bug' && b.feedback_type !== 'bug') return -1
      if (a.feedback_type !== 'bug' && b.feedback_type === 'bug') return 1
      
      // 2. Within same type, prioritize by user role (SLT > manager > team_member)
      const roleOrder = { 'SLT': 3, 'manager': 2, 'team_member': 1 }
      const aRoleWeight = roleOrder[a.user_role as keyof typeof roleOrder] || 0
      const bRoleWeight = roleOrder[b.user_role as keyof typeof roleOrder] || 0
      if (aRoleWeight !== bRoleWeight) return bRoleWeight - aRoleWeight
      
      // 3. Then by priority (critical > high > medium > low)
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const aPriorityWeight = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
      const bPriorityWeight = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
      if (aPriorityWeight !== bPriorityWeight) return bPriorityWeight - aPriorityWeight
      
      // 4. Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status_filter', statusFilter)
      if (typeFilter) params.append('feedback_type', typeFilter)

      const response = await apiService.get(`/api/feedback/?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feedback')
      }
      const data = await response.json()
      const prioritizedData = prioritizeFeedback(data)
      setFeedbackList(prioritizedData)
    } catch {
      setError('Failed to load feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])


  const handleSelectFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setUpdateStatus(feedback.status)
    setUpdatePriority(feedback.priority || '')
    setUpdateNotes(feedback.admin_notes || '')
  }

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return

    setIsUpdating(true)

    try {
      const updateData: Partial<Pick<Feedback, 'status' | 'priority' | 'admin_notes'>> = {}
      if (updateStatus !== selectedFeedback.status) updateData.status = updateStatus
      if (updatePriority !== (selectedFeedback.priority || '')) updateData.priority = updatePriority || null
      if (updateNotes !== (selectedFeedback.admin_notes || '')) updateData.admin_notes = updateNotes || null

      const response = await apiService.patch(`/api/feedback/${selectedFeedback.id}/`, updateData)
      if (!response.ok) {
        throw new Error('Failed to update feedback')
      }
      const updatedFeedback = await response.json()

      // Update the feedback in the list and re-prioritize
      setFeedbackList(prev => {
        const updated = prev.map(f =>
          f.id === selectedFeedback.id ? updatedFeedback : f
        )
        return prioritizeFeedback(updated)
      })

      setSelectedFeedback(updatedFeedback)
      alert('Feedback updated successfully!')
    } catch {
      alert('Failed to update feedback. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityBadgeColor = (priority: string | null) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SLT': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'team_member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return formatUKDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading feedback...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={fetchFeedback}
            variant="danger"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="User Feedback"
        subtitle="Intelligently prioritized: Bug fixes first, then by user role (SLT → Manager → Team Member) and priority"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); }}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong"
        >
          <option value="">All Types</option>
          <option value="bug">Bug Reports</option>
          <option value="feature_request">Feature Requests</option>
        </select>

        <Button
          onClick={fetchFeedback}
          variant="primary"
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback List */}
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
          <div className="p-4 lg:p-6 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">
              Feedback Items ({feedbackList.length})
            </h2>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-700 max-h-[600px] overflow-y-auto">
            {feedbackList.length === 0 ? (
              <div className="p-4 text-center text-neutral-600 dark:text-neutral-300">
                No feedback items found
              </div>
            ) : (
              feedbackList.map((feedback) => (
                <div
                  key={feedback.id}
                  onClick={() => { handleSelectFeedback(feedback); }}
                  className={`p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                    selectedFeedback?.id === feedback.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(feedback.status)}`}>
                        {feedback.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        feedback.feedback_type === 'bug' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {feedback.feedback_type === 'bug' ? '🐛 Bug' : '✨ Feature'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(feedback.user_role)}`}>
                        {feedback.user_role}
                      </span>
                      {feedback.priority && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadgeColor(feedback.priority)}`}>
                          {feedback.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                    {feedback.message.length > 100
                      ? feedback.message.substring(0, 100) + '...'
                      : feedback.message}
                  </p>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {feedback.user_email}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(feedback.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feedback Details */}
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 shadow-sm">
          {selectedFeedback ? (
            <>
              <div className="p-4 lg:p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h2 className="text-xl font-medium text-neutral-900 dark:text-white">
                  Feedback Details
                </h2>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type & Role
                    </label>
                    <div className="flex gap-2">
                      <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                        selectedFeedback.feedback_type === 'bug'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedFeedback.feedback_type === 'bug' ? '🐛 Bug Report' : '✨ Feature Request'}
                      </span>
                      <span className={`inline-block px-3 py-1 text-sm rounded-full ${getRoleBadgeColor(selectedFeedback.user_role)}`}>
                        {selectedFeedback.user_role} User
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {selectedFeedback.message}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedFeedback.user_email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Submitted
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedFeedback.created_at)}
                      </p>
                    </div>
                  </div>

                  {selectedFeedback.page_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Page URL
                      </label>
                      <a
                        href={selectedFeedback.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {selectedFeedback.page_url}
                      </a>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Update Status
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Status
                        </label>
                        <select
                          value={updateStatus}
                          onChange={(e) => { setUpdateStatus(e.target.value); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Priority
                        </label>
                        <select
                          value={updatePriority}
                          onChange={(e) => { setUpdatePriority(e.target.value); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Admin Notes
                        </label>
                        <textarea
                          value={updateNotes}
                          onChange={(e) => { setUpdateNotes(e.target.value); }}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Add internal notes..."
                        />
                      </div>

                      <Button
                        onClick={handleUpdateFeedback}
                        disabled={isUpdating}
                        loading={isUpdating}
                        variant="success"
                        fullWidth
                      >
                        Update Feedback
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Select a feedback item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
