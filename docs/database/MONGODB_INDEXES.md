# MongoDB Indexes - MadeBuy Marketplace

## Overview

This document describes all required MongoDB indexes for the MadeBuy marketplace transformation. The migration from jewelry-specific `pieces` to generic `products` introduces a critical new pattern: **cross-tenant marketplace queries**.

## Critical Design Pattern: Cross-Tenant vs Tenant-Scoped

### Traditional Pattern (Tenant-Scoped)
```javascript
// Query always filters by tenantId
db.pieces.find({ tenantId: 'jeweler123', status: 'available' })
```

### New Pattern (Cross-Tenant Marketplace)
```javascript
// Query across ALL tenants for marketplace browsing
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved',
  'marketplace.categories': 'jewelry'
})
// NOTE: No tenantId filter!
```

## Index Categories

### 1. Tenant-Scoped Indexes (Existing Pattern)

These indexes maintain existing functionality for tenant-specific operations.

#### 1.1 Tenant Base Index
```javascript
db.products.createIndex({ tenantId: 1 })
```
**Purpose:** All queries filtering by tenant
**Queries Supported:**
- List all products for a tenant
- Tenant dashboard analytics
- Admin inventory management

#### 1.2 Tenant Slug Uniqueness
```javascript
db.products.createIndex(
  { tenantId: 1, slug: 1 },
  { unique: true }
)
```
**Purpose:** Ensure unique product slugs per tenant
**Queries Supported:**
- Product lookup by slug within tenant store
- URL routing: `tenant.madebuy.com/products/[slug]`

#### 1.3 Tenant Status Filter
```javascript
db.products.createIndex({ tenantId: 1, status: 1 })
```
**Purpose:** Filter products by availability status
**Queries Supported:**
- Show only available products in store
- Admin filters: draft, reserved, sold

#### 1.4 Tenant Category Filter
```javascript
db.products.createIndex({ tenantId: 1, category: 1 })
```
**Purpose:** Category navigation within tenant store
**Queries Supported:**
- "Shop Jewelry" category pages
- Admin category filters

#### 1.5 Tenant Featured Products
```javascript
db.products.createIndex({ tenantId: 1, isFeatured: 1 })
```
**Purpose:** Featured product sections on store homepage
**Queries Supported:**
- Homepage hero sections
- Featured product carousels

#### 1.6 Tenant Recent Products
```javascript
db.products.createIndex({ tenantId: 1, createdAt: -1 })
```
**Purpose:** Sort products by creation date
**Queries Supported:**
- "New Arrivals" sections
- Admin "Recently Added" views

---

### 2. Cross-Tenant Marketplace Indexes (NEW)

**CRITICAL:** These indexes enable marketplace browsing across ALL tenants.

#### 2.1 Marketplace Browse Index
```javascript
db.products.createIndex(
  {
    'marketplace.listed': 1,
    'marketplace.approvalStatus': 1,
    'marketplace.categories': 1
  },
  { name: 'marketplace_browse' }
)
```
**Purpose:** Primary marketplace browsing
**Performance Impact:** CRITICAL - used on every marketplace page
**Queries Supported:**
```javascript
// Homepage: All approved marketplace products
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
})

// Category page: All jewelry products
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved',
  'marketplace.categories': 'jewelry'
})
```

**Why These Fields:**
- `marketplace.listed`: Tenants can opt products in/out
- `marketplace.approvalStatus`: Quality control (pending/approved/rejected)
- `marketplace.categories`: Category browsing (multi-category support)

#### 2.2 Marketplace Rating Sort
```javascript
db.products.createIndex(
  {
    'marketplace.listed': 1,
    'marketplace.avgRating': -1
  },
  { name: 'marketplace_rating' }
)
```
**Purpose:** Sort by product rating
**Queries Supported:**
```javascript
// "Top Rated" sort option
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
}).sort({ 'marketplace.avgRating': -1 })
```

#### 2.3 Marketplace Price Range
```javascript
db.products.createIndex(
  {
    'marketplace.listed': 1,
    price: 1
  },
  { name: 'marketplace_price' }
)
```
**Purpose:** Price filtering and sorting
**Queries Supported:**
```javascript
// Filter: $20-$50 price range
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved',
  price: { $gte: 20, $lte: 50 }
})

// Sort: Price low to high
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
}).sort({ price: 1 })
```

