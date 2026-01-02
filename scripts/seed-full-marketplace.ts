/**
 * Seed Full Marketplace Script
 *
 * Creates 10 test tenants with varied stores, designs, and 10-20 items each.
 * Also adds 50 items to the admin user's store.
 *
 * Usage: npx tsx scripts/seed-full-marketplace.ts
 */

import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://dev-mongo:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy'

// Australian-inspired maker store names with varied types
const TEST_STORES = [
  {
    name: 'Coastal Gems Studio',
    email: 'coastal@test.com',
    makerType: 'jewelry',
    tagline: 'Ocean-inspired jewellery handcrafted in Queensland',
    location: 'Gold Coast, QLD',
    primaryColor: '#0ea5e9',
    accentColor: '#06b6d4',
    layout: 'minimal',
    typography: 'elegant',
    plan: 'pro',
  },
  {
    name: 'Eucalyptus & Thread',
    email: 'eucalyptus@test.com',
    makerType: 'clothing',
    tagline: 'Sustainable Australian fashion',
    location: 'Byron Bay, NSW',
    primaryColor: '#059669',
    accentColor: '#10b981',
    layout: 'masonry',
    typography: 'modern',
    plan: 'business',
  },
  {
    name: 'Outback Pottery',
    email: 'outback@test.com',
    makerType: 'ceramics',
    tagline: 'Earthy ceramics inspired by the Australian landscape',
    location: 'Adelaide, SA',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    layout: 'grid',
    typography: 'classic',
    plan: 'pro',
  },
  {
    name: 'Sydney Canvas Co',
    email: 'sydneycanvas@test.com',
    makerType: 'art',
    tagline: 'Contemporary Australian art and prints',
    location: 'Surry Hills, NSW',
    primaryColor: '#7c3aed',
    accentColor: '#8b5cf6',
    layout: 'featured',
    typography: 'bold',
    plan: 'business',
  },
  {
    name: 'Blackwood Designs',
    email: 'blackwood@test.com',
    makerType: 'woodwork',
    tagline: 'Handcrafted timber furniture and homewares',
    location: 'Melbourne, VIC',
    primaryColor: '#78350f',
    accentColor: '#92400e',
    layout: 'minimal',
    typography: 'classic',
    plan: 'pro',
  },
  {
    name: 'Flame & Wax Studio',
    email: 'flamewax@test.com',
    makerType: 'candles',
    tagline: 'Hand-poured soy candles with Australian botanicals',
    location: 'Fremantle, WA',
    primaryColor: '#be185d',
    accentColor: '#ec4899',
    layout: 'grid',
    typography: 'elegant',
    plan: 'pro',
  },
  {
    name: 'Pure Bush Soap',
    email: 'purebush@test.com',
    makerType: 'soap',
    tagline: 'Natural skincare with native Australian ingredients',
    location: 'Hobart, TAS',
    primaryColor: '#16a34a',
    accentColor: '#22c55e',
    layout: 'masonry',
    typography: 'minimal',
    plan: 'business',
  },
  {
    name: 'Tannery Road Leather',
    email: 'tanneryroad@test.com',
    makerType: 'leather',
    tagline: 'Premium leather goods made to last',
    location: 'Brisbane, QLD',
    primaryColor: '#7c2d12',
    accentColor: '#9a3412',
    layout: 'featured',
    typography: 'bold',
    plan: 'pro',
  },
  {
    name: 'Woven Dreams',
    email: 'wovendreams@test.com',
    makerType: 'textiles',
    tagline: 'Handwoven textiles and macramé art',
    location: 'Newcastle, NSW',
    primaryColor: '#c2410c',
    accentColor: '#ea580c',
    layout: 'grid',
    typography: 'modern',
    plan: 'pro',
  },
  {
    name: 'Little Batch Kitchen',
    email: 'littlebatch@test.com',
    makerType: 'food',
    tagline: 'Artisan preserves and baked goods',
    location: 'Daylesford, VIC',
    primaryColor: '#b91c1c',
    accentColor: '#dc2626',
    layout: 'minimal',
    typography: 'classic',
    plan: 'business',
  },
]

