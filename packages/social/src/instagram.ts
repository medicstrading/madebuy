/**
 * Native Instagram API integration (optional - for future use)
 *
 * This provides direct Instagram publishing as an alternative/fallback
 * to Late API. Requires Instagram Business Account and Facebook Graph API.
 */

export interface InstagramCredentials {
  accessToken: string
  instagramBusinessAccountId: string
}

export interface InstagramMediaContainer {
  id: string
}

export interface InstagramPublishRequest {
  imageUrl: string
  caption: string
  accessToken: string
  instagramBusinessAccountId: string
}

export interface InstagramPublishResponse {
  id: string
  permalink?: string
}

/**
 * Create Instagram media container (step 1 of publishing)
 */
export async function createInstagramMediaContainer(
  request: InstagramPublishRequest
): Promise<InstagramMediaContainer> {
  const { imageUrl, caption, accessToken, instagramBusinessAccountId } = request

  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: accessToken,
  })

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${instagramBusinessAccountId}/media`,
    {
      method: 'POST',
      body: params,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Instagram API error (create container): ${error}`)
  }

  return await response.json()
}

/**
 * Publish Instagram media container (step 2 of publishing)
 */
export async function publishInstagramMedia(
  containerId: string,
  accessToken: string,
  instagramBusinessAccountId: string
): Promise<InstagramPublishResponse> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  })

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${instagramBusinessAccountId}/media_publish`,
    {
      method: 'POST',
      body: params,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Instagram API error (publish): ${error}`)
  }

  return await response.json()
}

/**
 * Complete Instagram publishing flow (create + publish)
 */
export async function publishToInstagram(
  request: InstagramPublishRequest
): Promise<InstagramPublishResponse> {
  // Step 1: Create media container
  const container = await createInstagramMediaContainer(request)

  // Step 2: Publish the container
  const result = await publishInstagramMedia(
    container.id,
    request.accessToken,
    request.instagramBusinessAccountId
  )

  return result
}

/**
 * Get Instagram media permalink
 */
export async function getInstagramMediaPermalink(
  mediaId: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
  )

  if (!response.ok) {
    throw new Error('Failed to get Instagram media permalink')
  }

  const data = await response.json()
  return data.permalink
}
