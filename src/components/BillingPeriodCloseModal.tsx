import React, { useState } from 'react'
import { X, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { Button } from './Button'
import { toast } from 'sonner'

interface BillingPeriodCloseModalProps {
  clientId: number
  clientName: string
  currentBalance: number
  currentPeriodEnd: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PeriodCloseData {
  force_close: boolean
  rollover_hours: number
  notes: string
  send_statement: boolean
  apply_adjustments: boolean
  adjustment_amount: number
  adjustment_reason: string
}

export const BillingPeriodCloseModal: React.FC<BillingPeriodCloseModalProps> = ({ 
  clientId, 
  clientName,
  currentBalance,
  currentPeriodEnd,
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [closeData, setCloseData] = useState<PeriodCloseData>({
    force_close: false,
    rollover_hours: Math.max(0, currentBalance),
    notes: '',
    send_statement: true,
    apply_adjustments: false,
    adjustment_amount: 0,
    adjustment_reason: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!closeData.force_close && currentBalance < 0) {
      toast.error('Cannot close period with negative balance. Enable force close or resolve the balance.')
      return
    }

    if (closeData.apply_adjustments && !closeData.adjustment_reason.trim()) {
      toast.error('Adjustment reason is required when applying adjustments')
      return
    }

    setShowConfirmation(true)
  }

  const handleConfirmedClose = async () => {
    setIsSubmitting(true)
    setShowConfirmation(false)

    try {
      // In a real implementation, you would call the backend:
      // await billingService.closeBillingPeriod(clientId, closeData)
      console.log('Closing billing period for client:', clientId, closeData)
      
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onSuccess()
      onClose()
      toast.success('Billing period closed successfully')
    } catch (error) {
      console.error('Failed to close billing period:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to close billing period')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setShowConfirmation(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Close Billing Period</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Close current billing period for {clientName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {showConfirmation ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                Confirm Period Close
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                This action cannot be undone. Are you sure you want to close the billing period for {clientName}?
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">Summary:</h4>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>• Current balance: {currentBalance.toFixed(2)} hours</li>
                <li>• Rollover hours: {closeData.rollover_hours.toFixed(2)} hours</li>
                {closeData.apply_adjustments && (
                  <li>• Adjustment: {closeData.adjustment_amount > 0 ? '+' : ''}{closeData.adjustment_amount.toFixed(2)} hours</li>
                )}
                <li>• Send statement: {closeData.send_statement ? 'Yes' : 'No'}</li>
                {closeData.force_close && (
                  <li className="text-amber-600 dark:text-amber-400">• Force close enabled</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmedClose}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Closing...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Close Period
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Current Status */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Current Period Status
              </h4>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Period End Date</p>
                    <p className="text-sm text-neutral-900 dark:text-white">{new Date(currentPeriodEnd).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Balance</p>
                    <p className={`text-sm font-medium ${
                      currentBalance < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {currentBalance.toFixed(2)} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Negative Balance Warning */}
            {currentBalance < 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Negative Balance Detected</h4>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This client has a negative balance of {Math.abs(currentBalance).toFixed(2)} hours. 
                  You must either resolve this balance or force close the period.
                </p>
              </div>
            )}

            {/* Rollover Configuration */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Rollover Configuration</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Hours to Rollover
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={closeData.rollover_hours}
                    onChange={(e) => setCloseData({...closeData, rollover_hours: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Unused hours to carry forward to the next period
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="force_close"
                    checked={closeData.force_close}
                    onChange={(e) => setCloseData({...closeData, force_close: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="force_close" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Force Close Period
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Close period even with negative balance (not recommended)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Adjustments */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Adjustments (Optional)</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="apply_adjustments"
                    checked={closeData.apply_adjustments}
                    onChange={(e) => setCloseData({...closeData, apply_adjustments: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <label htmlFor="apply_adjustments" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Apply manual adjustments
                  </label>
                </div>

                {closeData.apply_adjustments && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Adjustment Amount (hours)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={closeData.adjustment_amount}
                        onChange={(e) => setCloseData({...closeData, adjustment_amount: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                      />
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Use positive numbers to add hours, negative to subtract
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Adjustment Reason
                      </label>
                      <input
                        type="text"
                        required={closeData.apply_adjustments}
                        value={closeData.adjustment_reason}
                        onChange={(e) => setCloseData({...closeData, adjustment_reason: e.target.value})}
                        placeholder="e.g., Bonus hours for early payment"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statement Options */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Statement Options</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="send_statement"
                    checked={closeData.send_statement}
                    onChange={(e) => setCloseData({...closeData, send_statement: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <label htmlFor="send_statement" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Send statement to client automatically
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Period Close Notes
                  </label>
                  <textarea
                    value={closeData.notes}
                    onChange={(e) => setCloseData({...closeData, notes: e.target.value})}
                    rows={3}
                    placeholder="Add any notes about this period close..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Close Period
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}