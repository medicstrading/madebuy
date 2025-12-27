#!/bin/bash

# Cloudflare R2 Setup Script for MadeBuy
# This script creates an R2 bucket and generates API credentials

set -e

ACCOUNT_ID="edb4c9b54e17c0e47ab211b28d9c53b0"
EMAIL="aaron@esamail.com.au"
API_KEY="723f5235d6d2db9e809af4d7abc74b3a66018"
BUCKET_NAME="madebuy"

echo "🔧 Setting up Cloudflare R2 for MadeBuy..."
echo ""

# Check if R2 is enabled
echo "1️⃣ Checking if R2 is enabled..."
R2_CHECK=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" \
  -H "X-Auth-Email: ${EMAIL}" \
  -H "X-Auth-Key: ${API_KEY}" \
  -H "Content-Type: application/json")

if echo "$R2_CHECK" | grep -q "\"success\":false"; then
  echo "❌ R2 is not enabled on your Cloudflare account"
  echo ""
  echo "Please enable R2:"
  echo "1. Go to https://dash.cloudflare.com"
  echo "2. Click 'R2' in the left sidebar"
  echo "3. Click 'Purchase R2' or 'Enable R2'"
  echo "4. Complete the purchase (free tier available)"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✅ R2 is enabled"
echo ""

# Check if bucket exists
echo "2️⃣ Checking if bucket '${BUCKET_NAME}' exists..."
BUCKET_CHECK=$(echo "$R2_CHECK" | jq -r ".result.buckets[] | select(.name == \"${BUCKET_NAME}\") | .name" 2>/dev/null || echo "")

if [ -z "$BUCKET_CHECK" ]; then
  echo "Creating bucket '${BUCKET_NAME}'..."
  CREATE_RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" \
    -H "X-Auth-Email: ${EMAIL}" \
    -H "X-Auth-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    --data "{\"name\": \"${BUCKET_NAME}\"}")

  if echo "$CREATE_RESULT" | grep -q "\"success\":true"; then
    echo "✅ Bucket created successfully"
  else
    echo "❌ Failed to create bucket:"
    echo "$CREATE_RESULT" | jq '.errors'
    exit 1
  fi
else
  echo "✅ Bucket '${BUCKET_NAME}' already exists"
fi
echo ""

# Create R2 API Token (note: This requires dashboard action)
echo "3️⃣ Creating R2 API Token..."
echo ""
echo "⚠️  Note: R2 API tokens must be created through the dashboard."
echo ""
echo "Please follow these steps:"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Navigate to R2 → Manage R2 API Tokens"
echo "3. Click 'Create API Token'"
echo "4. Set permissions to 'Object Read & Write'"
echo "5. Scope to bucket: ${BUCKET_NAME}"
echo "6. Click 'Create API Token'"
echo ""
echo "Then copy the following values:"
echo "  - Access Key ID"
echo "  - Secret Access Key"
echo ""
read -p "Press Enter when you have created the token..."
echo ""
read -p "Enter Access Key ID: " ACCESS_KEY_ID
read -p "Enter Secret Access Key: " SECRET_ACCESS_KEY
echo ""

# Update .env.local
echo "4️⃣ Updating .env.local files..."

ENV_FILE="/home/aaron/claude-project/madebuy/apps/admin/.env.local"

# Backup existing .env.local
cp "$ENV_FILE" "${ENV_FILE}.backup"

# Update R2 credentials
sed -i "s|R2_ACCOUNT_ID=.*|R2_ACCOUNT_ID=${ACCOUNT_ID}|" "$ENV_FILE"
sed -i "s|R2_ACCESS_KEY_ID=.*|R2_ACCESS_KEY_ID=${ACCESS_KEY_ID}|" "$ENV_FILE"
sed -i "s|R2_SECRET_ACCESS_KEY=.*|R2_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}|" "$ENV_FILE"
sed -i "s|R2_BUCKET_NAME=.*|R2_BUCKET_NAME=${BUCKET_NAME}|" "$ENV_FILE"

echo "✅ Updated admin/.env.local"
echo ""

# Also update web app if it uses R2
WEB_ENV_FILE="/home/aaron/claude-project/madebuy/apps/web/.env.local"
if [ -f "$WEB_ENV_FILE" ]; then
  cp "$WEB_ENV_FILE" "${WEB_ENV_FILE}.backup"
  sed -i "s|R2_ACCOUNT_ID=.*|R2_ACCOUNT_ID=${ACCOUNT_ID}|" "$WEB_ENV_FILE"
  sed -i "s|R2_ACCESS_KEY_ID=.*|R2_ACCESS_KEY_ID=${ACCESS_KEY_ID}|" "$WEB_ENV_FILE"
  sed -i "s|R2_SECRET_ACCESS_KEY=.*|R2_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}|" "$WEB_ENV_FILE"
  sed -i "s|R2_BUCKET_NAME=.*|R2_BUCKET_NAME=${BUCKET_NAME}|" "$WEB_ENV_FILE"
  echo "✅ Updated web/.env.local"
fi

echo ""
echo "🎉 R2 setup complete!"
echo ""
echo "Summary:"
echo "  Account ID: ${ACCOUNT_ID}"
echo "  Bucket: ${BUCKET_NAME}"
echo "  Access Key ID: ${ACCESS_KEY_ID:0:10}..."
echo ""
echo "You can now upload logos in the admin interface."
echo "Restart the admin server to apply changes:"
echo "  pm2 restart madebuy-admin-dev"
