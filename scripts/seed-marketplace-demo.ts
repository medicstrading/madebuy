#!/usr/bin/env tsx

/**
 * Seed script to add demo marketplace products with stock images
 * Run with: MONGODB_URI="..." MONGODB_DB="madebuy" npx tsx scripts/seed-marketplace-demo.ts
 */

import { MongoClient, ObjectId } from 'mongodb'
import { nanoid } from 'nanoid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/madebuy'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

// Demo products with Unsplash stock images
const DEMO_PRODUCTS = [
  {
    name: 'Handcrafted Ceramic Mug',
    slug: 'handcrafted-ceramic-mug',
    description: 'Beautiful handmade ceramic mug with unique glaze pattern. Perfect for your morning coffee or tea. Each piece is one-of-a-kind.',
    price: 28.00,
    category: 'home-decor',
    subcategory: 'kitchenware',
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80'],
    stock: 15,
    rating: 4.8,
    reviewCount: 24,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Sterling Silver Necklace',
    slug: 'sterling-silver-necklace',
    description: 'Elegant sterling silver pendant necklace with delicate chain. Handcrafted by skilled artisan. Hypoallergenic and tarnish-resistant.',
    price: 65.00,
    category: 'jewelry',
    subcategory: 'necklaces',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'],
    stock: 8,
    rating: 4.9,
    reviewCount: 42,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Macramé Wall Hanging',
    slug: 'macrame-wall-hanging',
    description: 'Boho-style macramé wall hanging made with natural cotton rope. Adds texture and warmth to any space. 24" x 36".',
    price: 45.00,
    category: 'home-decor',
    subcategory: 'wall-art',
    images: ['https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80'],
    stock: 12,
    rating: 4.7,
    reviewCount: 18,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Leather Journal',
    slug: 'leather-journal',
    description: 'Premium leather-bound journal with handmade paper. Perfect for writing, sketching, or journaling. 200 pages.',
    price: 38.00,
    category: 'stationery',
    subcategory: 'journals',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80'],
    stock: 20,
    rating: 4.8,
    reviewCount: 31,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Hand-Poured Soy Candles Set',
    slug: 'hand-poured-soy-candles-set',
    description: 'Set of 3 hand-poured soy candles with essential oils. Lavender, Vanilla, and Eucalyptus scents. Burns for 40+ hours each.',
    price: 42.00,
    category: 'home-decor',
    subcategory: 'candles',
    images: ['https://images.unsplash.com/photo-1602874801006-94c0c1fd0ff0?w=800&q=80'],
    stock: 25,
    rating: 4.9,
    reviewCount: 67,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Woven Basket Set',
    slug: 'woven-basket-set',
    description: 'Set of 3 handwoven baskets in different sizes. Perfect for storage or decoration. Made from sustainable seagrass.',
    price: 55.00,
    category: 'home-decor',
    subcategory: 'storage',
    images: ['https://images.unsplash.com/photo-1595147389795-37094173bfd8?w=800&q=80'],
    stock: 10,
    rating: 4.6,
    reviewCount: 15,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Gemstone Bracelet',
    slug: 'gemstone-bracelet',
    description: 'Natural gemstone beaded bracelet with rose quartz and amethyst. Elastic band fits most wrists. Healing crystal properties.',
    price: 32.00,
    category: 'jewelry',
    subcategory: 'bracelets',
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80'],
    stock: 18,
    rating: 4.7,
    reviewCount: 28,
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Watercolor Art Print',
    slug: 'watercolor-art-print',
    description: 'Original watercolor art print on premium archival paper. Abstract floral design. 11" x 14" unframed.',
    price: 35.00,
    category: 'art',
    subcategory: 'prints',
    images: ['https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80'],
    stock: 30,
    rating: 4.8,
    reviewCount: 22,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Knit Throw Blanket',
    slug: 'knit-throw-blanket',
    description: 'Chunky knit throw blanket made from soft merino wool. Perfect for cozy evenings. 50" x 60". Machine washable.',
    price: 89.00,
    category: 'home-decor',
    subcategory: 'textiles',
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80'],
    stock: 7,
    rating: 4.9,
    reviewCount: 45,
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Terrarium Kit',
    slug: 'terrarium-kit',
    description: 'Complete DIY terrarium kit with glass container, succulents, soil, and decorative stones. Includes care instructions.',
    price: 48.00,
    category: 'plants',
    subcategory: 'terrariums',
    images: ['https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=800&q=80'],
    stock: 14,
    rating: 4.7,
    reviewCount: 19,
    isActive: true,
    isFeatured: false,
  },
]

