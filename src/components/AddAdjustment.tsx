import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Save, X, Plus, Building2 } from 'lucide-react'
import { timeTrackingService } from '../services/timeTrackingService'
import { LoadingInline } from './LoadingState'
import { PageHeader } from './PageHeader'
import { Button } from './Button'

interface AddAdjustmentProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const AddAdjustment: React.FC<AddAdjustmentProps> = () => {

  // Form state
  const [formData, setFormData] = useState({
    duration: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    billable: true,
    taskId: '',
    userId: '',
    clientId: ''
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoadingClients, setIsLoadingClients] = useState(true)

  // Client data (synced from ClickUp lists)
  const [clients, setClients] = useState<{ id: string | number; name: string; }[]>([])

  // Load clients on component mount (clients are now synced from ClickUp lists)
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoadingClients(true)
        const data = await timeTrackingService.getClientsAndLists()
        // Clients now include their ClickUp list IDs
        setClients(data.clients || [])
      } catch {
        // Don't show error to user if loading fails
      } finally {
        setIsLoadingClients(false)
      }
    }

    loadClients()
  }, [])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear messages when user starts typing
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      setError('Please enter a valid duration')
      return
    }

    if (!formData.description.trim()) {
      setError('Please enter a description')
      return
    }

    if (!formData.clientId) {
      setError('Please select a client/project')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Create start datetime from date and time inputs
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`)

      // Convert hours to milliseconds
      const durationInMs = Math.round(parseFloat(formData.duration) * 3600000)

      // Calculate end time
      const endDateTime = new Date(startDateTime.getTime() + durationInMs)

      await timeTrackingService.createTimeAdjustment({
        duration: durationInMs,
        description: formData.description.trim(),
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        billable: formData.billable,
        ...(formData.taskId && { taskId: formData.taskId }),
        ...(formData.userId && { userId: formData.userId }),
        ...(formData.clientId && { clientId: parseInt(formData.clientId) })
      })

      setSuccess(`Time entry added successfully: ${formData.duration}h "${formData.description}"`)

      // Reset form
      setFormData({
        duration: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        billable: true,
        taskId: '',
        userId: '',
        clientId: ''
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClear = () => {
    setFormData({
      duration: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      billable: true,
      taskId: '',
      userId: '',
      clientId: ''
    })
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Add Time Adjustment"
        subtitle="Manually add or edit time entries"
      />

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-cro-loss-strong/10 border border-cro-loss-strong/20 text-cro-loss-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); }}
              className="text-cro-loss-strong/60 hover:text-cro-loss-strong"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-brand-green-strong/10 border border-brand-green-strong/20 text-brand-green-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSuccess(null); }}
              className="text-brand-green-strong/60 hover:text-brand-green-strong"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Manual Time Entry Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Plus className="h-5 w-5 text-brand-purple-strong" />
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Add New Time Entry</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Duration (hours) *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="number"
                  id="duration"
                  step="0.1"
                  min="0"
                  max="24"
                  value={formData.duration}
                  onChange={(e) => { handleInputChange('duration', e.target.value); }}
                  className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  placeholder="e.g. 2.5"
                  required
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter time in hours (decimals allowed, e.g., 1.5 for 1 hour 30 minutes)
              </p>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => { handleInputChange('date', e.target.value); }}
                  className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => { handleInputChange('startTime', e.target.value); }}
                className="px-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
              />
            </div>

            {/* Billable */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Billing Status
              </label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable}
                  onChange={(e) => { handleInputChange('billable', e.target.checked); }}
                  className="h-4 w-4 text-brand-purple-strong focus:ring-brand-purple-strong border-neutral-300 rounded"
                />
                <label htmlFor="billable" className="text-sm text-neutral-600 dark:text-neutral-400">
                  This is billable time
                </label>
              </div>
            </div>
          </div>

          {/* Client/Project Selection (Unified from ClickUp Lists) */}
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Client / Project *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              {isLoadingClients ? (
                <div className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                  <LoadingInline icon="refresh" message="Loading clients..." size="sm" theme="neutral" showMessage={true} />
                </div>
              ) : (
                <select
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => { handleInputChange('clientId', e.target.value); }}
                  className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  required
                >
                  <option value="">Select a client/project...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Each ClickUp list represents a client/project for billing and reporting
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => { handleInputChange('description', e.target.value); }}
              className="px-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent resize-none"
              placeholder="Describe what you worked on..."
              required
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task ID */}
            <div>
              <label htmlFor="taskId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Task ID (Optional)
              </label>
              <input
                type="text"
                id="taskId"
                value={formData.taskId}
                onChange={(e) => { handleInputChange('taskId', e.target.value); }}
                className="px-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                placeholder="e.g. 123456789"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Optional: Associate with a specific task
              </p>
            </div>

            {/* User ID */}
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                User ID (Optional)
              </label>
              <input
                type="text"
                id="userId"
                value={formData.userId}
                onChange={(e) => { handleInputChange('userId', e.target.value); }}
                className="px-4 py-2 w-full border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                placeholder="Leave empty for current user"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Optional: Add time entry for another user (requires permissions)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              <Save className="h-4 w-4" />
              Add Time Entry
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleClear}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              Clear Form
            </Button>
          </div>
        </form>
      </div>

      {/* Usage Tips */}
      <div className="bg-brand-purple-strong/5 border border-brand-purple-strong/10 rounded-xl p-6">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-3">💡 Usage Tips</h3>
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          <li>• <strong>Duration:</strong> Enter time in hours with decimals (e.g., 1.5 = 1 hour 30 minutes, 0.25 = 15 minutes)</li>
          <li>• <strong>Client/Project:</strong> Select from the list - each ClickUp list represents a client for billing</li>
          <li>• <strong>Description:</strong> Be specific about what work was done for accurate time tracking</li>
          <li>• <strong>Billable:</strong> Check this for client work that should be invoiced</li>
          <li>• <strong>Task ID:</strong> Optional - link to a specific ClickUp task if relevant</li>
          <li>• <strong>User ID:</strong> Leave empty to add time for yourself, or specify another user's ID if you have permissions</li>
        </ul>
      </div>
    </div>
  )
}
