#!/bin/bash
# MadeBuy Phase 2 - Development Environment Setup
# This script initializes the development environment for the Phase 2 features

set -e

echo "============================================"
echo "  MadeBuy Phase 2 - Development Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm@8
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Check Docker (for MongoDB)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker not found. MongoDB will need to be configured manually.${NC}"
else
    echo -e "${GREEN}✓ Docker available${NC}"
fi

echo ""
echo "Installing dependencies..."
pnpm install

echo ""
echo "Setting up environment files..."

# Admin app .env
if [ ! -f "apps/admin/.env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example apps/admin/.env.local
        echo -e "${YELLOW}Created apps/admin/.env.local from template - please configure it${NC}"
    else
        echo -e "${YELLOW}No .env.example found - please create apps/admin/.env.local manually${NC}"
    fi
else
    echo -e "${GREEN}✓ apps/admin/.env.local exists${NC}"
fi

# Web app .env
if [ ! -f "apps/web/.env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example apps/web/.env.local
        echo -e "${YELLOW}Created apps/web/.env.local from template - please configure it${NC}"
    else
        echo -e "${YELLOW}No .env.example found - please create apps/web/.env.local manually${NC}"
    fi
else
    echo -e "${GREEN}✓ apps/web/.env.local exists${NC}"
fi

echo ""
echo "Starting MongoDB (if Docker available)..."
if command -v docker &> /dev/null; then
    # Check if MongoDB container exists
    if docker ps -a --format '{{.Names}}' | grep -q '^madebuy-mongo$'; then
        if docker ps --format '{{.Names}}' | grep -q '^madebuy-mongo$'; then
            echo -e "${GREEN}✓ MongoDB container already running${NC}"
        else
            docker start madebuy-mongo
            echo -e "${GREEN}✓ Started existing MongoDB container${NC}"
        fi
    else
        docker run -d --name madebuy-mongo -p 27017:27017 mongo:7
        echo -e "${GREEN}✓ Created and started MongoDB container${NC}"
    fi
else
    echo -e "${YELLOW}Skipping MongoDB setup - Docker not available${NC}"
fi

echo ""
echo "============================================"
echo "  Environment Ready!"
echo "============================================"
echo ""
echo "To start development servers:"
echo ""
echo "  Admin Dashboard (port 3300):"
echo "    pnpm --filter admin dev --port 3300"
echo ""
echo "  Web/Marketplace (port 3301):"
echo "    pnpm --filter web dev --port 3301"
echo ""
echo "  Both servers:"
echo "    pnpm dev"
echo ""
echo "Phase 2 Features to Implement:"
echo "  1. Sendle Shipping Integration"
echo "  2. Transaction Ledger & Financial Reporting"
echo "  3. Monthly Statement PDF Generation"
echo "  4. GST/Tax Reporting"
echo "  5. Product Reviews System"
echo "  6. Wishlist Functionality"
echo "  7. Abandoned Cart Recovery"
echo "  8. Conversion Funnel Analytics"
echo "  9. Webhook Email Notifications"
echo ""
echo "See features.db for complete feature list (294 features)."
echo "Use feature_get_next tool to get the next feature to implement."
echo ""
