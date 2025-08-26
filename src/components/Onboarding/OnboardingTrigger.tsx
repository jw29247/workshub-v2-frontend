import React from 'react'
import { HelpCircle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import { startOnboarding } from '../../store/slices/onboardingSlice'
import { selectCurrentUser } from '../../store/slices/authSlice'
import { getOnboardingSteps } from './onboardingSteps'
import { Button } from '../Button'

export const OnboardingTrigger: React.FC = () => {
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector(selectCurrentUser)

  const handleStartTour = () => {
    const role = currentUser?.role || 'team_member'
    const steps = getOnboardingSteps(role as 'SLT' | 'manager' | 'team_member')
    dispatch(startOnboarding({ role: role as 'SLT' | 'manager' | 'team_member', steps }))
  }

  return (
    <Button
      onClick={handleStartTour}
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
    >
      <HelpCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Take Tour</span>
    </Button>
  )
}