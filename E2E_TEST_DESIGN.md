# MadeBuy E2E Test Design Document

## Overview

This document outlines a comprehensive end-to-end (E2E) test suite for the MadeBuy platform, covering both the **Admin App** (seller dashboard) and **Web App** (public storefront). Tests are designed using Playwright and organized by feature area.

## Test Architecture

### Environment Configuration

```
Admin App:   https://madebuyadmin-production.up.railway.app (port 3300 locally)
Web App:     https://madebuyweb-production.up.railway.app (port 3301 locally)
```

### Test User Credentials (Environment Variables)

```bash
E2E_TEST_EMAIL=admin@test.com
E2E_TEST_PASSWORD=admin123
E2E_TEST_TENANT=test-shop
E2E_SKIP_AUTH_TESTS=false  # Set to false to run authenticated tests
```

---

## Test Suite Structure

```
apps/
  admin/e2e/
    ├── global-setup.ts          # Auth state, test tenant seeding
    ├── fixtures/                 # Page object models
    │   ├── admin-page.ts
    │   ├── inventory-page.ts
    │   ├── orders-page.ts
    │   └── ...
    ├── auth/
    │   ├── login.spec.ts
    │   ├── register.spec.ts
    │   ├── password-reset.spec.ts
    │   └── session.spec.ts
    ├── onboarding/
    │   ├── wizard.spec.ts
    │   ├── design-import.spec.ts
    │   └── location-setup.spec.ts
    ├── inventory/
    │   ├── crud.spec.ts
    │   ├── bulk-actions.spec.ts
    │   ├── variations.spec.ts
    │   ├── media-upload.spec.ts
    │   └── import-export.spec.ts
    ├── materials/
    │   ├── crud.spec.ts
    │   ├── invoice-scan.spec.ts
    │   └── usage-tracking.spec.ts
    ├── orders/
    │   ├── list-filter.spec.ts
    │   ├── order-detail.spec.ts
    │   ├── fulfillment.spec.ts
    │   └── bulk-actions.spec.ts
    ├── marketing/
    │   ├── publish.spec.ts
    │   ├── discounts.spec.ts
    │   ├── newsletters.spec.ts
    │   └── website-design.spec.ts
    ├── settings/
    │   ├── general.spec.ts
    │   ├── shipping.spec.ts
    │   ├── billing.spec.ts
    │   └── integrations.spec.ts
    ├── integrations/
    │   ├── etsy.spec.ts
    │   ├── ebay.spec.ts
    │   └── stripe-connect.spec.ts
    └── smoke.spec.ts

  web/e2e/
    ├── global-setup.ts
    ├── fixtures/
    │   ├── storefront-page.ts
    │   ├── cart-page.ts
    │   └── checkout-page.ts
    ├── storefront/
    │   ├── homepage.spec.ts
    │   ├── product-browse.spec.ts
    │   ├── product-detail.spec.ts
    │   ├── collections.spec.ts
    │   └── search.spec.ts
    ├── shopping/
    │   ├── add-to-cart.spec.ts
    │   ├── cart-management.spec.ts
    │   ├── wishlist.spec.ts
    │   └── bundles.spec.ts
    ├── checkout/
    │   ├── checkout-flow.spec.ts
    │   ├── discount-codes.spec.ts
    │   ├── shipping-options.spec.ts
    │   └── payment.spec.ts
    ├── content/
    │   ├── blog.spec.ts
    │   ├── static-pages.spec.ts
    │   └── newsletter-signup.spec.ts
    ├── customer/
    │   ├── enquiry.spec.ts
    │   ├── reviews.spec.ts
    │   └── order-tracking.spec.ts
    └── smoke.spec.ts
```

---

## ADMIN APP TEST SCENARIOS

### 1. Authentication Tests (`auth/`)

#### 1.1 Login Tests (`login.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-login-form` | Login page shows email, password fields, sign in button | P0 |
| `show-validation-empty` | Empty form shows validation errors | P1 |
| `show-error-invalid-credentials` | Invalid credentials show error message | P0 |
| `login-success` | Valid credentials redirect to dashboard | P0 |
| `redirect-unauthenticated` | Unauthenticated access to /dashboard redirects to login | P0 |
| `show-loading-state` | Sign in button shows loading state during auth | P2 |

