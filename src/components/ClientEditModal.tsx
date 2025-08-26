import React, { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from './Button'
import { clientService, type Client, type ClientUpdate, type ClientType } from '../services/clientService'
import { toast } from 'sonner'

interface ClientEditModalProps {
  client: Client
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedClient: Client) => void
}

export const ClientEditModal: React.FC<ClientEditModalProps> = ({ 
  client, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<ClientUpdate>({
    name: client.name || '',
    email: client.email || '',
    company: client.company || '',
    contact_person: client.contact_person || '',
    phone: client.phone || '',
    address: client.address || '',
    timezone: client.timezone || '',
    currency: client.currency || 'GBP',
    monthly_hours: client.monthly_hours || 0,
    reset_date: client.reset_date || 1,
    contract_start_date: client.contract_start_date || '',
    contract_end_date: client.contract_end_date || '',
    initial_hours: client.initial_hours || 0,
    hourly_rate: client.hourly_rate || 0,
    client_type: client.client_type || 'retainer',
    notes: client.notes || '',
    is_active: client.is_active ?? true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        company: client.company || '',
        contact_person: client.contact_person || '',
        phone: client.phone || '',
        address: client.address || '',
        timezone: client.timezone || '',
        currency: client.currency || 'GBP',
        monthly_hours: client.monthly_hours || 0,
        reset_date: client.reset_date || 1,
        contract_start_date: client.contract_start_date || '',
        contract_end_date: client.contract_end_date || '',
        initial_hours: client.initial_hours || 0,
        hourly_rate: client.hourly_rate || 0,
        client_type: client.client_type || 'retainer',
        notes: client.notes || '',
        is_active: client.is_active ?? true,
      })
    }
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim()) {
      toast.error('Client name is required')
      return
    }

    if (!formData.email?.trim()) {
      toast.error('Client email is required')
      return
    }

    if (formData.reset_date && (formData.reset_date < 1 || formData.reset_date > 28)) {
      toast.error('Reset date must be between 1 and 28')
      return
    }

    if (formData.monthly_hours && formData.monthly_hours < 0) {
      toast.error('Monthly hours cannot be negative')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedClient = await clientService.updateClient(client.id, formData)
      onSuccess(updatedClient)
      onClose()
      toast.success('Client updated successfully')
    } catch (error) {
      console.error('Failed to update client:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update client')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Edit Client</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Update client information and settings</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Client Type
                </label>
                <select
                  value={formData.client_type}
                  onChange={(e) => setFormData({...formData, client_type: e.target.value as ClientType})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                >
                  <option value="retainer">Retainer</option>
                  <option value="project">Project</option>
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Configuration */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Billing Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Monthly Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.monthly_hours}
                  onChange={(e) => setFormData({...formData, monthly_hours: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Reset Date (1-28)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.reset_date}
                  onChange={(e) => setFormData({...formData, reset_date: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Hourly Rate (£)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate ? (formData.hourly_rate / 100).toFixed(2) : ''}
                  onChange={(e) => setFormData({...formData, hourly_rate: Math.round((parseFloat(e.target.value) || 0) * 100)})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Contract Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Contract Start Date
                </label>
                <input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({...formData, contract_start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({...formData, contract_end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Initial Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.initial_hours}
                  onChange={(e) => setFormData({...formData, initial_hours: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Timezone
                </label>
                <input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  placeholder="e.g. Europe/London"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Additional Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Active Client
                </label>
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
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}