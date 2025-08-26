// Design reference: https://www.figma.com/design/jQgYNKUE4oT4oEkbqy7LcT/THATWORKS%C2%AE?node-id=1578-9379&t=Rp2FhfQfpvtcgdxj-4
// Force rebuild to fix CSS compilation issue
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import React, { Suspense, lazy } from 'react'
import { LoadingFullscreen } from './components/LoadingState'
import { AuthLogin } from './components/AuthWrapper'
import PasswordResetPage from './components/auth/PasswordResetPage'
import RegisterPage from './components/auth/RegisterPage'
import { BackendAuthProvider, useBackendAuth } from './contexts/ReduxAuthProvider'
const AppLayout = lazy(() => import('./components/AppLayout').then(mod => ({ default: mod.AppLayout })))
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimeTrackingProvider } from './contexts/ReduxTimeTrackingProvider'
import { RoleImpersonationProvider, useEffectiveUser } from './contexts/RoleImpersonationContext'
import { RoleImpersonationSwitcher } from './components/RoleImpersonationSwitcher'
// Home now renders login directly

// Simple ProtectedRoute component
function ProtectedRoute({ children, isAuthenticated, authLoading }: {
  children: React.ReactNode,
  isAuthenticated: boolean,
  authLoading: boolean
}) {
  if (authLoading) {
    return (
      <LoadingFullscreen
        message="Loading..."
        size="lg"
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppWithImpersonation() {
  const { isAuthenticated, user, loading: authLoading, logout } = useBackendAuth()
  const effectiveUser = useEffectiveUser()

  const currentUser = effectiveUser ? {
    name: effectiveUser.username 
      ? effectiveUser.username.charAt(0).toUpperCase() + effectiveUser.username.slice(1).toLowerCase()
      : effectiveUser.email?.split('@')[0] 
        ? effectiveUser.email.split('@')[0]!.charAt(0).toUpperCase() + effectiveUser.email.split('@')[0]!.slice(1).toLowerCase()
        : 'User',
    role: (effectiveUser.role || 'team_member') as 'team_member' | 'manager' | 'SLT',
    email: effectiveUser.email || '',
    isImpersonating: effectiveUser.isImpersonating
  } : undefined

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const HomePage = () => {
    // Redirect to app if already authenticated
    if (isAuthenticated && !authLoading) {
      return <Navigate to="/app" replace />
    }

    // Show loading state while checking auth
    if (authLoading) {
      return (
        <LoadingFullscreen
          message="Loading..."
          size="lg"
        />
      )
    }

    return <AuthLogin />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <AuthLogin />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route
        path="/reset-password"
        element={
          isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <PasswordResetPage />
          )
        }
      />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} authLoading={authLoading}>
            <TimeTrackingProvider {...(user?.email && { userEmail: user.email })}>
              {currentUser && (
                <>
                  <AppLayout
                    currentUser={currentUser}
                    onLogout={handleLogout}
                  />
                  <RoleImpersonationSwitcher />
                </>
              )}
            </TimeTrackingProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function AppContent() {
  return (
    <RoleImpersonationProvider>
      <AppWithImpersonation />
    </RoleImpersonationProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BackendAuthProvider>
        <Router>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFullscreen message="Loading..." size="lg" />}>
              <AppContent />
            </Suspense>
          </ErrorBoundary>
        </Router>
      </BackendAuthProvider>
    </ThemeProvider>
  )
}

export default App