#### 1.2 Registration Tests (`register.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-register-form` | Registration page shows all required fields | P0 |
| `validate-email-format` | Invalid email shows validation error | P1 |
| `validate-password-strength` | Weak password shows requirements | P1 |
| `validate-unique-email` | Duplicate email shows error | P0 |
| `register-success` | Valid registration creates tenant and redirects to onboarding | P0 |
| `show-terms-link` | Terms and privacy links are accessible | P2 |

#### 1.3 Password Reset Tests (`password-reset.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-forgot-form` | Forgot password page shows email input | P1 |
| `send-reset-email` | Valid email triggers reset email | P1 |
| `invalid-email-error` | Non-existent email shows appropriate message | P2 |
| `reset-link-works` | Reset link allows password change | P1 |

#### 1.4 Session Tests (`session.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `persist-session-reload` | Session persists across page reloads | P0 |
| `logout-success` | Logout clears session and redirects to login | P0 |
| `session-timeout` | Expired session redirects to login | P2 |

---

### 2. Onboarding Tests (`onboarding/`)

#### 2.1 Quick Launch Wizard (`wizard.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-wizard-steps` | Wizard shows all setup steps | P0 |
| `complete-basic-info` | Business name and description save correctly | P0 |
| `skip-optional-steps` | Optional steps can be skipped | P1 |
| `progress-indicator` | Progress bar updates as steps complete | P2 |
| `navigate-between-steps` | Can go back and forward between steps | P1 |

#### 2.2 Design Import (`design-import.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `scan-existing-site` | URL scan extracts colors and branding | P1 |
| `preview-generated-theme` | Preview shows applied theme | P1 |
| `accept-theme` | Accept applies theme to storefront | P1 |
| `decline-theme` | Decline returns to manual design | P2 |

#### 2.3 Location Setup (`location-setup.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `set-location` | Location saves to tenant | P1 |
| `currency-auto-set` | Currency matches location | P1 |
| `timezone-auto-set` | Timezone matches location | P2 |

---

### 3. Inventory/Products Tests (`inventory/`)

#### 3.1 CRUD Operations (`crud.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-products` | Inventory page shows product table | P0 |
| `navigate-to-create` | Create button navigates to new product form | P0 |
| `create-minimal-product` | Create product with name only | P0 |
| `create-full-product` | Create product with all fields | P0 |
| `validate-required-fields` | Form validates required fields | P1 |
| `edit-product` | Edit existing product | P0 |
| `delete-product` | Delete with confirmation | P0 |
| `duplicate-product` | Duplicate creates copy | P2 |
| `product-status-toggle` | Toggle available/sold out/hidden | P1 |

#### 3.2 Bulk Actions (`bulk-actions.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `show-checkboxes` | Table shows selection checkboxes | P1 |
| `select-individual` | Individual selection works | P1 |
| `select-all` | Header checkbox selects all | P1 |
| `show-bulk-toolbar` | Selection shows bulk actions toolbar | P1 |
| `bulk-status-change` | Change status of multiple products | P1 |
| `bulk-delete` | Delete multiple with confirmation | P1 |
| `bulk-featured-toggle` | Toggle featured on multiple | P2 |
| `clear-selection` | Clear button deselects all | P2 |

#### 3.3 Product Variations (`variations.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `add-variation-options` | Add size/color options | P1 |
| `generate-variants` | Generate variant combinations | P1 |
| `edit-variant-price` | Edit individual variant price | P1 |
| `edit-variant-stock` | Edit individual variant stock | P1 |
| `delete-variant` | Remove specific variant | P2 |

#### 3.4 Media Upload (`media-upload.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `upload-single-image` | Upload one image to product | P0 |
| `upload-multiple-images` | Upload multiple images | P1 |
| `reorder-images` | Drag to reorder images | P2 |
| `delete-image` | Remove image from product | P1 |
| `set-primary-image` | Set main product image | P1 |
| `image-preview` | Preview uploaded images | P2 |

#### 3.5 Import/Export (`import-export.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `download-template` | Download CSV template | P1 |
| `upload-csv` | Upload products CSV | P1 |
| `validate-csv-data` | Validation step shows errors | P1 |
| `confirm-import` | Import creates products | P1 |
| `export-products` | Export products to CSV | P2 |

