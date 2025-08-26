import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { settingsService } from '../../services/settingsService'
import type { UserSettings } from '../../services/settingsService'

interface SettingsState {
  userSettings: UserSettings[]
  loading: boolean
  error: string | null
}

const initialState: SettingsState = {
  userSettings: [],
  loading: false,
  error: null,
}

// Async thunks
export const fetchAllUserSettings = createAsyncThunk(
  'settings/fetchAllUserSettings',
  async () => {
    const response = await settingsService.getAllUserSettings()
    return response.users
  }
)

export const updateUserSettings = createAsyncThunk(
  'settings/updateUserSettings',
  async ({ email, settings }: { email: string; settings: Partial<UserSettings> }) => {
    const response = await settingsService.updateUserSettings(email, settings)
    return response
  }
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch all user settings
    builder
      .addCase(fetchAllUserSettings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllUserSettings.fulfilled, (state, action) => {
        state.loading = false
        state.userSettings = action.payload
      })
      .addCase(fetchAllUserSettings.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch user settings'
      })

    // Update user settings
    builder
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        const index = state.userSettings.findIndex(
          user => user.user_email === action.payload.user_email
        )
        if (index !== -1) {
          state.userSettings[index] = action.payload
        } else {
          state.userSettings.push(action.payload)
        }
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update user settings'
      })
  },
})

export const { clearSettingsError } = settingsSlice.actions
export default settingsSlice.reducer
