import React, { useState } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from './Button'
import { toast } from 'sonner'
import { billingService } from '../services/billingService'

interface SetRolloverModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clientId: number
  clientName: string
  resetDate: number
}

export const SetRolloverModal: React.FC<SetRolloverModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
  resetDate
}) => {
  const [rolloverHours, setRolloverHours] = useState<string>('')
  const [targetDate, setTargetDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    const hours = parseFloat(rolloverHours)
    if (isNaN(hours)) {
      setError('Please enter a valid number of hours')
      return
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this adjustment')
      return
    }

    setIsSubmitting(true)

    try {
      await billingService.setRolloverHours({
        client_id: clientId,
        rollover_hours: hours,
        target_date: new Date(targetDate).toISOString(),
        reason: reason.trim()
      })

      toast.success(`Successfully set ${hours} rollover hours for ${clientName}`)
      
      // Reset form
      setRolloverHours('')
      setReason('')
      setTargetDate(format(new Date(), 'yyyy-MM-dd'))
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Failed to set rollover hours:', error)
      setError(error.response?.data?.detail || 'Failed to set rollover hours')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setRolloverHours('')
    setReason('')
    setError(null)
    setTargetDate(format(new Date(), 'yyyy-MM-dd'))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCancel} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Set Rollover Hours
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This will set the rollover balance for <strong>{clientName}</strong> at the start of their billing period.
                    The period resets on day {resetDate} of each month.
                  </p>
                </div>
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                id="targetDate"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Select any date within the billing period you want to adjust
              </p>
            </div>

            {/* Rollover Hours */}
            <div>
              <label htmlFor="rolloverHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rollover Hours
              </label>
              <input
                type="number"
                id="rolloverHours"
                value={rolloverHours}
                onChange={(e) => setRolloverHours(e.target.value)}
                placeholder="0.00"
                step="0.25"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the number of hours to carry forward (use negative values to subtract hours)
              </p>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for Adjustment
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Q4 2023 reconciliation, Initial system setup, etc."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="ml-3 text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Setting...' : 'Set Rollover Hours'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}