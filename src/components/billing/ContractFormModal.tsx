import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppDispatch } from '../../store'
// TODO: Contract functionality not yet implemented in billingSlice
// import { createContract, updateContract } from '../../store/slices/billingSlice'
// import type { Contract } from '../../store/slices/billingSlice'

// Temporary Contract interface for development
interface Contract {
  id?: number
  client_id: number
  name: string
  type: string
  start_date: string
  end_date?: string
  monthly_hours?: number
  hourly_rate?: number
  total_value?: number
  status: string
  notes?: string
  created_at?: string
  updated_at?: string
}
import { toast } from 'sonner'
import { Button } from '../Button'

interface ContractFormModalProps {
  clientId: number
  contractId?: number | null
  onClose: () => void
  onSuccess: () => void
}

const ContractFormModal: React.FC<ContractFormModalProps> = ({
  clientId,
  contractId,
  onClose,
  onSuccess
}) => {
  // TODO: Uncomment when contract functionality is implemented
  // const dispatch = useAppDispatch()
  // TODO: Get contracts from state when implemented
  const contracts: Contract[] = []
  const isEditing = !!contractId
  
  const existingContract = contractId ? contracts.find(c => c.id === contractId) : null

  const [formData, setFormData] = useState({
    name: '',
    type: 'retainer' as 'retainer' | 'project' | 'hourly',
    start_date: '',
    end_date: '',
    monthly_hours: 0,
    hourly_rate: 0,
    total_value: 0,
    status: 'active' as 'active' | 'paused' | 'completed' | 'cancelled',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingContract) {
      setFormData({
        name: existingContract.name,
        type: existingContract.type as "project" | "retainer",
        start_date: existingContract.start_date,
        end_date: existingContract.end_date || '',
        monthly_hours: existingContract.monthly_hours || 0,
        hourly_rate: existingContract.hourly_rate || 0,
        total_value: existingContract.total_value || 0,
        status: existingContract.status as "active" | "paused" | "completed" | "cancelled",
        notes: existingContract.notes || ''
      })
    }
  }, [existingContract])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors['name'] = 'Contract name is required'
    }
    
    if (!formData.start_date) {
      newErrors['start_date'] = 'Start date is required'
    }
    
    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
      newErrors['end_date'] = 'End date must be after start date'
    }
    
    if (formData.type === 'retainer' && formData.monthly_hours <= 0) {
      newErrors['monthly_hours'] = 'Monthly hours required for retainer contracts'
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
      // TODO: Uncomment when contract functionality is implemented
      /*
      const dataToSubmit: Partial<Contract> = {
        ...formData,
        client_id: clientId,
        ...(formData.end_date ? { end_date: formData.end_date } : {}),
        ...(formData.type === 'retainer' && formData.monthly_hours ? { monthly_hours: formData.monthly_hours } : {}),
        ...(formData.hourly_rate ? { hourly_rate: formData.hourly_rate } : {}),
        ...(formData.total_value ? { total_value: formData.total_value } : {})
      }
      */

      // TODO: Implement contract creation/update when backend is ready
      if (isEditing && contractId) {
        // await dispatch(updateContract({ contractId, updates: dataToSubmit })).unwrap()
        toast.success('Contract update functionality not yet implemented')
      } else {
        // await dispatch(createContract(dataToSubmit)).unwrap()
        toast.success('Contract creation functionality not yet implemented')
      }
      
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} contract`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Contract' : 'Add New Contract'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors['name'] ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors['name'] && (
                <p className="mt-1 text-sm text-red-600">{errors['name']}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="retainer">Retainer</option>
                  <option value="project">Project</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors['start_date'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors['start_date'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['start_date']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors['end_date'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors['end_date'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['end_date']}</p>
                )}
              </div>

              {formData.type === 'retainer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Hours *
                  </label>
                  <input
                    type="number"
                    name="monthly_hours"
                    value={formData.monthly_hours}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors['monthly_hours'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['monthly_hours'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['monthly_hours']}</p>
                  )}
                </div>
              )}

              {formData.type === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (cents)
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Value (cents)
                </label>
                <input
                  type="number"
                  name="total_value"
                  value={formData.total_value}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              variant="primary"
            >
              {isEditing ? 'Update Contract' : 'Create Contract'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContractFormModal