#!/bin/bash
# MadeBuy Local Setup Script

set -e

echo "🚀 MadeBuy Local Setup"
echo "====================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2 globally..."
    npm install -g pm2
else
    echo "✅ PM2 is installed"
fi

# Check for environment files
echo ""
echo "📝 Checking environment files..."

if [ ! -f "apps/admin/.env.local" ]; then
    echo "⚠️  Admin .env.local not found. Creating from example..."
    cp apps/admin/.env.local.example apps/admin/.env.local
    echo "   Please edit apps/admin/.env.local with your values"
else
    echo "✅ Admin .env.local exists"
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo "⚠️  Web .env.local not found. Creating from example..."
    cp apps/web/.env.local.example apps/web/.env.local
    echo "   Please edit apps/web/.env.local with your values"
else
    echo "✅ Web .env.local exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Build
echo ""
echo "🔨 Building applications..."
pnpm build

# Create logs directory
mkdir -p logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local files with your credentials"
echo "2. Start apps with: pnpm pm2:start"
echo "3. View status with: pnpm pm2:status"
echo "4. View logs with: pnpm pm2:logs"
echo ""
echo "Admin: http://localhost:3001"
echo "Web: http://localhost:3002"
