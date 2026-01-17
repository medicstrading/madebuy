/**
 * @madebuy/social
 * Social media publishing and AI caption generation for MadeBuy platform
 */

// Export AI caption generation
export {
  type GenerateCaptionOptions,
  generateCaption,
  generateCaptionVariations,
  suggestHashtags,
} from './ai-captions'
// Export Instagram native API (optional fallback)
export {
  createInstagramMediaContainer,
  getInstagramMediaPermalink,
  type InstagramCredentials,
  type InstagramMediaContainer,
  type InstagramPublishRequest,
  type InstagramPublishResponse,
  publishInstagramMedia,
  publishToInstagram,
} from './instagram'
// Export Late API client (primary)
export {
  getLateClient,
  type LateAccount,
  type LateAccountsResponse,
  // Internal API types (useful for consumers)
  type LateAPIError,
  LateClient,
  type LateCreatePostAPIRequest,
  type LateCreatePostAPIResponse,
  type LateGetPostAPIResponse,
  type LateMedia,
  type LateOAuthTokenRequest,
  type LateOAuthTokenResponse,
  type LateOAuthUrlRequest,
  type LateOAuthUrlResponse,
  type LatePlatform,
  type LatePlatformType,
  type LatePost,
  type LatePostResponse,
  type LateProfile,
  type LateProfilesResponse,
  type LatePublishRequest,
  type LatePublishResponse,
  type LateUploadMediaAPIResponse,
  lateClient,
  publishToLate,
  scheduleToLate,
} from './late-client'
