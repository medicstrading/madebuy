# Australian Shipping Carrier Integration Research for MadeBuy

**Date:** 2026-01-01
**Purpose:** Research Australian shipping carriers and aggregators for e-commerce marketplace integration

---

## Executive Summary

For MadeBuy (an Etsy alternative marketplace), the recommended approach is:

1. **Phase 1 (MVP):** Integrate **Sendle** directly - lowest barrier, best for small sellers, carbon-neutral
2. **Phase 2:** Add **Australia Post eParcel** for sellers with higher volume
3. **Phase 3 (Scale):** Consider **Shippit** or **Starshipit** as aggregator if multi-carrier becomes necessary

---

## 1. Australia Post eParcel API

### Overview
Australia Post is the dominant carrier in Australia with the most comprehensive coverage, including rural/remote areas. eParcel is their business/e-commerce product.

### Account Setup Requirements
- **Minimum Volume:** Typically 2,000+ domestic/international parcels per year
- **Business Account:** Must have an Australia Post Business Account
- **Contract Required:** eParcel requires a formal contract with Australia Post
- **Account Numbers:**
  - Australia Post Account Number (10 digits)
  - MLID (Manifest Lodgement ID)
  - API Key and API Secret

### How to Get API Access
1. Create Australia Post Business Account at auspost.com.au
2. Request eParcel contract (contact account specialist)
3. Log into Developer Centre: `developers.auspost.com.au`
4. Submit API access request via support form
5. Include account numbers and company representative details
6. Australia Post will email API credentials within 24-48 hours

### API Authentication
```
POST https://auth.auspost.com.au/oauth/token
{
  "client_id": "{{client_id}}",
  "client_secret": "{{client_secret}}",
  "audience": "https://api.auspost.com.au",
  "grant_type": "client_credentials"
}
```
Returns `access_token` for Bearer authentication.

### Key API Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/shipments` | Create shipments with articles | POST |
| `/labels` | Generate shipping labels (PDF) | POST |
| `/tracking` | Track item status | GET |
| `/accounts/{account}/items` | Get pricing/rates | GET |

### Rate Calculation
- Rates fetched via the Shipments API when creating orders
- Based on: weight, dimensions, origin postcode, destination postcode
- Returns pricing summary with GST and surcharges included
- Zones: Metro, Regional, Remote classifications

### Label Generation
```
POST https://api.auspost.com.au/shipping/v1/labels
Headers:
  Authorization: Bearer {{access_token}}
  account-number: {{10_digit_account}}
Body:
  shipment_id: "from create shipment response"
  label_type: "PDF" or "ZPL"
```

### Tracking API
- Real-time tracking via `shipment_id` or tracking number
- Supports webhooks for push notifications
- Events: Picked up, In transit, Out for delivery, Delivered, etc.

### Pickup Scheduling
- Available via API for eParcel contract customers
- Schedule regular pickups or ad-hoc collection
- Requires MLID (Manifest Lodgement ID)

### Pros
- Best coverage (including rural Australia)
- Most trusted brand
- Competitive rates at volume
- Comprehensive API

### Cons
- Higher barrier to entry (contract required)
- Minimum volume requirements
- Complex setup process
- Not ideal for low-volume sellers

---

## 2. Sendle API

### Overview
Sendle is Australia's first 100% carbon-neutral delivery service, designed specifically for small businesses and e-commerce. **Perfect fit for MadeBuy's small seller base.**

### Account Setup
- **No minimum volume** - ideal for small sellers
- **No contracts** - pay as you go
- Sign up at sendle.com (free account)
- Instant API access available

### API Authentication
- **Method:** HTTP Basic Auth
- **Credentials:** Sendle ID + API Key
- **Sandbox:** Available at `sandbox.sendle.com` for testing

```javascript
auth: {
  username: `${sendle_id}`,
  password: `${api_key}`,
}
```

