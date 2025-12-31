/**
 * Seed Additional Items Script
 *
 * Adds more varied items to existing tenant for UI testing.
 * Creates 18 items across 6 categories.
 */

import { MongoClient } from 'mongodb'
import { nanoid } from 'nanoid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

const ADDITIONAL_ITEMS = [
  // Jewelry (6 items)
  { name: 'Rose Gold Stacking Rings Set', category: 'Rings', price: 125, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800', description: 'Set of 5 delicate stacking rings in rose gold vermeil.' },
  { name: 'Turquoise Statement Earrings', category: 'Earrings', price: 89, image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800', description: 'Bold turquoise drops with sterling silver hooks.' },
  { name: 'Hammered Gold Cuff Bracelet', category: 'Bracelets', price: 165, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800', description: 'Adjustable hammered brass cuff with gold plating.' },
  { name: 'Moonstone Pendant Necklace', category: 'Necklaces', price: 135, image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800', description: 'Rainbow moonstone cabochon on sterling chain.' },
  { name: 'Opal Stud Earrings', category: 'Earrings', price: 78, image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800', description: 'Australian opal studs with 14k gold posts.' },
  { name: 'Layered Chain Necklace', category: 'Necklaces', price: 95, image: 'https://images.unsplash.com/photo-1599459183200-59c3b0208c30?w=800', description: 'Three-layer gold chain necklace, adjustable lengths.' },

  // Ceramics (3 items)
  { name: 'Raku Tea Bowl', category: 'Bowls', price: 68, image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800', description: 'Traditional raku-fired tea bowl with copper glaze.' },
  { name: 'Minimalist Planter Set', category: 'Planters', price: 85, image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', description: 'Set of 3 geometric planters in matte white.' },
  { name: 'Artisan Coffee Pour Over', category: 'Kitchenware', price: 55, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', description: 'Handmade ceramic pour over coffee dripper.' },

  // Art (3 items)
  { name: 'Abstract Seascape Original', category: 'Paintings', price: 520, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800', description: 'Original acrylic painting, 24x36 inches, gallery wrapped.' },
  { name: 'Botanical Watercolor Print', category: 'Prints', price: 65, image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800', description: 'Archival giclee print of native wildflowers.' },
  { name: 'Modern Line Art Series', category: 'Illustrations', price: 145, image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800', description: 'Set of 3 minimalist line drawings, unframed.' },

  // Candles & Home (3 items)
  { name: 'Eucalyptus Mint Candle', category: 'Candles', price: 38, image: 'https://images.unsplash.com/photo-1602607742043-2c2b0be7c6ce?w=800', description: 'Soy wax candle in ceramic vessel, 50hr burn.' },
  { name: 'Sandalwood Rose Diffuser', category: 'Diffusers', price: 45, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', description: 'Reed diffuser with rattan sticks, 3-month scent.' },
  { name: 'Beeswax Taper Set', category: 'Candles', price: 28, image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800', description: 'Set of 4 hand-dipped beeswax taper candles.' },

  // Woodwork (3 items)
  { name: 'Live Edge Serving Board', category: 'Cutting Boards', price: 145, image: 'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800', description: 'Black walnut live edge board with mineral oil finish.' },
  { name: 'Turned Wooden Bowl', category: 'Home Decor', price: 185, image: 'https://images.unsplash.com/photo-1594226801341-41427b4e5c22?w=800', description: 'Maple burl decorative bowl, food safe finish.' },
  { name: 'Hardwood Coaster Set', category: 'Home Decor', price: 42, image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800', description: 'Set of 6 mixed hardwood coasters with holder.' },
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

async function seedMoreItems() {
  console.log('\n🌱 Adding more items to MadeBuy...\n')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db(MONGODB_DB)

    // Find admin tenant
    const tenant = await db.collection('tenants').findOne({ slug: 'admin' })
    if (!tenant) {
      console.error('❌ Admin tenant not found')
      process.exit(1)
    }

    const tenantId = tenant.id || 'admin'
    console.log(`📦 Tenant ID: ${tenantId}`)
    console.log(`📸 Creating ${ADDITIONAL_ITEMS.length} items...\n`)

    let created = 0
    for (const item of ADDITIONAL_ITEMS) {
      const mediaId = nanoid()
      const pieceId = nanoid()
      const slug = generateSlug(item.name) + '-' + nanoid(6)
      const createdAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)

      // Create media
      await db.collection('media').insertOne({
        id: mediaId,
        tenantId,
        filename: `${slug}.jpg`,
        mimeType: 'image/jpeg',
        size: 100000,
        variants: {
          original: { url: item.image, width: 800, height: 800 },
          thumbnail: { url: item.image, width: 400, height: 400 },
          medium: { url: item.image, width: 600, height: 600 },
        },
        tags: ['seed-data'],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Create piece
      await db.collection('pieces').insertOne({
        id: pieceId,
        tenantId,
        name: item.name,
        slug,
        description: item.description,
        materials: [],
        techniques: [],
        price: item.price,
        currency: 'AUD',
        status: 'available',
        mediaIds: [mediaId],
        primaryMediaId: mediaId,
        isFeatured: Math.random() > 0.7,
        category: item.category,
        tags: ['seed-data'],
        isPublishedToWebsite: true,
        viewCount: Math.floor(Math.random() * 150),
        createdAt,
        updatedAt: new Date(),
      })

      // Create product for marketplace
      await db.collection('products').insertOne({
        id: pieceId,
        tenantId,
        name: item.name,
        slug,
        description: item.description,
        category: item.category,
        tags: ['seed-data'],
        price: item.price,
        currency: 'AUD',
        status: 'available',
        mediaIds: [mediaId],
        primaryMediaId: mediaId,
        images: [item.image],
        marketplace: {
          listed: true,
          approvalStatus: 'approved',
          approvedAt: new Date(),
          marketplaceViews: Math.floor(Math.random() * 80),
          marketplaceSales: Math.floor(Math.random() * 8),
          avgRating: 4 + Math.random(),
          totalReviews: Math.floor(Math.random() * 25),
          listedAt: createdAt,
        },
        isFeatured: Math.random() > 0.7,
        isPublishedToWebsite: true,
        viewCount: Math.floor(Math.random() * 150),
        createdAt,
        updatedAt: new Date(),
      })

      created++
      console.log(`  ✅ ${item.name} - $${item.price}`)
    }

    // Get final counts
    const totalPieces = await db.collection('pieces').countDocuments({ tenantId })
    const totalProducts = await db.collection('products').countDocuments({ tenantId })
    const totalMedia = await db.collection('media').countDocuments({ tenantId })

    console.log(`\n🎉 Added ${created} items!`)
    console.log(`\n📊 New totals:`)
    console.log(`   Pieces: ${totalPieces}`)
    console.log(`   Products: ${totalProducts}`)
    console.log(`   Media: ${totalMedia}\n`)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seedMoreItems()
