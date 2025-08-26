import { useState } from 'react'
import { X, Plus, Minus, DollarSign } from 'lucide-react'
import { useAppDispatch } from '../../store'
import { type Client, fetchClients } from '../../store/slices/billingSlice'
import { creditLedgerService } from '../../services/creditLedgerService'
import { toast } from 'sonner'
import { Button } from '../Button'

interface CreditAdjustmentModalProps {
  clientId: number
  clientName: string
  client: Client | undefined  // Add client data for hourly rate calculation
  onClose: () => void
  onSuccess: () => void
}

const CreditAdjustmentModal = ({
  clientId,
  clientName,
  client,
  onClose,
  onSuccess
}: CreditAdjustmentModalProps) => {
  const dispatch = useAppDispatch()
  
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate charge amount based on hourly rate
  const calculateChargeAmount = () => {
    if (!client?.hourly_rate || !amount || Number(amount) <= 0) {
      return null
    }
    // API already returns hourly rate in major currency (pounds/dollars)
    const totalCharge = client.hourly_rate * Number(amount)
    return totalCharge
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP' // Could be made dynamic based on client.currency if available
    }).format(amount)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!amount || Number(amount) <= 0) {
      newErrors['amount'] = 'Amount must be greater than 0'
    }
    
    if (!description.trim()) {
      newErrors['description'] = 'Description is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const adjustedAmount = adjustmentType === 'deduct' ? -Number(amount) : Number(amount)
      
      await creditLedgerService.addCredits({
        client_id: clientId,
        amount: adjustedAmount,
        description,
        ...(notes ? { notes } : {})
      })
      
      // Refresh the clients list in Redux to show updated balance
      dispatch(fetchClients(false))
      
      toast.success(`Credits ${adjustmentType === 'add' ? 'added' : 'deducted'} successfully`)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust credits')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Adjust Credits
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-neutral-500 hover:text-gray-500 dark:hover:text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Adjusting credits for {clientName}
            </p>
            {client?.hourly_rate && client.hourly_rate > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Hourly rate: {formatCurrency(client.hourly_rate)}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setAdjustmentType('add'); }}
                className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Credits
              </button>
              <button
                type="button"
                onClick={() => { setAdjustmentType('deduct'); }}
                className={`flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium ${
                  adjustmentType === 'deduct'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                <Minus className="w-4 h-4 mr-2" />
                Deduct Credits
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Amount (hours) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (errors['amount']) {
                  setErrors(prev => ({ ...prev, ['amount']: '' }))
                }
              }}
              step="0.01"
              min="0"
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 ${
                errors['amount'] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-neutral-600'
              }`}
            />
            {errors['amount'] && (
              <p className="mt-1 text-sm text-red-600">{errors['amount']}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors['description']) {
                  setErrors(prev => ({ ...prev, ['description']: '' }))
                }
              }}
              placeholder="Reason for adjustment"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 ${
                errors['description'] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-neutral-600'
              }`}
            />
            {errors['description'] && (
              <p className="mt-1 text-sm text-red-600">{errors['description']}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); }}
              rows={3}
              placeholder="Optional additional information"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-md p-4 space-y-3">
            <p className="text-sm text-gray-600 dark:text-neutral-400">Preview:</p>
            <div className="space-y-2">
              <p className={`text-lg font-semibold ${
                adjustmentType === 'add' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {adjustmentType === 'add' ? '+' : '-'}{amount || '0'} hours
              </p>
              
              {/* Charging calculation */}
              {adjustmentType === 'add' && calculateChargeAmount() && (
                <div className="border-t border-gray-200 dark:border-neutral-600 pt-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                      Charge Client:
                    </span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(calculateChargeAmount()!)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    Based on hourly rate of {client?.hourly_rate ? formatCurrency(client.hourly_rate) : '£0.00'}/hour
                  </p>
                </div>
              )}
              
              {/* Show message if no hourly rate */}
              {adjustmentType === 'add' && (!client?.hourly_rate || client.hourly_rate === 0) && amount && Number(amount) > 0 && (
                <div className="border-t border-gray-200 dark:border-neutral-600 pt-2">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ No hourly rate set for this client - unable to calculate charge amount
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              variant={adjustmentType === 'add' ? 'success' : 'danger'}
            >
              {`${adjustmentType === 'add' ? 'Add' : 'Deduct'} Credits`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreditAdjustmentModal