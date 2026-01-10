/**
 * @madebuy/social
 * Social media publishing and AI caption generation for MadeBuy platform
 */

// Export Late API client (primary)
export {
  LateClient,
  lateClient,
  getLateClient,
  publishToLate,
  scheduleToLate,
  type LatePublishRequest,
  type LatePublishResponse,
  type LateOAuthUrlRequest,
  type LateOAuthUrlResponse,
  type LateOAuthTokenRequest,
  type LateOAuthTokenResponse,
  type LateAccount,
  type LateAccountsResponse,
  type LatePlatformType,
  type LatePost,
  type LatePlatform,
  type LateMedia,
  type LatePostResponse,
  type LateProfile,
  type LateProfilesResponse,
  // Internal API types (useful for consumers)
  type LateAPIError,
  type LateCreatePostAPIRequest,
  type LateCreatePostAPIResponse,
  type LateGetPostAPIResponse,
  type LateUploadMediaAPIResponse,
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