### How to Get API Credentials
1. Create Sendle account at sendle.com
2. Go to Settings > API tab
3. Add your website domain
4. Accept Terms and Conditions
5. Click "Claim Access" to generate Sendle ID and API Key

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/ping` | GET | Test API credentials |
| `GET /api/quote` | GET | Get shipping quote |
| `GET /api/products` | GET | List available shipping products |
| `POST /api/orders` | POST | Create booking/order |
| `GET /api/orders/{id}` | GET | Get order details and tracking |
| `DELETE /api/orders/{id}` | DELETE | Cancel order |

### Quote Endpoint (Rate Calculation)
```
GET /api/quote
Parameters:
  - pickup_suburb
  - pickup_postcode
  - delivery_suburb
  - delivery_postcode
  - weight_value
  - weight_units (kg/g/lb/oz)
```

### Products/Services Available
| Product Code | Display Name | First Mile |
|--------------|--------------|------------|
| `SAVER-DROPOFF` | Sendle Saver | Drop off |
| `SAVER-PICKUP` | Sendle Saver | Pickup |
| `STANDARD-DROPOFF` | Sendle Preferred | Drop off |
| `STANDARD-PICKUP` | Sendle Preferred | Pickup |
| `EXPRESS` | Sendle Express | Pickup (AU only) |

### Create Order (Booking + Label)
```javascript
POST /api/orders
{
  "pickup_date": "2026-01-05",
  "first_mile_option": "pickup", // or "drop_off"
  "description": "Handmade jewellery",
  "weight": { "value": "0.5", "units": "kg" },
  "customer_reference": "ORDER-12345",
  "sender": {
    "contact": { "name": "Seller Name", "phone": "0412345678" },
    "address": {
      "address_line1": "123 Main St",
      "suburb": "Sydney",
      "state_name": "NSW",
      "postcode": "2000",
      "country": "Australia"
    }
  },
  "receiver": {
    "contact": { "name": "Buyer Name", "email": "buyer@email.com" },
    "address": {
      "address_line1": "456 Other St",
      "suburb": "Melbourne",
      "state_name": "VIC",
      "postcode": "3000",
      "country": "Australia"
    }
  }
}
```

### Tracking Webhooks
1. Go to Sendle Dashboard > Settings > API tab
2. Enter webhook listener URL
3. Sendle sends HTTP POST for each tracking event:
```json
{
  "sendle_reference": "SAMPLE1",
  "event_id": "d72ef987-...",
  "event_type": "Dropped off",
  "description": "Parcel has been dropped off",
  "scan_time": "2026-01-01T10:00:00Z",
  "location_data": {
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "country": "AU"
  }
}
```
- Events: Pickup, Info, In Transit, Out for Delivery, Delivered
- Retries up to 3 times on failure
- Expects 2xx response

### Label Generation
- Labels are generated automatically when creating an order
- Returned as PDF URL in order response
- 4x6 thermal label format supported

### Pros
- **No minimum volume** - perfect for small sellers
- **No contracts** - pay per parcel
- **Carbon neutral** - good marketing angle
- **Simple API** - developer friendly, can integrate in hours
- **Competitive flat rates** for small parcels
- **Instant access** - no approval wait time

### Cons
- Limited to domestic AU, US, Canada (international from AU/US only)
- Not as comprehensive for remote areas as AusPost
- Rates can be higher than negotiated AusPost contracts at volume

---

## 3. StarTrack

### Overview
StarTrack is an Australia Post subsidiary specializing in premium courier services, particularly for CBD and metropolitan areas.

### Account Requirements
- StarTrack contract required
- Account Number (8 digits)
- Despatch ID
- Same API infrastructure as Australia Post

### API Access
- Uses same Australia Post Developer Centre
- Same authentication method as eParcel
- Contact StarTrack directly for account setup

### Services
- Express (next business day metro)
- Premium (same day in capital cities)
- Fixed Price Premium
- Regional services available

### Pros
- Premium service levels
- Same-day delivery options
- Strong metro coverage

### Cons
- Higher cost than standard eParcel
- Primarily metro-focused
- Requires separate contract

### Recommendation for MadeBuy
**Not recommended initially** - better to use Australia Post eParcel which includes StarTrack-equivalent services. Consider only if sellers specifically request premium courier options.

---

## 4. Other Australian Carriers

### Aramex (formerly Fastway)
- **Integration:** Via platform partners (Starshipit, Shippit) or direct API
- **Strength:** Competitive metro pricing, franchise network
- **API:** Available via `aramex.com/ae/en/developers-solution-center`
- **Best for:** High-volume B2C metro deliveries

### CouriersPlease
- **Integration:** Via aggregators or direct partnership
- **Strength:** Affordable small parcel rates, good e-commerce platform integrations
- **Best for:** Consistent B2C shipments (clothing, accessories)

### DHL Express
- **Integration:** Via aggregators or MyDHL+ API
- **Strength:** International express delivery
- **Best for:** International sellers/buyers, high-value items

---

## 5. Shipping Aggregators Comparison

### ShipStation
**Best for:** Marketplace sellers with multiple sales channels

| Aspect | Details |
|--------|---------|
| **Pricing** | From $9.99/month (starter) |
| **Carriers** | 100+ including AusPost, Sendle, StarTrack |
| **Integrations** | Shopify, eBay, Amazon, WooCommerce, BigCommerce |
| **Features** | Automation rules, batch labels, branded tracking |
| **API** | Full REST API available |

**Pros:**
- Deep marketplace integrations
- Excellent automation
- Good for multi-channel sellers
- Reasonable pricing

**Cons:**
- US-centric (some features limited in AU)
- Not a rate aggregator (uses your carrier accounts)
- Can be complex for beginners

### Shippit
**Best for:** Australian businesses wanting multi-carrier with AI allocation

| Aspect | Details |
|--------|---------|
| **Pricing** | Free (Lite), $499/mo (Plus), $999/mo (Pro) |
| **Carriers** | All major AU carriers integrated |
| **Features** | AI carrier selection, branded tracking, returns |
| **API** | Full REST API: `api.shippit.com` |

**Pros:**
- Australian-built, AU-focused
- AI-powered carrier selection
- Multi-carrier quotes at checkout
- Good returns management

**Cons:**
- Expensive for small sellers ($499+/month)
- Per-booking fees on lower tiers
- Overkill for single-carrier needs

### Starshipit
**Best for:** Australia/NZ focused businesses

| Aspect | Details |
|--------|---------|
| **Pricing** | From $45/month |
| **Carriers** | AusPost, StarTrack, Sendle, Aramex, DHL |
| **Features** | Returns automation, branded tracking |

**Pros:**
- More affordable than Shippit
- Good AusPost integration
- Returns portal included

**Cons:**
- Less carrier variety than ShipStation
- Limited international focus

### Easyship
**Best for:** International shipping focus

| Aspect | Details |
|--------|---------|
| **Pricing** | Free tier available, paid from $29/mo |
| **Carriers** | 550+ global couriers |
| **Features** | Tax/duty calculation, rate comparison |

**Pros:**
- Excellent for international
- Pre-negotiated rates available
- Duties/taxes at checkout

**Cons:**
- Less AU-specific optimization
- Can be overwhelming

### Aggregator Recommendation for MadeBuy

| Stage | Recommendation | Reason |
|-------|---------------|--------|
| MVP | **No aggregator** | Direct Sendle integration is simpler |
| Growth | **Starshipit** | Affordable AU-focused option |
| Scale | **Shippit** | When AI allocation adds value |

---

## 6. Calculated Shipping Implementation Patterns

### Weight-Based Pricing
Most common approach for general merchandise:

```javascript
// Example weight bands
const weightRates = [
  { maxKg: 0.5, basePrice: 8.95 },
  { maxKg: 1.0, basePrice: 10.95 },
  { maxKg: 3.0, basePrice: 14.95 },
  { maxKg: 5.0, basePrice: 18.95 },
  { maxKg: 10.0, basePrice: 24.95 },
  { maxKg: 22.0, basePrice: 34.95 }
];

