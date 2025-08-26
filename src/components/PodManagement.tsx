import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react'
import { adminService } from '../services/adminService'
import type { Pod, PodCreate, PodUpdate } from '../services/adminService'
import { ConfirmationModal } from './ConfirmationModal'
import { PodEditModal } from './PodEditModal'
import { Button } from './Button'

// Unified type for pod save operations
type PodSaveData = PodCreate | PodUpdate

interface PodManagementProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const PodManagement: React.FC<PodManagementProps> = () => {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [editingPod, setEditingPod] = useState<Pod | null>(null)
  const [creatingPod, setCreatingPod] = useState(false)
  const [showPodModal, setShowPodModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  useEffect(() => {
    loadPods()
  }, [])

  const loadPods = async () => {
    try {
      setLoading(true)
      const podsData = await adminService.getPods(true)
      setPods(podsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pods')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePod = async (podData: PodSaveData) => {
    try {
      setLoading(true)
      await adminService.createPod(podData as PodCreate)
      setShowPodModal(false)
      setCreatingPod(false)
      loadPods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pod')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod)
    setCreatingPod(false)
    setShowPodModal(true)
  }

  const handleSavePod = async (podData: PodSaveData) => {
    if (!editingPod) return

    try {
      setLoading(true)
      await adminService.updatePod(editingPod.id, podData as PodUpdate)
      setShowPodModal(false)
      setEditingPod(null)
      loadPods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pod')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePod = (podId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Pod',
      message: 'Are you sure you want to delete this pod? Users will be unassigned from this pod.',
      onConfirm: () => confirmDeletePod(podId)
    })
  }

  const confirmDeletePod = async (podId: number) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }))

    try {
      setLoading(true)
      await adminService.deletePod(podId)
      loadPods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pod')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title="Pod Management"
        subtitle="Configure team pods and assignments"
      />

      {/* Error Display */}
      {error && (
        <div className="bg-cro-loss-strong/10 border border-cro-loss-strong/20 text-cro-loss-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => { setError(null); }} className="text-cro-loss-strong/60 hover:text-cro-loss-strong">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pod Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Pod Management</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Create and manage team pods</p>
          </div>
          <Button
            onClick={() => {
              setCreatingPod(true)
              setEditingPod(null)
              setShowPodModal(true)
            }}
            variant="primary"
          >
            <Plus className="h-4 w-4" />
            Create Pod
          </Button>
        </div>
      </div>

      {/* Pods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pods.map((pod) => (
          <div
            key={pod.id}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    pod.type === 'design' ? 'bg-purple-100 dark:bg-purple-900/20' :
                    pod.type === 'development' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Building2
                    className={`h-6 w-6 ${
                      pod.type === 'design' ? 'text-purple-600 dark:text-purple-400' :
                      pod.type === 'development' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">{pod.name}</h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {pod.type.charAt(0).toUpperCase() + pod.type.slice(1)} • {pod.member_count} member{pod.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { handleEditPod(pod); }}
                  className="p-1 text-neutral-400 hover:text-brand-purple-strong"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { handleDeletePod(pod.id); }}
                  className="p-1 text-neutral-400 hover:text-cro-loss-strong"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {pod.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{pod.description}</p>
            )}

            <div className="flex items-center justify-between">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                pod.is_active
                  ? 'bg-brand-green-strong/10 text-brand-green-strong'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                {pod.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-neutral-400">
                Updated {new Date(pod.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {pods.length === 0 && !loading && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No pods found</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">Get started by creating your first team pod</p>
          <Button
            onClick={() => {
              setCreatingPod(true)
              setEditingPod(null)
              setShowPodModal(true)
            }}
            variant="primary"
            className="mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Pod
          </Button>
        </div>
      )}

      {/* Pod Edit/Create Modal */}
      {showPodModal && (
        <PodEditModal
          pod={editingPod}
          isCreating={creatingPod}
          onSave={creatingPod ? handleCreatePod : handleSavePod}
          onClose={() => {
            setShowPodModal(false)
            setEditingPod(null)
            setCreatingPod(false)
          }}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => { setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
      />
    </div>
  )
}
