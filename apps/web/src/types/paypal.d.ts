declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment)
      execute<T>(request: object): Promise<{ result: T }>
    }

    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string)
    }

    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string)
    }
  }

  export namespace orders {
    class OrdersGetRequest {
      constructor(orderId: string)
    }

    class OrdersCaptureRequest {
      constructor(orderId: string)
      requestBody(body: object): void
    }

    class OrdersCreateRequest {
      prefer(preference: string): void
      requestBody(body: OrdersCreateRequestBody): void
    }

    interface OrdersCreateRequestBody {
      intent: 'CAPTURE' | 'AUTHORIZE'
      purchase_units: PurchaseUnit[]
      application_context?: ApplicationContext
    }

    interface PurchaseUnit {
      reference_id?: string
      amount: {
        currency_code: string
        value: string
        breakdown?: {
          item_total?: { currency_code: string; value: string }
          shipping?: { currency_code: string; value: string }
          tax_total?: { currency_code: string; value: string }
        }
      }
      items?: Array<{
        name: string
        unit_amount: { currency_code: string; value: string }
        quantity: string
        description?: string
        sku?: string
        category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS' | 'DONATION'
      }>
      shipping?: {
        name?: { full_name: string }
        address?: {
          address_line_1?: string
          address_line_2?: string
          admin_area_1?: string
          admin_area_2?: string
          postal_code?: string
          country_code: string
        }
      }
    }

    interface ApplicationContext {
      brand_name?: string
      locale?: string
      landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE'
      shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS'
      user_action?: 'CONTINUE' | 'PAY_NOW'
      return_url?: string
      cancel_url?: string
    }
  }

  const paypal: {
    core: typeof core
    orders: typeof orders
  }

  export default paypal
}
