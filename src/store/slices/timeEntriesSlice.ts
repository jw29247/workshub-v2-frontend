import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { timeTrackingService } from '../../services/timeTrackingService'
import type { ActiveTimer, TodayTimeData, TimeLogsHistoryResponse, TimeLogsSummaryResponse } from '../../services/timeTrackingService'

interface TimeEntriesState {
  activeTimers: ActiveTimer[]
  todayTimeData: TodayTimeData | null
  timeHistory: TimeLogsHistoryResponse | null
  timeSummary: TimeLogsSummaryResponse | null
  loading: boolean
  error: string | null
}

const initialState: TimeEntriesState = {
  activeTimers: [],
  todayTimeData: null,
  timeHistory: null,
  timeSummary: null,
  loading: false,
  error: null,
}

const TEAM_ID = '6618875' // From CLAUDE.md

// Async thunks
export const fetchActiveTimers = createAsyncThunk(
  'timeEntries/fetchActiveTimers',
  async () => {
    const response = await timeTrackingService.getActiveTimers()
    return response
  }
)

export const refreshActiveTimers = createAsyncThunk(
  'timeEntries/refreshActiveTimers',
  async () => {
    // Force refresh cache, then fetch latest data
    await timeTrackingService.refreshActiveTimers()
    const response = await timeTrackingService.getActiveTimers()
    return response
  }
)

export const fetchTodayTimeData = createAsyncThunk(
  'timeEntries/fetchTodayTimeData',
  async () => {
    const response = await timeTrackingService.getTodayTimeEntries(TEAM_ID)
    return response
  }
)

export const startTimer = createAsyncThunk(
  'timeEntries/startTimer',
  async ({ taskId, description }: { taskId?: string; description?: string }) => {
    const response = await timeTrackingService.startTimer(TEAM_ID, {
      ...(taskId && { tid: taskId }),
      ...(description && { description }),
    })
    return response
  }
)

export const stopTimer = createAsyncThunk(
  'timeEntries/stopTimer',
  async () => {
    const response = await timeTrackingService.stopTimer(TEAM_ID)
    return response
  }
)

export const fetchTimeHistory = createAsyncThunk(
  'timeEntries/fetchTimeHistory',
  async (params?: {
    startDate?: string
    endDate?: string
    userId?: string
    clientName?: string
    limit?: number
    offset?: number
  }) => {
    const response = await timeTrackingService.getTimeLogsHistory(params)
    return response
  }
)

export const fetchTimeSummary = createAsyncThunk(
  'timeEntries/fetchTimeSummary',
  async (params?: {
    startDate?: string
    endDate?: string
    userId?: string
    clientName?: string
  }) => {
    const response = await timeTrackingService.getTimeLogsSummary(params)
    return response
  }
)

const timeEntriesSlice = createSlice({
  name: 'timeEntries',
  initialState,
  reducers: {
    updateActiveTimer: (state, action: PayloadAction<ActiveTimer>) => {
      const index = state.activeTimers.findIndex(timer => timer.id === action.payload.id)
      if (index !== -1) {
        state.activeTimers[index] = action.payload
      } else {
        state.activeTimers.push(action.payload)
      }
    },
    removeActiveTimer: (state, action: PayloadAction<string>) => {
      state.activeTimers = state.activeTimers.filter(timer => timer.id !== action.payload)
    },
    clearTimeEntriesError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch active timers
    builder
      .addCase(fetchActiveTimers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchActiveTimers.fulfilled, (state, action) => {
        state.loading = false
        state.activeTimers = action.payload.active_timers
      })
      .addCase(fetchActiveTimers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch active timers'
      })

    // Refresh active timers
    builder
      .addCase(refreshActiveTimers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(refreshActiveTimers.fulfilled, (state, action) => {
        state.loading = false
        state.activeTimers = action.payload.active_timers
      })
      .addCase(refreshActiveTimers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to refresh active timers'
      })

    // Fetch today's time data
    builder
      .addCase(fetchTodayTimeData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTodayTimeData.fulfilled, (state, action) => {
        state.loading = false
        state.todayTimeData = action.payload
      })
      .addCase(fetchTodayTimeData.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch today\'s time data'
      })

    // Start timer
    builder
      .addCase(startTimer.fulfilled, (state, action) => {
        state.activeTimers.push(action.payload.timer)
      })
      .addCase(startTimer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to start timer'
      })

    // Stop timer
    builder
      .addCase(stopTimer.fulfilled, (state) => {
        // Timer will be removed via WebSocket event
        state.error = null
      })
      .addCase(stopTimer.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to stop timer'
      })

    // Fetch time history
    builder
      .addCase(fetchTimeHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTimeHistory.fulfilled, (state, action) => {
        state.loading = false
        state.timeHistory = action.payload
      })
      .addCase(fetchTimeHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch time history'
      })

    // Fetch time summary
    builder
      .addCase(fetchTimeSummary.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTimeSummary.fulfilled, (state, action) => {
        state.loading = false
        state.timeSummary = action.payload
      })
      .addCase(fetchTimeSummary.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch time summary'
      })
  },
})

export const { updateActiveTimer, removeActiveTimer, clearTimeEntriesError } = timeEntriesSlice.actions
export default timeEntriesSlice.reducer
