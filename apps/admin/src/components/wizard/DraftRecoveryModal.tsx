'use client'

import { Clock, FileText, X } from 'lucide-react'
import type { WizardDraft } from './types'
import { STEP_LABELS } from './types'

interface DraftRecoveryModalProps {
  isOpen: boolean
  draft: WizardDraft
  onContinue: () => void
  onDiscard: () => void
  onClose: () => void
}

export function DraftRecoveryModal({
  isOpen,
  draft,
  onContinue,
  onDiscard,
  onClose,
}: DraftRecoveryModalProps) {
  if (!isOpen) return null

  const pieceName = draft.state.piece?.name || 'Untitled'
  const currentStep = STEP_LABELS[draft.state.currentStep]
  const stepNumber =
    ['item', 'media', 'marketplace', 'social', 'complete'].indexOf(
      draft.state.currentStep,
    ) + 1
  const lastUpdated = new Date(draft.lastUpdated)
  const timeAgo = getTimeAgo(lastUpdated)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
          <FileText className="h-7 w-7 text-purple-600" />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Continue your draft?
          </h3>
          <p className="mt-2 text-gray-600">You have an unfinished item</p>
        </div>

        {/* Draft info */}
        <div className="rounded-xl bg-gray-50 p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{pieceName}</p>
              <p className="text-sm text-gray-600">
                Step {stepNumber} of 5 &bull; {currentStep}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              {timeAgo}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all"
              style={{ width: `${(stepNumber / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Start Fresh
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 font-medium text-white hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