---

### 4. Materials Tests (`materials/`)

#### 4.1 CRUD Operations (`crud.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-materials` | Materials page shows list | P1 |
| `create-material` | Create new material with cost | P1 |
| `edit-material` | Edit material details | P1 |
| `delete-material` | Delete material | P1 |
| `link-to-products` | Link material to products | P1 |

#### 4.2 Invoice Scanning (`invoice-scan.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `upload-invoice-image` | Upload invoice photo | P1 |
| `ai-extract-items` | AI extracts line items | P1 |
| `review-extracted-data` | Review extracted materials | P1 |
| `confirm-add-materials` | Confirm adds to inventory | P1 |
| `reject-incorrect-data` | Reject and re-scan | P2 |

#### 4.3 Usage Tracking (`usage-tracking.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `log-material-usage` | Record material used in product | P2 |
| `calculate-cogs` | COGS calculated from materials | P2 |
| `material-report` | Report shows usage summary | P2 |

---

### 5. Orders Tests (`orders/`)

#### 5.1 List & Filtering (`list-filter.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-orders` | Orders page shows table | P0 |
| `filter-by-status` | Filter pending/shipped/completed | P1 |
| `filter-by-date` | Filter by date range | P2 |
| `search-orders` | Search by order number/customer | P1 |
| `sort-orders` | Sort by date/amount | P2 |
| `pagination` | Paginate through orders | P2 |

#### 5.2 Order Detail (`order-detail.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `view-order-detail` | Order detail shows all info | P0 |
| `view-customer-info` | Customer details visible | P0 |
| `view-items-ordered` | Order items with quantities | P0 |
| `view-shipping-address` | Shipping address visible | P0 |
| `order-timeline` | Order history timeline | P2 |

#### 5.3 Fulfillment (`fulfillment.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `mark-order-shipped` | Add tracking and mark shipped | P0 |
| `update-tracking` | Update tracking number | P1 |
| `print-packing-slip` | Generate packing slip | P2 |
| `mark-delivered` | Mark as delivered | P1 |
| `cancel-order` | Cancel with reason | P1 |

#### 5.4 Bulk Actions (`bulk-actions.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `bulk-mark-shipped` | Mark multiple orders shipped | P2 |
| `bulk-print-labels` | Print multiple packing slips | P2 |
| `bulk-export` | Export orders to CSV | P2 |

---

### 6. Marketing Tests (`marketing/`)

#### 6.1 Social Publishing (`publish.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-scheduled-posts` | Publish page shows scheduled | P1 |
| `create-new-post` | Create post with product | P1 |
| `select-products` | Select products for post | P1 |
| `generate-ai-caption` | Generate caption with AI | P1 |
| `edit-caption` | Edit generated caption | P1 |
| `schedule-post` | Schedule for future time | P1 |
| `post-immediately` | Post now option | P2 |
| `view-post-history` | View past posts | P2 |

#### 6.2 Discounts (`discounts.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-discounts` | Discounts page shows list | P1 |
| `create-percentage-discount` | Create % off coupon | P1 |
| `create-fixed-discount` | Create $ off coupon | P1 |
| `set-min-purchase` | Set minimum purchase | P2 |
| `set-expiry-date` | Set discount expiry | P1 |
| `limit-usage` | Set usage limits | P2 |
| `activate-deactivate` | Toggle discount active | P1 |

#### 6.3 Newsletters (`newsletters.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-newsletters` | Newsletter page shows list | P2 |
| `create-newsletter` | Create new newsletter | P2 |
| `edit-template` | Edit newsletter template | P2 |
| `preview-newsletter` | Preview before sending | P2 |
| `send-newsletter` | Send to subscribers | P2 |
| `view-stats` | View open/click rates | P2 |

#### 6.4 Website Design (`website-design.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-design-editor` | Design page loads | P1 |
| `change-colors` | Update brand colors | P1 |
| `change-fonts` | Update fonts | P2 |
| `upload-logo` | Upload store logo | P1 |
| `upload-banner` | Upload hero banner | P2 |
| `preview-changes` | Preview storefront | P1 |
| `save-changes` | Save design changes | P1 |

---

### 7. Settings Tests (`settings/`)

