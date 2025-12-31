/**
 * Seed Test Data Script
 *
 * Adds stock photos and test pieces/products to help visualize:
 * - Tenant storefronts (pieces collection)
 * - Unified marketplace (products collection)
 *
 * All test data is tagged with "test-data" for easy removal.
 *
 * Usage: npx ts-node scripts/seed-test-data.ts <tenant-slug>
 * Remove: npx ts-node scripts/remove-test-data.ts <tenant-slug>
 */

import { MongoClient } from 'mongodb'
import { nanoid } from 'nanoid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

// Unsplash source URLs - these redirect to actual images
const STOCK_IMAGES = {
  jewelry: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
    'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800',
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800',
  ],
  clothing: [
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800',
    'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
  ],
  art: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    'https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=800',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
  ],
  ceramics: [
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800',
    'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    'https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=800',
  ],
  woodwork: [
    'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    'https://images.unsplash.com/photo-1588854337115-1c67d9247e4d?w=800',
  ],
  candles: [
    'https://images.unsplash.com/photo-1602607742043-2c2b0be7c6ce?w=800',
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800',
    'https://images.unsplash.com/photo-1608181831718-2501c9f70c5a?w=800',
    'https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?w=800',
  ],
  soap: [
    'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800',
    'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800',
    'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=800',
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
  ],
}

