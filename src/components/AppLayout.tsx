import React, { useState, Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { OnboardingOverlay } from './Onboarding/OnboardingOverlay'
import { getOnboardingSteps } from './Onboarding/onboardingSteps'
import { useAppDispatch, useAppSelector } from '../store'
import { 
  startOnboarding, 
  checkOnboardingStatus, 
  selectOnboarding 
} from '../store/slices/onboardingSlice'
import { selectCurrentUser } from '../store/slices/authSlice'
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })))
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })))
const TodayView = lazy(() => import('./TodayView').then(m => ({ default: m.TodayView })))
const WeekView = lazy(() => import('./WeekView').then(m => ({ default: m.WeekView })))
const AllTimeLogs = lazy(() => import('./AllTimeLogs').then(m => ({ default: m.AllTimeLogs })))
const CreditDashboard = lazy(() => import('./CreditDashboard').then(m => ({ default: m.CreditDashboard })))
const ClientHealthMetrics = lazy(() => import('./ClientHealthMetrics').then(m => ({ default: m.ClientHealthMetrics })))
const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })))
const PodManagement = lazy(() => import('./PodManagement').then(m => ({ default: m.PodManagement })))
const ClientManagement = lazy(() => import('./ClientManagement').then(m => ({ default: m.ClientManagement })))
import { PulseCheck } from './PulseCheck'
import { AdminNotifications } from './AdminNotifications'
import { AdminFeedback } from './AdminFeedback'
import { PulseCheckLeadership } from './PulseCheckLeadership'
import TimeLogSync from './TimeLogSync'
import FeedbackWidget from './FeedbackWidget'
import { DatabaseLoadTester } from './LoadTesting'

