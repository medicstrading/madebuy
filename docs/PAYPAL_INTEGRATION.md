# PayPal Checkout Integration

This document describes the PayPal checkout integration for MadeBuy.

## Overview

PayPal is implemented as an **optional** payment method alongside Stripe. If PayPal is not configured, the checkout page will only show the Stripe option.

## Features

- **Side-by-side payment options**: Users can choose between Credit Card (Stripe) or PayPal
- **Stock reservation**: Products are reserved during checkout to prevent overselling
- **Graceful degradation**: If PayPal is not configured, checkout falls back to Stripe only
- **Webhook support**: Handle refunds and disputes via PayPal webhooks

## Setup

### 1. Get PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Create a new app (or use an existing one)
3. Copy the **Client ID** and **Secret** from the app details

### 2. Configure Environment Variables

Add these to `apps/web/.env.local`:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_secret_here
PAYPAL_MODE=sandbox  # Use 'production' for live payments
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_client_id_here  # Same as PAYPAL_CLIENT_ID

# PayPal Webhooks (optional but recommended)
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

### 3. Set Up Webhooks (Optional)

1. In PayPal Developer Dashboard, go to your app's **Webhooks** section
2. Add a webhook with URL: `https://yourdomain.com/api/webhooks/paypal`
3. Subscribe to these events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.DENIED`
   - `CUSTOMER.DISPUTE.CREATED`
4. Copy the **Webhook ID** and add it to your `.env.local` as `PAYPAL_WEBHOOK_ID`

## How It Works

### Checkout Flow

1. **User selects PayPal** on the checkout review page
2. **Create Order**:
   - POST `/api/checkout/paypal/create-order`
   - Validates products, reserves stock
   - Creates PayPal order via SDK
   - Returns PayPal order ID
3. **User approves payment** in PayPal popup
4. **Capture Payment**:
   - POST `/api/checkout/paypal/capture`
   - Captures the PayPal payment
   - Creates order in MadeBuy database
   - Confirms stock reservation (deducts inventory)
   - Returns order details
5. **Redirect to success page** with order number

### Stock Reservations

PayPal checkout uses the same stock reservation system as Stripe:

- Products are reserved when the PayPal order is created
- Reservation expires after 30 minutes if not captured
- Stock is deducted when payment is captured
- If payment fails, reservation is cancelled automatically

### Database Fields

The `Order` type includes PayPal-specific fields:

```typescript
{
  paymentMethod: 'paypal',  // vs 'stripe' or 'bank_transfer'
  paypalOrderId: 'string',  // PayPal's order ID
  paypalCaptureId: 'string' // PayPal's capture ID (for refunds)
}
```

## API Endpoints

### POST /api/checkout/paypal/create-order

Creates a PayPal order and reserves stock.

**Request:**
```json
{
  "tenantId": "string",
  "items": [
    {
      "pieceId": "string",
      "quantity": number,
      "price": number,
      "currency": "AUD"
    }
  ],
  "customerInfo": {
    "email": "string",
    "name": "string",
    "phone": "string"
  },
  "shippingAddress": {
    "line1": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "country": "string"
  }
}
```

**Response:**
```json
{
  "orderID": "string",
  "reservationSessionId": "string"
}
```

### POST /api/checkout/paypal/capture

Captures the PayPal payment and creates the order.

**Request:**
```json
{
  "orderID": "string",
  "tenantId": "string",
  "reservationSessionId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "string",
  "orderNumber": "string"
}
```

### POST /api/webhooks/paypal

Handles PayPal webhook events for refunds and disputes.

**Webhook Events Handled:**
- `PAYMENT.CAPTURE.COMPLETED` - Payment successfully captured
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded
- `PAYMENT.CAPTURE.DENIED` - Payment denied/failed
- `CUSTOMER.DISPUTE.CREATED` - Customer opened a dispute

## Testing

### Sandbox Testing

Use PayPal's sandbox accounts for testing:

1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Go to **Sandbox > Accounts**
3. Use the generated buyer account to test payments
4. Use test credit cards: [PayPal Test Cards](https://developer.paypal.com/tools/sandbox/card-testing/)

### Test Scenarios

1. **Successful payment**: Complete checkout with PayPal sandbox account
2. **Cancelled payment**: Open PayPal popup and click Cancel
3. **Out of stock**: Try to purchase more items than available
4. **Refund**: Issue a refund via PayPal dashboard and verify webhook handling

## Troubleshooting

### PayPal button not showing

- Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in `.env.local`
- Verify the client ID is correct
- Check browser console for errors

### Payment fails with "PayPal is not configured"

- Ensure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set
- Verify credentials are correct for the environment (sandbox vs production)
- Check server logs for detailed error messages

### Stock not deducted after payment

- Verify `reservationSessionId` is being passed to the capture endpoint
- Check `stock_reservations` collection in MongoDB
- Look for errors in server logs during capture

## Security Considerations

1. **Never expose** `PAYPAL_CLIENT_SECRET` to the client
2. **Always validate** webhook signatures (currently simplified - enhance for production)
3. **Use HTTPS** for webhook endpoints
4. **Verify payment status** before fulfilling orders
5. **Implement idempotency** to prevent duplicate order creation

## Migration to Production

When ready to go live:

1. Create a production PayPal app in the [PayPal Dashboard](https://www.paypal.com/businessmanager/)
2. Update environment variables:
   ```bash
   PAYPAL_CLIENT_ID=production_client_id
   PAYPAL_CLIENT_SECRET=production_secret
   PAYPAL_MODE=production
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=production_client_id
   ```
3. Set up production webhooks with your live domain
4. Test thoroughly with small amounts before announcing

## Support

For PayPal-specific issues:
- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Technical Support](https://developer.paypal.com/support/)