// Test products for each category
const TEST_PRODUCTS = {
  jewelry: [
    { name: '[TEST] Sterling Silver Crescent Moon Necklace', category: 'Necklaces', price: 89, description: 'Delicate crescent moon pendant on a fine sterling silver chain. Perfect for everyday elegance.' },
    { name: '[TEST] Gold Vermeil Huggie Earrings', category: 'Earrings', price: 65, description: 'Classic huggie hoops in luxurious gold vermeil. Comfortable for all-day wear.' },
    { name: '[TEST] Aquamarine Cocktail Ring', category: 'Rings', price: 145, description: 'Statement ring featuring a stunning aquamarine stone in a vintage-inspired setting.' },
    { name: '[TEST] Pearl Drop Bracelet', category: 'Bracelets', price: 78, description: 'Freshwater pearls on delicate gold-filled chain. Adjustable length.' },
    { name: '[TEST] Minimalist Bar Pendant', category: 'Pendants', price: 55, description: 'Simple horizontal bar pendant in brushed sterling silver.' },
    { name: '[TEST] Gemstone Cluster Studs', category: 'Earrings', price: 95, description: 'Colorful cluster of semi-precious stones set in rose gold.' },
    { name: '[TEST] Twisted Rope Chain', category: 'Necklaces', price: 120, description: 'Bold twisted rope chain in polished silver. Statement piece.' },
    { name: '[TEST] Vintage Signet Ring', category: 'Rings', price: 185, description: 'Classic signet ring with custom engraving option.' },
  ],
  clothing: [
    { name: '[TEST] Linen Summer Dress', category: 'Dresses', price: 189, description: 'Relaxed fit linen dress in natural tones. Perfect for warm weather.' },
    { name: '[TEST] Hand-Dyed Silk Scarf', category: 'Accessories', price: 75, description: 'Unique hand-dyed pattern on pure silk. Each piece is one-of-a-kind.' },
    { name: '[TEST] Oversized Cotton Blouse', category: 'Tops', price: 95, description: 'Effortlessly chic oversized blouse in organic cotton.' },
    { name: '[TEST] High-Waisted Linen Pants', category: 'Pants', price: 145, description: 'Comfortable high-waisted pants with relaxed leg.' },
    { name: '[TEST] Wool Blend Cardigan', category: 'Jackets', price: 165, description: 'Cozy cardigan in a soft wool blend. Perfect layering piece.' },
    { name: '[TEST] Printed Midi Skirt', category: 'Skirts', price: 110, description: 'Flowing midi skirt with original botanical print.' },
  ],
  art: [
    { name: '[TEST] Abstract Ocean Canvas', category: 'Paintings', price: 450, description: 'Original abstract painting inspired by ocean waves. Acrylic on canvas.' },
    { name: '[TEST] Botanical Print Series', category: 'Prints', price: 85, description: 'Set of 3 botanical prints on archival paper. Unframed.' },
    { name: '[TEST] Portrait Commission', category: 'Paintings', price: 650, description: 'Custom portrait in oil. Price includes consultation and revisions.' },
    { name: '[TEST] Landscape Photography', category: 'Photography', price: 220, description: 'Limited edition landscape photograph. Signed and numbered.' },
    { name: '[TEST] Mixed Media Collage', category: 'Mixed Media', price: 380, description: 'Contemporary collage combining paint, paper, and found materials.' },
    { name: '[TEST] Minimalist Line Drawing', category: 'Illustrations', price: 150, description: 'Elegant continuous line drawing on heavyweight paper.' },
  ],
  ceramics: [
    { name: '[TEST] Speckled Stoneware Mug', category: 'Mugs', price: 38, description: 'Handthrown mug with speckled glaze. Holds 12oz.' },
    { name: '[TEST] Serving Bowl Set', category: 'Bowls', price: 95, description: 'Set of 3 nesting bowls in complementary glazes.' },
    { name: '[TEST] Ceramic Vase - Large', category: 'Vases', price: 125, description: 'Statement vase with organic curves. Perfect for dried flowers.' },
    { name: '[TEST] Dinner Plate Set', category: 'Plates', price: 145, description: 'Set of 4 dinner plates in matte white glaze.' },
    { name: '[TEST] Decorative Figurine', category: 'Figurines', price: 65, description: 'Whimsical ceramic figure, handpainted details.' },
  ],
  woodwork: [
    { name: '[TEST] Walnut Cutting Board', category: 'Cutting Boards', price: 85, description: 'End-grain walnut cutting board. Built to last generations.' },
    { name: '[TEST] Oak Side Table', category: 'Furniture', price: 395, description: 'Minimalist side table in solid white oak. Danish-inspired design.' },
    { name: '[TEST] Wooden Serving Utensils', category: 'Utensils', price: 45, description: 'Set of hand-carved serving spoon and fork in cherry wood.' },
    { name: '[TEST] Picture Frame - Maple', category: 'Frames', price: 55, description: 'Simple picture frame in natural maple. Fits 8x10 photos.' },
    { name: '[TEST] Decorative Bowl', category: 'Home Decor', price: 120, description: 'Turned decorative bowl in exotic hardwood.' },
  ],
  candles: [
    { name: '[TEST] Lavender Dreams Candle', category: 'Candles', price: 32, description: 'Relaxing lavender and chamomile blend. 45 hour burn time.' },
    { name: '[TEST] Citrus Grove Wax Melts', category: 'Wax Melts', price: 18, description: 'Pack of 6 wax melts in refreshing citrus scent.' },
    { name: '[TEST] Fireside Collection', category: 'Candles', price: 45, description: 'Warm and cozy blend of cedar, vanilla, and smoke.' },
    { name: '[TEST] Reed Diffuser - Ocean', category: 'Diffusers', price: 38, description: 'Long-lasting reed diffuser with fresh ocean scent.' },
  ],
  soap: [
    { name: '[TEST] Oatmeal Honey Bar', category: 'Bar Soaps', price: 12, description: 'Gentle exfoliating bar with colloidal oatmeal and raw honey.' },
    { name: '[TEST] Lavender Bath Bombs', category: 'Bath Bombs', price: 8, description: 'Fizzing bath bomb with dried lavender and essential oils.' },
    { name: '[TEST] Shea Butter Body Cream', category: 'Skincare', price: 28, description: 'Rich body cream with shea butter and vitamin E.' },
    { name: '[TEST] Charcoal Detox Bar', category: 'Bar Soaps', price: 14, description: 'Deep cleansing bar with activated charcoal and tea tree.' },
  ],
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\[test\]\s*/gi, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

async function seedTestData(tenantSlug: string) {
  console.log(`\n🌱 Seeding test data for tenant: ${tenantSlug}\n`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(MONGODB_DB)

    // Find tenant
    const tenant = await db.collection('tenants').findOne({ slug: tenantSlug })
    if (!tenant) {
      console.error(`❌ Tenant not found: ${tenantSlug}`)
      process.exit(1)
    }

    const tenantId = tenant.id
    const makerType = tenant.makerType || 'jewelry'

    console.log(`📦 Tenant ID: ${tenantId}`)
    console.log(`🎨 Maker Type: ${makerType}`)

    // Get products and images for this maker type
    const products = TEST_PRODUCTS[makerType as keyof typeof TEST_PRODUCTS] || TEST_PRODUCTS.jewelry
    const images = STOCK_IMAGES[makerType as keyof typeof STOCK_IMAGES] || STOCK_IMAGES.jewelry

    console.log(`\n📸 Creating ${products.length} test pieces...\n`)

    let created = 0
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const imageUrl = images[i % images.length]

      // Create media record with external URL
      const mediaId = nanoid()
      const media = {
        id: mediaId,
        tenantId,
        filename: `test-image-${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        size: 100000,
        variants: {
          original: { url: imageUrl, width: 800, height: 800 },
          thumbnail: { url: imageUrl, width: 400, height: 400 },
          medium: { url: imageUrl, width: 600, height: 600 },
        },
        tags: ['test-data'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.collection('media').insertOne(media)

      const pieceId = nanoid()
      const slug = generateSlug(product.name) + '-' + nanoid(6)
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)

      // Create piece (for tenant storefront)
      const piece = {
        id: pieceId,
        tenantId,
        name: product.name,
        slug,
        description: product.description,
        materials: [],
        techniques: [],
        stones: [],
        metals: [],
        price: product.price,
        currency: 'AUD',
        status: 'available',
        mediaIds: [mediaId],
        primaryMediaId: mediaId,
        isFeatured: i < 3, // First 3 are featured
        category: product.category,
        tags: ['test-data'],
        isPublishedToWebsite: true,
        viewCount: Math.floor(Math.random() * 100),
        createdAt,
        updatedAt: new Date(),
      }

      await db.collection('pieces').insertOne(piece)

      // Also create in products collection (for marketplace)
      const marketplaceProduct = {
        id: pieceId,
        tenantId,
        name: product.name,
        slug,
        description: product.description,
        category: makerType,
        subcategory: product.category,
        tags: ['test-data'],
        attributes: {
          materials: [],
          techniques: [],
        },
        price: product.price,
        currency: 'AUD',
        status: 'available',
        mediaIds: [mediaId],
        primaryMediaId: mediaId,
        // Direct images array for marketplace ProductCard
        images: [imageUrl],
        socialVideos: [],
        integrations: {},
        marketplace: {
          listed: true,
          categories: [makerType],
          approvalStatus: 'approved',
          approvedAt: new Date(),
          marketplaceViews: Math.floor(Math.random() * 50),
          marketplaceSales: Math.floor(Math.random() * 5),
          avgRating: 4 + Math.random(),
          totalReviews: Math.floor(Math.random() * 20),
          listedAt: createdAt,
        },
        isFeatured: i < 3,
        isPublishedToWebsite: true,
        viewCount: Math.floor(Math.random() * 100),
        createdAt,
        updatedAt: new Date(),
      }

      await db.collection('products').insertOne(marketplaceProduct)

      created++
      console.log(`  ✅ ${product.name}`)
    }

    console.log(`\n🎉 Successfully created ${created} test items!`)
    console.log(`   - ${created} pieces (tenant storefront)`)
    console.log(`   - ${created} products (marketplace)`)
    console.log(`\n💡 To remove test data, run:`)
    console.log(`   npx tsx scripts/remove-test-data.ts ${tenantSlug}\n`)

  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Run if called directly
const tenantSlug = process.argv[2]
if (!tenantSlug) {
  console.log('Usage: npx ts-node scripts/seed-test-data.ts <tenant-slug>')
  console.log('Example: npx ts-node scripts/seed-test-data.ts my-store')
  process.exit(1)
}

seedTestData(tenantSlug)
