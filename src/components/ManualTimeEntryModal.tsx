import React, { useState, useEffect } from 'react'
import { X, Clock, Plus, Minus, DollarSign } from 'lucide-react'
import { timeEntryService, type TimeEntryType, type ManualTimeEntry } from '../services/timeEntryService'
import { clientService } from '../services/clientService'
import { Button } from './Button'
import { toast } from 'sonner'

interface ManualTimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  clientName?: string
  defaultType?: TimeEntryType
}

export const ManualTimeEntryModal: React.FC<ManualTimeEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientName: defaultClientName,
  defaultType = 'logged_time'
}) => {
  const [formData, setFormData] = useState<{
    client_name: string
    type: TimeEntryType
    hours: number
    minutes: number
    description: string
    task_name: string
    billable: boolean
    tags: string
    date: string
    time: string
  }>({
    client_name: defaultClientName || '',
    type: defaultType,
    hours: 0,
    minutes: 0,
    description: '',
    task_name: '',
    billable: true,
    tags: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5)
  })

  const [clients, setClients] = useState<string[]>([])
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchClients()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.client_name && clients.length > 0) {
      const filtered = clients.filter(client =>
        client.toLowerCase().includes(formData.client_name.toLowerCase())
      )
      setClientSuggestions(filtered.slice(0, 5))
      setShowClientDropdown(filtered.length > 0 && formData.client_name.length > 0)
    } else {
      setShowClientDropdown(false)
    }
  }, [formData.client_name, clients])

  const fetchClients = async () => {
    try {
      const clientList = await clientService.getClients()
      setClients(clientList.map(c => c.name))
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.client_name) {
      toast.error('Please select a client')
      return
    }

    if (formData.hours === 0 && formData.minutes === 0) {
      toast.error('Please enter a duration')
      return
    }

    setLoading(true)

    try {
      // Calculate duration in milliseconds
      const duration_ms = timeEntryService.hoursToMilliseconds(
        formData.hours + formData.minutes / 60
      )

      // Create datetime from date and time
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + duration_ms)

      const entry: ManualTimeEntry = {
        client_name: formData.client_name,
        duration_ms,
        type: formData.type,
        description: formData.description || undefined,
        task_name: formData.task_name || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        billable: formData.billable,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined
      }

      await timeEntryService.createManualEntry(entry)
      
      toast.success(`${timeEntryService.getTypeDisplayName(formData.type)} entry created successfully`)
      
      // Reset form
      setFormData({
        client_name: defaultClientName || '',
        type: defaultType,
        hours: 0,
        minutes: 0,
        description: '',
        task_name: '',
        billable: true,
        tags: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5)
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to create time entry:', error)
      toast.error('Failed to create time entry')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const typeOptions: { value: TimeEntryType; label: string; icon: string; description: string }[] = [
    {
      value: 'logged_time',
      label: 'Logged Time',
      icon: '⏱️',
      description: 'Regular billable work'
    },
    {
      value: 'credit_applied',
      label: 'Apply Credit',
      icon: '➕',
      description: 'Add hours to client balance'
    },
    {
      value: 'retainer_credit',
      label: 'Retainer Credit',
      icon: '💰',
      description: 'Monthly retainer allocation'
    },
    {
      value: 'refund',
      label: 'Refund',
      icon: '↩️',
      description: 'Refund hours to client'
    },
    {
      value: 'reconciliation',
      label: 'Reconciliation',
      icon: '⚖️',
      description: 'Billing adjustment'
    }
  ]

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Time Entry
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Entry Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entry Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: option.value })}
                  className={`
                    p-3 rounded-lg border-2 transition-colors text-left
                    ${formData.type === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Client Name with Autocomplete */}
          <div className="relative">
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              onFocus={() => setShowClientDropdown(true)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Start typing to search clients..."
              required
            />
            {showClientDropdown && clientSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
                {clientSuggestions.map((client) => (
                  <button
                    key={client}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, client_name: client })
                      setShowClientDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm"
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duration *
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-gray-700 dark:text-gray-300">hours</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-gray-700 dark:text-gray-300">minutes</span>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <input
                type="time"
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Task Name */}
          <div>
            <label htmlFor="task_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task Name
            </label>
            <input
              type="text"
              id="task_name"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Optional task name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Optional description"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Comma-separated tags (e.g., design, frontend, urgent)"
            />
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="billable"
              checked={formData.billable}
              onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="billable" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Billable
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}