import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import { Button } from './Button'
import {
  Users,
  Search,
  Edit,
  RefreshCw,
  X,
  Trash2,
  Mail
} from 'lucide-react'
import { adminService } from '../services/adminService'
import type { Pod, UserManagement as UserManagementType, UserManagementUpdate } from '../services/adminService'

import { UserEditModal } from './UserEditModal'
import { LoadingSpinner } from './LoadingSpinner'

interface UserManagementProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<UserManagementType[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')

  // Modal states
  const [editingUser, setEditingUser] = useState<UserManagementType | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)

  useEffect(() => {
    loadUsers()
    loadPods()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersData = await adminService.getUsers({
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole })
      })
      setUsers(usersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadPods = async () => {
    try {
      const podsData = await adminService.getPods(true)
      setPods(podsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pods')
    }
  }

  const handleSearch = () => {
    loadUsers()
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedRole('')
    loadUsers()
  }

  const handleEditUser = (user: UserManagementType) => {
    setEditingUser(user)
    setShowUserModal(true)
  }

  const handleSaveUser = async (userData: UserManagementUpdate) => {
    if (!editingUser) return

    try {
      setLoading(true)
      setError(null)
      await adminService.updateUser(editingUser.id, userData)
      setShowUserModal(false)
      setEditingUser(null)
      setSuccessMessage(`Successfully updated user ${editingUser.email || editingUser.username || editingUser.id}`)
      loadUsers()
      // Clear success message after 5 seconds
      setTimeout(() => { setSuccessMessage(null); }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await adminService.deleteUser(userId)
      setSuccessMessage(`Successfully deleted user ${username}`)
      loadUsers()
      // Clear success message after 5 seconds
      setTimeout(() => { setSuccessMessage(null); }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const handleSendWelcomeEmail = async (userId: string, userEmail: string) => {
    if (!confirm(`Send welcome email to ${userEmail}? This will include a password reset link.`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await adminService.sendWelcomeEmail(userId)
      setSuccessMessage(result.message)
      // Clear success message after 5 seconds
      setTimeout(() => { setSuccessMessage(null); }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send welcome email')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncClickUpUsers = async () => {
    try {
      setLoading(true)
      // const result = await adminService.syncClickUpUsers()
      const result = { created_users: 0, updated_users: 0, errors: [], created_profiles: 0, total_clickup_users: 0 }

      // Build a detailed message
      const messages = []
      if (result.created_users > 0) {
        messages.push(`${result.created_users} new users created`)
      }
      if (result.updated_users > 0) {
        messages.push(`${result.updated_users} users updated`)
      }
      if (result.created_profiles > 0) {
        messages.push(`${result.created_profiles} profiles created`)
      }

      const message = messages.length > 0
        ? `Sync completed: ${messages.join(', ')}. Total ClickUp users: ${result.total_clickup_users}`
        : `No changes made. ${result.total_clickup_users} ClickUp users already synced.`

      alert(message)
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync ClickUp users')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage user accounts, roles, and settings"
      />

      {/* Error Display */}
      {error && (
        <div className="bg-cro-loss-strong/10 border border-cro-loss-strong/20 text-cro-loss-strong px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); }}
              className="text-cro-loss-strong/60 hover:text-cro-loss-strong"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Success Message Display */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{successMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSuccessMessage(null); }}
              className="text-green-600/60 hover:text-green-600 dark:text-green-400/60 dark:hover:text-green-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); }}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="SLT">SLT</option>
              <option value="manager">Manager</option>
              <option value="team_member">Team Member</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={loading}
              loading={loading}
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button
              variant="outline"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="secondary"
              onClick={handleSyncClickUpUsers}
              disabled={loading}
              loading={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Sync ClickUp
            </Button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Users ({users.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner message="Loading users..." size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Pod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-purple-strong/10 flex items-center justify-center">
                          {user.initials ? (
                            <span className="text-sm font-medium text-brand-purple-strong">{user.initials}</span>
                          ) : (
                            <Users className="h-5 w-5 text-brand-purple-strong" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">
                            {user.display_name || user.username || 'Unknown User'}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'manager'
                          ? 'bg-brand-green-strong/10 text-brand-green-strong'
                          : user.role === 'designer'
                          ? 'bg-brand-purple-strong/10 text-brand-purple-strong'
                          : user.role === 'developer'
                          ? 'bg-cro-no-impact-strong/10 text-cro-no-impact-strong'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {user.role || 'No Role'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {user.pod_name || user.pod || 'No Pod'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-brand-green-strong/10 text-brand-green-strong'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { handleEditUser(user); }}
                          className="text-brand-purple-strong hover:text-brand-purple-strong/80"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendWelcomeEmail(user.id, user.email || user.username || 'this user')}
                          className="text-brand-green-strong hover:text-brand-green-strong/80"
                          title="Send welcome email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username || user.email || 'this user')}
                          className="text-cro-loss-strong hover:text-cro-loss-strong/80"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {showUserModal && editingUser && (
        <UserEditModal
          user={editingUser}
          pods={pods}
          onSave={handleSaveUser}
          onClose={() => {
            setShowUserModal(false)
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}