// Extended stock images for each maker type
const STOCK_IMAGES: Record<string, string[]> = {
  jewelry: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
    'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
    'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800',
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800',
    'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    'https://images.unsplash.com/photo-1609459558997-fce8f93e2c97?w=800',
    'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=800',
  ],
  clothing: [
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800',
    'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
  ],
  ceramics: [
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800',
    'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    'https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=800',
    'https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=800',
    'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=800',
    'https://images.unsplash.com/photo-1576020799627-aeac74d58064?w=800',
  ],
  art: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    'https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=800',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
    'https://images.unsplash.com/photo-1513519245088-0e12902e35a8?w=800',
    'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800',
  ],
  woodwork: [
    'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800',
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    'https://images.unsplash.com/photo-1588854337115-1c67d9247e4d?w=800',
    'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800',
  ],
  candles: [
    'https://images.unsplash.com/photo-1602607742043-2c2b0be7c6ce?w=800',
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800',
    'https://images.unsplash.com/photo-1608181831718-2501c9f70c5a?w=800',
    'https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?w=800',
    'https://images.unsplash.com/photo-1602910344008-22f323cc1817?w=800',
    'https://images.unsplash.com/photo-1543255006-d6395b6f1171?w=800',
    'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800',
    'https://images.unsplash.com/photo-1601919051950-bb9f3ffb3fee?w=800',
  ],
  soap: [
    'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800',
    'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800',
    'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=800',
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800',
    'https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=800',
  ],
  leather: [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
    'https://images.unsplash.com/photo-1473188588951-666fce8e7c68?w=800',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    'https://images.unsplash.com/photo-1585123388867-3bfe6dd4bdbf?w=800',
  ],
  textiles: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
    'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=800',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800',
    'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=800',
  ],
  food: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
    'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800',
    'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800',
    'https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=800',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
  ],
}

