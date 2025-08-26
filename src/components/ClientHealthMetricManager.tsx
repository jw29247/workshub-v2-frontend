import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { clientHealthService, type HealthMetric, type HealthMetricCreate, type HealthMetricUpdate, type ServiceApplicability } from '../services/clientHealthService'
import { ActionButton } from './ActionButton'

interface ClientHealthMetricManagerProps {
  onMetricsUpdated?: () => void
}

export const ClientHealthMetricManager: React.FC<ClientHealthMetricManagerProps> = ({ onMetricsUpdated }) => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingMetric, setEditingMetric] = useState<number | null>(null)
  const [newMetric, setNewMetric] = useState<HealthMetricCreate>({
    name: '',
    display_name: '',
    description: '',
    order_index: 0,
    is_active: true,
    service_applicability: 'all'
  })

  // Helper function to generate internal name from display name
  const generateInternalName = (displayName: string): string => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50) // Limit length
  }
  const [editForm, setEditForm] = useState<HealthMetricUpdate>({})
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await clientHealthService.getMetrics(false) // Get all metrics, including inactive
      setMetrics(data.sort((a, b) => a.order_index - b.order_index))
    } catch {
      setError('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMetric = async () => {
    if (!newMetric.display_name) {
      setError('Display name is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await clientHealthService.createMetric({
        ...newMetric,
        name: generateInternalName(newMetric.display_name),
        order_index: metrics.length
      })
      setNewMetric({
        name: '',
        display_name: '',
        description: '',
        order_index: 0,
        is_active: true,
        service_applicability: 'all'
      })
      setShowNewForm(false)
      await fetchMetrics()
      onMetricsUpdated?.()
    } catch {
      setError('Failed to create metric')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMetric = async (metricId: number) => {
    setSaving(true)
    setError(null)
    try {
      // If display name changed, regenerate internal name
      const updateData = { ...editForm }
      if (editForm.display_name) {
        updateData.name = generateInternalName(editForm.display_name)
      }
      await clientHealthService.updateMetric(metricId, updateData)
      setEditingMetric(null)
      setEditForm({})
      await fetchMetrics()
      onMetricsUpdated?.()
    } catch {
      setError('Failed to update metric')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMetric = async (metricId: number) => {
    if (!confirm('Are you sure you want to deactivate this metric?')) {
      return
    }

    setError(null)
    try {
      await clientHealthService.deleteMetric(metricId)
      await fetchMetrics()
      onMetricsUpdated?.()
    } catch {
      setError('Failed to delete metric')
    }
  }

  const handleMoveMetric = async (metricId: number, direction: 'up' | 'down') => {
    const index = metrics.findIndex(m => m.id === metricId)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === metrics.length - 1)) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updatedMetrics = [...metrics]
    const [removed] = updatedMetrics.splice(index, 1)
    if (removed) {
      updatedMetrics.splice(newIndex, 0, removed)
    }

    // Update order indexes
    const updates = updatedMetrics.map((metric, idx) => ({
      id: metric.id,
      order_index: idx
    }))

    // Update locally first for immediate UI response
    setMetrics(updatedMetrics.map((m, idx) => ({ ...m, order_index: idx })))

    // Then update on server
    try {
      for (const update of updates) {
        if (update.order_index !== metrics.find(m => m.id === update.id)?.order_index) {
          await clientHealthService.updateMetric(update.id, { order_index: update.order_index })
        }
      }
      onMetricsUpdated?.()
    } catch {
      // Revert on error
      await fetchMetrics()
    }
  }

  const startEdit = (metric: HealthMetric) => {
    setEditingMetric(metric.id)
    setEditForm({
      display_name: metric.display_name,
      description: metric.description,
      is_active: metric.is_active,
      service_applicability: metric.service_applicability
    })
  }

  const cancelEdit = () => {
    setEditingMetric(null)
    setEditForm({})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Add New Metric */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Health Metrics
            </h3>
            <ActionButton
              variant="primary"
              onClick={() => { setShowNewForm(!showNewForm); }}
            >
              <Plus className="h-4 w-4" />
              Add Metric
            </ActionButton>
          </div>

          {showNewForm && (
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Metric Name
                  </label>
                  <input
                    type="text"
                    value={newMetric.display_name}
                    onChange={(e) => { setNewMetric({ ...newMetric, display_name: e.target.value }); }}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    placeholder="e.g., Communication Quality"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newMetric.description || ''}
                  onChange={(e) => { setNewMetric({ ...newMetric, description: e.target.value }); }}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  rows={2}
                  placeholder="Brief description of what this metric measures"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Service Applicability
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="newServiceApplicability"
                      value="all"
                      checked={(newMetric.service_applicability || 'all') === 'all'}
                      onChange={(e) => { setNewMetric({ ...newMetric, service_applicability: e.target.value as ServiceApplicability }); }}
                      className="border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">All Services</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="newServiceApplicability"
                      value="cro_only"
                      checked={newMetric.service_applicability === 'cro_only'}
                      onChange={(e) => { setNewMetric({ ...newMetric, service_applicability: e.target.value as ServiceApplicability }); }}
                      className="border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">CRO Only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="newServiceApplicability"
                      value="non_cro_only"
                      checked={newMetric.service_applicability === 'non_cro_only'}
                      onChange={(e) => { setNewMetric({ ...newMetric, service_applicability: e.target.value as ServiceApplicability }); }}
                      className="border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Non-CRO Only</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <ActionButton
                  variant="primary"
                  onClick={handleCreateMetric}
                  disabled={saving || !newMetric.display_name}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create
                    </>
                  )}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setShowNewForm(false)
                    setNewMetric({
                      name: '',
                      display_name: '',
                      description: '',
                      order_index: 0,
                      is_active: true,
                      service_applicability: 'all'
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics List */}
      <div className="space-y-2">
        {metrics.map((metric, index) => (
          <div
            key={metric.id}
            className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 ${
              !metric.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="p-4">
              {editingMetric === metric.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Metric Name
                    </label>
                    <input
                      type="text"
                      value={editForm.display_name || ''}
                      onChange={(e) => { setEditForm({ ...editForm, display_name: e.target.value }); }}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => { setEditForm({ ...editForm, description: e.target.value }); }}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Service Applicability
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="editServiceApplicability"
                          value="all"
                          checked={(editForm.service_applicability || 'all') === 'all'}
                          onChange={(e) => { setEditForm({ ...editForm, service_applicability: e.target.value as ServiceApplicability }); }}
                          className="border-neutral-300 dark:border-neutral-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">All Services</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="editServiceApplicability"
                          value="cro_only"
                          checked={editForm.service_applicability === 'cro_only'}
                          onChange={(e) => { setEditForm({ ...editForm, service_applicability: e.target.value as ServiceApplicability }); }}
                          className="border-neutral-300 dark:border-neutral-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">CRO Only</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="editServiceApplicability"
                          value="non_cro_only"
                          checked={editForm.service_applicability === 'non_cro_only'}
                          onChange={(e) => { setEditForm({ ...editForm, service_applicability: e.target.value as ServiceApplicability }); }}
                          className="border-neutral-300 dark:border-neutral-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Non-CRO Only</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.is_active ?? true}
                        onChange={(e) => { setEditForm({ ...editForm, is_active: e.target.checked }); }}
                        className="rounded border-neutral-300 dark:border-neutral-600"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Active</span>
                    </label>
                    <div className="flex gap-2 ml-auto">
                      <ActionButton
                        variant="primary"

                        onClick={() => handleUpdateMetric(metric.id)}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </ActionButton>
                      <ActionButton
                        variant="secondary"

                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900 dark:text-white">
                      {metric.display_name}
                      {!metric.is_active && (
                        <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">(Inactive)</span>
                      )}
                      {metric.service_applicability === 'cro_only' && (
                        <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">(CRO Only)</span>
                      )}
                      {metric.service_applicability === 'non_cro_only' && (
                        <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">(Non-CRO Only)</span>
                      )}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                      {metric.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveMetric(metric.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveMetric(metric.id, 'down')}
                      disabled={index === metrics.length - 1}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { startEdit(metric); }}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {metric.is_active && (
                      <button
                        onClick={() => handleDeleteMetric(metric.id)}
                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {metrics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-300">
            No metrics configured yet. Add your first metric to get started.
          </p>
        </div>
      )}
    </div>
  )
}
