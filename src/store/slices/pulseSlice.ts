import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { pulseCheckService } from '../../services/pulseCheckService'
import type { PulseCheck } from '../../services/pulseCheckService'

interface PulseState {
  myPulseChecks: PulseCheck[]
  todaysPulseCheck: PulseCheck | null
  loading: boolean
  error: string | null
}

const initialState: PulseState = {
  myPulseChecks: [],
  todaysPulseCheck: null,
  loading: false,
  error: null,
}

// Async thunks
export const submitPulseCheck = createAsyncThunk(
  'pulse/submitPulseCheck',
  async ({ score, date }: { score: number; date?: string }) => {
    const response = await pulseCheckService.submitPulseCheck(score, date)
    return response
  }
)

export const fetchMyPulseChecks = createAsyncThunk(
  'pulse/fetchMyPulseChecks',
  async (limit: number = 30) => {
    const response = await pulseCheckService.getMyPulseChecks(limit)
    return response
  }
)

export const fetchTodaysPulseCheck = createAsyncThunk(
  'pulse/fetchTodaysPulseCheck',
  async () => {
    const response = await pulseCheckService.getTodaysPulseCheck()
    return response
  }
)

const pulseSlice = createSlice({
  name: 'pulse',
  initialState,
  reducers: {
    clearPulseError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Submit pulse check
    builder
      .addCase(submitPulseCheck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitPulseCheck.fulfilled, (state, action) => {
        state.loading = false
        state.todaysPulseCheck = action.payload
        // Update or add to myPulseChecks
        const existingIndex = state.myPulseChecks.findIndex(
          pc => pc.date === action.payload.date
        )
        if (existingIndex !== -1) {
          state.myPulseChecks[existingIndex] = action.payload
        } else {
          state.myPulseChecks.unshift(action.payload)
        }
      })
      .addCase(submitPulseCheck.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to submit pulse check'
      })

    // Fetch my pulse checks
    builder
      .addCase(fetchMyPulseChecks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyPulseChecks.fulfilled, (state, action) => {
        state.loading = false
        state.myPulseChecks = action.payload
      })
      .addCase(fetchMyPulseChecks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch pulse checks'
      })

    // Fetch today's pulse check
    builder
      .addCase(fetchTodaysPulseCheck.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTodaysPulseCheck.fulfilled, (state, action) => {
        state.loading = false
        state.todaysPulseCheck = action.payload
      })
      .addCase(fetchTodaysPulseCheck.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch today\'s pulse check'
      })
  },
})

export const { clearPulseError } = pulseSlice.actions
export default pulseSlice.reducer
