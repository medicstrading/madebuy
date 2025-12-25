/**
 * Etsy API Types
 */

export interface EtsyOAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
}

export interface EtsyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export interface EtsyShop {
  shop_id: number
  shop_name: string
  user_id: number
  create_date: number
  title: string
  announcement?: string
  currency_code: string
  is_vacation: boolean
  vacation_message?: string
  listing_active_count: number
  url: string
}

export interface EtsyListing {
  listing_id: number
  user_id: number
  shop_id: number
  title: string
  description: string
  state: 'active' | 'inactive' | 'draft' | 'sold_out' | 'expired'
  creation_timestamp: number
  created_timestamp: number
  ending_timestamp: number
  original_creation_timestamp: number
  last_modified_timestamp: number
  updated_timestamp: number
  state_timestamp: number
  quantity: number
  shop_section_id?: number
  featured_rank?: number
  url: string
  num_favorers: number
  is_customizable: boolean
  is_personalizable: boolean
  personalization_is_required: boolean
  personalization_char_count_max?: number
  personalization_instructions?: string
  listing_type: 'physical' | 'download' | 'both'
  tags: string[]
  materials: string[]
  shipping_profile_id?: number
  return_policy_id?: number
  processing_min?: number
  processing_max?: number
  who_made: 'i_did' | 'collective' | 'someone_else'
  when_made: 'made_to_order' | '2020_2024' | '2010_2019' | '2005_2009' | 'before_2005' | '2000_2004' | '1990s' | '1980s' | '1970s' | '1960s' | '1950s' | '1940s' | '1930s' | '1920s' | '1910s' | '1900s' | '1800s' | '1700s' | 'before_1700'
  is_supply: boolean
  item_weight?: number
  item_weight_unit?: 'oz' | 'lb' | 'g' | 'kg'
  item_length?: number
  item_width?: number
  item_height?: number
  item_dimensions_unit?: 'in' | 'ft' | 'mm' | 'cm' | 'm'
  is_private: boolean
  style?: string[]
  file_data?: string
  has_variations: boolean
  should_auto_renew: boolean
  language?: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  taxonomy_id?: number
  production_partner_ids?: number[]
  image_ids?: number[]
}

export interface EtsyListingCreateInput {
  quantity: number
  title: string
  description: string
  price: number
  who_made: EtsyListing['who_made']
  when_made: EtsyListing['when_made']
  taxonomy_id?: number
  shipping_profile_id?: number
  return_policy_id?: number
  materials?: string[]
  shop_section_id?: number
  processing_min?: number
  processing_max?: number
  tags?: string[]
  styles?: string[]
  item_weight?: number
  item_length?: number
  item_width?: number
  item_height?: number
  item_weight_unit?: EtsyListing['item_weight_unit']
  item_dimensions_unit?: EtsyListing['item_dimensions_unit']
  is_personalizable?: boolean
  personalization_is_required?: boolean
  personalization_char_count_max?: number
  personalization_instructions?: string
  production_partner_ids?: number[]
  image_ids?: number[]
  is_supply?: boolean
  is_customizable?: boolean
  should_auto_renew?: boolean
  is_taxable?: boolean
  type?: 'physical' | 'download' | 'both'
}

export interface EtsyListingUpdateInput {
  title?: string
  description?: string
  materials?: string[]
  should_auto_renew?: boolean
  shipping_profile_id?: number
  return_policy_id?: number
  shop_section_id?: number
  item_weight?: number
  item_length?: number
  item_width?: number
  item_height?: number
  item_weight_unit?: EtsyListing['item_weight_unit']
  item_dimensions_unit?: EtsyListing['item_dimensions_unit']
  is_taxable?: boolean
  taxonomy_id?: number
  tags?: string[]
  who_made?: EtsyListing['who_made']
  when_made?: EtsyListing['when_made']
  featured_rank?: number
  is_personalizable?: boolean
  personalization_is_required?: boolean
  personalization_char_count_max?: number
  personalization_instructions?: string
  state?: 'active' | 'inactive' | 'draft'
  is_supply?: boolean
  production_partner_ids?: number[]
  image_ids?: number[]
  processing_min?: number
  processing_max?: number
  styles?: string[]
}