const ClientDetailEnhanced = lazy(() => import('./billing/ClientDetailEnhanced').then(m => ({ default: m.ClientDetailEnhanced })))
const ExecutiveDashboard = lazy(() => import('./ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })))


interface AppLayoutProps {
  onLogout?: () => void
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    avatar?: string
    email?: string
  }
}

// Role-based route protection component
const RoleProtectedRoute: React.FC<{
  element: React.ReactElement
  allowedRoles: string[]
  currentUserRole?: string
}> = ({ element, allowedRoles, currentUserRole }) => {
  if (!currentUserRole || !allowedRoles.includes(currentUserRole)) {
    return <Navigate to="/app/dashboard" replace />
  }
  return element
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  onLogout,
  currentUser = { name: 'Demo User', role: 'SLT' }
}) => {
  const dispatch = useAppDispatch()
  const onboarding = useAppSelector(selectOnboarding)
  const authUser = useAppSelector(selectCurrentUser)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const location = useLocation()

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev
      // Save to localStorage
      localStorage.setItem('sidebar-collapsed', newState.toString())
      return newState
    })
  }

  // Get active tab from current URL
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/app' || path === '/app/') return 'dashboard'
    if (path === '/app/dashboard') return 'dashboard'
    if (path === '/app/executive-dashboard') return 'executive-dashboard'
    if (path === '/app/time/today') return 'time-today'
    if (path === '/app/time/week') return 'time-week'
    if (path === '/app/time/logs') return 'time-logs'
    if (path === '/app/clients/credits') return 'clients-credits'
    if (path === '/app/clients/health') return 'clients-health'

    if (path === '/app/admin/clients') return 'admin-clients'
    if (path === '/app/admin/notifications') return 'admin-notifications'
    if (path === '/app/admin/users') return 'admin-users'
    if (path === '/app/admin/pods') return 'admin-pods'
    if (path === '/app/admin/feedback') return 'admin-feedback'
    if (path === '/app/admin/pulse-leadership') return 'admin-pulse-leadership'

    if (path === '/app/settings') return 'settings'
    if (path === '/app/tools/pulse') return 'tools-pulse'
    if (path === '/app/tools/sync') return 'tools-sync'
    if (path === '/app/tools/reconciliation') return 'tools-reconciliation'
    return 'dashboard'
  }

  const activeTab = getActiveTab()

  // Check and trigger onboarding for new users
  useEffect(() => {
    const checkAndStartOnboarding = async () => {
      // Use auth user if available, otherwise use the prop
      const user = authUser || currentUser
      
      if (user && 'id' in user) {
        // Check if user has completed onboarding
        const result = await dispatch(checkOnboardingStatus(user.id))
        
        // If user hasn't completed onboarding, start it
        if (result.meta.requestStatus === 'fulfilled' && result.payload && typeof result.payload === 'object' && 'hasCompletedOnboarding' in result.payload && !result.payload.hasCompletedOnboarding) {
          const role = user.role as 'SLT' | 'manager' | 'team_member'
          const steps = getOnboardingSteps(role)
          dispatch(startOnboarding({ role, steps }))
        }
      } else if (!localStorage.getItem('onboarding_completed')) {
        // For demo users without real IDs, use localStorage
        const steps = getOnboardingSteps(currentUser.role)
        dispatch(startOnboarding({ role: currentUser.role, steps }))
      }
    }

    // Only check on first mount
    if (!onboarding.hasCompletedOnboarding) {
      checkAndStartOnboarding()
    }
  }, [dispatch, authUser, currentUser, onboarding.hasCompletedOnboarding]) // Include all dependencies

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-50 dark:bg-black font-space">
      {/* Onboarding Overlay */}
      <OnboardingOverlay />
      {/* Navigation */}
      <Navigation
        currentUser={currentUser}
        activeTab={activeTab}
        {...(onLogout && { onLogout })}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={handleMobileMenuToggle}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        }>
        <Routes>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard currentUser={currentUser} />} />
          <Route path="executive-dashboard" element={<RoleProtectedRoute element={<ExecutiveDashboard currentUser={currentUser} />} allowedRoles={['SLT', 'manager']} currentUserRole={currentUser?.role} />} />
          <Route path="time/today" element={<TodayView />} />
          <Route path="time/week" element={<WeekView currentUser={currentUser} />} />
          <Route path="time/logs" element={<AllTimeLogs currentUser={currentUser} />} />
          <Route path="clients/credits" element={<RoleProtectedRoute element={<CreditDashboard currentUser={currentUser} />} allowedRoles={['SLT', 'manager']} currentUserRole={currentUser?.role} />} />
          <Route path="clients/health" element={<RoleProtectedRoute element={<ClientHealthMetrics currentUser={currentUser} />} allowedRoles={['SLT', 'manager']} currentUserRole={currentUser?.role} />} />
          <Route path="billing/*" element={<Navigate to="/app/clients/credits" replace />} />
          <Route path="admin" element={<Navigate to="/app/admin/clients" replace />} />
          <Route path="admin/clients" element={<RoleProtectedRoute element={<ClientManagement currentUser={currentUser} />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />
          <Route path="admin/clients/:clientId" element={<RoleProtectedRoute element={<ClientDetailEnhanced />} allowedRoles={['SLT', 'manager']} currentUserRole={currentUser?.role} />} />
          <Route
            path="admin/notifications"
            element={
              currentUser?.role === 'SLT' ? (
                <AdminNotifications currentUser={currentUser} />
              ) : (
                <Navigate to="/app/dashboard" replace />
              )
            }
          />
          <Route path="admin/users" element={<RoleProtectedRoute element={<UserManagement currentUser={currentUser} />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />
          <Route path="admin/pods" element={<RoleProtectedRoute element={<PodManagement currentUser={currentUser} />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />
          <Route path="admin/feedback" element={<RoleProtectedRoute element={<AdminFeedback currentUser={currentUser} />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />
          <Route path="admin/pulse-leadership" element={<RoleProtectedRoute element={<PulseCheckLeadership currentUser={currentUser} />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />

          <Route path="settings" element={<Settings currentUser={currentUser} />} />
          <Route path="tools/pulse" element={<PulseCheck currentUser={currentUser} />} />
          <Route path="tools/sync" element={<RoleProtectedRoute element={<TimeLogSync />} allowedRoles={['SLT', 'manager']} currentUserRole={currentUser?.role} />} />
          {/* Ledger reconciliation removed - replaced by simplified credit system */}
          <Route path="tools/load-test" element={<RoleProtectedRoute element={<DatabaseLoadTester className="max-w-7xl mx-auto" />} allowedRoles={['SLT']} currentUserRole={currentUser?.role} />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
        </Suspense>
      </div>


      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  )
}
