import React, { useState, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import { Button } from './Button'
import {
  Heart,
  Frown,
  Meh,
  Smile,
  AlertCircle,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { pulseCheckService, type PulseCheck as PulseCheckType } from '../services/pulseCheckService'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'

interface PulseCheckProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

const PULSE_OPTIONS = [
  { value: 1, label: 'Very Bad', icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800' },
  { value: 2, label: 'Bad', icon: Frown, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800' },
  { value: 3, label: 'Okay', icon: Meh, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { value: 4, label: 'Good', icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' },
  { value: 5, label: 'Very Good', icon: Smile, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800' }
]

export const PulseCheck: React.FC<PulseCheckProps> = ({ currentUser }) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [todaysPulse, setTodaysPulse] = useState<PulseCheckType | null>(null)
  const [recentPulses, setRecentPulses] = useState<PulseCheckType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()


  // Load today's pulse and recent history
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load pulse data
      const [todayData, recentData] = await Promise.all([
        pulseCheckService.getTodaysPulseCheck(),
        pulseCheckService.getMyPulseChecks(7)
      ])

      setTodaysPulse(todayData)
      setRecentPulses(recentData)
      if (todayData) {
        setSelectedScore(todayData.score)
      }
    } catch {
      setError('Failed to load pulse check data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedScore || submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const pulse = await pulseCheckService.submitPulseCheck(selectedScore)
      setTodaysPulse(pulse)

      // Refresh recent pulses
      const recentData = await pulseCheckService.getMyPulseChecks(7)
      setRecentPulses(recentData)
    } catch {
      setError('Failed to submit pulse check')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate weekly average
  const weeklyAverage = () => {
    if (recentPulses.length === 0) return null
    const sum = recentPulses.reduce((acc, pulse) => acc + pulse.score, 0)
    return (sum / recentPulses.length).toFixed(1)
  }

  // Get this week's days for the mini calendar
  const weekDays = eachDayOfInterval({
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 })
  })

  const getPulseForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return recentPulses.find(p => p.date === dayStr)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-black">
        <div className="text-center">
          <Heart className="h-12 w-12 text-brand-purple-strong dark:text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading pulse check...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <PageHeader
        title="Daily Pulse Check"
        subtitle={`How are you feeling today, ${currentUser?.name || 'there'}?`}
      />

      {/* Notification is now displayed in PageHeader component for all pages */}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Pulse Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-6">
              {todaysPulse ? 'Update your pulse' : 'Submit your pulse'}
            </h2>

            <div className="grid grid-cols-5 gap-4 mb-8">
              {PULSE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedScore === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => { setSelectedScore(option.value); }}
                    disabled={submitting}
                    className={`
                        relative p-6 rounded-xl border-2 transition-all duration-200
                        ${isSelected
                          ? `${option.bgColor} ${option.borderColor} scale-105 shadow-lg`
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }
                        ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? option.color : 'text-neutral-400 dark:text-neutral-500'}`} />
                      <p className={`text-sm font-medium ${isSelected ? option.color : 'text-neutral-600 dark:text-neutral-300'}`}>
                        {option.label}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${isSelected ? option.color : 'text-neutral-400 dark:text-neutral-500'}`}>
                        {option.value}
                      </p>
                      {isSelected && (
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${option.bgColor} border-2 border-white dark:border-neutral-800 flex items-center justify-center`}>
                          <div className={`w-3 h-3 rounded-full ${option.color.replace('text-', 'bg-')}`} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={!selectedScore || submitting}
                loading={submitting}
                className="py-4"
              >
                {todaysPulse ? 'Update Pulse' : 'Submit Pulse'}
              </Button>

              {todaysPulse && (
                <p className="text-center mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Last updated at {format(parseISO(todaysPulse.updated_at), 'h:mm a')}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Weekly Average */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">Weekly Average</h3>
              </div>
              {weeklyAverage() ? (
                <div className="text-center">
                  <p className="text-4xl font-bold text-neutral-900 dark:text-white">{weeklyAverage()}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">out of 5</p>
                </div>
              ) : (
                <p className="text-neutral-500 dark:text-neutral-400 text-center">No data yet</p>
              )}
            </div>

            {/* Weekly Calendar */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">This Week</h3>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const pulse = getPulseForDay(day)
                  const isToday = isSameDay(day, today)
                  const dayOption = pulse ? PULSE_OPTIONS.find(opt => opt.value === pulse.score) : null

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        text-center p-2 rounded-lg border
                        ${isToday
                          ? 'border-brand-purple-strong dark:border-purple-400'
                          : 'border-neutral-200 dark:border-neutral-800'
                        }
                        ${pulse && dayOption ? dayOption.bgColor : 'bg-neutral-50 dark:bg-neutral-800/50'}
                      `}
                    >
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-sm font-medium ${
                        pulse && dayOption ? dayOption.color : 'text-neutral-400 dark:text-neutral-500'
                      }`}>
                        {pulse ? pulse.score : '-'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
              <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Recent History</h3>
              <div className="space-y-3">
                {recentPulses.slice(0, 5).map((pulse) => {
                  const option = PULSE_OPTIONS.find(opt => opt.value === pulse.score)
                  return (
                    <div key={pulse.id} className="flex items-center justify-between">
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {format(parseISO(pulse.date), 'MMM d')}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${option?.color || 'text-neutral-500'}`}>
                          {option?.label}
                        </span>
                        <span className={`
                          px-2 py-1 rounded text-xs font-medium
                          ${option?.bgColor || 'bg-neutral-100 dark:bg-neutral-800'}
                          ${option?.color || 'text-neutral-500'}
                        `}>
                          {pulse.score}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
