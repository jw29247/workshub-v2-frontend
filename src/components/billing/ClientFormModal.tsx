import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAppDispatch } from '../../store'
import { fetchClients } from '../../store/slices/billingSlice'
import type { Client } from '../../services/clientService'
import { toast } from 'sonner'
import { Button } from '../Button'
import { clientService, type ClientType } from '../../services/clientService'
import { adminService, type UserManagement } from '../../services/adminService'

interface ClientFormModalProps {
  clientId?: number | null
  onClose: () => void
  onSuccess: () => void
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ clientId, onClose, onSuccess }) => {
  const dispatch = useAppDispatch()
  const isEditing = !!clientId
  
  const [existingClient, setExistingClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    monthly_hours: 0,
    reset_date: 1,
    is_active: true,
    contract_end_date: undefined as string | undefined,
    contract_start_date: undefined as string | undefined,  // New field
    initial_hours: 0,  // New field
    hourly_rate: 0,
    client_type: 'retainer' as ClientType,
    manager_id: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<UserManagement[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const initialDataRef = useRef(formData)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch individual client data when editing to ensure we have latest data
  useEffect(() => {
    if (clientId && isEditing) {
      const loadClient = async () => {
        try {
          const client = await clientService.getClient(clientId)
          setExistingClient(client)
        } catch (error) {
          console.error('Failed to load client:', error)
          toast.error('Failed to load client data')
        }
      }
      loadClient()
    }
  }, [clientId, isEditing])

  useEffect(() => {
    if (existingClient) {
      setFormData({
        name: existingClient.name,
        email: existingClient.email || '',
        notes: existingClient.notes || '',
        monthly_hours: existingClient.monthly_hours,
        reset_date: existingClient.reset_date,
        is_active: existingClient.is_active,
        contract_end_date: existingClient.contract_end_date ? existingClient.contract_end_date.split('T')[0] : undefined,
        contract_start_date: existingClient.contract_start_date ? existingClient.contract_start_date.split('T')[0] : undefined,
        initial_hours: existingClient.initial_hours || 0,
        hourly_rate: existingClient.hourly_rate || 0,
        client_type: (existingClient.client_type || 'retainer') as ClientType,
        manager_id: existingClient.manager_id || ''
      })
    }
  }, [existingClient])

  // Load users for manager dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        // Get SLT and manager users for the dropdown
        const userData = await adminService.getUsers({ role: 'SLT' })
        const managerData = await adminService.getUsers({ role: 'manager' })
        const combinedUsers = [...userData, ...managerData]
        setUsers(combinedUsers)
      } catch (error) {
        console.error('Failed to load users:', error)
        // Don't show error toast, just keep dropdown empty
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [])

  // Focus first field on mount for faster entry
  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  // Track initial data for unsaved-changes prompt
  useEffect(() => {
    initialDataRef.current = formData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasUnsavedChanges = useMemo(() => {
    const a = initialDataRef.current
    const b = formData
    return (
      a.name !== b.name ||
      a.email !== b.email ||
      a.notes !== b.notes ||
      a.monthly_hours !== b.monthly_hours ||
      a.reset_date !== b.reset_date ||
      a.is_active !== b.is_active ||
      a.contract_end_date !== b.contract_end_date ||
      a.contract_start_date !== b.contract_start_date ||
      a.initial_hours !== b.initial_hours ||
      a.hourly_rate !== b.hourly_rate ||
      a.client_type !== b.client_type ||
      a.manager_id !== b.manager_id
    )
  }, [formData])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors['name'] = 'Client name is required'
    }
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors['email'] = 'Invalid email address'
    }
    
    if (formData.monthly_hours < 0) {
      newErrors['monthly_hours'] = 'Monthly hours cannot be negative'
    }
    
    if (formData.reset_date < 1 || formData.reset_date > 28) {
      newErrors['reset_date'] = 'Reset date must be between 1 and 28'
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
      // Build payload carefully to match backend schema and avoid empty strings
      const {
        name,
        email,
        notes,
        monthly_hours,
        reset_date,
        is_active,
        contract_end_date,
        hourly_rate,
        client_type,
        manager_id
      } = formData

      // Common fields
      const basePayload: Record<string, unknown> = {
        name,
        ...(email ? { email } : {}),
        monthly_hours,
        reset_date,
        ...(notes ? { notes } : {}),
        ...(contract_end_date ? { contract_end_date } : {}),
        ...(formData.contract_start_date ? { contract_start_date: formData.contract_start_date } : {}),
        ...(formData.initial_hours ? { initial_hours: formData.initial_hours } : {}),
        ...(hourly_rate ? { hourly_rate } : {}),
        client_type,
        ...(manager_id ? { manager_id } : {})
      }

      // On update, allow toggling active; on create, omit it to satisfy backend model
      const dataToSubmit: Partial<Client> = isEditing
        ? ({ ...basePayload, is_active } as Partial<Client>)
        : (basePayload as Partial<Client>)
      
      if (isEditing && clientId) {
        await clientService.updateClient(clientId, dataToSubmit)
        toast.success('Client updated successfully')
        // Refresh the clients list in Redux
        dispatch(fetchClients(false))
      } else {
        await clientService.createClient(dataToSubmit as any)
        toast.success('Client created successfully')
        // Refresh the clients list in Redux
        dispatch(fetchClients(false))
      }
      
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'create'} client`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? Number(value) : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                const confirmClose = window.confirm('Discard unsaved changes?')
                if (!confirmClose) return
              }
              onClose()
            }}
            className="text-gray-400 dark:text-neutral-500 hover:text-gray-500 dark:hover:text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  ref={nameInputRef}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white ${
                    errors['name'] ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                  }`}
                />
                {errors['name'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['name']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white ${
                    errors['email'] ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                  }`}
                />
                {errors['email'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['email']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Client Type
                </label>
                <select
                  name="client_type"
                  value={formData.client_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                >
                  <option value="retainer">Retainer</option>
                  <option value="project">Project</option>
                  <option value="cro">CRO</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Retainer clients appear in usage tracking, Project/CRO clients appear in health metrics
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Manager (Optional)
                </label>
                <select
                  name="manager_id"
                  value={formData.manager_id}
                  onChange={handleChange}
                  disabled={loadingUsers}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                >
                  <option value="">No manager assigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.display_name || user.username || user.email} ({user.role})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Assign a manager to group clients in health metrics
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
              />
            </div>
          </div>

          {/* Billing Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Billing Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Monthly Hours Allocation
                </label>
                <input
                  type="number"
                  name="monthly_hours"
                  value={formData.monthly_hours}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white ${
                    errors['monthly_hours'] ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                  }`}
                />
                {errors['monthly_hours'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['monthly_hours']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Hourly Rate (£)
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Monthly Reset Date (1-28)
                </label>
                <input
                  type="number"
                  name="reset_date"
                  value={formData.reset_date}
                  onChange={handleChange}
                  min="1"
                  max="28"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white ${
                    errors['reset_date'] ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                  }`}
                />
                {errors['reset_date'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['reset_date']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  name="contract_start_date"
                  value={formData.contract_start_date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  When did this client's retainer contract begin?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Initial Hours Balance
                </label>
                <input
                  type="number"
                  name="initial_hours"
                  value={formData.initial_hours}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Starting hour balance (can be negative for deficit, supports decimals)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Contract End Date
                </label>
                <input
                  type="date"
                  name="contract_end_date"
                  value={formData.contract_end_date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-neutral-700 dark:text-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-600 rounded dark:bg-neutral-700"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-neutral-100">
                  Active Client
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <Button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) {
                  const confirmClose = window.confirm('Discard unsaved changes?')
                  if (!confirmClose) return
                }
                onClose()
              }}
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
              {isEditing ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientFormModal