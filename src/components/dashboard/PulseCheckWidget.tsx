import React, { useState, useEffect } from 'react'
import { Heart, Frown, Meh, Smile, CheckCircle2 } from 'lucide-react'
import { Button } from '../Button'
import { pulseCheckService, type PulseCheck } from '../../services/pulseCheckService'
import { format, parseISO } from 'date-fns'

interface PulseCheckWidgetProps {
  currentUser?: {
    name: string
    email?: string
  }
}

const PULSE_OPTIONS = [
  { value: 1, label: 'Very Bad', icon: Frown, color: 'text-red-500', emoji: '😔' },
  { value: 2, label: 'Bad', icon: Frown, color: 'text-orange-500', emoji: '😕' },
  { value: 3, label: 'Okay', icon: Meh, color: 'text-yellow-500', emoji: '😐' },
  { value: 4, label: 'Good', icon: Smile, color: 'text-green-500', emoji: '😊' },
  { value: 5, label: 'Very Good', icon: Smile, color: 'text-emerald-500', emoji: '😄' }
]

const PulseCheckWidget: React.FC<PulseCheckWidgetProps> = ({ currentUser }) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [todaysPulse, setTodaysPulse] = useState<PulseCheck | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user has already submitted today's pulse
  useEffect(() => {
    const checkTodaysPulse = async () => {
      try {
        setIsLoading(true)
        const pulse = await pulseCheckService.getTodaysPulseCheck()
        setTodaysPulse(pulse)
        if (pulse) {
          setSelectedScore(pulse.score)
        }
      } catch (err) {
        console.error('Error checking today\'s pulse:', err)
        setError('Failed to load pulse data')
      } finally {
        setIsLoading(false)
      }
    }

    checkTodaysPulse()
  }, [])

  const handleSubmit = async () => {
    if (!selectedScore || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      const pulse = await pulseCheckService.submitPulseCheck(selectedScore)
      setTodaysPulse(pulse)
      setShowSuccess(true)
      
      // Hide widget after 2 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error submitting pulse check:', err)
      setError('Failed to submit pulse check')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't show widget if loading
  if (isLoading) {
    return null
  }

  // Don't show widget if already submitted today (and not in success state)
  if (todaysPulse && !showSuccess) {
    return null
  }

  // Show success animation
  if (showSuccess) {
    return (
      <div className="bg-neutral-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col items-center justify-center py-4">
          <CheckCircle2 className="h-12 w-12 text-brand-green-strong dark:text-green-400 mb-3 animate-pulse" />
          <p className="text-lg font-medium text-neutral-900 dark:text-white">
            Thanks for checking in, {currentUser?.name || 'there'}!
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Your pulse has been recorded at {format(new Date(), 'h:mm a')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-lg">
          <Heart className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Daily Pulse Check
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            How are you feeling today?
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Score selector - compact version for dashboard */}
        <div className="grid grid-cols-5 gap-2">
          {PULSE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { setSelectedScore(option.value); }}
              disabled={isSubmitting}
              className={`
                flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200
                ${selectedScore === option.value
                  ? 'border-brand-purple-strong dark:border-purple-400 bg-brand-purple-strong/10 dark:bg-purple-400/20 scale-105'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/50'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-2xl mb-1">{option.emoji}</span>
              <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                {option.value}
              </span>
              <span className={`text-xs mt-1 ${option.color}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Submit button */}
        {selectedScore && (
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            variant="primary"
            size="md"
            fullWidth
          >
            Submit Pulse
          </Button>
        )}
      </div>
    </div>
  )
}

export default PulseCheckWidget