import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  selectOnboarding,
  selectCurrentStep,
  selectIsFirstStep,
  selectIsLastStep,
  nextStep,
  previousStep,
  skipOnboarding,
  finishOnboarding,
  completeOnboarding
} from '../../store/slices/onboardingSlice'
import { selectCurrentUser } from '../../store/slices/authSlice'

interface HighlightPosition {
  top: number
  left: number
  width: number
  height: number
}

export const OnboardingOverlay: React.FC = () => {
  const dispatch = useAppDispatch()
  const onboarding = useAppSelector(selectOnboarding)
  const currentStep = useAppSelector(selectCurrentStep)
  const isFirstStep = useAppSelector(selectIsFirstStep)
  const isLastStep = useAppSelector(selectIsLastStep)
  const currentUser = useAppSelector(selectCurrentUser)
  const [highlightPosition, setHighlightPosition] = useState<HighlightPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onboarding.isActive || !currentStep) return

    if (currentStep.target) {
      const targetElement = document.querySelector(currentStep.target)
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        setHighlightPosition({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8
        })
        
        // Scroll element into view
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      } else {
        setHighlightPosition(null)
      }
    } else {
      setHighlightPosition(null)
    }
  }, [currentStep, onboarding.isActive])

  const handleNext = () => {
    if (isLastStep) {
      handleFinish()
    } else {
      dispatch(nextStep())
    }
  }

  const handlePrevious = () => {
    dispatch(previousStep())
  }

  const handleSkip = () => {
    dispatch(skipOnboarding())
  }

  const handleFinish = async () => {
    dispatch(finishOnboarding())
    if (currentUser?.id) {
      await dispatch(completeOnboarding(currentUser.id))
    }
  }

  if (!onboarding.isActive || !currentStep) {
    return null
  }

  const getTooltipPosition = () => {
    if (!highlightPosition || !currentStep.placement) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const padding = 16
    const tooltipWidth = 400
    const tooltipHeight = 200

    let position: any = {}

    switch (currentStep.placement) {
      case 'top':
        position = {
          bottom: `${window.innerHeight - highlightPosition.top + padding}px`,
          left: `${highlightPosition.left + highlightPosition.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'bottom':
        position = {
          top: `${highlightPosition.top + highlightPosition.height + padding}px`,
          left: `${highlightPosition.left + highlightPosition.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'left':
        position = {
          top: `${highlightPosition.top + highlightPosition.height / 2}px`,
          right: `${window.innerWidth - highlightPosition.left + padding}px`,
          transform: 'translateY(-50%)'
        }
        break
      case 'right':
        position = {
          top: `${highlightPosition.top + highlightPosition.height / 2}px`,
          left: `${highlightPosition.left + highlightPosition.width + padding}px`,
          transform: 'translateY(-50%)'
        }
        break
      case 'center':
      default:
        position = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }
    }

    // Ensure tooltip stays within viewport
    if (position.left && typeof position.left === 'string') {
      const leftValue = parseInt(position.left)
      if (leftValue < padding) position.left = `${padding}px`
      if (leftValue + tooltipWidth > window.innerWidth - padding) {
        position.left = `${window.innerWidth - tooltipWidth - padding}px`
      }
    }

    if (position.top && typeof position.top === 'string') {
      const topValue = parseInt(position.top)
      if (topValue < padding) position.top = `${padding}px`
      if (topValue + tooltipHeight > window.innerHeight - padding) {
        position.top = `${window.innerHeight - tooltipHeight - padding}px`
      }
    }

    return position
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/75 pointer-events-auto"
        onClick={currentStep.showSkip ? handleSkip : undefined}
      />

      {/* Highlight area */}
      {highlightPosition && (
        <div
          className="absolute border-2 border-brand-purple-strong rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] pointer-events-none transition-all duration-300"
          style={{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
          }}
        >
          <div className="absolute inset-0 animate-pulse bg-brand-purple-strong/20 rounded-lg" />
        </div>
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 pointer-events-auto max-w-md transition-all duration-300"
        style={getTooltipPosition()}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Step {onboarding.currentStepIndex + 1} of {onboarding.steps.length}
            </span>
          </div>
          {currentStep.showSkip !== false && (
            <button
              onClick={handleSkip}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1 mb-4">
          <div
            className="bg-brand-purple-strong h-1 rounded-full transition-all duration-300"
            style={{
              width: `${((onboarding.currentStepIndex + 1) / onboarding.steps.length) * 100}%`
            }}
          />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {currentStep.title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
          {currentStep.description}
        </p>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isFirstStep
                ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {onboarding.steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === onboarding.currentStepIndex
                    ? 'bg-brand-purple-strong w-6'
                    : index < onboarding.currentStepIndex
                    ? 'bg-brand-purple-strong/50'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-brand-purple-strong text-white rounded-lg text-sm font-medium hover:bg-brand-purple-strong/90 transition-all"
          >
            {isLastStep ? (
              <>
                Finish
                <CheckCircle className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}