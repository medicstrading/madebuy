import OpenAI from 'openai'
import type { AICaptionRequest, AICaptionResponse } from '@madebuy/shared'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not configured. AI caption generation will fail.')
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

export interface GenerateCaptionOptions extends AICaptionRequest {
  imageUrls?: string[]
  productName?: string
  productDescription?: string
}

/**
 * Generate AI-powered social media caption using OpenAI GPT-4 Vision
 */
export async function generateCaption(
  options: GenerateCaptionOptions
): Promise<AICaptionResponse> {
  const {
    imageUrls = [],
    productName,
    productDescription,
    style = 'professional',
    includeHashtags = true,
  } = options

  // Build the prompt based on style
  const stylePrompts = {
    casual: 'Write a casual, friendly social media caption',
    professional: 'Write a professional, polished social media caption',
    playful: 'Write a playful, fun social media caption with personality',
  }

  const systemPrompt = `You are a social media expert specializing in product marketing for handmade crafts and jewelry.
Your captions should be engaging, authentic, and optimized for social media engagement.
${includeHashtags ? 'Always include relevant hashtags at the end.' : 'Do not include hashtags.'}`

  let userPrompt = stylePrompts[style] || stylePrompts.professional

  if (productName) {
    userPrompt += ` for a product called "${productName}"`
  }

  if (productDescription) {
    userPrompt += `. Product details: ${productDescription}`
  }

  userPrompt += '. Keep it concise (under 150 characters for the main text), engaging, and authentic.'

  // Prepare messages with images if provided
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (imageUrls.length > 0) {
    // GPT-4 Vision can analyze images
    const imageContent = imageUrls.slice(0, 4).map(url => ({
      type: 'image_url',
      image_url: { url }
    }))

    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        ...imageContent,
      ]
    })
  } else {
    messages.push({
      role: 'user',
      content: userPrompt,
    })
  }

  try {
    const response = await openai.chat.completions.create({
      model: imageUrls.length > 0 ? 'gpt-4-vision-preview' : 'gpt-4-turbo-preview',
      messages,
      max_tokens: 300,
      temperature: 0.8, // More creative
    })

    const captionText = response.choices[0]?.message?.content?.trim() || ''

    // Extract hashtags from the caption
    const hashtags = captionText.match(/#[\w]+/g) || []
    const captionWithoutHashtags = captionText.replace(/#[\w]+/g, '').trim()

    return {
      caption: includeHashtags ? captionText : captionWithoutHashtags,
      hashtags: hashtags.map((tag: string) => tag.replace('#', '')),
      confidence: 0.85, // Could be calculated based on response
    }
  } catch (error) {
    console.error('Error generating AI caption:', error)
    throw new Error('Failed to generate AI caption')
  }
}

/**
 * Generate multiple caption variations
 */
export async function generateCaptionVariations(
  options: GenerateCaptionOptions,
  count: number = 3
): Promise<AICaptionResponse[]> {
  const promises = Array(count)
    .fill(null)
    .map(() => generateCaption(options))

  return await Promise.all(promises)
}

/**
 * Extract relevant hashtags for a product/piece
 */
export async function suggestHashtags(
  productName: string,
  productDescription?: string,
  category?: string
): Promise<string[]> {
  const prompt = `Generate 10-15 relevant Instagram hashtags for a handmade product:
Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${category ? `Category: ${category}` : ''}

Return ONLY the hashtags, one per line, without the # symbol.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a social media hashtag expert. Generate relevant, popular hashtags for product marketing.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  })

  const hashtagText = response.choices[0]?.message?.content?.trim() || ''
  const hashtags = hashtagText
    .split('\n')
    .map(tag => tag.trim().replace(/^#/, ''))
    .filter(tag => tag.length > 0)

  return hashtags
}
