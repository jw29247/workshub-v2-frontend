import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionButton } from '../ActionButton'
import AuthLayout from './AuthLayout'
import { useBackendAuth } from '../../contexts/ReduxAuthProvider'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useBackendAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const username = fullName || email.split('@')[0] || email
      await register(email, password, username)
      navigate('/app')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join your team and start tracking time efficiently">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName" className="block text-caption text-content-primary mb-2">Full Name</label>
          <div className="relative">
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); }}
              className="w-full px-4 py-3 border border-border-default rounded-xl bg-surface-primary text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-body-sm"
              placeholder="Enter your full name"
            />
          </div>
        </div>

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
          <p className="mt-2 text-body-sm text-content-tertiary">Must be a @workshub.agency or @thatworks.agency email</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-caption text-content-primary mb-2">Password</label>
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
        </div>

        {error && (
          <div className="rounded-xl bg-status-error-weak border border-status-error p-4">
            <div className="text-body-sm text-status-error">{error}</div>
          </div>
        )}

        <div className="pt-2">
          <ActionButton type="submit" disabled={loading} loading={loading} variant="primary" className="w-full">
            Create Account
          </ActionButton>
        </div>

        <div className="text-center pt-2">
          <span className="text-body-sm text-content-tertiary">Already have an account? </span>
          <Link to="/login" className="text-body-sm text-brand-primary hover:text-brand-primary/80 transition-colors duration-200">Sign in</Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage


