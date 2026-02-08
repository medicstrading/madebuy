'use client'

import type { MediaItem, Piece, SocialPlatform, Tenant } from '@madebuy/shared'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { DraftRecoveryModal } from './DraftRecoveryModal'
import { CompleteStep } from './steps/CompleteStep'
import { ItemStep } from './steps/ItemStep'
import { MarketplaceStep } from './steps/MarketplaceStep'
import { MediaStep } from './steps/MediaStep'
import { SocialStep } from './steps/SocialStep'
import {
  getInitialWizardState,
  STEP_ORDER,
  type WizardDraft,
  type WizardState,
  type WizardStep,
} from './types'
import { WizardProgress } from './WizardProgress'

interface QuickLaunchWizardProps {
  tenant: Tenant
  existingMedia: MediaItem[]
  connectedSocialPlatforms: SocialPlatform[]
  connectedMarketplaces: {
    etsy: boolean
    ebay: boolean
  }
}

export function QuickLaunchWizard({
  tenant,
  existingMedia,
  connectedSocialPlatforms,
  connectedMarketplaces,
}: QuickLaunchWizardProps) {
  const _router = useRouter()
  const [state, setState] = useState<WizardState>(getInitialWizardState())
  const [draft, setDraft] = useState<WizardDraft | null>(null)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(existingMedia)

  // Determine locked steps based on plan
  const currentPlan = tenant.plan || 'free'
  const lockedSteps: WizardStep[] = []
  if (
    !['maker', 'professional', 'studio', 'pro', 'business'].includes(
      currentPlan,
    )
  ) {
    // Free users can still see but some features are gated within steps
  }

  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check for existing draft on mount
  useEffect(() => {
    const controller = new AbortController()

    const checkForDraft = async () => {
      try {
        const response = await fetch('/api/wizard/draft', {
          signal: controller.signal,
        })
        if (response.ok) {
          const data = await response.json()
          if (data.draft) {
            setDraft(data.draft)
            setShowDraftModal(true)
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return
        // No draft or error - continue fresh
      }
    }
    checkForDraft()

    return () => {
      controller.abort()
    }
  }, [])

  // Auto-save draft when state changes (debounced)
  useEffect(() => {
    if (state.pieceId && state.currentStep !== 'complete') {
      // Clear any pending save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      // Debounce save by 1 second
      saveTimerRef.current = setTimeout(() => {
        // Define the save function inside the effect to avoid stale closures
        const saveDraft = async () => {
          try {
            await fetch('/api/wizard/draft', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state }),
            })
          } catch {
            // Silent fail for draft saving
          }
        }
        saveDraft()
      }, 1000)
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [state])

  const deleteDraft = async () => {
    try {
      await fetch('/api/wizard/draft', { method: 'DELETE' })
    } catch {
      // Silent fail
    }
  }

  const handleContinueDraft = () => {
    if (draft) {
      setState(draft.state)
      setShowDraftModal(false)
    }
  }

  const handleDiscardDraft = async () => {
    await deleteDraft()
    setDraft(null)
    setShowDraftModal(false)
    setState(getInitialWizardState())
  }

  const goToStep = (step: WizardStep) => {
    // Can only go to completed steps or current step
    if (state.completedSteps.includes(step) || step === state.currentStep) {
      setState((prev) => ({ ...prev, currentStep: step }))
    }
  }

  const completeStep = (step: WizardStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }))
  }

  const _nextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep)
    if (currentIndex < STEP_ORDER.length - 1) {
      completeStep(state.currentStep)
      setState((prev) => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex + 1],
      }))
    }
  }

  const prevStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep)
    if (currentIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: STEP_ORDER[currentIndex - 1],
      }))
    }
  }

  // Step handlers
  const handleItemSave = async (data: Partial<Piece>, pieceId: string) => {
    // Combine all state updates into one to avoid race conditions
    setState((prev) => ({
      ...prev,
      piece: data,
      pieceId,
      loading: false,
      completedSteps: prev.completedSteps.includes('item')
        ? prev.completedSteps
        : [...prev.completedSteps, 'item'],
      currentStep: 'media' as WizardStep,
    }))
  }

  const handleItemSkip = () => {
    // Can't skip item step - it's required
    // But we could create a minimal draft piece
  }

  const handleMediaSave = async (
    mediaIds: string[],
    primaryId: string | null,
    uploadedIds: string[],
  ) => {
    setState((prev) => ({
      ...prev,
      mediaIds,
      primaryMediaId: primaryId,
      uploadedMediaIds: [...prev.uploadedMediaIds, ...uploadedIds],
      loading: true,
    }))

    // Update piece with media
    if (state.pieceId) {
      try {
        await fetch(`/api/pieces/${state.pieceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaIds,
            primaryMediaId: primaryId,
          }),
        })

        // Refresh media list to include newly uploaded items
        const mediaResponse = await fetch('/api/media')
        if (mediaResponse.ok) {
          const { media } = await mediaResponse.json()
          setMediaItems(media)
        }
      } catch (error) {
        console.error('Failed to update piece media:', error)
      }
    }

    // Combine state update with step transition
    setState((prev) => ({
      ...prev,
      loading: false,
      completedSteps: prev.completedSteps.includes('media')
        ? prev.completedSteps
        : [...prev.completedSteps, 'media'],
      currentStep: 'marketplace' as WizardStep,
    }))
  }

  const handleMediaSkip = () => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes('media')
        ? prev.completedSteps
        : [...prev.completedSteps, 'media'],
      currentStep: 'marketplace' as WizardStep,
    }))
  }

  const handleMarketplaceSave = async (selection: {
    storefront: boolean
    etsy: boolean
    ebay: boolean
  }) => {
    setState((prev) => ({
      ...prev,
      marketplaces: selection,
      loading: true,
    }))

    // Create marketplace listings if selected and piece exists
    if (state.pieceId) {
      try {
        // Update piece to be published to website
        if (selection.storefront) {
          await fetch(`/api/pieces/${state.pieceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'available',
              isPublishedToWebsite: true,
            }),
          })
        }

        // Create Etsy listing
        if (selection.etsy && connectedMarketplaces.etsy) {
          await fetch('/api/marketplace/etsy/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pieceId: state.pieceId }),
          })
        }

        // Create eBay listing
        if (selection.ebay && connectedMarketplaces.ebay) {
          await fetch('/api/marketplace/ebay/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pieceId: state.pieceId }),
          })
        }
      } catch (error) {
        console.error('Failed to create marketplace listings:', error)
      }
    }

    // Combine state update with step transition
    setState((prev) => ({
      ...prev,
      loading: false,
      completedSteps: prev.completedSteps.includes('marketplace')
        ? prev.completedSteps
        : [...prev.completedSteps, 'marketplace'],
      currentStep: 'social' as WizardStep,
    }))
  }

  const handleSocialSave = async (data: {
    platforms: SocialPlatform[]
    caption: string
    scheduleTime: Date | null
    selectedMediaIds: string[]
  }) => {
    setState((prev) => ({
      ...prev,
      social: data,
      loading: true,
    }))

    // Create social publish record and optionally execute
    if (data.platforms.length > 0 && data.caption) {
      try {
        const response = await fetch('/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platforms: data.platforms,
            caption: data.caption,
            mediaIds: data.selectedMediaIds,
            scheduledFor: data.scheduleTime?.toISOString(),
            pieceId: state.pieceId,
          }),
        })

        if (response.ok) {
          const { publishRecord } = await response.json()
          setState((prev) => ({ ...prev, publishRecordId: publishRecord.id }))

          // Execute immediately if not scheduled
          if (!data.scheduleTime) {
            await fetch(`/api/publish/${publishRecord.id}/execute`, {
              method: 'POST',
            })
          }
        }
      } catch (error) {
        console.error('Failed to create publish record:', error)
      }
    }

    // Delete draft on completion
    await deleteDraft()

    // Combine state update with step transition
    setState((prev) => ({
      ...prev,
      loading: false,
      completedSteps: prev.completedSteps.includes('social')
        ? prev.completedSteps
        : [...prev.completedSteps, 'social'],
      currentStep: 'complete' as WizardStep,
    }))
  }

  const handleSocialSkip = async () => {
    // Delete draft on completion
    await deleteDraft()
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes('social')
        ? prev.completedSteps
        : [...prev.completedSteps, 'social'],
      currentStep: 'complete' as WizardStep,
    }))
  }

  const handleAddAnother = () => {
    setState(getInitialWizardState())
  }

  // Get current step's media items (for steps that need them)
  const getSelectedMediaItems = (): MediaItem[] => {
    return state.mediaIds
      .map((id) => mediaItems.find((m) => m.id === id))
      .filter((m): m is MediaItem => !!m)
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Draft recovery modal */}
      {draft && (
        <DraftRecoveryModal
          isOpen={showDraftModal}
          draft={draft}
          onContinue={handleContinueDraft}
          onDiscard={handleDiscardDraft}
          onClose={() => setShowDraftModal(false)}
        />
      )}

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Progress indicator */}
        {state.currentStep !== 'complete' && (
          <div className="mb-12">
            <WizardProgress
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              onStepClick={goToStep}
              lockedSteps={lockedSteps}
            />
          </div>
        )}

        {/* Step content */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          {state.currentStep === 'item' && (
            <ItemStep
              initialData={state.piece}
              onSave={handleItemSave}
              onSkip={handleItemSkip}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'media' && state.pieceId && (
            <MediaStep
              pieceId={state.pieceId}
              initialMediaIds={state.mediaIds}
              primaryMediaId={state.primaryMediaId}
              existingMedia={mediaItems}
              onSave={handleMediaSave}
              onBack={prevStep}
              onSkip={handleMediaSkip}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'marketplace' && (
            <MarketplaceStep
              tenantSlug={tenant.slug}
              initialSelection={state.marketplaces}
              connectedPlatforms={connectedMarketplaces}
              currentPlan={currentPlan}
              onSave={handleMarketplaceSave}
              onBack={prevStep}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'social' && state.pieceId && (
            <SocialStep
              pieceId={state.pieceId}
              pieceName={state.piece?.name || ''}
              pieceDescription={state.piece?.description || ''}
              mediaItems={getSelectedMediaItems()}
              connectedPlatforms={connectedSocialPlatforms}
              currentPlan={currentPlan}
              initialData={state.social}
              onSave={handleSocialSave}
              onBack={prevStep}
              onSkip={handleSocialSkip}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'complete' && state.pieceId && (
            <CompleteStep
              pieceName={state.piece?.name || ''}
              pieceId={state.pieceId}
              tenantSlug={tenant.slug}
              mediaItems={getSelectedMediaItems()}
              marketplaces={state.marketplaces}
              socialPlatforms={state.social.platforms}
              socialScheduled={state.social.scheduleTime !== null}
              socialScheduleTime={state.social.scheduleTime}
              onAddAnother={handleAddAnother}
            />
          )}
        </div>
      </div>
    </div>
  )
}