function calculateByWeight(weightKg) {
  const band = weightRates.find(r => weightKg <= r.maxKg);
  return band ? band.basePrice : null; // Over limit
}
```

### Dimensional Weight (DIM Weight)
Carriers charge based on whichever is greater - actual weight or dimensional weight:

```javascript
// Australian domestic DIM factor typically 250 (cm) or 5000 (international)
const DIM_FACTOR = 250;

function calculateDimWeight(lengthCm, widthCm, heightCm) {
  return (lengthCm * widthCm * heightCm) / DIM_FACTOR;
}

function getBillableWeight(actualKg, lengthCm, widthCm, heightCm) {
  const dimWeight = calculateDimWeight(lengthCm, widthCm, heightCm);
  return Math.max(actualKg, dimWeight);
}
```

### Zone-Based Pricing
Australia Post uses zones based on origin-destination distance:

| Zone | Description | Example (from Sydney) |
|------|-------------|----------------------|
| Metro | Same metro area | Sydney to Sydney suburbs |
| Zone 1 | Same state regional | Sydney to Newcastle |
| Zone 2 | Interstate metro | Sydney to Melbourne |
| Zone 3 | Interstate regional | Sydney to Perth suburbs |
| Zone 4 | Remote | Sydney to Alice Springs |

```javascript
// Zone determination (simplified)
const zones = {
  'NSW-NSW': 1,
  'NSW-VIC': 2,
  'NSW-QLD': 2,
  'NSW-WA': 3,
  'NSW-NT': 4,
  // ... etc
};