#### 7.1 General Settings (`general.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `update-shop-name` | Change shop name | P1 |
| `update-email` | Update contact email | P1 |
| `update-description` | Update shop description | P2 |
| `save-changes` | Save all changes | P1 |

#### 7.2 Shipping Settings (`shipping.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `add-shipping-zone` | Add new shipping zone | P1 |
| `set-flat-rate` | Set flat rate shipping | P1 |
| `set-free-shipping` | Set free shipping threshold | P1 |
| `set-pickup-option` | Enable local pickup | P2 |
| `edit-shipping-zone` | Edit existing zone | P1 |
| `delete-shipping-zone` | Remove shipping zone | P2 |

#### 7.3 Billing Settings (`billing.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `view-current-plan` | Show current subscription | P1 |
| `upgrade-plan` | Initiate plan upgrade | P1 |
| `view-usage` | View usage stats | P2 |
| `manage-payment-method` | Access Stripe portal | P1 |

#### 7.4 Integrations (`integrations.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `view-connections` | Connections page shows integrations | P1 |
| `connect-late-api` | Connect Late.com for social | P1 |
| `disconnect-integration` | Disconnect an integration | P2 |
| `view-connection-status` | Show connected/disconnected state | P1 |

---

### 8. Marketplace Integrations (`integrations/`)

#### 8.1 Etsy Integration (`etsy.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-connect-button` | Show Etsy connect option | P1 |
| `initiate-oauth` | Start OAuth flow | P1 |
| `show-connected-status` | Show when connected | P1 |
| `sync-listings` | Sync products to Etsy | P2 |
| `disconnect` | Disconnect Etsy | P2 |

#### 8.2 eBay Integration (`ebay.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-connect-button` | Show eBay connect option | P1 |
| `initiate-oauth` | Start OAuth flow | P1 |
| `show-connected-status` | Show when connected | P1 |
| `sync-listings` | Sync products to eBay | P2 |
| `configure-policies` | Set eBay policies | P2 |

#### 8.3 Stripe Connect (`stripe-connect.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-connect-button` | Show Stripe Connect option | P0 |
| `initiate-onboarding` | Start Stripe onboarding | P0 |
| `show-connected-status` | Show when connected | P0 |
| `view-payouts` | View payout information | P1 |

---

## WEB APP TEST SCENARIOS

### 1. Storefront Tests (`storefront/`)

#### 1.1 Homepage (`homepage.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `load-homepage` | Tenant homepage loads | P0 |
| `display-shop-name` | Shop name in header | P0 |
| `display-featured-products` | Featured products section | P1 |
| `display-testimonials` | Customer testimonials | P2 |
| `newsletter-signup` | Newsletter form visible | P2 |
| `navigation-links` | Navigation works | P0 |

#### 1.2 Product Browse (`product-browse.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-all-products` | Shop page shows products | P0 |
| `product-card-info` | Card shows image, name, price | P0 |
| `filter-by-collection` | Filter by collection | P1 |
| `sort-products` | Sort by price/date | P1 |
| `pagination` | Paginate through products | P2 |
| `empty-state` | Show message when no products | P1 |

#### 1.3 Product Detail (`product-detail.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-product-info` | Name, description, price | P0 |
| `display-images` | Product images gallery | P0 |
| `select-variant` | Select size/color variant | P1 |
| `update-price-variant` | Price updates with variant | P1 |
| `add-to-cart-button` | Add to cart is visible | P0 |
| `quantity-selector` | Change quantity | P1 |
| `sold-out-state` | Show sold out for unavailable | P1 |

#### 1.4 Collections (`collections.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `view-collection` | Collection page shows products | P1 |
| `collection-description` | Show collection info | P2 |
| `navigate-between-collections` | Collection links work | P2 |

#### 1.5 Search (`search.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-search-page` | Search page loads | P1 |
| `search-by-name` | Find products by name | P1 |
| `search-no-results` | Show no results message | P1 |
| `search-suggestions` | Show search suggestions | P2 |

---

### 2. Shopping Tests (`shopping/`)

#### 2.1 Add to Cart (`add-to-cart.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `add-product` | Add product to cart | P0 |
| `cart-count-updates` | Cart icon count updates | P0 |
| `add-with-variant` | Add with selected variant | P1 |
| `add-multiple-quantity` | Add multiple of same product | P1 |
| `show-confirmation` | Show add to cart confirmation | P1 |

