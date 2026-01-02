import type {
  EtsyShop,
  EtsyListing,
  EtsyListingCreateInput,
  EtsyListingUpdateInput,
  EtsyInventoryUpdateInput,
  EtsyShippingProfile,
  EtsyListingsResponse,
  EtsyImage,
  EtsyReceipt,
} from './types'

const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application'

export class EtsyClient {
  private apiKey: string
  private accessToken: string

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${ETSY_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Etsy API error (${response.status}): ${error}`)
    }

    return await response.json() as T
  }

  // Shop operations
  async getShop(shopId: string): Promise<EtsyShop> {
    return await this.request<EtsyShop>(`/shops/${shopId}`)
  }

  async getShippingProfiles(shopId: string): Promise<{ results: EtsyShippingProfile[] }> {
    return await this.request<{ results: EtsyShippingProfile[] }>(
      `/shops/${shopId}/shipping-profiles`
    )
  }

  // Listing operations
  async createListing(
    shopId: string,
    data: EtsyListingCreateInput
  ): Promise<EtsyListing> {
    return await this.request<EtsyListing>(`/shops/${shopId}/listings`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getListing(listingId: string): Promise<EtsyListing> {
    return await this.request<EtsyListing>(`/listings/${listingId}`)
  }

  async updateListing(
    shopId: string,
    listingId: string,
    data: EtsyListingUpdateInput
  ): Promise<EtsyListing> {
    return await this.request<EtsyListing>(
      `/shops/${shopId}/listings/${listingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async deleteListing(listingId: string): Promise<void> {
    await this.request(`/listings/${listingId}`, {
      method: 'DELETE',
    })
  }

  async getShopListings(
    shopId: string,
    params?: {
      state?: 'active' | 'inactive' | 'draft' | 'sold_out' | 'expired'
      limit?: number
      offset?: number
      sort_on?: 'created' | 'price' | 'updated' | 'score'
      sort_order?: 'asc' | 'desc'
    }
  ): Promise<EtsyListingsResponse> {
    const queryParams = new URLSearchParams()

    if (params?.state) queryParams.set('state', params.state)
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())
    if (params?.sort_on) queryParams.set('sort_on', params.sort_on)
    if (params?.sort_order) queryParams.set('sort_order', params.sort_order)

    const query = queryParams.toString()
    const endpoint = `/shops/${shopId}/listings${query ? `?${query}` : ''}`

    return await this.request<EtsyListingsResponse>(endpoint)
  }

  // Inventory operations
  async updateInventory(
    listingId: string,
    data: EtsyInventoryUpdateInput
  ): Promise<{ products: any[] }> {
    return await this.request<{ products: any[] }>(
      `/listings/${listingId}/inventory`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    )
  }

  async getInventory(listingId: string): Promise<{ products: any[] }> {
    return await this.request<{ products: any[] }>(
      `/listings/${listingId}/inventory`
    )
  }

  // Image operations
  async uploadImage(
    shopId: string,
    listingId: string,
    imageFile: File | Blob,
    params?: {
      rank?: number
      overwrite?: boolean
      is_watermarked?: boolean
      alt_text?: string
    }
  ): Promise<EtsyImage> {
    const formData = new FormData()
    formData.append('image', imageFile)

    if (params?.rank !== undefined) formData.append('rank', params.rank.toString())
    if (params?.overwrite !== undefined) formData.append('overwrite', params.overwrite.toString())
    if (params?.is_watermarked !== undefined) formData.append('is_watermarked', params.is_watermarked.toString())
    if (params?.alt_text) formData.append('alt_text', params.alt_text)

    const url = `${ETSY_API_BASE}/shops/${shopId}/listings/${listingId}/images`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Etsy image upload error (${response.status}): ${error}`)
    }

    return await response.json() as EtsyImage
  }

  async getListingImages(listingId: string): Promise<{ results: EtsyImage[] }> {
    return await this.request<{ results: EtsyImage[] }>(
      `/listings/${listingId}/images`
    )
  }

  async deleteListingImage(
    shopId: string,
    listingId: string,
    listingImageId: string
  ): Promise<void> {
    await this.request(
      `/shops/${shopId}/listings/${listingId}/images/${listingImageId}`,
      {
        method: 'DELETE',
      }
    )
  }

  // Receipt/Order operations
  async getShopReceipts(
    shopId: string,
    params?: {
      limit?: number
      offset?: number
      sort_on?: 'created' | 'updated' | 'paid'
      sort_order?: 'asc' | 'desc'
      was_paid?: boolean
      was_shipped?: boolean
    }
  ): Promise<{ results: EtsyReceipt[] }> {
    const queryParams = new URLSearchParams()

    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())
    if (params?.sort_on) queryParams.set('sort_on', params.sort_on)
    if (params?.sort_order) queryParams.set('sort_order', params.sort_order)
    if (params?.was_paid !== undefined) queryParams.set('was_paid', params.was_paid.toString())
    if (params?.was_shipped !== undefined) queryParams.set('was_shipped', params.was_shipped.toString())

    const query = queryParams.toString()
    const endpoint = `/shops/${shopId}/receipts${query ? `?${query}` : ''}`

    return await this.request<{ results: EtsyReceipt[] }>(endpoint)
  }

  async getReceipt(shopId: string, receiptId: string): Promise<EtsyReceipt> {
    return await this.request<EtsyReceipt>(`/shops/${shopId}/receipts/${receiptId}`)
  }
}
