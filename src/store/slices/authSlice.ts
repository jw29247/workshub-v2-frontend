import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { backendAuthService } from '../../services/backendAuthService'

interface User {
  id: string
  email: string
  username: string
  role?: string
  pod?: string
  email_verified?: boolean
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

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  preferences: UserPreferences | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: backendAuthService.isAuthenticated(),
  user: backendAuthService.getStoredUser(),
  preferences: null,
  loading: false,
  error: null,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, remember = true }: { email: string; password: string; remember?: boolean }) => {
    const response = await backendAuthService.login({ email, password }, { remember })
    return response
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, username }: { email: string; password: string; username: string }) => {
    const response = await backendAuthService.register({ email, password, username })
    return response
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async () => {
    const user = await backendAuthService.getCurrentUser()
    return user
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: { username?: string; email?: string }) => {
    const updatedUser = await backendAuthService.updateProfile(data)
    return updatedUser
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    await backendAuthService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    })
  }
)

export const fetchUserPreferences = createAsyncThunk(
  'auth/fetchUserPreferences',
  async () => {
    const preferences = await backendAuthService.getUserPreferences()
    return preferences
  }
)

export const updateUserPreferences = createAsyncThunk(
  'auth/updateUserPreferences',
  async (preferences: UserPreferences) => {
    const updatedPreferences = await backendAuthService.updateUserPreferences(preferences)
    return updatedPreferences
  }
)

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string) => {
    await backendAuthService.requestPasswordReset({ email })
  }
)

export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async ({ token, newPassword }: { token: string; newPassword: string }) => {
    await backendAuthService.confirmPasswordReset({ token, new_password: newPassword })
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      backendAuthService.logout()
      state.isAuthenticated = false
      state.user = null
      state.preferences = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Login failed'
      })

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Registration failed'
      })

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
      })

    // Update profile
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update profile'
      })

    // Change password
    builder
      .addCase(changePassword.fulfilled, () => {
        // Password changed successfully
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to change password'
      })

    // Fetch preferences
    builder
      .addCase(fetchUserPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload
      })
      .addCase(fetchUserPreferences.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch preferences'
      })

    // Update preferences
    builder
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update preferences'
      })
  },
})

export const { logout, clearError, setUser } = authSlice.actions

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.loading

export default authSlice.reducer