// Products per category
const PRODUCTS: Record<string, Array<{ name: string; category: string; price: number; description: string }>> = {
  jewelry: [
    { name: 'Sterling Silver Wave Ring', category: 'Rings', price: 95, description: 'Ocean wave design in polished sterling silver' },
    { name: 'Opal Drop Earrings', category: 'Earrings', price: 185, description: 'Australian boulder opal drops on gold-filled hooks' },
    { name: 'Shell Pearl Necklace', category: 'Necklaces', price: 145, description: 'Delicate chain with freshwater pearl pendant' },
    { name: 'Moonstone Cuff Bracelet', category: 'Bracelets', price: 220, description: 'Hammered silver cuff with rainbow moonstone' },
    { name: 'Coral Reef Studs', category: 'Earrings', price: 65, description: 'Textured studs inspired by coral formations' },
    { name: 'Whale Tail Pendant', category: 'Pendants', price: 78, description: 'Minimalist whale tail in brushed silver' },
    { name: 'Sea Glass Ring', category: 'Rings', price: 89, description: 'Genuine sea glass set in recycled silver' },
    { name: 'Starfish Charm Bracelet', category: 'Bracelets', price: 110, description: 'Delicate chain with starfish charms' },
    { name: 'Sand Dollar Necklace', category: 'Necklaces', price: 125, description: 'Cast sand dollar on adjustable chain' },
    { name: 'Ocean Jasper Earrings', category: 'Earrings', price: 135, description: 'Unique jasper stones with ocean patterns' },
    { name: 'Mermaid Scale Ring', category: 'Rings', price: 75, description: 'Textured band with iridescent finish' },
    { name: 'Anchor Pendant', category: 'Pendants', price: 55, description: 'Classic anchor in oxidized silver' },
  ],
  clothing: [
    { name: 'Linen Wrap Dress', category: 'Dresses', price: 245, description: 'Breathable linen dress with tie waist' },
    { name: 'Organic Cotton Tee', category: 'Tops', price: 75, description: 'Relaxed fit tee in certified organic cotton' },
    { name: 'Wide Leg Pants', category: 'Pants', price: 165, description: 'Flowing wide leg pants in natural linen' },
    { name: 'Block Print Kimono', category: 'Jackets', price: 195, description: 'Hand block printed cotton kimono' },
    { name: 'Merino Wool Cardigan', category: 'Jackets', price: 285, description: 'Oversized cardigan in Australian merino' },
    { name: 'Tie-Dye Maxi Skirt', category: 'Skirts', price: 145, description: 'Hand-dyed flowing maxi skirt' },
    { name: 'Hemp Blend Shirt', category: 'Tops', price: 95, description: 'Sustainable hemp and cotton blend' },
    { name: 'Linen Jumpsuit', category: 'Dresses', price: 275, description: 'All-in-one summer jumpsuit' },
    { name: 'Cropped Cardigan', category: 'Jackets', price: 155, description: 'Boxy cropped cardi in soft cotton' },
    { name: 'Drawstring Shorts', category: 'Pants', price: 85, description: 'Casual linen shorts with pockets' },
  ],
  ceramics: [
    { name: 'Speckled Coffee Mug', category: 'Mugs', price: 42, description: 'Handthrown mug with speckled glaze' },
    { name: 'Serving Bowl - Large', category: 'Bowls', price: 85, description: 'Statement serving bowl in earthy tones' },
    { name: 'Dinner Plate Set of 4', category: 'Plates', price: 165, description: 'Handmade dinner plates, each unique' },
    { name: 'Bud Vase Collection', category: 'Vases', price: 55, description: 'Set of 3 mini bud vases' },
    { name: 'Ceramic Planter', category: 'Planters', price: 68, description: 'Drainage hole included, matte finish' },
    { name: 'Pasta Bowls Set of 2', category: 'Bowls', price: 95, description: 'Deep bowls perfect for pasta nights' },
    { name: 'Espresso Cup Set', category: 'Mugs', price: 48, description: '2 espresso cups with saucers' },
    { name: 'Decorative Dish', category: 'Plates', price: 35, description: 'Trinket dish with organic shape' },
    { name: 'Statement Vase', category: 'Vases', price: 145, description: 'Tall sculptural vase in terracotta' },
    { name: 'Mixing Bowl Set', category: 'Bowls', price: 125, description: '3 nesting bowls for the kitchen' },
  ],
  art: [
    { name: 'Abstract Ocean Canvas', category: 'Paintings', price: 550, description: 'Original acrylic on stretched canvas' },
    { name: 'Botanical Print Set', category: 'Prints', price: 95, description: 'Set of 3 native flora prints' },
    { name: 'Landscape Photography', category: 'Photography', price: 280, description: 'Limited edition Australian landscape' },
    { name: 'Portrait Commission', category: 'Paintings', price: 750, description: 'Custom portrait in your choice of medium' },
    { name: 'Abstract Geometric Print', category: 'Prints', price: 65, description: 'A3 print on archival paper' },
    { name: 'Sunset Series - Original', category: 'Paintings', price: 420, description: 'Oil on canvas, ready to hang' },
    { name: 'Black & White Photo Set', category: 'Photography', price: 145, description: 'Urban photography collection' },
    { name: 'Watercolor Florals', category: 'Paintings', price: 320, description: 'Original watercolor on paper' },
    { name: 'Digital Art Print', category: 'Prints', price: 45, description: 'High quality digital print A4' },
    { name: 'Mixed Media Collage', category: 'Mixed Media', price: 385, description: 'Unique mixed media artwork' },
  ],
  woodwork: [
    { name: 'Walnut Cutting Board', category: 'Cutting Boards', price: 95, description: 'End-grain board with juice groove' },
    { name: 'Oak Bedside Table', category: 'Furniture', price: 485, description: 'Minimalist design with drawer' },
    { name: 'Serving Spoon Set', category: 'Utensils', price: 55, description: 'Hand-carved in native timber' },
    { name: 'Floating Shelf', category: 'Home Decor', price: 125, description: 'Solid timber shelf with hidden mount' },
    { name: 'Cheese Board', category: 'Cutting Boards', price: 78, description: 'Shaped board with handle' },
    { name: 'Desktop Organizer', category: 'Home Decor', price: 95, description: 'Keep your desk tidy in style' },
    { name: 'Picture Frame 8x10', category: 'Frames', price: 65, description: 'Simple frame in recycled timber' },
    { name: 'Salad Servers', category: 'Utensils', price: 45, description: 'Fork and spoon set in olive wood' },
    { name: 'Decorative Bowl', category: 'Home Decor', price: 135, description: 'Turned bowl in blackwood' },
    { name: 'Coat Hooks', category: 'Home Decor', price: 85, description: 'Set of 3 wall-mounted hooks' },
  ],
  candles: [
    { name: 'Eucalyptus & Mint', category: 'Candles', price: 38, description: 'Refreshing blend, 50hr burn time' },
    { name: 'Native Bushland', category: 'Candles', price: 42, description: 'Australian botanicals scent' },
    { name: 'Lemon Myrtle Wax Melts', category: 'Wax Melts', price: 18, description: 'Pack of 6 soy wax melts' },
    { name: 'Coastal Breeze Diffuser', category: 'Diffusers', price: 45, description: 'Reed diffuser, 3 month life' },
    { name: 'Lavender Fields', category: 'Candles', price: 35, description: 'Calming lavender, perfect for bedtime' },
    { name: 'Fireside Collection', category: 'Candles', price: 48, description: 'Warm cedar and vanilla notes' },
    { name: 'Citrus Grove', category: 'Candles', price: 38, description: 'Fresh orange and grapefruit' },
    { name: 'Sandalwood & Amber', category: 'Candles', price: 44, description: 'Rich and sophisticated scent' },
    { name: 'Wax Melt Gift Set', category: 'Wax Melts', price: 32, description: 'Selection of 12 melts' },
    { name: 'Mini Candle Trio', category: 'Candles', price: 55, description: '3 travel-sized candles' },
  ],
  soap: [
    { name: 'Oatmeal & Honey Bar', category: 'Bar Soaps', price: 14, description: 'Gentle exfoliation for sensitive skin' },
    { name: 'Charcoal Detox Soap', category: 'Bar Soaps', price: 16, description: 'Deep cleansing activated charcoal' },
    { name: 'Lavender Bath Bombs', category: 'Bath Bombs', price: 9, description: 'Fizzing relaxation, sold individually' },
    { name: 'Shea Butter Body Cream', category: 'Skincare', price: 32, description: 'Rich moisturizer for dry skin' },
    { name: 'Tea Tree Soap Bar', category: 'Bar Soaps', price: 14, description: 'Antibacterial and refreshing' },
    { name: 'Rose Petal Bath Soak', category: 'Bath Bombs', price: 22, description: 'Luxury bath soak with dried petals' },
    { name: 'Eucalyptus Shower Steamer', category: 'Bath Bombs', price: 8, description: 'Turn your shower into a spa' },
    { name: 'Lip Balm Collection', category: 'Skincare', price: 18, description: 'Set of 3 natural lip balms' },
    { name: 'Hand Cream Duo', category: 'Skincare', price: 28, description: '2 scents in travel sizes' },
    { name: 'Soap Gift Box', category: 'Bar Soaps', price: 45, description: 'Selection of 4 bar soaps' },
  ],
  leather: [
    { name: 'Classic Tote Bag', category: 'Bags', price: 295, description: 'Full grain leather tote, lined' },
    { name: 'Bi-fold Wallet', category: 'Wallets', price: 125, description: 'Slim wallet with card slots' },
    { name: 'Leather Belt', category: 'Belts', price: 95, description: 'Solid brass buckle, full grain' },
    { name: 'Journal Cover A5', category: 'Journals', price: 85, description: 'Refillable leather journal' },
    { name: 'Key Holder', category: 'Accessories', price: 35, description: 'Simple key organizer' },
    { name: 'Crossbody Bag', category: 'Bags', price: 245, description: 'Compact crossbody with strap' },
    { name: 'Card Holder', category: 'Wallets', price: 55, description: 'Minimalist card case' },
    { name: 'Watch Strap', category: 'Accessories', price: 65, description: 'Custom fit available' },
    { name: 'Passport Cover', category: 'Accessories', price: 48, description: 'Travel in style' },
    { name: 'Laptop Sleeve 13"', category: 'Bags', price: 145, description: 'Padded protection for your laptop' },
  ],
  textiles: [
    { name: 'Macramé Wall Hanging', category: 'Wall Hangings', price: 145, description: 'Handmade cotton macramé' },
    { name: 'Woven Cushion Cover', category: 'Pillows', price: 85, description: 'Textured weave, insert not included' },
    { name: 'Cotton Throw Blanket', category: 'Blankets', price: 165, description: 'Chunky knit in neutral tones' },
    { name: 'Table Runner', category: 'Table Linens', price: 75, description: 'Handwoven linen runner' },
    { name: 'Plant Hanger', category: 'Wall Hangings', price: 45, description: 'Macramé pot holder' },
    { name: 'Floor Cushion', category: 'Pillows', price: 125, description: 'Oversized meditation cushion' },
    { name: 'Linen Napkin Set', category: 'Table Linens', price: 55, description: 'Set of 4 cloth napkins' },
    { name: 'Woven Basket', category: 'Bags', price: 95, description: 'Storage basket with handles' },
    { name: 'Patchwork Quilt', category: 'Quilts', price: 385, description: 'Queen size, machine washable' },
    { name: 'Boho Rug', category: 'Rugs', price: 245, description: 'Flatweave cotton rug' },
  ],
  food: [
    { name: 'Fig & Vanilla Jam', category: 'Preserves', price: 16, description: 'Small batch preserve, 250g' },
    { name: 'Sourdough Starter Kit', category: 'Baked Goods', price: 28, description: 'Everything to start baking' },
    { name: 'Chocolate Truffles Box', category: 'Confectionery', price: 35, description: '12 handmade truffles' },
    { name: 'Spiced Chai Blend', category: 'Beverages', price: 22, description: 'Loose leaf tea, 100g' },
    { name: 'Hot Sauce Collection', category: 'Sauces', price: 32, description: 'Set of 3 artisan hot sauces' },
    { name: 'Granola Gift Pack', category: 'Baked Goods', price: 28, description: '2 bags of house granola' },
    { name: 'Salted Caramels', category: 'Confectionery', price: 18, description: 'Box of 8 sea salt caramels' },
    { name: 'Herb Salt Trio', category: 'Spice Blends', price: 25, description: '3 flavored cooking salts' },
    { name: 'Fruit Paste', category: 'Preserves', price: 19, description: 'Quince paste for cheese boards' },
    { name: 'Biscotti Jar', category: 'Baked Goods', price: 24, description: 'Almond biscotti in gift jar' },
  ],
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40)
}