async function seed() {
  console.log('🌱 Seeding marketplace with demo products...')
  console.log(`📦 Database: ${MONGODB_DB}`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db(MONGODB_DB)

    // Get or create a demo tenant
    const tenantsCollection = db.collection('tenants')
    let demoTenant = await tenantsCollection.findOne({ slug: 'demo-store' })

    if (!demoTenant) {
      console.log('📝 Creating demo tenant...')
      const tenantResult = await tenantsCollection.insertOne({
        slug: 'demo-store',
        businessName: 'Demo Handmade Store',
        email: 'demo@madebuy.com',
        settings: {
          marketplaceEnabled: true,
          currency: 'USD',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      demoTenant = await tenantsCollection.findOne({ _id: tenantResult.insertedId })
    }

    if (!demoTenant) {
      throw new Error('Failed to create demo tenant')
    }

    console.log(`✅ Using tenant: ${demoTenant.businessName} (${demoTenant._id})`)

    // Insert demo products
    const productsCollection = db.collection('products')

    // Clear existing demo products
    const deleteResult = await productsCollection.deleteMany({
      tenantId: demoTenant._id.toString(),
      'metadata.isDemoProduct': true,
    })
    console.log(`🗑️  Removed ${deleteResult.deletedCount} existing demo products`)

    // Insert new demo products with marketplace fields
    const productsToInsert = DEMO_PRODUCTS.map(product => ({
      id: nanoid(),
      ...product,
      tenantId: demoTenant._id.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        isDemoProduct: true,
      },
      marketplace: {
        listed: true,
        enabled: true,
        approvalStatus: 'approved',
        featured: product.isFeatured,
        avgRating: product.rating || 0,
        totalReviews: product.reviewCount || 0,
        marketplaceViews: Math.floor(Math.random() * 500) + 100,
        marketplaceSales: Math.floor(Math.random() * 100) + 10,
        categories: [product.category],
      },
    }))

    const insertResult = await productsCollection.insertMany(productsToInsert)
    console.log(`✅ Inserted ${insertResult.insertedCount} demo products`)

    // Create seller profile for demo tenant
    const sellerProfilesCollection = db.collection('seller_profiles')
    const existingProfile = await sellerProfilesCollection.findOne({ tenantId: demoTenant._id.toString() })

    if (!existingProfile) {
      const sellerProfile = {
        tenantId: demoTenant._id.toString(),
        displayName: demoTenant.businessName,
        bio: 'Demo handmade marketplace seller with a curated collection of unique, handcrafted items.',
        location: 'Melbourne, Australia',
        avatar: undefined,
        stats: {
          totalSales: 1234,
          avgRating: 4.8,
          totalReviews: 256,
          responseRate: 98,
          avgResponseTime: 2, // hours
          onTimeDeliveryRate: 99,
          repeatCustomerRate: 45,
        },
        badges: ['top_seller', 'fast_shipper', 'verified'],
        policies: {
          processingTime: '1-3 business days',
          returns: '30-day return policy',
          customization: 'Available on request',
        },
        memberSince: new Date('2024-01-01'),
        customizationAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await sellerProfilesCollection.insertOne(sellerProfile)
      console.log(`✅ Created seller profile for ${demoTenant.businessName}`)
    }

    // Show summary
    console.log('\n📊 Summary:')
    console.log(`   Total products: ${DEMO_PRODUCTS.length}`)
    console.log(`   Featured: ${DEMO_PRODUCTS.filter(p => p.isFeatured).length}`)
    console.log(`   Categories: ${new Set(DEMO_PRODUCTS.map(p => p.category)).size}`)

    console.log('\n✨ Demo products seeded successfully!')
    console.log('🌐 View them at: http://localhost:3302/marketplace')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('👋 Database connection closed')
  }
}

seed()
