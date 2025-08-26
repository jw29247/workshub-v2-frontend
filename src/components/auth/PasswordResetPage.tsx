import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton } from '../ActionButton'
import AuthLayout from './AuthLayout'
import { backendAuthService } from '../../services/backendAuthService'

export const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [mode, setMode] = useState<'request' | 'reset'>(token ? 'reset' : 'request')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (token) setMode('reset')
  }, [token])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await backendAuthService.requestPasswordReset({ email })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await backendAuthService.confirmPasswordReset({ token: token!, new_password: password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'request' ? 'Reset your password' : 'Create new password'
  const subtitle = mode === 'request' ? "Enter your email and we'll send you a secure link to reset your password" : 'Choose a strong password for your account'

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {success && mode === 'request' ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-status-success-weak border border-status-success p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-body-md font-medium text-status-success mb-1">Check your email</h3>
                <p className="text-body-sm text-content-secondary">We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Link to="/login" className="text-body-sm text-brand-primary hover:text-brand-primary/80 transition-colors duration-200">← Back to login</Link>
          </div>
        </div>
      ) : success && mode === 'reset' ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-status-success-weak border border-status-success p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-body-md font-medium text-status-success mb-1">Password updated successfully</h3>
                <p className="text-body-sm text-content-secondary">Your password has been reset. Redirecting to login...</p>
              </div>
            </div>
          </div>
        </div>
      ) : mode === 'request' ? (
        <form className="space-y-6" onSubmit={handleRequestReset}>
          <div>
            <label htmlFor="email" className="block text-caption text-content-primary mb-2">Email Address</label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); }}
                className="w-full px-4 py-3 border border-border-default rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-body-sm"
                placeholder="you@workshub.agency"
              />
            </div>
            <p className="mt-2 text-body-sm text-content-tertiary">Enter the email address associated with your account</p>
          </div>
          {error && (
            <div className="rounded-xl bg-status-error-weak border border-status-error p-4">
              <div className="text-body-sm text-status-error">{error}</div>
            </div>
          )}
          <div className="pt-2">
            <ActionButton type="submit" disabled={loading} loading={loading} variant="primary" className="w-full">Send reset email</ActionButton>
          </div>
          <div className="text-center pt-4">
            <Link to="/login" className="text-body-sm text-brand-primary hover:text-brand-primary/80 transition-colors duration-200">← Back to login</Link>
          </div>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleResetPassword}>
          <div>
            <label htmlFor="password" className="block text-caption text-content-primary mb-2">New Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                className="w-full px-4 py-3 border border-border-default rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-body-sm"
                placeholder="••••••••"
              />
            </div>
            <p className="mt-2 text-body-sm text-content-tertiary">Choose a strong password with at least 6 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-caption text-content-primary mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); }}
                className="w-full px-4 py-3 border border-border-default rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-body-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-xl bg-status-error-weak border border-status-error p-4">
              <div className="text-body-sm text-status-error">{error}</div>
            </div>
          )}
          <div className="pt-2">
            <ActionButton type="submit" disabled={loading} loading={loading} variant="primary" className="w-full">Reset password</ActionButton>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

export default PasswordResetPage


