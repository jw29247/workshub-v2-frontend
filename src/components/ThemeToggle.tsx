import React from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-9 w-16 items-center rounded-full bg-neutral-200 dark:bg-neutral-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong dark:focus:ring-brand-purple-weak focus:ring-offset-2 dark:focus:ring-offset-black ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white dark:bg-black shadow-md transition-transform duration-200 ${
          theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
        }`}
      >
        {theme === 'light' ? (
          <Sun className="h-4 w-4 text-neutral-600" />
        ) : (
          <Moon className="h-4 w-4 text-neutral-300" />
        )}
      </span>
    </button>
  )
}

// Alternative compact icon-only version
export const ThemeToggleIcon: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-black transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple-strong dark:focus:ring-brand-purple-weak ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  )
}
