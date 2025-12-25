import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/madebuy';
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy';

async function createTestTenant() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DB);
    const tenantsCollection = db.collection('tenants');

    // Check if tenant already exists
    const existing: any = await tenantsCollection.findOne({ email: 'admin@test.com' });
    if (existing) {
      console.log('✅ Test tenant already exists!\n');
      console.log('Tenant Details:');
      console.log('===============');
      console.log('Email:', existing.email);
      console.log('Password: admin123');
      console.log('Business Name:', existing.businessName);
      console.log('Tenant ID:', existing.id);
      console.log('\n📍 Access URLs:');
      console.log('===============');
      console.log('Admin Login: http://localhost:3301/login');
      console.log('Shop URL: http://localhost:3302/' + existing.id);
      console.log('\n🔐 Login Credentials:');
      console.log('===============');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
      return;
    }

    // Create password hash
    const passwordHash = await bcrypt.hash('admin123', 10);
    const tenantId = nanoid();

    // Create tenant
    const tenant = {
      id: tenantId,
      email: 'admin@test.com',
      passwordHash,
      businessName: 'Test Shop',
      description: 'A test handmade jewelry shop',
      primaryColor: '#2563eb',
      accentColor: '#10b981',
      domainStatus: 'none',
      features: {
        socialPublishing: true,
        aiCaptions: true,
        multiChannelOrders: false,
        advancedAnalytics: false,
        unlimitedPieces: false,
        customDomain: false,
      },
      plan: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenantsCollection.insertOne(tenant as any);
    console.log('✅ Test tenant created successfully!\n');
    console.log('Tenant Details:');
    console.log('===============');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    console.log('Business Name: Test Shop');
    console.log('Tenant ID:', tenantId);
    console.log('\n📍 Access URLs:');
    console.log('===============');
    console.log('Admin Login: http://localhost:3301/login');
    console.log('Shop URL: http://localhost:3302/' + tenantId);
    console.log('\n🔐 Login Credentials:');
    console.log('===============');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createTestTenant();
