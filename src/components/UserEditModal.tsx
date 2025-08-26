import React, { useState, useEffect } from 'react'
import { Save, Key } from 'lucide-react'
import type { Pod, UserManagement, UserManagementUpdate } from '../services/adminService'
import { adminService } from '../services/adminService'
import { Button } from './Button'
import { useAppSelector } from '../store'
import { toast } from 'sonner'

interface UserEditModalProps {
  user: UserManagement
  pods: Pod[]
  onSave: (userData: UserManagementUpdate) => void
  onClose: () => void
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user, pods: initialPods, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    initials: user.initials || '',
    role: user.role || '',
    pod: user.pod || '',
    is_active: user.is_active,
    is_hidden: user.is_hidden || false,
    profile: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      display_name: user.display_name || '',
      phone: user.phone || '',
      pod_id: user.pod_id || undefined,
      department: user.department || '',
      job_title: user.job_title || '',
    }
  })

  const [pods, setPods] = useState<Pod[]>(initialPods || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingPods, setLoadingPods] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  
  const currentUser = useAppSelector(state => state.auth.user)
  const isSLT = currentUser?.role === 'SLT'

  useEffect(() => {
    if (!initialPods || initialPods.length === 0) {
      loadPods()
    }
  }, [initialPods])

  const loadPods = async () => {
    try {
      setLoadingPods(true)
      const podsData = await adminService.getPods(true)
      setPods(podsData)
    } catch {
        // Ignore errors
    } finally {
      setLoadingPods(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save user data
      onSave(formData as any)
    } catch {
      alert('Failed to save changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter both password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsResettingPassword(true)
    try {
      await adminService.resetUserPassword(user.id, newPassword)
      toast.success('Password reset successfully')
      setShowPasswordReset(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Edit User</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Update user information and settings</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => { setFormData({...formData, username: e.target.value}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({...formData, email: e.target.value}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.profile.first_name}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, first_name: e.target.value}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.profile.last_name}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, last_name: e.target.value}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.profile.display_name}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, display_name: e.target.value}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Initials</label>
                <input
                  type="text"
                  value={formData.initials}
                  onChange={(e) => { setFormData({...formData, initials: e.target.value}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Work Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => { setFormData({...formData, role: e.target.value}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  <option value="SLT">SLT</option>
                  <option value="manager">Manager</option>
                  <option value="team_member">Team Member</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Pod</label>
                <select
                  value={formData.profile.pod_id || ''}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, pod_id: e.target.value ? parseInt(e.target.value) : undefined}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  disabled={loadingPods}
                >
                  <option value="">No Pod</option>
                  {pods.filter(pod => pod.is_active).map(pod => (
                    <option key={pod.id} value={pod.id}>{pod.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.profile.department}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, department: e.target.value}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Job Title</label>
                <input
                  type="text"
                  value={formData.profile.job_title}
                  onChange={(e) => { setFormData({...formData, profile: {...formData.profile, job_title: e.target.value}}); }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => { setFormData({...formData, is_active: e.target.checked}); }}
                  className="w-4 h-4 text-brand-purple-strong bg-gray-100 border-gray-300 rounded focus:ring-brand-purple-strong"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  User is active
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_hidden"
                  checked={formData.is_hidden}
                  onChange={(e) => { setFormData({...formData, is_hidden: e.target.checked}); }}
                  className="w-4 h-4 text-brand-purple-strong bg-gray-100 border-gray-300 rounded focus:ring-brand-purple-strong"
                />
                <label htmlFor="is_hidden" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Hide from today/week views and live timers
                </label>
              </div>
            </div>
          </div>

          {/* Password Reset - Only for SLT */}
          {isSLT && (
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4">Security</h4>
              {!showPasswordReset ? (
                <Button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Reset Password
                </Button>
              ) : (
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Setting a new password for {user.email}
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isResettingPassword}
                      loading={isResettingPassword}
                      variant="primary"
                    >
                      Reset Password
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowPasswordReset(false)
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      variant="secondary"
                      disabled={isResettingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
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
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
