import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  Info,
  Filter
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { apiService } from '../services/apiService'
import { PageHeader } from './PageHeader'

interface PulseCheckData {
  id: number
  user_id: string
  user_name: string
  user_email: string
  score: number
  date: string
  created_at: string
  updated_at: string
}

interface ChartDataPoint {
  date: string
  [key: string]: string | number // Dynamic user scores
}

interface PulseCheckLeadershipProps {
  currentUser?: {
    role: 'team_member' | 'manager' | 'SLT'
  }
}

const COLORS = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'
]

export const PulseCheckLeadership: React.FC<PulseCheckLeadershipProps> = ({ currentUser }) => {
  const [pulseData, setPulseData] = useState<PulseCheckData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<number>(30)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Check if user has permission
  const canViewLeadershipData = currentUser?.role === 'SLT'

  const loadPulseData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.get(`/api/pulse-checks/admin/all?days=${days}`)

      if (!response.ok) {
        throw new Error('Failed to fetch pulse check data')
      }

      const data = await response.json()
      setPulseData(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pulse check data')
      setPulseData([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (canViewLeadershipData) {
      loadPulseData()
    }
  }, [canViewLeadershipData, days, loadPulseData])

  const formatChartData = (): ChartDataPoint[] => {
    if (!pulseData.length) return []

    // Get unique users and initialize selectedUsers if empty
    const uniqueUsers = [...new Set(pulseData.map(item => item.user_name))]
    if (selectedUsers.length === 0) {
      setSelectedUsers(uniqueUsers.slice(0, 5)) // Show first 5 users by default
    }

    // Group data by date
    const dateGroups: { [date: string]: { [userName: string]: number } } = {}

    pulseData.forEach(item => {
      const dateStr = format(parseISO(item.date), 'MMM dd')
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {}
      }
      dateGroups[dateStr][item.user_name] = item.score
    })

    // Convert to chart format
    return Object.entries(dateGroups)
      .map(([date, users]) => ({
        date,
        ...users
      }))
      .sort((a, b) => new Date(a.date + ', 2024').getTime() - new Date(b.date + ', 2024').getTime())
  }

  const getUniqueUsers = (): string[] => {
    return [...new Set(pulseData.map(item => item.user_name))].sort()
  }

  const getAverageScore = (userName: string): number => {
    const userScores = pulseData.filter(item => item.user_name === userName)
    if (!userScores.length) return 0
    return Math.round((userScores.reduce((sum, item) => sum + item.score, 0) / userScores.length) * 10) / 10
  }

  const toggleUserSelection = (userName: string) => {
    setSelectedUsers(prev =>
      prev.includes(userName)
        ? prev.filter(name => name !== userName)
        : [...prev, userName]
    )
  }

  if (!canViewLeadershipData) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">
              You don't have permission to view leadership pulse check data.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Only Senior Leadership Team members can access this section.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-brand-purple-strong dark:text-purple-400 animate-pulse mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">Loading pulse check data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Error Loading Data</h3>
                <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const chartData = formatChartData()
  const uniqueUsers = getUniqueUsers()

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Team Pulse Trends"
        subtitle="Track pulse check scores across all team members over time"
      >
        {/* Time Period Filter */}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-neutral-400" />
          <select
            value={days}
            onChange={(e) => { setDays(parseInt(e.target.value)); }}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-purple-strong/50 focus:border-brand-purple-strong transition-colors"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {uniqueUsers.length}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Active Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {pulseData.length}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Total Responses</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {pulseData?.length ? Math.round((pulseData.reduce((sum, item) => sum + item.score, 0) / pulseData.length) * 10) / 10 : 0}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">Average Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Filter */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Filter Team Members</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {uniqueUsers.map(userName => (
            <button
              key={userName}
              onClick={() => { toggleUserSelection(userName); }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedUsers.includes(userName)
                  ? 'border-brand-purple-strong bg-brand-purple-strong/10 text-brand-purple-strong dark:text-purple-400'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-brand-purple-strong/50'
              }`}
            >
              <p className="font-medium text-sm">{userName}</p>
              <p className="text-xs opacity-75">Avg: {getAverageScore(userName)}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setSelectedUsers(uniqueUsers); }}
            className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => { setSelectedUsers([]); }}
            className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && selectedUsers.length > 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Pulse Score Trends</h3>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis
                  domain={[1, 5]}
                  stroke="#6B7280"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(15 23 42)',
                    border: '1px solid rgb(71 85 105)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Legend />
                {selectedUsers.map((userName, index) => (
                  <Line
                    key={userName}
                    type="monotone"
                    dataKey={userName}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[index % COLORS.length] || '#8B5CF6', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-300">
              {selectedUsers.length === 0
                ? "Please select team members to view their pulse trends"
                : "No pulse check data available for the selected period"
              }
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              This dashboard shows pulse check scores for all team members. Scores range from 1-5, with higher scores indicating better wellbeing.
              Use the filters to customize the view and identify trends or team members who might need support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
