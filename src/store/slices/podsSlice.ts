import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { adminService } from '../../services/adminService'
import type { Pod, PodCreate, PodUpdate, UserManagement, UserManagementUpdate } from '../../services/adminService'

interface PodsState {
  pods: Pod[]
  currentPod: Pod | null
  users: UserManagement[]
  loading: boolean
  error: string | null
}

const initialState: PodsState = {
  pods: [],
  currentPod: null,
  users: [],
  loading: false,
  error: null,
}

// Async thunks
export const fetchPods = createAsyncThunk(
  'pods/fetchPods',
  async (includeInactive: boolean = false) => {
    const response = await adminService.getPods(includeInactive)
    return response
  }
)

export const createPod = createAsyncThunk(
  'pods/createPod',
  async (podData: PodCreate) => {
    const response = await adminService.createPod(podData)
    return response
  }
)

export const updatePod = createAsyncThunk(
  'pods/updatePod',
  async ({ podId, updates }: { podId: number; updates: PodUpdate }) => {
    const response = await adminService.updatePod(podId, updates)
    return response
  }
)

export const deletePod = createAsyncThunk(
  'pods/deletePod',
  async (podId: number) => {
    await adminService.deletePod(podId)
    return podId
  }
)

export const fetchUsers = createAsyncThunk(
  'pods/fetchUsers',
  async (params?: {
    search?: string
    pod_id?: number
    role?: string
    skip?: number
    limit?: number
  }) => {
    const response = await adminService.getUsers(params)
    return response
  }
)

export const updateUser = createAsyncThunk(
  'pods/updateUser',
  async ({ userId, updates }: { userId: string; updates: UserManagementUpdate }) => {
    const response = await adminService.updateUser(userId, updates)
    return response
  }
)

export const deleteUser = createAsyncThunk(
  'pods/deleteUser',
  async (userId: string) => {
    await adminService.deleteUser(userId)
    return userId
  }
)

const podsSlice = createSlice({
  name: 'pods',
  initialState,
  reducers: {
    setCurrentPod: (state, action: PayloadAction<Pod | null>) => {
      state.currentPod = action.payload
    },
    clearPodsError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch pods
    builder
      .addCase(fetchPods.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPods.fulfilled, (state, action) => {
        state.loading = false
        state.pods = action.payload
      })
      .addCase(fetchPods.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch pods'
      })

    // Create pod
    builder
      .addCase(createPod.fulfilled, (state, action) => {
        state.pods.push(action.payload)
      })
      .addCase(createPod.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create pod'
      })

    // Update pod
    builder
      .addCase(updatePod.fulfilled, (state, action) => {
        const index = state.pods.findIndex(pod => pod.id === action.payload.id)
        if (index !== -1) {
          state.pods[index] = action.payload
        }
        if (state.currentPod?.id === action.payload.id) {
          state.currentPod = action.payload
        }
      })
      .addCase(updatePod.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update pod'
      })

    // Delete pod
    builder
      .addCase(deletePod.fulfilled, (state, action) => {
        state.pods = state.pods.filter(pod => pod.id !== action.payload)
        if (state.currentPod?.id === action.payload) {
          state.currentPod = null
        }
      })
      .addCase(deletePod.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete pod'
      })

    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch users'
      })

    // Update user
    builder
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload.id)
        if (index !== -1) {
          state.users[index] = action.payload
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update user'
      })

    // Delete user
    builder
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.id !== action.payload)
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete user'
      })
  },
})

export const { setCurrentPod, clearPodsError } = podsSlice.actions
export default podsSlice.reducer
