/**
 * Caption Style Profile Types
 *
 * Per-platform AI caption style learning system.
 * Stores user preferences, example posts, and auto-learned content.
 */

import type { SocialPlatform } from './tenant'

/**
 * Caption style profile for a specific platform
 */
export interface CaptionStyleProfile {
  id: string
  tenantId: string
  platform: SocialPlatform

  // Structured style options
  style: CaptionStyleOptions

  // User-provided example posts (3-5)
  examplePosts: ExamplePost[]

  // Auto-learned examples from successful posts
  learnedExamples: LearnedExample[]

  // Onboarding state
  onboardingComplete: boolean

  createdAt: Date
  updatedAt: Date
}

/**
 * Structured caption style options
 */
export interface CaptionStyleOptions {
  // Tone selection (can select multiple)
  tones: CaptionTone[]

  // Emoji usage preference
  emojiUsage: EmojiUsage

  // Caption length preference
  lengthPreference: LengthPreference

  // Hashtag style
  hashtagStyle: HashtagStyle
  hashtagPosition: 'inline' | 'end'

  // Call to action preferences
  includeCallToAction: boolean
  callToActionStyle?: CallToActionStyle

  // Custom instructions (user can add their own guidelines)
  customInstructions?: string
}

/**
 * Available tone options
 */
export type CaptionTone =
  | 'professional'
  | 'casual'
  | 'playful'
  | 'luxurious'
  | 'authentic'
  | 'educational'
  | 'inspirational'
  | 'conversational'

export type EmojiUsage = 'none' | 'minimal' | 'moderate' | 'heavy'
export type LengthPreference = 'short' | 'medium' | 'long'
export type HashtagStyle = 'none' | 'minimal' | 'moderate' | 'heavy'
export type CallToActionStyle = 'subtle' | 'direct' | 'question'

/**
 * User-provided example post
 */
export interface ExamplePost {
  id: string
  content: string
  addedAt: Date
  source: 'user' | 'imported'
}

/**
 * Auto-learned example from successful posts
 */
export interface LearnedExample {
  id: string
  content: string
  publishRecordId: string
  platform: SocialPlatform
  learnedAt: Date

  // Engagement metrics (if available from platform)
  metrics?: {
    likes?: number
    comments?: number
    shares?: number
    reach?: number
  }
}

/**
 * Input for creating a new style profile
 */
export interface CreateCaptionStyleInput {
  platform: SocialPlatform
  style?: Partial<CaptionStyleOptions>
  examplePosts?: string[]
}

/**
 * Input for updating style options
 */
export interface UpdateCaptionStyleInput {
  style?: Partial<CaptionStyleOptions>
}

/**
 * Default style options per platform
 */
export const PLATFORM_DEFAULT_STYLES: Record<
  SocialPlatform,
  CaptionStyleOptions
> = {
  instagram: {
    tones: ['authentic', 'casual'],
    emojiUsage: 'moderate',
    lengthPreference: 'medium',
    hashtagStyle: 'moderate',
    hashtagPosition: 'end',
    includeCallToAction: true,
    callToActionStyle: 'question',
  },
  tiktok: {
    tones: ['playful', 'conversational'],
    emojiUsage: 'heavy',
    lengthPreference: 'short',
    hashtagStyle: 'minimal',
    hashtagPosition: 'end',
    includeCallToAction: true,
    callToActionStyle: 'direct',
  },
  facebook: {
    tones: ['conversational', 'authentic'],
    emojiUsage: 'minimal',
    lengthPreference: 'medium',
    hashtagStyle: 'none',
    hashtagPosition: 'end',
    includeCallToAction: true,
    callToActionStyle: 'subtle',
  },
  pinterest: {
    tones: ['inspirational', 'educational'],
    emojiUsage: 'minimal',
    lengthPreference: 'medium',
    hashtagStyle: 'minimal',
    hashtagPosition: 'end',
    includeCallToAction: false,
  },
  youtube: {
    tones: ['conversational', 'educational'],
    emojiUsage: 'minimal',
    lengthPreference: 'long',
    hashtagStyle: 'minimal',
    hashtagPosition: 'end',
    includeCallToAction: true,
    callToActionStyle: 'direct',
  },
  'website-blog': {
    tones: ['professional', 'educational'],
    emojiUsage: 'none',
    lengthPreference: 'long',
    hashtagStyle: 'none',
    hashtagPosition: 'end',
    includeCallToAction: true,
    callToActionStyle: 'subtle',
  },
}

/**
 * Platform-specific guidelines for AI prompts
 */
export const PLATFORM_GUIDELINES: Record<SocialPlatform, string> = {
  instagram: `Instagram best practices:
- First line is crucial (appears before "more" button)
- Use line breaks for readability
- End with relevant hashtags (15-30 work well)
- Include a question or call-to-action to boost engagement
- Authentic, personal tone performs best`,

  tiktok: `TikTok best practices:
- Keep it short and punchy (under 100 characters ideal)
- Reference trending sounds/challenges if relevant
- Emojis help with visibility and personality
- Minimal hashtags (3-5 max)
- Casual, relatable tone works best`,

  facebook: `Facebook best practices:
- Longer form content works well
- Skip hashtags (or use 1-2 max)
- Ask questions to encourage comments
- Personal stories and behind-the-scenes resonate
- Conversational tone preferred`,

  pinterest: `Pinterest best practices:
- Focus on descriptive, searchable text
- Include relevant keywords naturally
- Describe what viewers will learn or get
- Keep it helpful and aspirational
- SEO-friendly descriptions perform best`,

  youtube: `YouTube description best practices:
- Front-load important keywords
- Include timestamps if relevant
- Add relevant links and CTAs
- Use natural language for SEO
- Detailed descriptions help discoverability`,

  'website-blog': `Blog post best practices:
- Professional, well-structured content
- SEO-friendly with natural keyword usage
- Clear value proposition
- Strong opening and conclusion
- Focus on providing genuine value`,
}

/**
 * Tone display labels for UI
 */
export const TONE_LABELS: Record<CaptionTone, string> = {
  professional: 'Professional',
  casual: 'Casual',
  playful: 'Playful',
  luxurious: 'Luxurious',
  authentic: 'Authentic',
  educational: 'Educational',
  inspirational: 'Inspirational',
  conversational: 'Conversational',
}

/**
 * Emoji usage display labels
 */
export const EMOJI_USAGE_LABELS: Record<EmojiUsage, string> = {
  none: 'No emojis',
  minimal: 'Minimal (1-2)',
  moderate: 'Moderate (3-5)',
  heavy: 'Lots of emojis',
}

/**
 * Length preference display labels
 */
export const LENGTH_LABELS: Record<LengthPreference, string> = {
  short: 'Short (under 100 chars)',
  medium: 'Medium (100-200 chars)',
  long: 'Long (200+ chars)',
}

/**
 * Hashtag style display labels
 */
export const HASHTAG_LABELS: Record<HashtagStyle, string> = {
  none: 'No hashtags',
  minimal: 'Few (3-5)',
  moderate: 'Moderate (10-15)',
  heavy: 'Many (20-30)',
}

/**
 * CTA style display labels
 */
export const CTA_LABELS: Record<CallToActionStyle, string> = {
  subtle: 'Subtle nudge',
  direct: 'Clear call-to-action',
  question: 'Engaging question',
}
