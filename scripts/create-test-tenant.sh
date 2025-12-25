#!/bin/bash
# Create a test tenant in MongoDB

set -e

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/madebuy}"
MONGODB_DB="${MONGODB_DB:-madebuy}"

echo "🔧 Creating test tenant..."
echo ""

# Generate a tenant ID
TENANT_ID=$(node -e "const { nanoid } = require('nanoid'); console.log(nanoid())")

# Generate password hash for 'admin123' using bcryptjs from admin app
PASSWORD_HASH=$(node -e "
const bcrypt = require('./apps/admin/node_modules/bcryptjs');
bcrypt.hash('admin123', 10).then(hash => console.log(hash));
")

# Create tenant document using mongosh
mongosh "$MONGODB_URI" --quiet --eval "
db = db.getSiblingDB('$MONGODB_DB');

// Check if tenant exists
const existing = db.tenants.findOne({ email: 'admin@test.com' });
if (existing) {
  print('✅ Test tenant already exists!');
  print('');
  print('Tenant Details:');
  print('===============');
  print('Email: ' + existing.email);
  print('Password: admin123');
  print('Business Name: ' + existing.businessName);
  print('Tenant ID: ' + existing.id);
  print('');
  print('📍 Access URLs:');
  print('===============');
  print('Admin Login: http://localhost:3301/login');
  print('Shop URL: http://localhost:3302/' + existing.id);
  quit(0);
}

// Create new tenant
const tenant = {
  id: '$TENANT_ID',
  email: 'admin@test.com',
  passwordHash: '$PASSWORD_HASH',
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
    customDomain: false
  },
  plan: 'free',
  createdAt: new Date(),
  updatedAt: new Date()
};

db.tenants.insertOne(tenant);

print('✅ Test tenant created successfully!');
print('');
print('Tenant Details:');
print('===============');
print('Email: admin@test.com');
print('Password: admin123');
print('Business Name: Test Shop');
print('Tenant ID: $TENANT_ID');
print('');
print('📍 Access URLs:');
print('===============');
print('Admin Login: http://localhost:3301/login');
print('Shop URL: http://localhost:3302/$TENANT_ID');
print('');
print('🔐 Login Credentials:');
print('===============');
print('Email: admin@test.com');
print('Password: admin123');
"

echo ""
echo "✅ Setup complete!"