export interface EtsyInventoryUpdateInput {
  products: Array<{
    sku?: string
    property_values?: Array<{
      property_id: number
      property_name?: string
      scale_id?: number | null
      value_ids: number[]
      values: string[]
    }>
    offerings: Array<{
      offering_id?: number
      price: number
      quantity: number
      is_enabled: boolean
    }>
  }>
  price_on_property?: number[]
  quantity_on_property?: number[]
  sku_on_property?: number[]
}

export interface EtsyShippingProfile {
  shipping_profile_id: number
  title: string
  user_id: number
  min_processing_days: number
  max_processing_days: number
  processing_days_display_label: string
  origin_country_iso: string
  origin_postal_code?: string
  profile_type: 'manual' | 'calculated'
}

export interface EtsyReceipt {
  receipt_id: number
  receipt_type: number
  seller_user_id: number
  seller_email: string
  buyer_user_id: number
  buyer_email: string
  name: string
  first_line: string
  second_line?: string
  city: string
  state?: string
  zip: string
  status: 'open' | 'paid' | 'completed' | 'processing' | 'canceled'
  formatted_address: string
  country_iso: string
  payment_method: string
  payment_email?: string
  message_from_seller?: string
  message_from_buyer?: string
  message_from_payment?: string
  is_paid: boolean
  is_shipped: boolean
  create_timestamp: number
  created_timestamp: number
  update_timestamp: number
  updated_timestamp: number
  is_gift: boolean
  gift_message?: string
  grandtotal: {
    amount: number
    divisor: number
    currency_code: string
  }
  subtotal: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_price: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_shipping_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_tax_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_vat_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  discount_amt: {
    amount: number
    divisor: number
    currency_code: string
  }
  gift_wrap_price: {
    amount: number
    divisor: number
    currency_code: string
  }
  shipments: EtsyShipment[]
  transactions: EtsyTransaction[]
}

export interface EtsyShipment {
  receipt_shipping_id: number
  shipment_notification_timestamp: number
  carrier_name: string
  tracking_code: string
}

export interface EtsyTransaction {
  transaction_id: number
  title: string
  description: string
  seller_user_id: number
  buyer_user_id: number
  create_timestamp: number
  created_timestamp: number
  paid_timestamp: number
  shipped_timestamp: number
  quantity: number
  listing_image_id: number
  receipt_id: number
  is_digital: boolean
  file_data: string
  listing_id: number
  transaction_type: string
  product_id: number
  sku?: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  shipping_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  variations: Array<{
    property_id: number
    value_id: number
    formatted_name: string
    formatted_value: string
  }>
  product_data: Array<{
    property_id: number
    property_name: string
    scale_id?: number | null
    scale_name?: string | null
    value_ids: number[]
    values: string[]
  }>
  shipping_profile_id: number
  min_processing_days: number
  max_processing_days: number
  shipping_method?: string
  shipping_upgrade?: string
  expected_ship_date: number
  buyer_coupon: number
  shop_coupon: number
}

export interface EtsyImage {
  listing_id: number
  listing_image_id: number
  hex_code?: string
  red?: number
  green?: number
  blue?: number
  hue?: number
  saturation?: number
  brightness?: number
  is_black_and_white: boolean
  creation_tsz: number
  created_timestamp: number
  rank: number
  url_75x75: string
  url_170x135: string
  url_570xN: string
  url_fullxfull: string
  full_height: number
  full_width: number
  alt_text?: string
}

export interface EtsyListingsResponse {
  count: number
  results: EtsyListing[]
}

export interface EtsyError {
  error: string
  error_description?: string
}