#### 2.2 Cart Management (`cart-management.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-cart-page` | Cart page loads | P0 |
| `show-cart-items` | Items display correctly | P0 |
| `update-quantity` | Change item quantity | P0 |
| `remove-item` | Remove item from cart | P0 |
| `show-subtotal` | Subtotal calculates correctly | P0 |
| `empty-cart-state` | Show empty cart message | P1 |
| `proceed-to-checkout` | Checkout button works | P0 |
| `cart-persistence` | Cart persists on reload | P1 |

#### 2.3 Wishlist (`wishlist.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `add-to-wishlist` | Add product to wishlist | P2 |
| `view-wishlist` | Wishlist page shows items | P2 |
| `remove-from-wishlist` | Remove wishlist item | P2 |
| `move-to-cart` | Move wishlist item to cart | P2 |

#### 2.4 Bundles (`bundles.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `view-bundles-page` | Bundles page loads | P2 |
| `view-bundle-detail` | Bundle detail shows products | P2 |
| `add-bundle-to-cart` | Add bundle to cart | P2 |
| `bundle-pricing` | Bundle shows savings | P2 |

---

### 3. Checkout Tests (`checkout/`)

#### 3.1 Checkout Flow (`checkout-flow.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `navigate-to-checkout` | Cart to checkout navigation | P0 |
| `display-order-summary` | Show items in checkout | P0 |
| `enter-customer-info` | Enter email and name | P0 |
| `enter-shipping-address` | Enter shipping address | P0 |
| `redirect-empty-cart` | Redirect if cart empty | P1 |

#### 3.2 Discount Codes (`discount-codes.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `apply-valid-code` | Valid code reduces total | P1 |
| `reject-invalid-code` | Invalid code shows error | P1 |
| `reject-expired-code` | Expired code shows error | P2 |
| `remove-code` | Remove applied discount | P2 |
| `minimum-not-met` | Show min purchase error | P2 |

#### 3.3 Shipping Options (`shipping-options.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-shipping-options` | Show available shipping | P1 |
| `select-shipping-method` | Select shipping option | P1 |
| `update-total-shipping` | Total includes shipping | P1 |
| `free-shipping-threshold` | Free shipping if eligible | P2 |

#### 3.4 Payment (`payment.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `redirect-to-stripe` | Proceed to Stripe Checkout | P0 |
| `payment-success-redirect` | Success page after payment | P0 |
| `payment-cancel-redirect` | Return to cart on cancel | P1 |
| `order-confirmation` | Success page shows order details | P1 |

---

### 4. Content Tests (`content/`)

#### 4.1 Blog (`blog.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `list-blog-posts` | Blog page shows posts | P2 |
| `view-blog-post` | Individual post loads | P2 |
| `blog-navigation` | Navigate between posts | P2 |

#### 4.2 Static Pages (`static-pages.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `about-page` | About page loads | P2 |
| `contact-page` | Contact page loads | P1 |
| `faq-page` | FAQ page loads | P2 |
| `shipping-page` | Shipping info page | P2 |
| `terms-page` | Terms page loads | P2 |
| `privacy-page` | Privacy page loads | P2 |

#### 4.3 Newsletter Signup (`newsletter-signup.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-signup-form` | Newsletter form visible | P2 |
| `submit-valid-email` | Successful subscription | P2 |
| `reject-invalid-email` | Invalid email error | P2 |
| `unsubscribe-link` | Unsubscribe works | P2 |

---

### 5. Customer Interaction Tests (`customer/`)

#### 5.1 Enquiry Form (`enquiry.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-contact-form` | Contact form visible | P1 |
| `submit-enquiry` | Enquiry submission works | P1 |
| `validate-required-fields` | Required fields validated | P1 |
| `show-success-message` | Success message after submit | P1 |

#### 5.2 Reviews (`reviews.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `display-product-reviews` | Reviews shown on product | P2 |
| `submit-review` | Submit product review | P2 |
| `verify-purchase-required` | Must purchase to review | P2 |

#### 5.3 Order Tracking (`order-tracking.spec.ts`)
| Test Case | Description | Priority |
|-----------|-------------|----------|
| `access-download-link` | Digital download works | P2 |
| `download-expired` | Expired download shows error | P2 |

