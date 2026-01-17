/**
 * Caption Style Profile Repository
 *
 * Handles CRUD operations for per-platform AI caption style profiles.
 */

import type {
  CaptionStyleOptions,
  CaptionStyleProfile,
  CreateCaptionStyleInput,
  ExamplePost,
  LearnedExample,
  SocialPlatform,
  UpdateCaptionStyleInput,
} from '@madebuy/shared'
import { PLATFORM_DEFAULT_STYLES } from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

const COLLECTION = 'caption_styles'

/**
 * Create a new caption style profile for a platform
 */
export async function createCaptionStyleProfile(
  tenantId: string,
  input: CreateCaptionStyleInput,
): Promise<CaptionStyleProfile> {
  const db = await getDatabase()

  // Get default style for platform, merge with any provided overrides
  const defaultStyle = PLATFORM_DEFAULT_STYLES[input.platform]
  const style: CaptionStyleOptions = {
    ...defaultStyle,
    ...input.style,
  }

  // Convert example posts to proper format
  const examplePosts: ExamplePost[] = (input.examplePosts || []).map(
    (content) => ({
      id: nanoid(),
      content,
      addedAt: new Date(),
      source: 'user' as const,
    }),
  )

  const profile: CaptionStyleProfile = {
    id: nanoid(),
    tenantId,
    platform: input.platform,
    style,
    examplePosts,
    learnedExamples: [],
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(profile)
  return profile
}

/**
 * Get caption style profile for a platform
 */
export async function getCaptionStyleProfile(
  tenantId: string,
  platform: SocialPlatform,
): Promise<CaptionStyleProfile | null> {
  const db = await getDatabase()
  return (await db.collection(COLLECTION).findOne({
    tenantId,
    platform,
  })) as CaptionStyleProfile | null
}

/**
 * Get all style profiles for a tenant
 */
export async function getAllStyleProfiles(
  tenantId: string,
): Promise<CaptionStyleProfile[]> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .find({ tenantId })
    .sort({ platform: 1 })
    .toArray()) as unknown as CaptionStyleProfile[]
}

/**
 * Check if a style profile exists for a platform
 */
export async function hasStyleProfile(
  tenantId: string,
  platform: SocialPlatform,
): Promise<boolean> {
  const db = await getDatabase()
  const count = await db.collection(COLLECTION).countDocuments({
    tenantId,
    platform,
  })
  return count > 0
}

/**
 * Update style options for a profile
 */
export async function updateCaptionStyleOptions(
  tenantId: string,
  platform: SocialPlatform,
  updates: UpdateCaptionStyleInput,
): Promise<void> {
  const db = await getDatabase()

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.style) {
    // Merge with existing style options
    for (const [key, value] of Object.entries(updates.style)) {
      updateFields[`style.${key}`] = value
    }
  }

  await db
    .collection(COLLECTION)
    .updateOne({ tenantId, platform }, { $set: updateFields })
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(
  tenantId: string,
  platform: SocialPlatform,
): Promise<void> {
  const db = await getDatabase()
  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $set: {
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Add an example post to a profile
 */
export async function addExamplePost(
  tenantId: string,
  platform: SocialPlatform,
  content: string,
  source: 'user' | 'imported' = 'user',
): Promise<ExamplePost> {
  const db = await getDatabase()

  const example: ExamplePost = {
    id: nanoid(),
    content,
    addedAt: new Date(),
    source,
  }

  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $push: { examplePosts: example } as any,
      $set: { updatedAt: new Date() },
    },
  )

  return example
}

/**
 * Remove an example post from a profile
 */
export async function removeExamplePost(
  tenantId: string,
  platform: SocialPlatform,
  exampleId: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $pull: { examplePosts: { id: exampleId } } as any,
      $set: { updatedAt: new Date() },
    },
  )
}

/**
 * Get all example posts for a profile
 */
export async function getExamplePosts(
  tenantId: string,
  platform: SocialPlatform,
): Promise<ExamplePost[]> {
  const profile = await getCaptionStyleProfile(tenantId, platform)
  return profile?.examplePosts || []
}

/**
 * Add a learned example from a successful publish
 */
export async function addLearnedExample(
  tenantId: string,
  platform: SocialPlatform,
  content: string,
  publishRecordId: string,
  metrics?: LearnedExample['metrics'],
): Promise<LearnedExample> {
  const db = await getDatabase()

  const example: LearnedExample = {
    id: nanoid(),
    content,
    publishRecordId,
    platform,
    learnedAt: new Date(),
    metrics,
  }

  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $push: { learnedExamples: example } as any,
      $set: { updatedAt: new Date() },
    },
  )

  return example
}

/**
 * Get learned examples for a profile
 */
export async function getLearnedExamples(
  tenantId: string,
  platform: SocialPlatform,
  limit?: number,
): Promise<LearnedExample[]> {
  const profile = await getCaptionStyleProfile(tenantId, platform)
  const examples = profile?.learnedExamples || []

  if (limit && examples.length > limit) {
    // Return most recent examples
    return examples.slice(-limit)
  }

  return examples
}

/**
 * Check if a publish record has already been learned
 */
export async function isAlreadyLearned(
  tenantId: string,
  platform: SocialPlatform,
  publishRecordId: string,
): Promise<boolean> {
  const db = await getDatabase()
  const count = await db.collection(COLLECTION).countDocuments({
    tenantId,
    platform,
    'learnedExamples.publishRecordId': publishRecordId,
  })
  return count > 0
}

/**
 * Prune learned examples to keep only the most recent
 */
export async function pruneLearnedExamples(
  tenantId: string,
  platform: SocialPlatform,
  keepCount: number = 10,
): Promise<void> {
  const db = await getDatabase()

  const profile = await getCaptionStyleProfile(tenantId, platform)
  if (!profile || profile.learnedExamples.length <= keepCount) {
    return
  }

  // Keep only the most recent examples
  const toKeep = profile.learnedExamples
    .sort(
      (a, b) =>
        new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime(),
    )
    .slice(0, keepCount)

  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $set: {
        learnedExamples: toKeep,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Delete a style profile
 */
export async function deleteCaptionStyleProfile(
  tenantId: string,
  platform: SocialPlatform,
): Promise<void> {
  const db = await getDatabase()
  await db.collection(COLLECTION).deleteOne({ tenantId, platform })
}

/**
 * Reset style options to platform defaults
 */
export async function resetToDefaults(
  tenantId: string,
  platform: SocialPlatform,
): Promise<void> {
  const db = await getDatabase()
  const defaultStyle = PLATFORM_DEFAULT_STYLES[platform]

  await db.collection(COLLECTION).updateOne(
    { tenantId, platform },
    {
      $set: {
        style: defaultStyle,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Get style profile or create with defaults if doesn't exist
 */
export async function getOrCreateStyleProfile(
  tenantId: string,
  platform: SocialPlatform,
): Promise<CaptionStyleProfile> {
  let profile = await getCaptionStyleProfile(tenantId, platform)

  if (!profile) {
    profile = await createCaptionStyleProfile(tenantId, { platform })
  }

  return profile
}
