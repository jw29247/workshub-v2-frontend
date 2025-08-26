import React from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'

interface LoadingStateProps {
  // Display variants
  variant?: 'spinner' | 'icon' | 'text' | 'inline' | 'fullscreen' | 'centered' | 'button'

  // Size options
  size?: 'sm' | 'md' | 'lg' | 'xl'

  // Text content
  message?: string

  // Icon options
  icon?: 'default' | 'refresh' | 'none'

  // Custom styling
  className?: string

  // Color themes
  theme?: 'primary' | 'neutral' | 'white'

  // Layout options
  showMessage?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  message = 'Loading...',
  icon = 'default',
  className = '',
  theme = 'primary',
  showMessage = true
}) => {
  // Size mappings
  const sizeClasses = {
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-sm',
      gap: 'gap-2'
    },
    md: {
      spinner: 'h-6 w-6',
      text: 'text-base',
      gap: 'gap-3'
    },
    lg: {
      spinner: 'h-8 w-8',
      text: 'text-lg',
      gap: 'gap-4'
    },
    xl: {
      spinner: 'h-12 w-12',
      text: 'text-xl',
      gap: 'gap-4'
    }
  }

  // Theme mappings
  const themeClasses = {
    primary: {
      spinner: 'text-brand-purple-strong',
      text: 'text-neutral-600 dark:text-neutral-300',
      border: 'border-brand-purple-strong'
    },
    neutral: {
      spinner: 'text-neutral-400',
      text: 'text-neutral-500',
      border: 'border-neutral-400'
    },
    white: {
      spinner: 'text-white',
      text: 'text-white',
      border: 'border-white'
    }
  }

  const currentSize = sizeClasses[size]
  const currentTheme = themeClasses[theme]

  // Render spinner icon
  const renderSpinner = () => {
    if (icon === 'none') return null

    const IconComponent = icon === 'refresh' ? RefreshCw : Loader2

    return (
      <IconComponent
        className={`${currentSize.spinner} ${currentTheme.spinner} animate-spin`}
        aria-hidden="true"
      />
    )
  }

  // Render custom circular spinner
  const renderCircularSpinner = () => {
    return (
      <div
        className={`animate-spin rounded-full border-b-2 ${currentTheme.border} ${currentSize.spinner} inline-block`}
        aria-hidden="true"
      />
    )
  }

  // Button variant - for inline button loading states
  if (variant === 'button') {
    return (
      <div className={`flex items-center justify-center ${currentSize.gap} ${className}`}>
        {icon !== 'none' && renderSpinner()}
        {showMessage && (
          <span className={currentTheme.text}>
            {message}
          </span>
        )}
      </div>
    )
  }

  // Text only variant
  if (variant === 'text') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className={`${currentSize.text} ${currentTheme.text}`}>
          {message}
        </span>
      </div>
    )
  }

  // Inline variant - minimal horizontal layout
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center ${currentSize.gap} ${className}`}>
        {renderSpinner()}
        {showMessage && (
          <span className={`${currentSize.text} ${currentTheme.text}`}>
            {message}
          </span>
        )}
      </div>
    )
  }

  // Fullscreen variant - covers entire viewport
  if (variant === 'fullscreen') {
    return (
      <div className={`fixed inset-0 bg-neutral-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
        <div className="text-center">
          {renderCircularSpinner()}
          {showMessage && (
            <p className={`mt-4 ${currentSize.text} ${currentTheme.text}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Centered variant - centers content in container
  if (variant === 'centered') {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center">
          {renderCircularSpinner()}
          {showMessage && (
            <p className={`mt-4 ${currentSize.text} ${currentTheme.text}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Icon variant - just the spinning icon
  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {renderSpinner()}
      </div>
    )
  }

  // Default spinner variant - vertical layout with icon and text
  return (
    <div className={`flex flex-col items-center ${currentSize.gap} ${className}`}>
      <div className="text-center">
        {renderCircularSpinner()}
      </div>
      {showMessage && (
        <p className={`${currentSize.text} ${currentTheme.text} text-center`}>
          {message}
        </p>
      )}
    </div>
  )
}

// Convenience components for common use cases
export const LoadingSpinner: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState variant="spinner" {...props} />
)

export const LoadingButton: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState variant="button" {...props} />
)

export const LoadingCentered: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState variant="centered" {...props} />
)

export const LoadingFullscreen: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState variant="fullscreen" {...props} />
)

export const LoadingInline: React.FC<Omit<LoadingStateProps, 'variant'>> = (props) => (
  <LoadingState variant="inline" {...props} />
)