---

## CROSS-APP INTEGRATION TESTS

### Admin-to-Web Flow Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `product-appears-on-storefront` | Product created in admin shows on web | P0 |
| `product-update-reflects` | Product edits reflect on web | P0 |
| `product-sold-out-sync` | Sold out status syncs | P1 |
| `discount-works-on-checkout` | Admin discount works in checkout | P1 |
| `order-appears-in-admin` | Web order shows in admin orders | P0 |
| `design-changes-reflect` | Website design changes apply | P1 |
| `collection-products-show` | Collection products display | P1 |

### End-to-End Purchase Flow

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `complete-purchase-flow` | Full flow: browse → cart → checkout → payment → confirmation | P0 |
| `order-notification` | Seller receives order notification | P1 |
| `order-fulfillment-flow` | Seller marks shipped, buyer sees tracking | P1 |

---

## NON-FUNCTIONAL TESTS

### Performance Tests
| Test Case | Description |
|-----------|-------------|
| `page-load-under-3s` | Key pages load in under 3 seconds |
| `search-response-time` | Search returns results quickly |
| `image-lazy-loading` | Images lazy load properly |

### Accessibility Tests
| Test Case | Description |
|-----------|-------------|
| `keyboard-navigation` | All features keyboard accessible |
| `screen-reader-labels` | ARIA labels present |
| `color-contrast` | Text meets contrast requirements |

### Mobile Responsive Tests
| Test Case | Description |
|-----------|-------------|
| `mobile-navigation` | Mobile menu works |
| `touch-targets` | Buttons are touch-friendly |
| `cart-mobile` | Cart usable on mobile |
| `checkout-mobile` | Checkout works on mobile |

---

## TEST DATA REQUIREMENTS

### Test Tenant Setup
```typescript
// Required test data in database
const testTenant = {
  slug: 'test-shop',
  name: 'Test Shop',
  email: 'admin@test.com',
  plan: 'studio',  // Full features
  features: {
    socialPublishing: true,
    aiCaptions: true,
    unlimitedPieces: true,
    customDomain: true
  }
}

// Test products needed
const testProducts = [
  { name: 'Test Product 1', price: 29.99, status: 'available' },
  { name: 'Test Product 2', price: 49.99, status: 'available' },
  { name: 'Sold Out Product', price: 19.99, status: 'sold_out' }
]

// Test discount codes
const testDiscounts = [
  { code: 'TEST10', type: 'percentage', value: 10 },
  { code: 'EXPIRED', type: 'percentage', value: 20, expiresAt: '2024-01-01' }
]
```

---

## RUNNING TESTS

### Local Development
```bash
# Run admin tests
pnpm --filter admin test:e2e

# Run admin tests with visible browser
pnpm --filter admin test:e2e:headed

# Run web tests
pnpm --filter web test:e2e

# Run specific test file
pnpm --filter admin test:e2e auth/login.spec.ts

# Run tests matching pattern
pnpm --filter admin test:e2e --grep "login"
```

### CI/CD Pipeline
```bash
# Run all tests in CI mode
E2E_TEST_EMAIL=admin@test.com \
E2E_TEST_PASSWORD=admin123 \
E2E_TEST_TENANT=test-shop \
pnpm test:e2e:ci
```

### Test Reports
- HTML reports: `apps/admin/playwright-report/`
- Screenshots on failure: `apps/admin/test-results/`
- Videos on failure: `apps/admin/test-results/`

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Path (P0)
- Authentication login/logout
- Basic inventory CRUD
- Storefront product display
- Complete checkout flow
- Order management basics

### Phase 2: Core Features (P1)
- Full auth suite (register, reset)
- Bulk operations
- Variations & media
- Marketing features
- Settings management

### Phase 3: Extended Coverage (P2)
- Newsletter functionality
- Blog content
- Wishlist
- Advanced filtering
- Performance tests

---

## NEXT STEPS

1. **Set up test fixtures** - Create Page Object Models for reusable test helpers
2. **Seed test data** - Create database seeding script for consistent test state
3. **Implement P0 tests** - Start with critical path tests
4. **Add to CI pipeline** - Configure GitHub Actions for automated testing
5. **Expand coverage** - Add P1 and P2 tests progressively