function getZone(originState, destState, destPostcode) {
  // Remote postcodes get +1 zone
  const isRemote = checkRemotePostcode(destPostcode);
  const baseZone = zones[`${originState}-${destState}`] || 3;
  return isRemote ? baseZone + 1 : baseZone;
}
```

### Free Shipping Threshold Calculation
Formula to find profitable free shipping minimum:

```
Free Shipping Threshold = (Avg Shipping Cost / Gross Margin %) + AOV
```

**Example for MadeBuy:**
- Average Order Value (AOV): $65
- Average Shipping Cost: $10
- Gross Margin: 30% (0.30)

```
Threshold = ($10 / 0.30) + $65 = $33.33 + $65 = $98.33
```

Recommendation: **$99 free shipping threshold**

### Implementation for MadeBuy Sellers

```typescript
// Shipping calculation for checkout
interface ShippingQuote {
  carrier: string;
  service: string;
  price: number;
  estimatedDays: number;
}

async function getShippingQuotes(
  sellerPostcode: string,
  buyerPostcode: string,
  items: CartItem[]
): Promise<ShippingQuote[]> {
  const totalWeight = items.reduce((sum, i) => sum + i.weight * i.qty, 0);

  // Get Sendle quote
  const sendleQuote = await sendle.getQuote({
    pickup_postcode: sellerPostcode,
    delivery_postcode: buyerPostcode,
    weight_value: totalWeight,
    weight_units: 'kg'
  });

  return [
    {
      carrier: 'Sendle',
      service: 'Standard',
      price: sendleQuote.quote.gross.amount,
      estimatedDays: sendleQuote.eta_days
    }
  ];
}
```

---

## 7. Recommended Architecture for MadeBuy

### Phase 1: MVP (Sendle Only)

```
+-------------------+     +-------------------+     +-------------------+
|   MadeBuy Web     |---->|  Shipping API     |---->|   Sendle API      |
|    (Checkout)     |     |   (Internal)      |     |                   |
+-------------------+     +-------------------+     +-------------------+
                                 |
                                 v
                          +-------------------+
                          |    MongoDB        |
                          | (Shipping Logs)   |
                          +-------------------+
