/**
 * @madebuy/social
 * Social media publishing and AI caption generation for MadeBuy platform
 */

// Export Late API client (primary)
export {
  LateClient,
  lateClient,
  type LatePublishRequest,
  type LatePublishResponse,
  type LateOAuthUrlRequest,
  type LateOAuthUrlResponse,
  type LateOAuthTokenRequest,
  type LateOAuthTokenResponse,
} from './late-client'

// Export AI caption generation
export {
  generateCaption,
  generateCaptionVariations,
  suggestHashtags,
  type GenerateCaptionOptions,
} from './ai-captions'

// Export Instagram native API (optional fallback)
export {
  createInstagramMediaContainer,
  publishInstagramMedia,
  publishToInstagram,
  getInstagramMediaPermalink,
  type InstagramCredentials,
  type InstagramMediaContainer,
  type InstagramPublishRequest,
  type InstagramPublishResponse,
} from './instagram'
