import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
    '2xl': 'text-5xl sm:text-7xl lg:text-8xl'
  }

  return (
    <h1 className={`font-medium tracking-tight text-black dark:text-white ${sizeClasses[size]} ${className}`}>
      Works
      <span
        className="bg-gradient-to-r from-brand-indigo to-brand-violet bg-clip-text text-transparent dark:from-brand-indigo dark:to-brand-violet"
      >
        Hub
      </span>
    </h1>
  )
}
