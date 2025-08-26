import React, { useState, useEffect } from 'react'
import {
  Users,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Calendar,
  BarChart3,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { presentationScheduleService, type WeeklyPresentationSchedule, type PresentationSchedule } from '../services/presentationScheduleService'
import { adminService, type UserManagement } from '../services/adminService'
import { ActionButton } from './ActionButton'
import { LoadingSpinner } from './LoadingSpinner'

interface PresentationScheduleManagerProps {
  weekStarting: string
  onClose?: () => void
}

export const PresentationScheduleManager: React.FC<PresentationScheduleManagerProps> = ({ 
  weekStarting, 
  onClose 
}) => {
  const [schedule, setSchedule] = useState<WeeklyPresentationSchedule | null>(null)
  const [managers, setManagers] = useState<UserManagement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  const [draggingItem, setDraggingItem] = useState<PresentationSchedule | null>(null)

  useEffect(() => {
    loadData()
  }, [weekStarting])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load managers and current schedule
      const [managersData, scheduleData] = await Promise.all([
        adminService.getUsers(),
        presentationScheduleService.getWeeklySchedule(weekStarting)
      ])
      
      // Filter to only managers (not SLT) - ignore is_hidden flag for this view
      // Managers need to be visible in presentation scheduling even if hidden elsewhere
      const managerUsers = managersData.filter(u => 
        u.role === 'manager' && u.is_active !== false
      )
      
      setManagers(managerUsers)
      // Ensure schedule always has a value, even if API returns undefined
      setSchedule(scheduleData || { week_starting: weekStarting, schedules: [] })
      
      // If no schedule exists, preselect all managers
      if (!scheduleData || scheduleData.schedules.length === 0) {
        setSelectedManagers(managerUsers.map(m => m.id))
      }
    } catch {
      setError('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSchedule = async () => {
    if (selectedManagers.length < 2) {
      setError('Please select at least 2 managers')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const newSchedule = await presentationScheduleService.generateSchedule({
        week_starting: weekStarting,
        manager_ids: selectedManagers
      })
      if (newSchedule) {
        setSchedule(newSchedule)
        setSelectedManagers([])
      } else {
        throw new Error('Failed to generate schedule')
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      setError('Failed to generate schedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleMovePosition = async (scheduleId: number, currentPosition: number, direction: 'up' | 'down') => {
    if (!schedule) return
    
    const newPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1
    if (newPosition < 1 || newPosition > schedule.schedules.length) return

    setSaving(true)
    try {
      await presentationScheduleService.updateSchedulePosition(scheduleId, newPosition)
      await loadData()
    } catch {
      setError('Failed to update position')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: PresentationSchedule) => {
    setDraggingItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetItem: PresentationSchedule) => {
    e.preventDefault()
    
    if (!draggingItem || draggingItem.id === targetItem.id) {
      setDraggingItem(null)
      return
    }

    setSaving(true)
    try {
      await presentationScheduleService.updateSchedulePosition(
        draggingItem.id, 
        targetItem.presentation_order
      )
      await loadData()
    } catch {
      setError('Failed to reorder schedule')
    } finally {
      setSaving(false)
      setDraggingItem(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner message="Loading presentation schedule..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-brand-primary" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Presentation Schedule
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Week of {new Date(weekStarting).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Current Schedule */}
      {schedule && schedule.schedules && schedule.schedules.length > 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Order
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {schedule.schedules.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  draggingItem?.id === item.id
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30'
                } hover:border-brand-primary transition-colors cursor-move`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                    item.presentation_order === 1 ? 'bg-green-500' :
                    item.presentation_order === 2 ? 'bg-blue-500' :
                    item.presentation_order === 3 ? 'bg-orange-500' :
                    'bg-neutral-500'
                  }`}>
                    {item.presentation_order}
                  </div>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {item.manager_name || 'Unknown Manager'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMovePosition(item.id, item.presentation_order, 'up')}
                    disabled={item.presentation_order === 1 || saving}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMovePosition(item.id, item.presentation_order, 'down')}
                    disabled={item.presentation_order === schedule.schedules.length || saving}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Generate New Schedule */
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Round-Robin Schedule
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Select managers to include in this week's presentation order
            </p>
          </div>
          <div className="p-4">
            {managers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-neutral-500 dark:text-neutral-400 mb-4">
                  No managers found in the system.
                </div>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  Please ensure there are active users with the 'manager' role in the system.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {managers.map(manager => (
                  <label
                    key={manager.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedManagers.includes(manager.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedManagers([...selectedManagers, manager.id])
                        } else {
                          setSelectedManagers(selectedManagers.filter(id => id !== manager.id))
                        }
                      }}
                      className="rounded border-neutral-300 dark:border-neutral-600"
                    />
                    <span className="text-neutral-900 dark:text-white">
                      {manager.display_name || manager.username}
                    </span>
                  </label>
                ))}
              </div>
            )}
            
            <ActionButton
              variant="primary"
              onClick={handleGenerateSchedule}
              disabled={managers.length === 0 || selectedManagers.length < 2 || saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : managers.length === 0 ? (
                <>
                  <BarChart3 className="h-4 w-4" />
                  No Managers Available
                </>
              ) : selectedManagers.length < 2 ? (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Select at least 2 managers
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Generate Fair Schedule
                </>
              )}
            </ActionButton>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Round-Robin System:</strong> The schedule generator ensures each manager gets equal 
          opportunities in each position over time. Drag and drop to manually reorder if needed.
        </p>
      </div>
    </div>
  )
}