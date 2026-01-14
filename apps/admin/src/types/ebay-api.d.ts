/**
 * Type declarations for ebay-api package
 * This file provides types when the package isn't installed locally
 */

declare module 'ebay-api' {
  interface EbayApiConfig {
    appId: string
    certId: string
    sandbox: boolean
    siteId: number
    marketplaceId: string
    contentLanguage: string
    acceptLanguage: string
    scope: string[]
    autoRefreshToken: boolean
  }

  interface OAuth2Credentials {
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
  }

  interface AxiosInstance {
    interceptors: {
      request: {
        use: (fn: (config: any) => any) => void
      }
    }
  }

  class eBayApi {
    static SiteId: {
      EBAY_AU: number
      EBAY_US: number
      [key: string]: number
    }

    static MarketplaceId: {
      EBAY_AU: string
      EBAY_US: string
      [key: string]: string
    }

    static Locale: {
      en_AU: string
      en_US: string
      [key: string]: string
    }

    constructor(config: EbayApiConfig)

    OAuth2: {
      setCredentials: (credentials: OAuth2Credentials) => void
      getToken: () => Promise<string>
      refreshToken: () => Promise<OAuth2Credentials>
    }

    req: {
      instance: AxiosInstance
    }

    sell: {
      inventory: {
        createOrReplaceInventoryItem: (sku: string, item: any) => Promise<any>
        getInventoryItem: (sku: string) => Promise<any>
        deleteInventoryItem: (sku: string) => Promise<void>
        createOffer: (offer: any) => Promise<any>
        updateOffer: (offerId: string, offer: any) => Promise<any>
        publishOffer: (offerId: string) => Promise<any>
        withdrawOffer: (offerId: string) => Promise<any>
        deleteOffer: (offerId: string) => Promise<void>
        getOffers: (params?: any) => Promise<any>
      }
      account: {
        getPaymentPolicies: (marketplaceId: string) => Promise<any>
        getReturnPolicies: (marketplaceId: string) => Promise<any>
        getFulfillmentPolicies: (marketplaceId: string) => Promise<any>
      }
      fulfillment: {
        getOrders: (params: any) => Promise<any>
        getOrder: (orderId: string) => Promise<any>
      }
    }

    trading: {
      GetCategories: (params: any) => Promise<any>
    }
  }

  export default eBayApi
}
