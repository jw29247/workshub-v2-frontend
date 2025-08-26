import React, { useState } from 'react'
import {
  LoadingState,
  LoadingSpinner,
  LoadingCentered,
  LoadingFullscreen,
  LoadingInline
} from './LoadingState'
import { ActionButton } from './ActionButton'

/**
 * Demo component showing all loading state variants
 * This is for documentation/testing purposes and should be removed from production builds
 */
export const LoadingExamples: React.FC = () => {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)

  const handleButtonTest = async () => {
    setButtonLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setButtonLoading(false)
  }

  return (
    <div className="p-8 space-y-8 bg-white dark:bg-neutral-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-8">
          Loading State Examples
        </h1>

        {/* Basic Spinner Variants */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Basic Spinner Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Small</h3>
              <LoadingSpinner size="sm" message="Loading..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Medium</h3>
              <LoadingSpinner size="md" message="Loading..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Large</h3>
              <LoadingSpinner size="lg" message="Loading..." />
            </div>
          </div>
        </section>

        {/* Theme Variants */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Theme Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Primary Theme</h3>
              <LoadingSpinner theme="primary" message="Loading..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Neutral Theme</h3>
              <LoadingSpinner theme="neutral" message="Loading..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-900">
              <h3 className="text-sm font-medium mb-2 text-white">White Theme</h3>
              <LoadingSpinner theme="white" message="Loading..." />
            </div>
          </div>
        </section>

        {/* Layout Variants */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Layout Variants
          </h2>

          <div className="space-y-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Inline</h3>
              <LoadingInline message="Loading data..." icon="refresh" />
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Centered</h3>
              <div className="h-32 bg-neutral-50 dark:bg-neutral-800 rounded">
                <LoadingCentered message="Loading content..." />
              </div>
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Icon Only</h3>
              <LoadingState variant="icon" size="md" />
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Text Only</h3>
              <LoadingState variant="text" message="Please wait..." />
            </div>
          </div>
        </section>

        {/* Button Integration */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Button Integration
          </h2>
          <div className="space-x-4">
            <ActionButton
              variant="primary"
              loading={buttonLoading}
              onClick={handleButtonTest}
            >
              Test Loading Button
            </ActionButton>

            <ActionButton
              variant="secondary"
              loading={buttonLoading}
              onClick={handleButtonTest}
            >
              Secondary Button
            </ActionButton>
          </div>
        </section>

        {/* Fullscreen Demo */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Fullscreen Loading
          </h2>
          <ActionButton
            variant="secondary"
            onClick={() => {
              setShowFullscreen(true)
              setTimeout(() => { setShowFullscreen(false); }, 3000)
            }}
          >
            Show Fullscreen Loading (3 seconds)
          </ActionButton>
        </section>

        {/* Icon Variants */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Icon Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Default Icon</h3>
              <LoadingInline icon="default" message="Loading..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Refresh Icon</h3>
              <LoadingInline icon="refresh" message="Refreshing..." />
            </div>
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <h3 className="text-sm font-medium mb-2">No Icon</h3>
              <LoadingInline icon="none" message="Loading..." />
            </div>
          </div>
        </section>
      </div>

      {/* Fullscreen Loading Demo */}
      {showFullscreen && (
        <LoadingFullscreen
          message="Loading application..."
          size="xl"
        />
      )}
    </div>
  )
}

export default LoadingExamples
