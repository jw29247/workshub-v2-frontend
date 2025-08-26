import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionButton } from '../ActionButton'
import AuthLayout from './AuthLayout'
import { useBackendAuth } from '../../contexts/ReduxAuthProvider'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useBackendAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  useEffect(() => {
    return () => {
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await login(email, password, remember)
      navigate('/app')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your dashboard">
      <form className="space-y-6" onSubmit={handleSubmit}>
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
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 border rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 transition-all duration-200 text-body-sm ${
                error 
                  ? 'border-status-error focus:ring-status-error/20 focus:border-status-error'
                  : 'border-border-default focus:ring-brand-primary/20 focus:border-brand-primary'
              }`}
              placeholder="you@workshub.agency"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-caption text-content-primary mb-2">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 border rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 transition-all duration-200 text-body-sm ${
                error 
                  ? 'border-status-error focus:ring-status-error/20 focus:border-status-error'
                  : 'border-border-default focus:ring-brand-primary/20 focus:border-brand-primary'
              }`}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className={`rounded-xl p-4 animate-pulse ${
            error.includes('Unable to connect') 
              ? 'bg-status-warning-weak border border-status-warning' 
              : 'bg-status-error-weak border border-status-error'
          }`}>
            <div className="flex items-start gap-3">
              {error.includes('Unable to connect') ? (
                <svg className="w-5 h-5 text-status-warning mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-status-error mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div className="flex-1">
                <div className={`text-body-sm font-medium ${
                  error.includes('Unable to connect') ? 'text-status-warning' : 'text-status-error'
                }`}>{error}</div>
                {error.includes('Invalid email or password') && (
                  <div className="text-caption text-content-secondary mt-1">
                    If you've forgotten your password, please contact your administrator.
                  </div>
                )}
                {error.includes('Unable to connect') && (
                  <div className="text-caption text-content-secondary mt-1">
                    Make sure the backend server is running and accessible.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <ActionButton type="submit" disabled={loading} loading={loading} variant="primary" className="w-full">
            Sign In
          </ActionButton>
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => { setRemember(e.target.checked); }}
              className="h-4 w-4 rounded border-border-default text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-body-sm text-content-secondary">Keep me signed in</span>
          </label>
          <Link to="/reset-password" className="text-body-sm text-brand-primary hover:text-brand-primary/80 transition-colors duration-200">Forgot password?</Link>
        </div>
        <div className="text-center pt-2">
          <Link to="/register" className="text-body-sm text-brand-primary hover:text-brand-primary/80 transition-colors duration-200">Create account</Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default LoginPage


