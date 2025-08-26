import React, { useState } from 'react'
import { Users, ChevronDown, X, AlertTriangle } from 'lucide-react'
import { useRoleImpersonation } from '../contexts/RoleImpersonationContext'
import { Button } from './Button'

export const RoleImpersonationSwitcher: React.FC = () => {
  const { actualRole, activeRole, isImpersonating, canImpersonate, setImpersonatedRole, stopImpersonating } = useRoleImpersonation()
  const [isOpen, setIsOpen] = useState(false)

  if (!canImpersonate) {
    return null
  }

  const roles = [
    { value: 'SLT', label: 'SLT', description: 'Full system access' },
    { value: 'manager', label: 'Manager', description: 'Team and client management' },
    { value: 'team_member', label: 'Team Member', description: 'Basic user access' }
  ]

  const handleRoleSelect = (role: string) => {
    if (role === actualRole) {
      stopImpersonating()
    } else {
      setImpersonatedRole(role as 'SLT' | 'manager' | 'team_member')
    }
    setIsOpen(false)
  }

  return (
    <>
      {/* Floating Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2">
          {isImpersonating && (
            <div className="bg-yellow-500 text-black px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Viewing as {activeRole}
              </span>
              <button
                onClick={stopImpersonating}
                className="ml-2 hover:bg-yellow-600 rounded p-1 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Role Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all ${
                isImpersonating 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {activeRole || 'Select Role'}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsOpen(false)}
                />
                
                {/* Menu */}
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 z-50">
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Role Impersonation
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      View the system as different roles
                    </p>
                  </div>

                  <div className="p-2">
                    {roles.map(role => (
                      <button
                        key={role.value}
                        onClick={() => handleRoleSelect(role.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group ${
                          activeRole === role.value
                            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {role.label}
                            {role.value === actualRole && (
                              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                                (Your role)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {role.description}
                          </div>
                        </div>
                        {activeRole === role.value && (
                          <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  {isImpersonating && (
                    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={stopImpersonating}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Stop Impersonating
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}