# MadeBuy - Multi-tenant E-commerce Platform

A comprehensive e-commerce platform for handmade businesses with inventory management, social media integration, and multi-channel selling.

## 🏗️ Architecture

### Monorepo Structure
```
madebuy/
├── apps/
│   ├── admin/          # Admin dashboard (Next.js)
│   └── web/            # Customer storefront (Next.js)
└── packages/
    ├── db/             # MongoDB repositories
    ├── shared/         # Shared types and utilities
    ├── social/         # Social media & AI integrations
    └── storage/        # R2/image storage
```

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB
- **Storage**: Cloudflare R2
- **Payments**: Stripe
- **Email**: Resend
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- MongoDB (local or Atlas)
- PM2 (for production deployment)

### Installation

1. **Clone and install dependencies**:
```bash
cd madebuy
pnpm install
```

2. **Set up environment variables**:

For Admin app:
```bash
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit apps/admin/.env.local with your values
```

For Web app:
```bash
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local with your values
```

3. **Build the project**:
```bash
pnpm build
```

## 🧪 Development

### Run in development mode:
```bash
# Run both apps
pnpm dev

# Run admin only
pnpm dev:admin

# Run web only
pnpm dev:web
```

Access the apps:
- Admin: http://localhost:3301
- Web: http://localhost:3302

## 🚢 Production Deployment (PM2)

### First-time setup:

1. **Install PM2 globally** (if not installed):
```bash
npm install -g pm2
```

2. **Build for production**:
```bash
pnpm build
```

3. **Start with PM2**:
```bash
pnpm pm2:start
```

### PM2 Management Commands:

```bash
# View status
pnpm pm2:status

# View logs
pnpm pm2:logs

# Monitor in real-time
pnpm pm2:monit

# Restart apps
pnpm pm2:restart

# Stop apps
pnpm pm2:stop

# Delete apps from PM2
pnpm pm2:delete

# Build and restart (for updates)
pnpm deploy:local
```

### PM2 Startup on Boot:

To make apps start automatically on system boot:
```bash
pm2 startup
# Follow the command output instructions
pm2 save
```

## 📁 Environment Variables

### Admin App (apps/admin/.env.local)

Required:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` - Database name
- `NEXTAUTH_URL` - Admin URL (http://localhost:3301)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `R2_ACCOUNT_ID` - Cloudflare R2 account
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret
- `R2_BUCKET_NAME` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public URL

Optional:
- `OPENAI_API_KEY` - For AI caption generation
- `INSTAGRAM_CLIENT_ID` - Instagram OAuth
- `INSTAGRAM_CLIENT_SECRET` - Instagram OAuth
- `LATE_API_KEY` - For social media publishing

### Web App (apps/web/.env.local)

Required:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` - Database name
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `R2_PUBLIC_URL` - R2 public URL for images

Optional:
- `RESEND_API_KEY` - For order confirmation emails
- `DEFAULT_FROM_EMAIL` - Default sender email

## 🔧 Key Features

### Admin Dashboard
- ✅ Inventory management (pieces/products)
- ✅ Materials tracking with usage reports
- ✅ Media library with R2 storage
- ✅ Order management
- ✅ Customer enquiries
- ✅ Promotions
- ✅ Social media publishing with AI captions
- ✅ Instagram integration
- ✅ Dashboard statistics

### Customer Storefront
- ✅ Multi-tenant architecture (/{tenant} routing)
- ✅ Product catalog
- ✅ Shopping cart
- ✅ Stripe checkout
- ✅ Order confirmation emails
- ✅ Responsive design

## 📝 Development Notes

### Building
```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm build:admin
pnpm build:web
```

### Linting
```bash
pnpm lint
```

### Cleaning
```bash
# Remove all node_modules and build artifacts
pnpm clean
```

## 🐛 Troubleshooting

### Build fails with TypeScript errors
```bash
pnpm clean
pnpm install
pnpm build
```

### PM2 apps not starting
1. Check build completed: `ls -la apps/*/. next`
2. Check logs: `pnpm pm2:logs`
3. Verify environment variables are set in `.env.local` files

### MongoDB connection fails
- Verify `MONGODB_URI` is correct
- Check MongoDB is running: `mongosh`
- For Atlas: check IP whitelist

## 📦 Package Scripts

Root level:
- `pnpm dev` - Run all apps in development
- `pnpm build` - Build all apps
- `pnpm pm2:start` - Start production with PM2
- `pnpm deploy:local` - Build and restart PM2

## 🔒 Security Notes

- Never commit `.env.local` files
- Rotate `NEXTAUTH_SECRET` regularly
- Use webhook secrets for Stripe
- Restrict R2 bucket CORS policies
- Use environment-specific API keys

## 📄 License

Private - All rights reserved
