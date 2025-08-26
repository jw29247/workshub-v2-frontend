import React from 'react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
  variant?: 'spinner' | 'dots'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = false,
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3'
  }

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8'

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  if (variant === 'dots') {
    return (
      <div className={containerClasses}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex space-x-1">
            <div 
              className={`${dotSizeClasses[size]} rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse`}
              aria-label="Loading"
            />
            <div 
              className={`${dotSizeClasses[size]} rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse`}
              style={{ animationDelay: '200ms' }}
            />
            <div 
              className={`${dotSizeClasses[size]} rounded-full bg-brand-purple-strong dark:bg-purple-400 animate-pulse`}
              style={{ animationDelay: '400ms' }}
            />
          </div>
          {message && (
            <p className={`text-neutral-600 dark:text-neutral-400 ${textSizeClasses[size]}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        <div 
          className={`animate-spin rounded-full border-neutral-200 dark:border-neutral-700 border-t-brand-purple-strong dark:border-t-purple-400 ${sizeClasses[size]}`}
          aria-label="Loading"
        />
        {message && (
          <p className={`text-neutral-600 dark:text-neutral-400 ${textSizeClasses[size]}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}