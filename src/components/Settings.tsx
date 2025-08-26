import React, { useState, useEffect } from 'react'
import { useBackendAuth } from '../contexts/ReduxAuthProvider'
import { backendAuthService } from '../services/backendAuthService'
import { ActionButton } from './ActionButton'
import { PageHeader } from './PageHeader'
import { Button } from './Button'
import { OnboardingTrigger } from './Onboarding/OnboardingTrigger'
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  Camera,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'

interface SettingsProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    avatar?: string
    email?: string
  }
}

export const Settings: React.FC<SettingsProps> = ({
  currentUser = { name: 'Demo User', role: 'SLT', email: 'demo@workshub.agency' }
}) => {
  const { user, updateProfile, changePassword, getUserPreferences, updateUserPreferences } = useBackendAuth()
  
  // Use the auth user if available, otherwise fallback to the prop
  const displayUser = user ? {
    name: user.username || user.email?.split('@')[0] || 'User',
    role: (currentUser.role || 'team_member') as 'team_member' | 'manager' | 'SLT',
    email: user.email,
    avatar: currentUser.avatar
  } : currentUser
  const [activeSection, setActiveSection] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    taskUpdates: true,
    timeTracking: true,
    weeklyReports: true,
    dashboardTheme: 'system',
    timeFormat: '24h',
    showInDashboard: true
  })
  const [preferencesLoading, setPreferencesLoading] = useState(false)

  // Synchronize form state with user data when it becomes available
  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Load user preferences when component mounts
  useEffect(() => {
    const loadPreferences = async () => {
      if (user) {
        try {
          const userPrefs = await getUserPreferences();
          setPreferences({
            emailNotifications: userPrefs.email_notifications ?? true,
            taskUpdates: userPrefs.task_updates ?? true,
            timeTracking: userPrefs.time_tracking ?? true,
            weeklyReports: userPrefs.weekly_reports ?? true,
            dashboardTheme: userPrefs.dashboard_theme ?? 'system',
            timeFormat: userPrefs.time_format ?? '24h',
            showInDashboard: userPrefs.show_in_dashboard ?? true,
          });
        } catch {
          // Keep default values if loading fails
        }
      }
    };

    loadPreferences();
  }, [user, getUserPreferences]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await updateProfile({
        username: profileForm.username,
        email: profileForm.email
      })
      setMessage('Profile updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    // Enhanced password validation to match UI requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      setError('Password does not meet the requirements listed below')
      setLoading(false)
      return
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password changed successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await backendAuthService.requestPasswordReset({ email: user?.email || '' })
      setMessage('Password reset email sent! Check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = async (key: string, value: boolean | string) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // Debounce the API call to avoid too many requests
    if (preferencesLoading) return;

    setPreferencesLoading(true);
    try {
      // Map camelCase to snake_case for API
      const apiPreferences = {
        email_notifications: newPreferences.emailNotifications,
        task_updates: newPreferences.taskUpdates,
        time_tracking: newPreferences.timeTracking,
        weekly_reports: newPreferences.weeklyReports,
        dashboard_theme: newPreferences.dashboardTheme,
        time_format: newPreferences.timeFormat,
        show_in_dashboard: newPreferences.showInDashboard,
      };
      await updateUserPreferences(apiPreferences);
      // Optionally show a success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
      // Revert the change on error
      setPreferences(preferences);
    } finally {
      setPreferencesLoading(false);
    }
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Palette }
  ]

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900">
        <div className="relative">
          <div className="w-20 h-20 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center">
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-brand-purple-strong dark:text-purple-400" />
            )}
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            className="absolute -bottom-1 -right-1 p-2 rounded-full"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <h3 className="text-xl font-medium text-neutral-900 dark:text-white">{displayUser.name}</h3>
          <p className="text-neutral-600 dark:text-neutral-300">{displayUser.email}</p>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
            displayUser.role === 'SLT' ? 'bg-brand-purple-strong/10 dark:bg-purple-400/20 text-brand-purple-strong dark:text-purple-400' :
            displayUser.role === 'manager' ? 'bg-brand-green-strong/10 dark:bg-green-400/20 text-brand-green-strong dark:text-green-400' :
            'bg-cro-no-impact-strong/10 dark:bg-blue-400/20 text-cro-no-impact-strong dark:text-blue-400'
          }`}>
            {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-6">
        <h4 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Profile Information</h4>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Display Name
            </label>
            <input
              id="username"
              type="text"
              value={profileForm.username}
              onChange={(e) => { setProfileForm({ ...profileForm, username: e.target.value }); }}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={profileForm.email}
              onChange={(e) => { setProfileForm({ ...profileForm, email: e.target.value }); }}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
              placeholder="your@workshub.agency"
            />
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Must be a @workshub.agency or @thatworks.agency email
            </p>
          </div>

          <div className="pt-4">
            <ActionButton
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Save Changes
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  )

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-medium text-neutral-900 dark:text-white">Change Password</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">Update your password to keep your account secure</p>
          </div>
          <Lock className="h-6 w-6 text-neutral-400" />
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => { setPasswordForm({ ...passwordForm, currentPassword: e.target.value }); }}
                className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => { setShowCurrentPassword(!showCurrentPassword); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => { setPasswordForm({ ...passwordForm, newPassword: e.target.value }); }}
                className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => { setShowNewPassword(!showNewPassword); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); }}
                className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => { setShowConfirmPassword(!showConfirmPassword); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <ActionButton
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Change Password
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={handleResetPassword}
              disabled={loading}
            >
              Send Reset Email
            </ActionButton>
          </div>
        </form>
      </div>

      <div className="bg-cro-no-impact-strong/5 dark:bg-orange-500/10 rounded-2xl border border-cro-no-impact-strong/20 dark:border-orange-500/30 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-cro-no-impact-strong dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-neutral-900 dark:text-white">Password Requirements</h5>
            <ul className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Include uppercase and lowercase letters</li>
              <li>• Include at least one number</li>
              <li>• Include at least one special character</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-6">
        <h4 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Email Notifications</h4>
        <div className="space-y-4">
          {[
            { id: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your account and activity' },
            { id: 'taskUpdates', label: 'Task Updates', description: 'Get notified when tasks are assigned or updated' },
            { id: 'timeTracking', label: 'Time Tracking Alerts', description: 'Reminders about time tracking and idle warnings' },
            { id: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly summary reports via email' }
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex-1">
                <h5 className="font-medium text-neutral-900 dark:text-white">{item.label}</h5>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences[item.id as keyof typeof preferences] as boolean}
                  onChange={(e) => handlePreferenceChange(item.id, e.target.checked)}
                  disabled={preferencesLoading}
                />
                <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-purple-strong/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple-strong peer-disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-6">
        <h4 className="text-lg font-medium text-neutral-900 dark:text-white mb-6">Dashboard Preferences</h4>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Theme Preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' }
              ].map((theme) => (
                <label key={theme.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={preferences.dashboardTheme === theme.value}
                    onChange={(e) => handlePreferenceChange('dashboardTheme', e.target.value)}
                    disabled={preferencesLoading}
                    className="sr-only peer"
                  />
                  <div className="p-4 text-center border border-neutral-300 dark:border-neutral-700 rounded-xl peer-checked:border-brand-purple-strong peer-checked:bg-brand-purple-strong/5 dark:peer-checked:bg-brand-purple-strong/10 transition-colors">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{theme.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Time Format
            </label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
              disabled={preferencesLoading}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors disabled:opacity-50"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <div>
              <h5 className="font-medium text-neutral-900 dark:text-white">Show in Team Dashboard</h5>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Allow others to see your activity in the team dashboard</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.showInDashboard}
                onChange={(e) => handlePreferenceChange('showInDashboard', e.target.checked)}
                disabled={preferencesLoading}
              />
              <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-purple-strong/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple-strong"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection()
      case 'security':
        return renderSecuritySection()
      case 'notifications':
        return renderNotificationsSection()
      case 'preferences':
        return renderPreferencesSection()
      default:
        return renderProfileSection()
    }
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Settings"
          subtitle="Manage your account settings and preferences"
        />
        <OnboardingTrigger />
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-cro-win-strong/10 dark:bg-green-900/20 border border-cro-win-strong/20 dark:border-green-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-cro-win-strong dark:text-green-400" />
            <p className="text-sm text-cro-win-strong dark:text-green-400">{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-cro-loss-strong/10 dark:bg-red-900/20 border border-cro-loss-strong/20 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-cro-loss-strong dark:text-red-400" />
            <p className="text-sm text-cro-loss-strong dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-purple-strong/10 dark:bg-purple-400/20 text-brand-purple-strong border border-brand-purple-strong/20'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
