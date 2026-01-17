import type { Piece, SocialPlatform } from '@madebuy/shared'

export type WizardStep =
  | 'item'
  | 'media'
  | 'marketplace'
  | 'social'
  | 'complete'

export interface WizardState {
  currentStep: WizardStep
  completedSteps: WizardStep[]

  // Step 1: Item data
  piece: Partial<Piece> | null
  pieceId: string | null

  // Step 2: Media
  mediaIds: string[]
  primaryMediaId: string | null
  uploadedMediaIds: string[] // New media uploaded in this session

  // Step 3: Marketplace selection
  marketplaces: {
    storefront: boolean
    etsy: boolean
    ebay: boolean
  }
  marketplaceListingIds: {
    etsy?: string
    ebay?: string
  }

  // Step 4: Social publishing
  social: {
    platforms: SocialPlatform[]
    caption: string
    scheduleTime: Date | null
    selectedMediaIds: string[]
  }

  // Publishing results
  publishRecordId: string | null

  // UI state
  loading: boolean
  error: string | null
}

export interface WizardDraft {
  id: string
  tenantId: string
  state: WizardState
  lastUpdated: Date
  createdAt: Date
}

export const STEP_ORDER: WizardStep[] = [
  'item',
  'media',
  'marketplace',
  'social',
  'complete',
]

export const STEP_LABELS: Record<WizardStep, string> = {
  item: 'Item',
  media: 'Media',
  marketplace: 'Where',
  social: 'Social',
  complete: 'Done',
}

export const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  item: 'Create your product',
  media: 'Add photos',
  marketplace: 'Choose platforms',
  social: 'Announce it',
  complete: 'All done!',
}

export function getInitialWizardState(): WizardState {
  return {
    currentStep: 'item',
    completedSteps: [],
    piece: null,
    pieceId: null,
    mediaIds: [],
    primaryMediaId: null,
    uploadedMediaIds: [],
    marketplaces: {
      storefront: true,
      etsy: false,
      ebay: false,
    },
    marketplaceListingIds: {},
    social: {
      platforms: [],
      caption: '',
      scheduleTime: null,
      selectedMediaIds: [],
    },
    publishRecordId: null,
    loading: false,
    error: null,
  }
}

export function canProceedToStep(
  state: WizardState,
  targetStep: WizardStep,
): boolean {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)
  const targetIndex = STEP_ORDER.indexOf(targetStep)

  // Can always go back to completed steps
  if (state.completedSteps.includes(targetStep)) {
    return true
  }

  // Can only go to next step if current is complete
  if (targetIndex === currentIndex + 1) {
    return state.completedSteps.includes(state.currentStep)
  }

  return false
}

export function isStepComplete(state: WizardState, step: WizardStep): boolean {
  switch (step) {
    case 'item':
      return !!state.pieceId
    case 'media':
      return state.mediaIds.length > 0
    case 'marketplace':
      return true // Always completable (storefront is default)
    case 'social':
      return true // Optional step, always completable
    case 'complete':
      return false // Never "complete"
    default:
      return false
  }
}
