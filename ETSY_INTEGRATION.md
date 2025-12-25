# Etsy Integration Documentation

## Overview

MadeBuy now supports syncing your jewelry inventory to Etsy marketplace. This integration allows you to:

- Automatically create Etsy listings from MadeBuy pieces
- Sync inventory quantities in real-time
- Manage everything from one dashboard
- Receive order webhooks to reduce stock automatically

## Setup Instructions

### 1. Create an Etsy App

1. Go to [Etsy Developers Portal](https://www.etsy.com/developers/your-apps)
2. Click "Create a New App"
3. Fill in app details:
   - **App Name**: MadeBuy Integration
   - **App Type**: Public App
   - **Redirect URI**: `https://yourdomain.com/api/marketplaces/etsy/callback` (or `http://localhost:3301/api/marketplaces/etsy/callback` for development)
4. Request the following scopes:
   - `listings_r` - Read listings
   - `listings_w` - Create/update listings
   - `shops_r` - Read shop info
   - `shops_w` - Manage shop sections
5. Note your **API Key (Client ID)**

### 2. Configure Environment Variables

Add the following to your `apps/admin/.env.local`:

```env
# Etsy Integration
ETSY_CLIENT_ID=your_etsy_api_key_here
ETSY_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_URL=http://localhost:3301
```

For production, update `NEXT_PUBLIC_URL` to your production domain.

### 3. Database Schema

The integration adds the following fields to your database:

**Tenant collection:**
```typescript
{
  integrations: {
    etsy: {
      shopId: string
      shopName: string
      accessToken: string  // Encrypted
      refreshToken: string // Encrypted
      expiresAt: Date
      tokenType: string
      shippingProfileId: string
      autoSync: boolean
      syncDirection: 'one_way' | 'two_way'
      connectedAt: Date
      lastSyncAt: Date
    }
  }
}
```

**Piece collection:**
```typescript
{
  integrations: {
    etsy: {
      listingId: string
      listingUrl: string
      state: 'draft' | 'active' | 'inactive' | 'sold_out' | 'expired'
      lastSyncedAt: Date
      etsyQuantity: number
      syncEnabled: boolean
    }
  }
}
```

### 4. Connect to Etsy

1. Navigate to `/dashboard/connections/marketplaces`
2. Click "Connect Etsy"
3. Authorize MadeBuy to access your Etsy shop
4. You'll be redirected back and your shop will be connected

### 5. Sync Your Inventory

**Manual Sync:**
1. Go to `/dashboard/connections/marketplaces/etsy`
2. Click "Sync Now"
3. All available pieces will be pushed to Etsy

**Auto-Sync:**
- When enabled, pieces are automatically synced when:
  - A new piece is created and marked as "available"
  - Stock quantity changes
  - Price changes
  - Description or images are updated

### 6. Set Up Webhooks (Optional)

To receive real-time notifications when orders are placed on Etsy:

1. In your Etsy app settings, add webhook URL:
   ```
   https://yourdomain.com/api/marketplaces/etsy/webhook
   ```

2. Subscribe to events:
   - `receipt.created`
   - `receipt.paid`
   - `listing.updated`

3. Copy the webhook secret to your `.env.local` as `ETSY_WEBHOOK_SECRET`

## Features

### 1. OAuth Connection
- Secure PKCE-based authentication
- Automatic token refresh
- Shop information retrieval

### 2. Listing Management
- **Create Listings**: Automatically create Etsy listings from MadeBuy pieces
- **Update Listings**: Sync changes to title, description, price, quantity
- **Smart Mapping**:
  - Maps categories to Etsy taxonomy IDs
  - Combines stones + metals into materials
  - Adds techniques to description
  - Creates tags from piece tags + category

### 3. Inventory Sync
- Real-time quantity updates
- Price synchronization
- Status mapping (available → active, sold → inactive)

### 4. Image Upload
- Uploads up to 10 images per listing
- Fetches from R2 storage
- Sets primary image and alt text

### 5. Webhook Handling
- Reduces MadeBuy inventory when Etsy orders come in
- Verified webhook signatures for security
- Automatic stock updates

## Data Mapping

### MadeBuy → Etsy

| MadeBuy Field | Etsy Field | Notes |
|---------------|------------|-------|
| `name` | `title` | Truncated to 140 characters |
| `description` | `description` | Includes materials, techniques, dimensions |
| `price` | `price` | Direct mapping |
| `stock` | `quantity` | Available inventory |
| `category` | `taxonomy_id` | Mapped to Etsy jewelry categories |
| `tags` | `tags` | Max 13 tags |
| `stones + metals` | `materials` | Combined array |
| `status` | `state` | available→active, draft→draft, sold→inactive |

### Etsy Categories Supported

- Rings: 1122
- Necklaces: 1110
- Earrings: 1118
- Bracelets: 1114
- Anklets: 1116
- Pendants: 1112
- Charms: 1124
- Jewelry Sets: 1128
- Brooches: 1120
- Body Jewelry: 1126
- Other Jewelry: 1106

## API Routes

### `POST /api/marketplaces/etsy/auth`
Initiates OAuth flow to connect Etsy shop.

### `GET /api/marketplaces/etsy/callback`
OAuth callback handler. Exchanges authorization code for access token.

### `POST /api/marketplaces/etsy/sync`
Manually triggers full inventory sync to Etsy.

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 50,
    "synced": 48,
    "created": 30,
    "updated": 18,
    "failed": 2,
    "errors": [
      { "pieceId": "abc123", "error": "Missing price" }
    ]
  }
}
```

### `POST /api/marketplaces/etsy/disconnect`
Removes Etsy integration. Does not delete listings from Etsy.

### `POST /api/marketplaces/etsy/webhook`
Receives webhooks from Etsy for order events.

## UI Components

### Marketplaces Hub
`/dashboard/connections/marketplaces`
- Shows connection status for all marketplaces
- Connect/disconnect buttons
- Last sync timestamp

### Etsy Connection Page
`/dashboard/connections/marketplaces/etsy`
- Shop details
- Sync settings
- Manual sync trigger
- Disconnect option

### Inventory Table
`/dashboard/inventory`
- Added "Synced" column showing Etsy icon for synced pieces
- Click icon to view listing on Etsy

## Sync Behavior

### One-Way Sync (MadeBuy → Etsy)
- Changes in MadeBuy are pushed to Etsy
- Changes in Etsy do NOT affect MadeBuy
- Recommended for most users

### Two-Way Sync (Future)
- Changes sync in both directions
- Webhooks update MadeBuy when Etsy listings change
- More complex conflict resolution

## Troubleshooting

### Connection Fails
- Verify `ETSY_CLIENT_ID` is correct
- Check redirect URI matches exactly (including http vs https)
- Ensure you're using the correct Etsy account

### Sync Fails
- Check piece has required fields: `name`, `price > 0`, `stock`
- Verify token hasn't expired (tokens expire after 90 days)
- Check Etsy API status at https://status.etsy.com

### Images Don't Upload
- Verify images are publicly accessible
- Check R2 bucket permissions
- Max 10 images per listing

### Webhook Not Working
- Verify webhook URL is publicly accessible
- Check `ETSY_WEBHOOK_SECRET` matches Etsy app settings
- Review logs at `/api/marketplaces/etsy/webhook`

## Security Notes

- Access tokens are stored in MongoDB (consider encrypting in production)
- Webhook signatures are verified before processing
- PKCE flow prevents authorization code interception
- State parameter prevents CSRF attacks

## Limitations

- Maximum 100 pieces synced per manual sync
- Etsy rate limits: ~10 requests/second
- Token expiration: 90 days (auto-refresh not yet implemented)
- Image uploads limited to 10 per listing

## Future Enhancements

- [ ] Automatic token refresh
- [ ] Two-way sync support
- [ ] Bulk image upload optimization
- [ ] Etsy analytics integration
- [ ] Automatic listing renewal
- [ ] Variation/SKU support
- [ ] Section/category management
- [ ] Scheduled price updates

## Package Structure

```
packages/marketplaces/
├── src/
│   ├── etsy/
│   │   ├── client.ts        # Etsy API wrapper
│   │   ├── oauth.ts         # OAuth PKCE flow
│   │   ├── mapping.ts       # Data transformation
│   │   ├── sync.ts          # Sync logic
│   │   ├── webhooks.ts      # Webhook handlers
│   │   └── types.ts         # TypeScript types
│   └── index.ts             # Package exports
```

## Support

For issues or questions:
1. Check Etsy API documentation: https://developers.etsy.com
2. Review logs in admin console
3. Check connection status in `/dashboard/connections/marketplaces`
