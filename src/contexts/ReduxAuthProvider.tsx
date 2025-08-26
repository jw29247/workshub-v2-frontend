import React, { createContext, useContext, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import {
  login,
  register,
  logout,
  updateProfile,
  changePassword,
  fetchUserPreferences,
  updateUserPreferences,
  fetchCurrentUser,
} from '../store/slices/authSlice'

interface User {
  id: string
  email: string
  username: string
  role?: string
  pod?: string
}

interface UserPreferences {
  email_notifications?: boolean
  task_updates?: boolean
  time_tracking?: boolean
  weekly_reports?: boolean
  dashboard_theme?: string
  time_format?: string
  show_in_dashboard?: boolean
}

interface BackendAuthContextType {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => void
  updateProfile: (data: { username?: string; email?: string }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  getUserPreferences: () => Promise<UserPreferences>
  updateUserPreferences: (preferences: UserPreferences) => Promise<UserPreferences>
}

const BackendAuthContext = createContext<BackendAuthContextType | undefined>(undefined)

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, loading, preferences } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Check if user is authenticated on mount
    if (isAuthenticated && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, isAuthenticated, user])

  const handleLogin = async (email: string, password: string, remember: boolean = true) => {
    try {
      const result = await dispatch(login({ email, password, remember })).unwrap()

      return result
    } catch (error) {
      console.error('Login failed in ReduxAuthProvider:', error)
      throw error
    }
  }

  const handleRegister = async (email: string, password: string, username: string) => {
    await dispatch(register({ email, password, username })).unwrap()
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  const handleUpdateProfile = async (data: { username?: string; email?: string }) => {
    await dispatch(updateProfile(data)).unwrap()
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    await dispatch(changePassword({ currentPassword, newPassword })).unwrap()
  }

  const handleGetUserPreferences = async (): Promise<UserPreferences> => {
    if (!preferences) {
      const result = await dispatch(fetchUserPreferences()).unwrap()
      return result
    }
    return preferences
  }

  const handleUpdateUserPreferences = async (prefs: UserPreferences): Promise<UserPreferences> => {
    const result = await dispatch(updateUserPreferences(prefs)).unwrap()
    return result
  }

  return (
    <BackendAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateProfile: handleUpdateProfile,
        changePassword: handleChangePassword,
        getUserPreferences: handleGetUserPreferences,
        updateUserPreferences: handleUpdateUserPreferences,
      }}
    >
      {children}
    </BackendAuthContext.Provider>
  )
}

// Export the hook to use the context
// eslint-disable-next-line react-refresh/only-export-components
export function useBackendAuth() {
  const context = useContext(BackendAuthContext)
  if (context === undefined) {
    throw new Error('useBackendAuth must be used within a BackendAuthProvider')
  }
  return context
}
