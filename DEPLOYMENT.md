# MadeBuy - Local Deployment Guide

This guide covers setting up MadeBuy for local development and testing using PM2.

## ✅ Completed Setup

The following has been configured:

1. ✅ **TypeScript Build** - Fixed and all packages build successfully
2. ✅ **Dashboard Stats** - Real database queries for piece/media/order/enquiry counts
3. ✅ **Email System** - Resend integration for order confirmations
4. ✅ **PM2 Configuration** - Production-ready process management

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./scripts/setup.sh

# Edit environment files
nano apps/admin/.env.local
nano apps/web/.env.local

# Start with PM2
pnpm pm2:start
```

### Option 2: Manual Setup

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment variables**:
```bash
# Admin app
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit apps/admin/.env.local

# Web app
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local
```

3. **Build the project**:
```bash
pnpm build
```

4. **Start with PM2**:
```bash
pnpm pm2:start
```

## 📋 Required Environment Variables

### Minimal Setup (Testing)

For basic testing, you need at minimum:

**Both apps**:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` - Database name (e.g., "madebuy")

**Admin only**:
- `NEXTAUTH_URL=http://localhost:3301`
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

**Web only**:
- `STRIPE_SECRET_KEY` - Stripe test key
- `STRIPE_PUBLISHABLE_KEY` - Stripe test publishable key

### Full Production Setup

See `.env.example` files in each app for complete configuration.

## 🎮 PM2 Commands

### Basic Operations

```bash
# Start apps
pnpm pm2:start

# View status
pnpm pm2:status

# View logs (all apps)
pnpm pm2:logs

# View logs (specific app)
pm2 logs madebuy-admin
pm2 logs madebuy-web

# Monitor in real-time
pnpm pm2:monit

# Restart apps
pnpm pm2:restart

# Stop apps
pnpm pm2:stop

# Remove from PM2
pnpm pm2:delete
```

### Advanced Operations

```bash
# Restart specific app
pm2 restart madebuy-admin
pm2 restart madebuy-web

# View detailed info
pm2 info madebuy-admin

# Flush logs
pm2 flush

# Save PM2 process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

## 🔄 Deployment Workflow

### Initial Deployment

```bash
# 1. Build
pnpm build

# 2. Start PM2
pnpm pm2:start

# 3. Check status
pnpm pm2:status
```

### Updating Code

```bash
# Quick update (rebuild and restart)
pnpm deploy:local

# Or manual steps:
pnpm build
pnpm pm2:restart
```

### Zero-Downtime Deployment

```bash
# For production, use reload instead of restart
pm2 reload madebuy-admin
pm2 reload madebuy-web
```

## 📁 Log Files

Logs are stored in the `logs/` directory:

- `logs/admin-error.log` - Admin app errors
- `logs/admin-out.log` - Admin app output
- `logs/web-error.log` - Web app errors
- `logs/web-out.log` - Web app output

View logs:
```bash
# Tail logs in real-time
pnpm pm2:logs

# View specific log file
tail -f logs/admin-error.log
```

## 🧪 Testing the Setup

### 1. Verify Apps are Running

```bash
pnpm pm2:status
```

You should see:
```
┌────┬──────────────────┬─────────┬─────────┬──────────┐
│ id │ name             │ status  │ restart │ uptime   │
├────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0  │ madebuy-admin    │ online  │ 0       │ 2m       │
│ 1  │ madebuy-web      │ online  │ 0       │ 2m       │
└────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 2. Test Admin App

```bash
curl http://localhost:3301
# Should return HTML
```

Or visit in browser: http://localhost:3301

### 3. Test Web App

```bash
curl http://localhost:3302
# Should return HTML or redirect
```

Or visit in browser: http://localhost:3302

### 4. Check Logs

```bash
pnpm pm2:logs
# Should show startup logs with no errors
```

## 🔧 Troubleshooting

### Apps won't start

1. Check build completed:
```bash
ls -la apps/admin/.next
ls -la apps/web/.next
```

2. Rebuild if needed:
```bash
pnpm build
```

3. Check logs:
```bash
pnpm pm2:logs
```

### Port already in use

```bash
# Find process using port
lsof -i :3301
lsof -i :3302

# Kill process
kill -9 <PID>
```

### MongoDB connection errors

1. Verify MongoDB is running:
```bash
mongosh $MONGODB_URI
```

2. Check `.env.local` has correct URI

3. For MongoDB Atlas:
   - Whitelist your IP
   - Check credentials

### Environment variables not loading

PM2 uses the environment from when it was started. After changing `.env.local`:

```bash
pnpm pm2:restart
```

## 🌐 Accessing the Apps

Once running:

- **Admin Dashboard**: http://localhost:3301
  - Login page: http://localhost:3301/login
  - Dashboard: http://localhost:3301/dashboard

- **Customer Storefront**: http://localhost:3302
  - Tenant shop: http://localhost:3302/{tenant-id}

## 🎯 Next Steps

1. **Create a tenant account**:
   - Visit http://localhost:3301/login
   - Create first admin user (requires database setup)

2. **Configure integrations**:
   - Add Stripe keys for payments
   - Add Resend key for emails
   - Add R2 credentials for media storage
   - Add OpenAI key for AI captions

3. **Test the flow**:
   - Create pieces in admin
   - Upload media
   - Publish to website
   - Test checkout on web app

4. **Set up startup on boot** (optional):
```bash
pm2 startup
# Follow the command output
pm2 save
```

## 📊 Monitoring

### PM2 Web Dashboard (Optional)

```bash
# Install PM2 Plus
pm2 install pm2-server-monit

# Link to PM2 Plus dashboard
pm2 link <secret> <public>
```

### System Resources

```bash
# Real-time monitoring
pnpm pm2:monit

# CPU and memory usage
pm2 list
```

## 🔒 Production Checklist

Before deploying to actual production:

- [ ] Use strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS/SSL
- [ ] Set up proper MongoDB backups
- [ ] Configure Stripe webhook endpoints
- [ ] Set up email domain verification (Resend)
- [ ] Configure CORS for R2 bucket
- [ ] Set up monitoring/alerts
- [ ] Configure PM2 startup script
- [ ] Set up log rotation
- [ ] Use environment-specific API keys
- [ ] Enable rate limiting
- [ ] Set up firewall rules

## 📞 Support

For issues:
1. Check logs: `pnpm pm2:logs`
2. Review this guide
3. Check main README.md
4. Review .env.example files