```

**Features:**
- Real-time quotes at checkout
- Label generation for sellers
- Tracking webhooks to update order status
- Seller-managed shipping (they book and ship)

### Database Schema

```typescript
// Shipment record
interface Shipment {
  _id: ObjectId;
  orderId: ObjectId;
  sellerId: ObjectId;
  buyerId: ObjectId;

  carrier: 'sendle' | 'auspost' | 'startrack';
  carrierReference: string;  // e.g., Sendle order ID
  trackingNumber: string;

  status: 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

  origin: {
    name: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
  };

  destination: {
    name: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
  };

  parcel: {
    weightKg: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };

  pricing: {
    quotedPrice: number;  // What buyer paid
    actualCost: number;   // What was charged to seller
    currency: 'AUD';
  };

  labelUrl?: string;

  trackingEvents: [{
    timestamp: Date;
    event: string;
    description: string;
    location?: string;
  }];

  createdAt: Date;
  updatedAt: Date;
}
```

### API Routes

```typescript
// apps/web/api/shipping/
POST /api/shipping/quote          // Get shipping quotes
POST /api/shipping/book           // Book shipment (creates label)
GET  /api/shipping/:orderId       // Get shipment status
POST /api/shipping/webhook/sendle // Receive Sendle tracking updates
```

### Phase 2: Add Australia Post

When sellers reach 2,000+ parcels/year and request better rates:

1. Add AusPost eParcel as second carrier option
2. Allow sellers to connect their own eParcel accounts
3. Provide carrier selection at checkout

### Phase 3: Aggregator (If Needed)

Only if:
- Multiple carriers become difficult to manage
- Sellers requesting carrier variety
- Need AI-powered carrier allocation

Consider Starshipit ($45/mo) or Shippit ($499/mo).

---

## 8. Implementation Checklist

### Immediate (MVP)

- [ ] Create Sendle business account
- [ ] Generate API credentials (Sendle ID + API Key)
- [ ] Set up sandbox environment for testing
- [ ] Build `/api/shipping/quote` endpoint
- [ ] Build `/api/shipping/book` endpoint
- [ ] Create webhook endpoint for tracking updates
- [ ] Add shipping options to checkout flow
- [ ] Build seller dashboard for label printing
- [ ] Add tracking page for buyers

### Post-MVP

- [ ] Add Australia Post eParcel integration
- [ ] Build seller carrier account management
- [ ] Implement free shipping threshold logic
- [ ] Add shipping insurance options
- [ ] Build returns/refund shipping flow
- [ ] Consider aggregator if multi-carrier becomes complex

---

## 9. Cost Comparison (Sample 1kg Parcel Sydney to Melbourne)

| Carrier/Method | Price (approx) | Delivery Time |
|----------------|----------------|---------------|
| Sendle Standard | $8.95 | 2-5 days |
| Sendle Express | $12.95 | 1-2 days |
| AusPost eParcel | $9.50-12.00 | 2-4 days |
| AusPost Express | $15.00+ | 1-2 days |
| StarTrack Express | $18.00+ | Next day |

*Prices are indicative and depend on contract rates.*

---

## 10. Key Takeaways

1. **Start with Sendle** - lowest barrier, best for marketplace with many small sellers
2. **Sellers manage their own shipping** - MadeBuy facilitates quotes and labels
3. **Real-time quotes at checkout** essential for buyer experience
4. **Webhook-based tracking** keeps orders updated automatically
5. **Free shipping threshold** at ~$99 to maintain margins
6. **Add AusPost later** for high-volume sellers wanting better rates
7. **Avoid aggregators initially** - adds cost and complexity for MVP

---

## Resources

- **Australia Post Developer Centre:** https://developers.auspost.com.au
- **Sendle API Documentation:** https://developers.sendle.com
- **Sendle Sandbox:** https://sandbox.sendle.com
- **Shippit Developer Centre:** https://developer.shippit.com
- **Starshipit:** https://www.starshipit.com

---

*Research completed: 2026-01-01*
*For: MadeBuy Marketplace*
