import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'
import { clientHealthService, type HealthTrend, type HealthMetric, type HealthScoreStatus } from '../services/clientHealthService'
import { clientService, type Client } from '../services/clientService'
import { ActionButton } from './ActionButton'
import { useTheme } from '../contexts/ThemeContext'

interface ClientHealthTrendsProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const ClientHealthTrends: React.FC<ClientHealthTrendsProps> = () => {
  const { theme } = useTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [selectedClient, setSelectedClient] = useState<number | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<number[]>([])
  const [trend, setTrend] = useState<HealthTrend | null>(null)
  const [loading, setLoading] = useState(false)
  const [, setError] = useState<string | null>(null)

  // Score to numeric mapping for visualization
  const scoreToNumber = (score: HealthScoreStatus): number => {
    switch (score) {
      case 'green': return 3
      case 'amber': return 2
      case 'red': return 1
    }
  }

  // const _numberToScore = (num: number): HealthScoreStatus => {
  //   if (num >= 2.5) return 'green'
  //   if (num >= 1.5) return 'amber'
  //   return 'red'
  // }

  const getScoreColor = (score: HealthScoreStatus): string => {
    switch (score) {
      case 'green': return '#10B981'
      case 'amber': return '#F59E0B'
      case 'red': return '#EF4444'
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchTrendData = React.useCallback(async () => {
    if (!selectedClient) return

    setLoading(true)
    try {
      const data = await clientHealthService.getHealthTrend(
        selectedClient,
        undefined, // Use default start date (12 weeks ago)
        undefined, // Use default end date (today)
        selectedMetrics.length > 0 ? selectedMetrics : undefined
      )
      setTrend(data)
    } catch {
      setError('Failed to load trend data')
    } finally {
      setLoading(false)
    }
  }, [selectedClient, selectedMetrics])

  useEffect(() => {
    if (selectedClient) {
      fetchTrendData()
    }
  }, [selectedClient, fetchTrendData])

  const fetchInitialData = async () => {
    try {
      const [clientsData, metricsData] = await Promise.all([
        clientService.getClients(true),
        clientHealthService.getMetrics(true)
      ])
      setClients(clientsData)
      setMetrics(metricsData)

      // Select first client by default
      if (clientsData.length > 0 && clientsData[0]) {
        setSelectedClient(clientsData[0].id)
      }

      // Select all metrics by default
      setSelectedMetrics(metricsData.map(m => m.id))
    } catch {
      setError('Failed to load data')
    }
  }


  const handleMetricToggle = (metricId: number) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId)
      } else {
        return [...prev, metricId]
      }
    })
  }

  const formatChartData = () => {
    if (!trend) return []

    // Group data by week
    const dataByWeek: Record<string, { week: string; [key: string]: number | string }> = {}

    trend.trend_data.forEach(item => {
      if (!dataByWeek[item.week_starting]) {
        dataByWeek[item.week_starting] = {
          week: new Date(item.week_starting).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
          }),
          fullDate: item.week_starting
        }
      }
      // Store both the score value and the original status
      const weekData = dataByWeek[item.week_starting]
      if (weekData) {
        weekData[`${item.metric_name}_value`] = scoreToNumber(item.score)
        weekData[`${item.metric_name}_status`] = item.score
      }
    })

    return Object.values(dataByWeek).sort((a, b) => {
      const aDate = a['fullDate'] as string
      const bDate = b['fullDate'] as string
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
  }

  const calculateStatusChange = () => {
    if (!trend || trend.trend_data.length < 2) return { improved: 0, worsened: 0, unchanged: 0 }

    const weeks = [...new Set(trend.trend_data.map(d => d.week_starting))].sort()
    if (weeks.length < 2) return { improved: 0, worsened: 0, unchanged: 0 }

    const firstWeek = weeks[0]
    const lastWeek = weeks[weeks.length - 1]

    let improved = 0
    let worsened = 0
    let unchanged = 0

    metrics.filter(m => selectedMetrics.includes(m.id)).forEach(metric => {
      const firstScore = trend.trend_data.find(d => d.week_starting === firstWeek && d.metric_id === metric.id)
      const lastScore = trend.trend_data.find(d => d.week_starting === lastWeek && d.metric_id === metric.id)

      if (firstScore && lastScore) {
        const firstValue = scoreToNumber(firstScore.score)
        const lastValue = scoreToNumber(lastScore.score)

        if (lastValue > firstValue) improved++
        else if (lastValue < firstValue) worsened++
        else unchanged++
      }
    })

    return { improved, worsened, unchanged }
  }

  const chartData = formatChartData()
  const statusChange = calculateStatusChange()

  // Custom Y-axis tick formatter
  const yAxisTickFormatter = (value: number) => {
    if (value === 3) return 'Green'
    if (value === 2) return 'Amber'
    if (value === 1) return 'Red'
    return ''
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string; payload: Record<string, any> }>; label?: string }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
          <p className="font-medium text-neutral-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: { dataKey: string; value: number; color: string; payload: Record<string, any> }, index: number) => {
            const metricName = entry.dataKey.replace('_value', '')
            const status = entry.payload[`${metricName}_status`] as HealthScoreStatus
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getScoreColor(status) }}
                />
                <span className="text-neutral-600 dark:text-neutral-300">
                  {metricName}:
                </span>
                <span className="font-medium text-neutral-900 dark:text-white capitalize">
                  {status}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Client Health Trends
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Visualize client health metrics over time
          </p>
        </div>
        <ActionButton variant="secondary" onClick={fetchTrendData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </ActionButton>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="space-y-4">
          {/* Client Selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Select Client
            </label>
            <select
              value={selectedClient || ''}
              onChange={(e) => { setSelectedClient(Number(e.target.value)); }}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
            >
              <option value="">Choose a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Filters */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Filter Metrics
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {metrics.map((metric) => (
                <label
                  key={metric.id}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => { handleMetricToggle(metric.id); }}
                    className="rounded border-neutral-300 dark:border-neutral-600"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {metric.display_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trend Summary */}
      {trend && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Period
            </h3>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-2">
              {new Date(trend.start_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
              })} - {new Date(trend.end_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Improved
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-5 w-5 text-cro-win-strong dark:text-green-400" />
              <p className="text-lg font-semibold text-cro-win-strong dark:text-green-400">
                {statusChange.improved}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Worsened
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <TrendingDown className="h-5 w-5 text-cro-loss-strong dark:text-red-400" />
              <p className="text-lg font-semibold text-cro-loss-strong dark:text-red-400">
                {statusChange.worsened}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Unchanged
            </h3>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mt-2">
              {statusChange.unchanged}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {selectedClient && chartData.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Health Score Trend
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                />
                <XAxis
                  dataKey="week"
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                />
                <YAxis
                  domain={[0.5, 3.5]}
                  ticks={[1, 2, 3]}
                  tickFormatter={yAxisTickFormatter}
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => value.replace('_value', '')}
                  wrapperStyle={{
                    paddingTop: '20px',
                    color: theme === 'dark' ? '#E5E7EB' : '#1F2937'
                  }}
                />
                {metrics
                  .filter(m => selectedMetrics.includes(m.id))
                  .map((metric) => (
                    <Bar
                      key={metric.id}
                      dataKey={`${metric.display_name}_value`}
                      name={metric.display_name}
                    >
                      {chartData.map((entry, index) => {
                        const status = entry[`${metric.display_name}_status`] as HealthScoreStatus
                        return (
                          <Cell key={`cell-${index}`} fill={getScoreColor(status || 'amber')} />
                        )
                      })}
                    </Bar>
                  ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Green</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Amber</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Red</span>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {selectedClient && chartData.length === 0 && !loading && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-12 border border-neutral-200 dark:border-neutral-700 text-center">
          <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">
            No health score data available for the selected client and metrics.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-12 border border-neutral-200 dark:border-neutral-700 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">
            Loading trend data...
          </p>
        </div>
      )}
    </div>
  )
}