#### 2.4 Marketplace Recent Listings
```javascript
db.products.createIndex(
  {
    'marketplace.listed': 1,
    createdAt: -1
  },
  { name: 'marketplace_recent' }
)
```
**Purpose:** "Recently Added" marketplace section
**Queries Supported:**
```javascript
// Homepage: Show 24 newest products
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
}).sort({ createdAt: -1 }).limit(24)
```

#### 2.5 Full-Text Search (Cross-Tenant)
```javascript
db.products.createIndex(
  {
    name: 'text',
    description: 'text',
    tags: 'text'
  },
  { name: 'product_search' }
)
```
**Purpose:** Marketplace search functionality
**Performance Impact:** Text indexes are large - monitor size
**Queries Supported:**
```javascript
// Search for "handmade silver necklace"
db.products.find({
  $text: { $search: 'handmade silver necklace' },
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
})
```

**Text Search Notes:**
- Supports English stemming ("running" matches "run")
- Case-insensitive
- Weighted fields possible (name weighted higher than description)
- Can combine with filters (category, price range)

---

### 3. Additional Collection Indexes

#### 3.1 Marketplace Reviews
```javascript
db.marketplace_reviews.createIndex({ productId: 1, status: 1 })
db.marketplace_reviews.createIndex({ productId: 1, createdAt: -1 })
db.marketplace_reviews.createIndex({ tenantId: 1 }) // Seller reviews
db.marketplace_reviews.createIndex({ buyerId: 1 }) // Customer reviews
```

#### 3.2 Seller Profiles
```javascript
db.seller_profiles.createIndex({ tenantId: 1 }, { unique: true })
db.seller_profiles.createIndex({ 'stats.avgRating': -1 }) // Top sellers
```

#### 3.3 Tenant Marketplace Stats
```javascript
db.tenant_marketplace_stats.createIndex({ tenantId: 1 }, { unique: true })
db.tenant_marketplace_stats.createIndex({ marketplaceSales: -1 }) // Leaderboard
```

#### 3.4 Disputes
```javascript
db.disputes.createIndex({ orderId: 1 })
db.disputes.createIndex({ sellerId: 1, status: 1 })
db.disputes.createIndex({ buyerId: 1, status: 1 })
db.disputes.createIndex({ resolutionDeadline: 1 }) // Auto-resolution jobs
```

#### 3.5 Featured Placements
```javascript
db.featured_placements.createIndex({ tenantId: 1, status: 1 })
db.featured_placements.createIndex({ status: 1, startDate: 1, endDate: 1 })
db.featured_placements.createIndex({ placement: 1, status: 'active' }) // Active placements
```

---

## Performance Considerations

### Index Size Monitoring
Cross-tenant indexes can grow large. Monitor with:
```javascript
db.products.stats().indexSizes
```

Expected sizes (for 10,000 products):
- `marketplace_browse`: ~2 MB
- `product_search` (text): ~15-20 MB (largest)
- `marketplace_rating`: ~1 MB
- `marketplace_price`: ~1 MB

### Query Patterns to Avoid

**❌ BAD: Sort without index**
```javascript
// Will scan entire collection!
db.products.find({
  'marketplace.listed': true
}).sort({ 'marketplace.marketplaceViews': -1 })
```
**Fix:** Add index on `marketplace.marketplaceViews` if this query is common

**❌ BAD: Multiple field ranges**
```javascript
// Cannot use both price and rating range efficiently
db.products.find({
  price: { $gte: 20, $lte: 50 },
  'marketplace.avgRating': { $gte: 4.0 }
})
```
**Fix:** Filter on one range, sort/filter others in application code

### Compound Index Prefix Rule

MongoDB can use compound indexes for prefix queries:

**Index:** `{ tenantId: 1, category: 1, status: 1 }`

**Can use index:**
- `{ tenantId: 'xyz' }`
- `{ tenantId: 'xyz', category: 'jewelry' }`
- `{ tenantId: 'xyz', category: 'jewelry', status: 'available' }`

**CANNOT use index:**
- `{ category: 'jewelry' }` (missing prefix)
- `{ status: 'available' }` (missing prefix)

---

## Marketplace vs Tenant Store Query Examples

### Example 1: Browse Jewelry Category

**Tenant Store** (tenant-scoped):
```javascript
db.products.find({
  tenantId: 'jeweler123',
  category: 'jewelry',
  status: 'available'
})
// Uses index: { tenantId: 1, category: 1 }
```

**Marketplace** (cross-tenant):
```javascript
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved',
  'marketplace.categories': 'jewelry'
})
// Uses index: marketplace_browse
```

