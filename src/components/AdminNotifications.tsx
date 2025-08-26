import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  X,
  Power,
  Info,
  HelpCircle
} from 'lucide-react'
import { notificationService, type DailyNotification, type NotificationCreate } from '../services/notificationService'
import { format, parseISO } from 'date-fns'
import { ActionButton } from './ActionButton'

interface AdminNotificationsProps {
  currentUser?: {
    role: 'team_member' | 'manager' | 'SLT'
  }
}

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<DailyNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingNotification, setEditingNotification] = useState<DailyNotification | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dateRangeMode, setDateRangeMode] = useState(false)
  const [showVariableHelp, setShowVariableHelp] = useState(false)

  // Form state with extended date range support
  const [formData, setFormData] = useState<NotificationCreate & { end_date?: string }>({
    title: '',
    message: '',
    type: 'info',
    display_date: format(new Date(), 'yyyy-MM-dd'),
    button_text: '',
    button_url: '',
    end_date: ''
  })

  // Check if user has permission
  const canManageNotifications = currentUser?.role === 'SLT'

  useEffect(() => {
    if (canManageNotifications) {
      loadNotifications()
    }
  }, [canManageNotifications])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await notificationService.getAllNotifications()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load notifications')
      setNotifications([]) // Ensure notifications is always an array
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title || !formData.message) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (dateRangeMode && formData.end_date) {
        // Create notifications for date range
        const startDate = new Date(formData.display_date)
        const endDate = new Date(formData.end_date)

        if (endDate < startDate) {
          setError('End date must be after start date')
          setSubmitting(false)
          return
        }

        const currentDate = new Date(startDate)
        const promises = []

        while (currentDate <= endDate) {
          const notificationData = {
            ...formData,
            display_date: format(currentDate, 'yyyy-MM-dd')
          }
          delete notificationData.end_date
          promises.push(notificationService.createNotification(notificationData))
          currentDate.setDate(currentDate.getDate() + 1)
        }

        await Promise.allSettled(promises)
      } else {
        // Create single notification
        const notificationData = { ...formData }
        delete notificationData.end_date
        await notificationService.createNotification(notificationData)
      }

      await loadNotifications()
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create notification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingNotification || !formData.title || !formData.message) return

    try {
      setSubmitting(true)
      setError(null)
      const updateData = { ...formData }
      delete updateData.end_date
      await notificationService.updateNotification(editingNotification.id, updateData)
      await loadNotifications()
      setEditingNotification(null)
      resetForm()
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to update notification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return

    try {
      await notificationService.deleteNotification(id)
      await loadNotifications()
    } catch {
      setError('Failed to delete notification')
    }
  }

  const handleToggleStatus = async (id: number) => {
    try {
      await notificationService.toggleNotificationStatus(id)
      await loadNotifications()
    } catch {
      setError('Failed to toggle notification status')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      display_date: format(new Date(), 'yyyy-MM-dd'),
      button_text: '',
      button_url: '',
      end_date: ''
    })
    setDateRangeMode(false)
    setShowVariableHelp(false)
  }

  const openEditModal = (notification: DailyNotification) => {
    setEditingNotification(notification)
    setDateRangeMode(false)
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      display_date: notification.display_date,
      button_text: notification.button_text || '',
      button_url: notification.button_url || '',
      end_date: ''
    })
  }

  // Process variables for preview
  const processPreviewVariables = (text: string) => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    const variables: Record<string, string> = {
      '{name}': 'John Smith',
      '{firstName}': 'John',
      '{greeting}': greeting,
      '{day}': format(new Date(), 'EEEE'),
      '{date}': format(new Date(), 'MMMM d, yyyy'),
      '{time}': format(new Date(), 'h:mm a')
    }

    let processedText = text
    Object.entries(variables).forEach(([key, value]) => {
      processedText = processedText.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
    })

    return processedText
  }

  if (!canManageNotifications) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="text-center">
            <Bell className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">
              You don't have permission to manage notifications.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Only Senior Leadership Team members can access this section.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="text-center">
            <Bell className="h-12 w-12 text-brand-purple-strong dark:text-purple-400 animate-pulse mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">Loading notifications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title="Notification Management"
        subtitle="Create and manage notifications that appear on the daily pulse check page"
      />

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Notifications will be displayed prominently on the Daily Pulse Check page for all users on their scheduled dates.
              You can create notifications for specific dates or date ranges.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-medium text-neutral-900 dark:text-white">Active Notifications</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              {notifications.length} total notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
          <ActionButton
            variant="primary"
            onClick={() => {
              setShowCreateModal(true)
              setError(null)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Notification
          </ActionButton>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">
              No notifications created yet.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Create your first notification to communicate with your team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  p-4 rounded-xl border transition-all duration-200
                  ${notification.is_active
                    ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-neutral-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${notification.type === 'info'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : notification.type === 'warning'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        }
                      `}>
                        {notification.type}
                      </span>
                      {!notification.is_active && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Display on {format(parseISO(notification.display_date), 'MMM d, yyyy')}</span>
                      </div>
                      {notification.button_text && notification.button_url && (
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-400">•</span>
                          <span>Button: "{notification.button_text}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleStatus(notification.id)}
                      className={`
                        p-2 rounded-lg transition-colors
                        ${notification.is_active
                          ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                          : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }
                      `}
                      title={notification.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { openEditModal(notification); }}
                      className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateModal || editingNotification) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-neutral-900 dark:text-white">
                {editingNotification ? 'Edit Notification' : 'Create Notification'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingNotification(null)
                  resetForm()
                  setError(null)
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Title
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowVariableHelp(!showVariableHelp); }}
                    className="text-xs text-brand-purple-strong hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                  >
                    <HelpCircle className="h-3 w-3" />
                    Variables
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => { setFormData({ ...formData, title: e.target.value }); }}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                  placeholder="e.g., {greeting}, {firstName}!"
                />
              </div>

              {showVariableHelp && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Available Variables</h4>
                  <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{greeting}'}</code> - Time-based greeting (Good morning/afternoon/evening)</div>
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{name}'}</code> - User's full name</div>
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{firstName}'}</code> - User's first name only</div>
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{day}'}</code> - Current day (e.g., Monday)</div>
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{date}'}</code> - Current date (e.g., January 15, 2025)</div>
                    <div><code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">{'{time}'}</code> - Current time (e.g., 9:30 AM)</div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-500 mt-3">
                    Example: "{'{greeting}'}, {'{firstName}'}. Today we ask you to submit your time sheets."
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => { setFormData({ ...formData, message: e.target.value }); }}
                  rows={3}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors resize-none"
                  placeholder="e.g., {greeting}, {firstName}. Today we ask you to submit your weekly reports."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => { setFormData({ ...formData, type: e.target.value as 'info' | 'warning' | 'success' }); }}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                </select>
              </div>

              {!editingNotification && (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <input
                    type="checkbox"
                    id="dateRangeMode"
                    checked={dateRangeMode}
                    onChange={(e) => { setDateRangeMode(e.target.checked); }}
                    className="h-4 w-4 text-brand-purple-strong focus:ring-brand-purple-strong/50 border-neutral-300 rounded"
                  />
                  <label htmlFor="dateRangeMode" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Create for date range
                  </label>
                </div>
              )}

              <div className={dateRangeMode ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {dateRangeMode ? 'Start Date' : 'Display Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.display_date}
                    onChange={(e) => { setFormData({ ...formData, display_date: e.target.value }); }}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                  />
                </div>

                {dateRangeMode && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => { setFormData({ ...formData, end_date: e.target.value }); }}
                      min={formData.display_date}
                      className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-4">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Optional Call-to-Action Button
                </p>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.button_text || ''}
                    onChange={(e) => { setFormData({ ...formData, button_text: e.target.value }); }}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                    placeholder="e.g., Learn More"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Button URL
                  </label>
                  <input
                    type="url"
                    value={formData.button_url || ''}
                    onChange={(e) => { setFormData({ ...formData, button_url: e.target.value }); }}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                    placeholder="https://example.com"
                  />
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Leave empty if you don't want to show a button
                  </p>
                </div>
              </div>

              {/* Live Preview */}
              {(formData.title || formData.message) && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-4">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Preview (with sample user "John Smith")
                  </p>
                  <div className={`rounded-lg border p-4 ${
                    formData.type === 'info'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : formData.type === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                    {formData.title && (
                      <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
                        {processPreviewVariables(formData.title)}
                      </h4>
                    )}
                    {formData.message && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {processPreviewVariables(formData.message)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingNotification(null)
                  resetForm()
                  setError(null)
                }}
                disabled={submitting}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={editingNotification ? handleUpdate : handleCreate}
                loading={submitting}
                disabled={submitting}
              >
                {editingNotification ? 'Update' : dateRangeMode ? 'Create Notifications' : 'Create Notification'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
