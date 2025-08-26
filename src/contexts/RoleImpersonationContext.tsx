import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAppSelector } from '../store'
import { isDevelopment } from '../config'

type UserRole = 'SLT' | 'manager' | 'team_member'

interface RoleImpersonationContextType {
  // The actual user's role
  actualRole: UserRole | null
  // The currently active role (actual or impersonated)
  activeRole: UserRole | null
  // Whether impersonation is active
  isImpersonating: boolean
  // Whether the current user can impersonate (SLT in dev)
  canImpersonate: boolean
  // Function to set the impersonated role
  setImpersonatedRole: (role: UserRole | null) => void
  // Function to stop impersonating
  stopImpersonating: () => void
}

const RoleImpersonationContext = createContext<RoleImpersonationContextType | undefined>(undefined)

export const useRoleImpersonation = () => {
  const context = useContext(RoleImpersonationContext)
  if (!context) {
    throw new Error('useRoleImpersonation must be used within a RoleImpersonationProvider')
  }
  return context
}

interface RoleImpersonationProviderProps {
  children: ReactNode
}

export const RoleImpersonationProvider: React.FC<RoleImpersonationProviderProps> = ({ children }) => {
  const user = useAppSelector(state => state.auth.user)
  const actualRole = (user?.role as UserRole) ?? null
  const [impersonatedRole, setImpersonatedRoleState] = useState<UserRole | null>(null)

  // Only allow impersonation for SLT users in development
  const canImpersonate = isDevelopment && actualRole === 'SLT'

  // Load saved impersonation from localStorage on mount
  useEffect(() => {
    if (canImpersonate) {
      const savedRole = localStorage.getItem('impersonatedRole')
      if (savedRole && ['manager', 'team_member'].includes(savedRole)) {
        setImpersonatedRoleState(savedRole as UserRole)
      }
    } else {
      // Clear impersonation if user can't impersonate
      localStorage.removeItem('impersonatedRole')
      setImpersonatedRoleState(null)
    }
  }, [canImpersonate])

  const setImpersonatedRole = (role: UserRole | null) => {
    if (!canImpersonate) {
      console.warn('User cannot impersonate roles')
      return
    }

    if (role === actualRole) {
      // If setting to actual role, just stop impersonating
      stopImpersonating()
      return
    }

    if (role) {
      localStorage.setItem('impersonatedRole', role)
      setImpersonatedRoleState(role)

    } else {
      stopImpersonating()
    }
  }

  const stopImpersonating = () => {
    localStorage.removeItem('impersonatedRole')
    setImpersonatedRoleState(null)

  }

  const activeRole = impersonatedRole ?? actualRole
  const isImpersonating = !!impersonatedRole && impersonatedRole !== actualRole

  const value: RoleImpersonationContextType = {
    actualRole,
    activeRole,
    isImpersonating,
    canImpersonate,
    setImpersonatedRole,
    stopImpersonating
  }

  return (
    <RoleImpersonationContext.Provider value={value}>
      {children}
    </RoleImpersonationContext.Provider>
  )
}

// Hook to get the effective user with impersonated role
export const useEffectiveUser = () => {
  const user = useAppSelector(state => state.auth.user)
  const { activeRole, isImpersonating } = useRoleImpersonation()

  if (!user) return null

  return {
    ...user,
    role: activeRole ?? user.role,
    isImpersonating
  }
}