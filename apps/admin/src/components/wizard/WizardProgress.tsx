'use client'

import { Check, Lock } from 'lucide-react'
import { STEP_ORDER, STEP_LABELS, type WizardStep } from './types'

interface WizardProgressProps {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  onStepClick: (step: WizardStep) => void
  lockedSteps?: WizardStep[]
}

export function WizardProgress({
  currentStep,
  completedSteps,
  onStepClick,
  lockedSteps = [],
}: WizardProgressProps) {
  const displaySteps = STEP_ORDER.filter(s => s !== 'complete')

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
          style={{
            width: `${(completedSteps.length / (displaySteps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {displaySteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step)
            const isCurrent = currentStep === step
            const isLocked = lockedSteps.includes(step)
            const canClick = isCompleted || isCurrent

            return (
              <button
                key={step}
                onClick={() => canClick && !isLocked && onStepClick(step)}
                disabled={!canClick || isLocked}
                className={`flex flex-col items-center gap-2 transition-all ${
                  canClick && !isLocked ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                {/* Circle */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : isCurrent
                        ? 'border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-200'
                        : isLocked
                          ? 'border-gray-200 bg-gray-100 text-gray-400'
                          : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-xs font-medium ${
                    isCurrent
                      ? 'text-purple-600'
                      : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-400'
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
