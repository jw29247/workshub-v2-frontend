import React from 'react'
import { LoadingButton } from './LoadingState'

interface ActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'with-icon' | 'accent'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-pressed'?: boolean
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  loading = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed
}) => {
  // Primary button (black with shadow)
  if (variant === 'primary') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-900 dark:border-white px-6 py-2 text-sm font-medium text-white dark:text-black bg-neutral-900 dark:bg-white transition-all duration-200 hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed btn-primary-shadow btn-primary-shadow-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-strong focus-visible:ring-offset-2 dark:focus-visible:ring-brand-purple-weak dark:focus-visible:ring-offset-neutral-900 ${className}`}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-busy={loading}
      >
        {loading ? (
          <LoadingButton
            size="sm"
            theme="white"
            message="Loading..."
            icon="none"
            showMessage={true}
          />
        ) : children}
      </button>
    )
  }

  // Secondary button (white with light border)
  if (variant === 'secondary') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 dark:border-white px-6 py-2 text-sm font-medium text-neutral-900 dark:text-white bg-white dark:bg-black transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-strong focus-visible:ring-offset-2 dark:focus-visible:ring-brand-purple-weak dark:focus-visible:ring-offset-neutral-900 ${className}`}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-busy={loading}
      >
        {loading ? (
          <LoadingButton
            size="sm"
            theme="primary"
            message="Loading..."
            icon="none"
            showMessage={true}
          />
        ) : children}
      </button>
    )
  }

  // Accent CTA (gradient, bold, shadowed)
  if (variant === 'accent') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        className={`interactive-primary rounded-full px-8 py-3 text-sm font-semibold tracking-tight ${className}`}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-busy={loading}
      >
        {loading ? (
          <LoadingButton
            size="sm"
            theme="white"
            message="Loading..."
            icon="none"
            showMessage={true}
          />
        ) : children}
      </button>
    )
  }

  // With icon variant (inherits from secondary style)
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 dark:border-white px-8 py-5 text-sm font-medium text-neutral-900 dark:text-white bg-white dark:bg-black transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-strong focus-visible:ring-offset-2 dark:focus-visible:ring-brand-purple-weak dark:focus-visible:ring-offset-neutral-900 ${className}`}
      onClick={onClick}
      aria-label={ariaLabel || `${children} with arrow`}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      aria-busy={loading}
    >
      {loading ? (
        <LoadingButton
          size="sm"
          theme="primary"
          message="Loading..."
          icon="none"
          showMessage={true}
        />
      ) : children}
      {!loading && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      )}
    </button>
  )
}