async function seedFullMarketplace() {
  console.log('\n🌱 SEEDING FULL MARKETPLACE\n')
  console.log('='.repeat(50))

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB\n')

    const db = client.db(MONGODB_DB)
    const tenantsCollection = db.collection('tenants')
    const piecesCollection = db.collection('pieces')
    const productsCollection = db.collection('products')
    const mediaCollection = db.collection('media')

    // First, find existing admin tenant to add 50 items
    const adminTenant = await tenantsCollection.findOne({ email: 'admin@test.com' })

    let totalTenants = 0
    let totalProducts = 0

    // Create 10 test stores
    console.log('📦 CREATING TEST STORES\n')

    for (const store of TEST_STORES) {
      // Check if already exists
      const existing = await tenantsCollection.findOne({ email: store.email })
      if (existing) {
        console.log(`  ⏭️  ${store.name} already exists, skipping...`)
        continue
      }

      const passwordHash = await bcrypt.hash('test123', 10)
      const tenantId = nanoid()
      const slug = generateSlug(store.name)

      const tenant = {
        id: tenantId,
        slug,
        email: store.email,
        passwordHash,
        businessName: store.name,
        storeName: store.name,
        tagline: store.tagline,
        description: `Welcome to ${store.name}! ${store.tagline}. Based in ${store.location}, we create beautiful handmade ${store.makerType} with love and care.`,
        location: store.location,
        makerType: store.makerType,
        primaryColor: store.primaryColor,
        accentColor: store.accentColor,
        websiteDesign: {
          layout: store.layout,
          typography: store.typography,
          banner: {
            overlayText: store.name,
            overlaySubtext: store.tagline,
            overlayOpacity: 40,
            height: 'large',
          },
        },
        domainStatus: 'none',
        features: {
          socialPublishing: true,
          aiCaptions: true,
          multiChannelOrders: store.plan !== 'free',
          advancedAnalytics: store.plan === 'business',
          unlimitedPieces: store.plan !== 'free',
          customDomain: store.plan !== 'free',
          marketplaceListing: true,
          marketplaceFeatured: store.plan === 'business',
        },
        plan: store.plan,
        status: 'active',
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }

      await tenantsCollection.insertOne(tenant as any)
      totalTenants++
      console.log(`  ✅ Created: ${store.name} (${store.makerType})`)

      // Add 10-20 products for this store
      const products = PRODUCTS[store.makerType] || PRODUCTS.jewelry
      const images = STOCK_IMAGES[store.makerType] || STOCK_IMAGES.jewelry
      const numProducts = 10 + Math.floor(Math.random() * 11) // 10-20 products

      for (let i = 0; i < Math.min(numProducts, products.length); i++) {
        const product = products[i]
        const imageUrl = images[i % images.length]

        // Create media
        const mediaId = nanoid()
        await mediaCollection.insertOne({
          id: mediaId,
          tenantId,
          type: 'image',
          mimeType: 'image/jpeg',
          originalFilename: `${generateSlug(product.name)}.jpg`,
          sizeBytes: 100000,
          variants: {
            original: { url: imageUrl, width: 800, height: 800, size: 100000, key: `${tenantId}/${mediaId}` },
            thumb: { url: imageUrl, width: 400, height: 400, size: 50000, key: `${tenantId}/${mediaId}-thumb` },
          },
          displayOrder: 0,
          isPrimary: true,
          tags: ['marketplace-seed'],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)

        const pieceId = nanoid()
        const pieceSlug = generateSlug(product.name) + '-' + nanoid(6)
        const createdAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)

        // Create piece
        await piecesCollection.insertOne({
          id: pieceId,
          tenantId,
          name: product.name,
          slug: pieceSlug,
          description: product.description,
          materials: [],
          techniques: [],
          price: product.price * 100, // Convert to cents
          currency: 'AUD',
          status: 'available',
          mediaIds: [mediaId],
          primaryMediaId: mediaId,
          isFeatured: i < 3,
          category: product.category,
          tags: ['marketplace-seed'],
          isPublishedToWebsite: true,
          viewCount: Math.floor(Math.random() * 150),
          createdAt,
          updatedAt: new Date(),
        } as any)

        // Create marketplace product
        await productsCollection.insertOne({
          id: pieceId,
          tenantId,
          name: product.name,
          slug: pieceSlug,
          description: product.description,
          category: store.makerType,
          subcategory: product.category,
          tags: ['marketplace-seed'],
          attributes: { materials: [], techniques: [] },
          price: product.price * 100,
          currency: 'AUD',
          status: 'available',
          mediaIds: [mediaId],
          primaryMediaId: mediaId,
          images: [imageUrl],
          socialVideos: [],
          integrations: {},
          marketplace: {
            listed: true,
            categories: [store.makerType],
            approvalStatus: 'approved',
            approvedAt: new Date(),
            marketplaceViews: Math.floor(Math.random() * 100),
            marketplaceSales: Math.floor(Math.random() * 10),
            avgRating: 4 + Math.random(),
            totalReviews: Math.floor(Math.random() * 25),
            listedAt: createdAt,
          },
          isFeatured: i < 3,
          isPublishedToWebsite: true,
          viewCount: Math.floor(Math.random() * 150),
          createdAt,
          updatedAt: new Date(),
        } as any)

        totalProducts++
      }
      console.log(`     → Added ${Math.min(numProducts, products.length)} products`)
    }

    // Add 50 items to admin store if it exists
    if (adminTenant) {
      console.log(`\n📦 ADDING 50 ITEMS TO ADMIN STORE\n`)

      const adminMakerType = adminTenant.makerType || 'jewelry'

      // Combine products from multiple categories for variety
      const allProducts = [
        ...PRODUCTS.jewelry.slice(0, 15),
        ...PRODUCTS.art.slice(0, 10),
        ...PRODUCTS.ceramics.slice(0, 10),
        ...PRODUCTS.candles.slice(0, 8),
        ...PRODUCTS.soap.slice(0, 7),
      ]
      const allImages = [
        ...STOCK_IMAGES.jewelry,
        ...STOCK_IMAGES.art,
        ...STOCK_IMAGES.ceramics,
        ...STOCK_IMAGES.candles,
        ...STOCK_IMAGES.soap,
      ]

      for (let i = 0; i < 50; i++) {
        const product = allProducts[i % allProducts.length]
        const imageUrl = allImages[i % allImages.length]
        const category = i < 15 ? 'jewelry' : i < 25 ? 'art' : i < 35 ? 'ceramics' : i < 43 ? 'candles' : 'soap'

        const mediaId = nanoid()
        await mediaCollection.insertOne({
          id: mediaId,
          tenantId: adminTenant.id,
          type: 'image',
          mimeType: 'image/jpeg',
          originalFilename: `admin-product-${i + 1}.jpg`,
          sizeBytes: 100000,
          variants: {
            original: { url: imageUrl, width: 800, height: 800, size: 100000, key: `${adminTenant.id}/${mediaId}` },
            thumb: { url: imageUrl, width: 400, height: 400, size: 50000, key: `${adminTenant.id}/${mediaId}-thumb` },
          },
          displayOrder: 0,
          isPrimary: true,
          tags: ['marketplace-seed', 'admin-store'],
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)

        const pieceId = nanoid()
        const pieceSlug = generateSlug(`Admin ${product.name} ${i + 1}`) + '-' + nanoid(6)
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)

        await piecesCollection.insertOne({
          id: pieceId,
          tenantId: adminTenant.id,
          name: `${product.name} #${i + 1}`,
          slug: pieceSlug,
          description: product.description,
          materials: [],
          techniques: [],
          price: product.price * 100,
          currency: 'AUD',
          status: 'available',
          mediaIds: [mediaId],
          primaryMediaId: mediaId,
          isFeatured: i < 5,
          category: product.category,
          tags: ['marketplace-seed', 'admin-store'],
          isPublishedToWebsite: true,
          viewCount: Math.floor(Math.random() * 200),
          createdAt,
          updatedAt: new Date(),
        } as any)

        await productsCollection.insertOne({
          id: pieceId,
          tenantId: adminTenant.id,
          name: `${product.name} #${i + 1}`,
          slug: pieceSlug,
          description: product.description,
          category,
          subcategory: product.category,
          tags: ['marketplace-seed', 'admin-store'],
          attributes: { materials: [], techniques: [] },
          price: product.price * 100,
          currency: 'AUD',
          status: 'available',
          mediaIds: [mediaId],
          primaryMediaId: mediaId,
          images: [imageUrl],
          socialVideos: [],
          integrations: {},
          marketplace: {
            listed: true,
            categories: [category],
            approvalStatus: 'approved',
            approvedAt: new Date(),
            marketplaceViews: Math.floor(Math.random() * 150),
            marketplaceSales: Math.floor(Math.random() * 15),
            avgRating: 4 + Math.random(),
            totalReviews: Math.floor(Math.random() * 30),
            listedAt: createdAt,
          },
          isFeatured: i < 5,
          isPublishedToWebsite: true,
          viewCount: Math.floor(Math.random() * 200),
          createdAt,
          updatedAt: new Date(),
        } as any)

        totalProducts++
      }
      console.log(`  ✅ Added 50 products to admin store`)
    } else {
      console.log(`\n⚠️  No admin tenant found (admin@test.com). Create one first.`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 SEEDING COMPLETE!\n')
    console.log(`   📦 ${totalTenants} new stores created`)
    console.log(`   🛍️  ${totalProducts} total products added`)
    console.log('\n📍 Test Store Credentials:')
    console.log('   Email: [store-name]@test.com')
    console.log('   Password: test123')
    console.log('\n💡 To remove seed data:')
    console.log('   db.pieces.deleteMany({ tags: "marketplace-seed" })')
    console.log('   db.products.deleteMany({ tags: "marketplace-seed" })')
    console.log('   db.media.deleteMany({ tags: "marketplace-seed" })\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seedFullMarketplace()
