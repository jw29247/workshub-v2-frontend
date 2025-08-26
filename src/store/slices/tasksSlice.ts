import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { apiService } from '../../services/apiService'

interface Task {
  id: string
  name: string
  description?: string
  client_name?: string
  assignee?: string
  status?: string
  priority?: string
  due_date?: string
  created_at?: string
  updated_at?: string
}

interface TasksState {
  tasks: Task[]
  currentTask: Task | null
  loading: boolean
  error: string | null
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async () => {
    const response = await apiService.get('/api/tasks')
    if (!response.ok) {
      throw new Error('Failed to fetch tasks')
    }
    return response.json()
  }
)

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId: string) => {
    const response = await apiService.get(`/api/tasks/${taskId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch task')
    }
    return response.json()
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: Partial<Task>) => {
    const response = await apiService.post('/api/tasks', taskData)
    if (!response.ok) {
      throw new Error('Failed to create task')
    }
    return response.json()
  }
)

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
    const response = await apiService.put(`/api/tasks/${taskId}`, updates)
    if (!response.ok) {
      throw new Error('Failed to update task')
    }
    return response.json()
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string) => {
    const response = await apiService.delete(`/api/tasks/${taskId}`)
    if (!response.ok) {
      throw new Error('Failed to delete task')
    }
    return taskId
  }
)

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload
    },
    clearTasksError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch tasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false
        state.tasks = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch tasks'
      })

    // Fetch task by ID
    builder
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.currentTask = action.payload
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch task'
      })

    // Create task
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create task'
      })

    // Update task
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update task'
      })

    // Delete task
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(task => task.id !== action.payload)
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete task'
      })
  },
})

export const { setCurrentTask, clearTasksError } = tasksSlice.actions
export default tasksSlice.reducer
