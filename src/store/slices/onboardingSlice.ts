import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { apiRequest } from '../../utils/api'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for the element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: () => void
  showSkip?: boolean
  showNext?: boolean
  showPrev?: boolean
}

export interface OnboardingState {
  isActive: boolean
  currentStepIndex: number
  steps: OnboardingStep[]
  hasCompletedOnboarding: boolean
  isLoading: boolean
  error: string | null
  userRole: 'SLT' | 'manager' | 'team_member' | null
}

const initialState: OnboardingState = {
  isActive: false,
  currentStepIndex: 0,
  steps: [],
  hasCompletedOnboarding: false,
  isLoading: false,
  error: null,
  userRole: null
}

// Async thunk to check if user has completed onboarding
export const checkOnboardingStatus = createAsyncThunk(
  'onboarding/checkStatus',
  async (userId: string | number) => {
    return await apiRequest(`/api/admin/users/${userId}/onboarding-status`, {
      method: 'GET'
    })
  }
)

// Async thunk to mark onboarding as complete
export const completeOnboarding = createAsyncThunk(
  'onboarding/complete',
  async (userId: string | number) => {
    return await apiRequest(`/api/admin/users/${userId}/complete-onboarding`, {
      method: 'POST'
    })
  }
)

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    startOnboarding: (state, action: PayloadAction<{ role: 'SLT' | 'manager' | 'team_member', steps: OnboardingStep[] }>) => {
      state.isActive = true
      state.currentStepIndex = 0
      state.steps = action.payload.steps
      state.userRole = action.payload.role
      state.error = null
    },
    nextStep: (state) => {
      if (state.currentStepIndex < state.steps.length - 1) {
        state.currentStepIndex += 1
      }
    },
    previousStep: (state) => {
      if (state.currentStepIndex > 0) {
        state.currentStepIndex -= 1
      }
    },
    goToStep: (state, action: PayloadAction<number>) => {
      const stepIndex = action.payload
      if (stepIndex >= 0 && stepIndex < state.steps.length) {
        state.currentStepIndex = stepIndex
      }
    },
    skipOnboarding: (state) => {
      state.isActive = false
      state.currentStepIndex = 0
      state.steps = []
    },
    finishOnboarding: (state) => {
      state.isActive = false
      state.hasCompletedOnboarding = true
      state.currentStepIndex = 0
      state.steps = []
    },
    resetOnboarding: (state) => {
      return initialState
    },
    setOnboardingError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    }
  },
  extraReducers: (builder) => {
    builder
      // Check onboarding status
      .addCase(checkOnboardingStatus.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(checkOnboardingStatus.fulfilled, (state, action) => {
        state.isLoading = false
        state.hasCompletedOnboarding = action.payload.hasCompletedOnboarding
      })
      .addCase(checkOnboardingStatus.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to check onboarding status'
      })
      // Complete onboarding
      .addCase(completeOnboarding.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.isLoading = false
        state.hasCompletedOnboarding = true
        state.isActive = false
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to save onboarding completion'
      })
  }
})

export const {
  startOnboarding,
  nextStep,
  previousStep,
  goToStep,
  skipOnboarding,
  finishOnboarding,
  resetOnboarding,
  setOnboardingError
} = onboardingSlice.actions

// Selectors
export const selectOnboarding = (state: RootState) => state.onboarding
export const selectCurrentStep = (state: RootState) => 
  state.onboarding.steps[state.onboarding.currentStepIndex] || null
export const selectIsFirstStep = (state: RootState) => state.onboarding.currentStepIndex === 0
export const selectIsLastStep = (state: RootState) => 
  state.onboarding.currentStepIndex === state.onboarding.steps.length - 1

export default onboardingSlice.reducer