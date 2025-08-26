import React, { useState, useEffect } from 'react'
import {
  Heart,
  Calendar,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BarChart3,
  User,
  Download
} from 'lucide-react'
import { pulseCheckService, type AllPulsesResponse, type UserPulseCheck } from '../services/pulseCheckService'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { PageHeader } from './PageHeader'

interface PulseCheckAdminProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

const PULSE_OPTIONS = [
  { value: 1, label: 'Very Bad', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', barColor: 'bg-red-500 dark:bg-red-400' },
  { value: 2, label: 'Bad', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', barColor: 'bg-orange-500 dark:bg-orange-400' },
  { value: 3, label: 'Okay', color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', barColor: 'bg-yellow-500 dark:bg-yellow-400' },
  { value: 4, label: 'Good', color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', barColor: 'bg-green-500 dark:bg-green-400' },
  { value: 5, label: 'Very Good', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', barColor: 'bg-emerald-500 dark:bg-emerald-400' }
]

export const PulseCheckAdmin: React.FC<PulseCheckAdminProps> = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [pulseData, setPulseData] = useState<AllPulsesResponse | null>(null)
  const [weekData, setWeekData] = useState<AllPulsesResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  // Check access
  useEffect(() => {
    if (currentUser?.role !== 'SLT') {
      setError('Access denied. This page is only available to Senior Leadership Team members.')
      setLoading(false)
    }
  }, [currentUser])

  // Load data based on view mode
  useEffect(() => {
    if (currentUser?.role === 'SLT') {
      if (viewMode === 'day') {
        loadDayData()
      } else {
        loadWeekData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode, currentUser])

  const loadDayData = async () => {
    try {
      setLoading(true)
      setError(null)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const data = await pulseCheckService.getAllPulseChecks(dateStr)
      setPulseData(data)
    } catch (err) {
      const error = err as Error
      if (error.message?.includes('403')) {
        setError('Access denied. SLT members only.')
      } else {
        setError('Failed to load pulse check data')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadWeekData = async () => {
    try {
      setLoading(true)
      setError(null)
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')
      const data = await pulseCheckService.getPulseChecksRange(startStr, endStr)
      setWeekData([data as any])
    } catch (err) {
      const error = err as Error
      if (error.message?.includes('403')) {
        setError('Access denied. SLT members only.')
      } else {
        setError(`Failed to load weekly data: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(prev, days))
  }

  const handleExportCSV = () => {
    if (!pulseData) return

    const csv = [
      ['Date', 'Username', 'Email', 'Role', 'Score', 'Submitted At'],
      ...pulseData.pulses.map((p: any) => [
        p.date,
        p.username,
        p.email,
        p.role || 'N/A',
        p.score.toString(),
        format(parseISO(p.created_at), 'yyyy-MM-dd HH:mm:ss')
      ])
    ]

    const csvContent = csv.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pulse-checks-${pulseData.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPulseOption = (score: number) => {
    const option = PULSE_OPTIONS.find(opt => opt.value === score)
    return option || PULSE_OPTIONS[2] // Default to 'Okay' option
  }

  const getScoreDistribution = (pulses: UserPulseCheck[]) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    pulses.forEach(p => {
      if (p.score >= 1 && p.score <= 5) {
        distribution[p.score as keyof typeof distribution]++
      }
    })
    return distribution
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Heart className="h-12 w-12 text-brand-purple-strong dark:text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading pulse check data...</p>
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
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400">Access Restricted</h3>
                <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Pulse Check Scores"
        subtitle="Monitor team wellbeing and sentiment across the organization"
      >
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => { setViewMode('day'); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => { setViewMode('week'); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleDateChange(viewMode === 'day' ? -1 : -7); }}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                dateFormat={viewMode === 'day' ? 'EEEE, MMM d, yyyy' : "'Week of' MMM d"}
                maxDate={new Date()}
                customInput={
                  <button className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    <Calendar className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {viewMode === 'day'
                        ? format(selectedDate, 'EEEE, MMM d, yyyy')
                        : `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')}`
                      }
                    </span>
                  </button>
                }
                calendarClassName="pulse-admin-calendar"
                showWeekNumbers={viewMode === 'week'}
                calendarStartDay={1}
              />
            </div>
            <button
              onClick={() => { handleDateChange(viewMode === 'day' ? 1 : 7); }}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              disabled={isSameDay(selectedDate, new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Export Button */}
          {viewMode === 'day' && pulseData && pulseData.total_responses > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-brand-purple-strong hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </PageHeader>

      {viewMode === 'day' ? (
        // Day View
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">Total Responses</h3>
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                {pulseData?.total_responses || 0}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                team members checked in
              </p>
            </div>

            <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">Average Score</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {pulseData?.average_score || 0}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">/ 5</p>
              </div>
              {pulseData && pulseData.average_score > 0 && (
                <p className={`text-sm mt-1 font-medium ${
                  getPulseOption(Math.round(pulseData.average_score))?.color || 'text-neutral-600'
                }`}>
                  {getPulseOption(Math.round(pulseData.average_score))?.label || 'Unknown'}
                </p>
              )}
            </div>

            <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">Score Distribution</h3>
              </div>
              {pulseData && pulseData.total_responses > 0 ? (
                <div className="flex items-end gap-1 h-20">
                  {Object.entries(getScoreDistribution(pulseData.pulses)).map(([score, count]) => {
                    const percentage = (count / pulseData.total_responses) * 100
                    const option = getPulseOption(parseInt(score))
                    const barHeight = Math.max(percentage, 5) // Minimum 5% height for visibility
                    return (
                      <div
                        key={score}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                      >
                        <div className="w-full flex flex-col justify-end" style={{ height: '64px' }}>
                          <div
                            className={`w-full ${option?.barColor || 'bg-neutral-300'} rounded-t transition-all duration-300`}
                            style={{ height: `${barHeight}%` }}
                            title={`${count} responses (${Math.round(percentage)}%)`}
                          />
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">{score}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No data</p>
              )}
            </div>
          </div>

          {/* Individual Responses */}
          <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-6">
              Individual Responses
            </h2>

            {pulseData && pulseData.total_responses > 0 ? (
              <div className="space-y-3">
                {pulseData.pulses.map((pulse: any, index: number) => {
                  const option = getPulseOption(pulse.score)
                  return (
                    <div
                      key={`${pulse.user_id}-${index}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-neutral-900 dark:text-white">
                            {pulse.username}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300">
                            {pulse.email} • {pulse.role || 'Team Member'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-lg ${option?.bgColor || 'bg-neutral-100'} ${option?.color || 'text-neutral-600'} font-medium`}>
                          {option?.label || 'Unknown'} ({pulse.score})
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {format(parseISO(pulse.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  No pulse checks submitted for this date
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        // Week View
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
          <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-6">
            Weekly Trends
          </h2>

          <div className="space-y-6">
            {weekData.length > 0 ? (
              weekData.map((dayData) => (
                <div key={dayData.date} className="border-b border-neutral-200 dark:border-neutral-800 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      {format(parseISO(dayData.date), 'EEEE, MMM d')}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {dayData.total_responses} responses
                      </span>
                      <span className={`font-medium ${
                        getPulseOption(Math.round(dayData.average_score))?.color || 'text-neutral-600'
                      }`}>
                        Avg: {dayData.average_score}
                      </span>
                    </div>
                  </div>

                  {/* Mini distribution for each day */}
                  <div className="flex items-center gap-2">
                    {Object.entries(getScoreDistribution(dayData.pulses)).map(([score, count]) => {
                      const option = getPulseOption(parseInt(score))
                      return (
                        <div
                          key={score}
                          className={`flex items-center gap-1 px-2 py-1 rounded ${
                            count > 0 ? (option?.bgColor || 'bg-neutral-100 dark:bg-neutral-800') : 'bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          <span className={`text-xs font-medium ${
                            count > 0 ? (option?.color || 'text-neutral-400 dark:text-neutral-500') : 'text-neutral-400 dark:text-neutral-500'
                          }`}>
                            {score}
                          </span>
                          <span className={`text-xs ${
                            count > 0 ? (option?.color || 'text-neutral-400 dark:text-neutral-500') : 'text-neutral-400 dark:text-neutral-500'
                          }`}>
                            ({count})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  No data available for this week
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
