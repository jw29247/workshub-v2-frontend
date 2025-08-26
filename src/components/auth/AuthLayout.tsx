import React from 'react'
import { Logo } from '../Logo'

export interface AuthLayoutProps {
  title: string
  subtitle?: string
  leftTitle?: string
  leftDescription?: string
  leftBullets?: Array<{ title: string; description: string; icon?: React.ReactNode }>
  footerText?: React.ReactNode
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  footerText,
  children,
}) => {

  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="grid min-h-screen lg:grid-cols-12 grid-cols-1 m-0">
        {/* Left Column - Brand & Product Context */}
        <div className="hidden lg:block lg:col-span-7 border-r border-default relative overflow-hidden p-0 m-0 isolate" style={{ backgroundColor: 'rgb(16,16,16)' }}>
          {/* Background looping video, left aligned with safe scaling */}
          <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgb(16,16,16)' }}>
            <video
              className="absolute left-0 bottom-0 w-full h-auto block"
              src="/brand/flag.webm"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </div>

        {/* Right Column - Auth Content */}
        <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Header logo for all viewports */}
            <div className="text-center mb-8">
              <Logo size="lg" />
            </div>

            {/* Headings */}
            <h1 className="text-heading-md text-center text-content-primary mb-2">{title}</h1>
            {subtitle && (
              <p className="text-content-secondary text-body-sm text-center mb-8">{subtitle}</p>
            )}

            <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 backdrop-blur-md shadow-xl p-8">
              {children}
            </div>

            {footerText && (
              <div className="mt-8 text-center">
                <p className="text-body-sm text-content-tertiary">{footerText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout


