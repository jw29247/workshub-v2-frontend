import React, { useState, useEffect } from 'react'
import { formatUKTime, formatUKDate, toUKTime } from '../utils/dateFormatting'
import { Info, X } from 'lucide-react'
import { Button } from './Button'
import { notificationService, type DailyNotification } from '../services/notificationService'
import { useBackendAuth } from '../contexts/ReduxAuthProvider'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string // Alias for subtitle for compatibility
  actions?: React.ReactNode // For action buttons
  children?: React.ReactNode // For any additional elements like buttons
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, description, actions, children }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notification, setNotification] = useState<DailyNotification | null>(null)
  const [notificationDismissed, setNotificationDismissed] = useState(false)
  const { user } = useBackendAuth()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => { clearInterval(timer); }
  }, [])

  // Load today's notification
  useEffect(() => {
    const loadNotification = async () => {
      // Check if notification was already dismissed today
      const dismissedDate = localStorage.getItem('notification_dismissed_date')
      const today = new Date().toDateString()
      
      if (dismissedDate === today) {
        setNotificationDismissed(true)
        return
      }

      try {
        const todayNotification = await notificationService.getTodaysNotification()
        setNotification(todayNotification)
        setNotificationDismissed(false)
      } catch {
        // Don't break the component if notifications fail
        setNotification(null)
      }
    }

    loadNotification()
  }, [])

  // Process variables in notification text
  const processNotificationVariables = (text: string, userName: string) => {
    const variables: Record<string, string> = {
      '{name}': userName,
      '{firstName}': userName.split(' ')[0] || userName,
      '{date}': new Date().toLocaleDateString(),
      '{day}': new Date().toLocaleDateString([], { weekday: 'long' }),
      '{month}': new Date().toLocaleDateString([], { month: 'long' }),
      '{year}': new Date().getFullYear().toString()
    }

    let processedText = text
    Object.entries(variables).forEach(([key, value]) => {
      processedText = processedText.replace(new RegExp(key, 'g'), value)
    })

    return processedText
  }

  const handleDismissNotification = () => {
    setNotificationDismissed(true)
    // Store dismissal in localStorage with today's date
    localStorage.setItem('notification_dismissed_date', new Date().toDateString())
  }

  return (
    <div className="space-y-4">
      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-medium text-neutral-900 dark:text-white">{title}</h1>
          {(subtitle || description) && (
            <p className="text-neutral-600 dark:text-neutral-300 mt-1">{subtitle || description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {actions || children}
          <div className="text-left sm:text-right">
            <div className="text-neutral-600 dark:text-neutral-300 text-sm">
              {formatUKTime(currentTime, {
                hour12: false
              })}
            </div>
            <div className="text-xl lg:text-2xl font-medium text-neutral-900 dark:text-white">
              {formatUKDate(currentTime, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && !notificationDismissed && (
        <div className="animate-fadeIn">
          <div className={`rounded-xl border p-4 ${
            notification.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : notification.type === 'warning'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-start gap-3">
              <Info className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                notification.type === 'info'
                  ? 'text-blue-500'
                  : notification.type === 'warning'
                  ? 'text-yellow-500'
                  : 'text-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900 dark:text-white text-sm">
                      {processNotificationVariables(notification.title, (user as any)?.first_name || (user as any)?.display_name || (user as any)?.username || user?.email || 'there')}
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-300 text-sm mt-1">
                      {processNotificationVariables(notification.message, (user as any)?.first_name || (user as any)?.display_name || (user as any)?.username || user?.email || 'there')}
                    </p>
                    {notification.button_text && notification.button_url && (
                      <a
                        href={notification.button_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                          inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all
                          ${notification.type === 'info'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : notification.type === 'warning'
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                          }
                        `}
                      >
                        {notification.button_text}
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissNotification}
                    className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 -mt-1 -mr-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}