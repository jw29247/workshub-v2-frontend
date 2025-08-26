import React from 'react'
import type { TimerServiceStatus } from '../services/timeTrackingService'

interface ServiceStatusIndicatorProps {
  serviceStatus: TimerServiceStatus | null
  className?: string
}

const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({ 
  serviceStatus, 
  className = '' 
}) => {
  // Don't show anything if service is active or status is unknown
  if (!serviceStatus || serviceStatus.service_active) {
    return null
  }


  const formatTime = (isoString: string, showTimezone: boolean = true) => {
    try {
      const date = new Date(isoString)
      // Use en-GB for UK format (24-hour clock)
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/London',
        timeZoneName: showTimezone ? 'short' : undefined
      })
    } catch {
      return isoString
    }
  }

  const formatTimeUntil = (isoString: string | undefined) => {
    if (!isoString) return ''
    
    try {
      const targetDate = new Date(isoString)
      const now = new Date()
      
      // Check if dates are valid
      if (isNaN(targetDate.getTime()) || isNaN(now.getTime())) {
        console.warn('Invalid date:', isoString)
        return 'soon'
      }
      
      const diffMs = targetDate.getTime() - now.getTime()
      
      // If time is in the past
      if (diffMs <= 0) {
        return 'now'
      }
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMinutes / 60)
      const remainingMinutes = diffMinutes % 60
      
      // Less than 1 minute
      if (diffMinutes < 1) {
        return 'less than a minute'
      }
      
      // Less than 1 hour
      if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'min' : 'mins'}`
      }
      
      // Less than 24 hours  
      if (diffHours < 24) {
        if (remainingMinutes === 0) {
          return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`
        }
        return `${diffHours}h ${remainingMinutes}m`
      }
      
      // Over 24 hours - show days
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays === 1) {
        return 'tomorrow at ' + formatTime(isoString, false)
      }
      if (diffDays < 7) {
        return `${diffDays} days`
      }
      
      // For longer periods, just show the date
      return formatTime(isoString)
    } catch (error) {
      console.error('Error formatting time until:', error, isoString)
      return 'soon'
    }
  }

  return (
    <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Live Data Offline
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Live data is offline outside of business hours.
            </p>
            {serviceStatus.business_hours.next_business_start && (
              <p className="mt-1 text-xs">
                Service will resume at <span className="font-medium">{formatTime(serviceStatus.business_hours.next_business_start, false)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceStatusIndicator