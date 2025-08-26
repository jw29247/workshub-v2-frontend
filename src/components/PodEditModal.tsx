import React, { useState } from 'react'
import { Save } from 'lucide-react'
import type { Pod, PodCreate, PodUpdate } from '../services/adminService'
import { Button } from './Button'

// Unified type for pod save operations
type PodSaveData = PodCreate | PodUpdate

interface PodEditModalProps {
  pod: Pod | null
  isCreating: boolean
  onSave: (podData: PodSaveData) => void
  onClose: () => void
}

export const PodEditModal: React.FC<PodEditModalProps> = ({ pod, isCreating, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: pod?.name || '',
    type: pod?.type || 'mixed' as 'design' | 'development' | 'mixed',
    description: pod?.description || '',
    is_active: pod?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {isCreating ? 'Create Pod' : 'Edit Pod'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isCreating ? 'Create a new team pod' : 'Update pod information'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => { setFormData({...formData, name: e.target.value}); }}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => { setFormData({...formData, description: e.target.value}); }}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => { setFormData({...formData, type: e.target.value as 'design' | 'development' | 'mixed'}); }}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
            >
              <option value="design">Design</option>
              <option value="development">Development</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pod_is_active"
              checked={formData.is_active}
              onChange={(e) => { setFormData({...formData, is_active: e.target.checked}); }}
              className="w-4 h-4 text-brand-purple-strong bg-gray-100 border-gray-300 rounded focus:ring-brand-purple-strong"
            />
            <label htmlFor="pod_is_active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Pod is active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
            >
              <Save className="h-4 w-4" />
              {isCreating ? 'Create Pod' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