### Example 2: Search Products

**Tenant Store**:
```javascript
db.products.find({
  tenantId: 'jeweler123',
  $text: { $search: 'silver necklace' }
})
// Uses: product_search + filter by tenantId
```

**Marketplace**:
```javascript
db.products.find({
  $text: { $search: 'silver necklace' },
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved'
})
// Uses: product_search + filter by marketplace fields
```

---

## Migration Script Index Creation

The migration script creates all indexes automatically:

```typescript
// From scripts/migrate-pieces-to-products.ts
async function createProductIndexes(db: any) {
  const productsCollection = db.collection('products')

  // Tenant-scoped indexes
  await productsCollection.createIndex({ tenantId: 1 })
  await productsCollection.createIndex({ tenantId: 1, slug: 1 }, { unique: true })
  await productsCollection.createIndex({ tenantId: 1, status: 1 })
  await productsCollection.createIndex({ tenantId: 1, category: 1 })
  await productsCollection.createIndex({ tenantId: 1, isFeatured: 1 })
  await productsCollection.createIndex({ tenantId: 1, createdAt: -1 })

  // Cross-tenant marketplace indexes
  await productsCollection.createIndex({
    'marketplace.listed': 1,
    'marketplace.approvalStatus': 1,
    'marketplace.categories': 1
  }, { name: 'marketplace_browse' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    'marketplace.avgRating': -1
  }, { name: 'marketplace_rating' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    price: 1
  }, { name: 'marketplace_price' })

  await productsCollection.createIndex({
    'marketplace.listed': 1,
    createdAt: -1
  }, { name: 'marketplace_recent' })

  // Full-text search
  await productsCollection.createIndex({
    name: 'text',
    description: 'text',
    tags: 'text'
  }, { name: 'product_search' })

  console.log('   ✅ Created 11 indexes')
}
```

---

## Index Maintenance

### Check Index Usage
```javascript
// Production: Check if indexes are being used
db.products.aggregate([
  { $indexStats: {} }
])
```

### Rebuild Indexes (if needed)
```javascript
db.products.reIndex()
```

**WARNING:** `reIndex()` locks the collection. Only run during maintenance windows.

### Drop Unused Indexes
```javascript
// If an index is never used, drop it to save space
db.products.dropIndex('index_name')
```

---

## Testing Index Performance

### Explain Query Plan
```javascript
// Check if query uses expected index
db.products.find({
  'marketplace.listed': true,
  'marketplace.approvalStatus': 'approved',
  'marketplace.categories': 'jewelry'
}).explain('executionStats')
```

**Look for:**
- `winningPlan.stage` should be `IXSCAN` (index scan)
- `totalDocsExamined` should be close to `nReturned` (not scanning extra docs)
- `executionTimeMillis` should be < 100ms for typical queries

### Load Testing Queries

Test with realistic data volumes:
- 100 tenants
- 10,000 products
- 1,000 marketplace-listed products

**Target Performance:**
- Marketplace homepage: < 200ms
- Category browse: < 150ms
- Search results: < 300ms
- Product detail page: < 50ms

---

## Future Optimizations

### Potential Additions (if needed)

1. **Seller-specific marketplace stats:**
   ```javascript
   db.products.createIndex({
     tenantId: 1,
     'marketplace.listed': 1,
     'marketplace.marketplaceSales': -1
   })
   ```

2. **Featured products only:**
   ```javascript
   db.products.createIndex({
     'marketplace.listed': 1,
     'marketplace.featuredUntil': 1
   })
   ```

3. **Quality score ranking:**
   ```javascript
   db.products.createIndex({
     'marketplace.listed': 1,
     'marketplace.qualityScore': -1
   })
   ```

---

## Summary

**Total Indexes Created:** 11 on `products` collection

**Tenant-Scoped (6):**
- tenantId
- tenantId + slug (unique)
- tenantId + status
- tenantId + category
- tenantId + isFeatured
- tenantId + createdAt

**Cross-Tenant Marketplace (5):**
- marketplace_browse (listed + approvalStatus + categories)
- marketplace_rating (listed + avgRating)
- marketplace_price (listed + price)
- marketplace_recent (listed + createdAt)
- product_search (text index on name, description, tags)

**Critical Insight:**
The cross-tenant marketplace pattern is fundamentally different from existing tenant-scoped queries. These indexes enable MadeBuy to function as a unified marketplace while maintaining secure tenant isolation for store management.
