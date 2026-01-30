# Email Service

Transactional email system for MadeBuy using Resend.

## Setup

1. Add `RESEND_API_KEY` to your environment variables:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=noreply@madebuy.com.au
   EMAIL_FROM_NAME=MadeBuy
   ```

2. The email service will automatically use these environment variables.

## Usage

### High-Level Helper Functions (Recommended)

Import the helper functions from `@madebuy/shared`:

```typescript
import {
  sendOrderConfirmation,
  sendOrderNotification,
  sendShippingNotification,
  sendPasswordReset,
  sendWelcomeEmail,
} from '@madebuy/shared'

// Send order confirmation to customer
await sendOrderConfirmation({
  order,
  tenant,
  baseUrl: 'https://madebuy.com.au',
})

// Send order notification to seller
await sendOrderNotification({
  order,
  tenant,
  adminUrl: 'https://admin.madebuy.com.au',
})

// Send shipping notification
await sendShippingNotification({
  order,
  tenant,
  trackingInfo: {
    trackingNumber: 'TRACK123',
    carrier: 'Australia Post',
    estimatedDelivery: '2025-02-05',
  },
  status: 'shipped', // 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_failed'
})

// Send password reset
await sendPasswordReset({
  email: 'seller@example.com',
  tenantName: 'John Doe',
  resetLink: 'https://admin.madebuy.com.au/reset-password?token=xxx',
  expiresInMinutes: 60,
})

// Send welcome email
await sendWelcomeEmail({
  tenant,
  adminUrl: 'https://admin.madebuy.com.au',
  marketplaceUrl: 'https://madebuy.com.au',
})
```

All functions return:
```typescript
{
  success: boolean
  messageId?: string
  error?: string
}
```

### Integration Points

#### 1. Order Webhook Handler

In `apps/web/src/app/api/webhooks/stripe/route.ts`:

```typescript
import { sendOrderConfirmation, sendOrderNotification } from '@madebuy/shared'

// After order is created and payment confirmed
if (event.type === 'checkout.session.completed') {
  // Send to customer
  await sendOrderConfirmation({ order, tenant })

  // Send to seller
  await sendOrderNotification({ order, tenant })
}
```

#### 2. Shipping Updates

In `apps/admin/src/app/api/orders/[id]/route.ts`:

```typescript
import { sendShippingNotification } from '@madebuy/shared'

// When order status is updated to 'shipped'
if (input.status === 'shipped') {
  await sendShippingNotification({
    order,
    tenant,
    status: 'shipped',
    trackingInfo: {
      trackingNumber: input.trackingNumber,
      carrier: input.carrier,
    },
  })
}
```

#### 3. Auth Flows

In password reset handler:

```typescript
import { sendPasswordReset } from '@madebuy/shared'

const resetToken = generateToken()
const resetLink = `https://admin.madebuy.com.au/reset-password?token=${resetToken}`

await sendPasswordReset({
  email: tenant.email,
  tenantName: tenant.businessName,
  resetLink,
})
```

In tenant registration:

```typescript
import { sendWelcomeEmail } from '@madebuy/shared'

// After tenant is created
await sendWelcomeEmail({ tenant })
```

## Templates

All templates include:
- HTML version with responsive design
- Plain text version for accessibility
- Consistent MadeBuy branding
- Mobile-friendly layout

### Available Templates

1. **Order Confirmation** - Sent to customers after purchase
2. **Order Notification** - Sent to sellers when they receive an order
3. **Shipping Notifications** - Shipped, out for delivery, delivered, delivery failed
4. **Password Reset** - Secure password reset with expiring link
5. **Welcome Email** - Onboarding email for new sellers

## Advanced Usage

### Direct Template Access

For custom email scenarios, you can use templates directly:

```typescript
import {
  renderOrderConfirmationEmail,
  createEmailSender,
  getPlatformFromAddress,
} from '@madebuy/shared'

const sender = createEmailSender()
const { subject, html, text } = renderOrderConfirmationEmail({
  order,
  tenant,
  baseUrl: 'https://madebuy.com.au',
})

await sender.send({
  to: { email: 'customer@example.com', name: 'Customer' },
  from: getPlatformFromAddress(),
  subject,
  html,
  text,
})
```

## Testing

To test emails in development without sending:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Email Preview]', subject)
  console.log('[Email HTML]', html)
  // Don't actually send
  return { success: true }
}
```

Or use Resend's test mode API key which logs emails without sending.

## Error Handling

All email functions gracefully handle errors:

```typescript
const result = await sendOrderConfirmation({ order, tenant })

if (!result.success) {
  console.error('Failed to send email:', result.error)
  // Email failure should not block the order
  // Consider logging to monitoring service
}
```

Email failures are logged but don't throw errors, so they won't break your order flow.
