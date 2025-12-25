# 🎉 MadeBuy - Access Guide

Your MadeBuy platform is now fully configured and running!

## 🌐 Access URLs

### Admin Dashboard
**URL**: http://localhost:3301

The homepage now automatically redirects to the login page.

### Customer Storefront
**URL**: http://localhost:3302/VQR8V-NLi6_T4GINKLDIM

This is your test shop's storefront where customers can browse products.

---

## 🔐 Login Credentials

### Admin Login
- **Email**: admin@test.com
- **Password**: admin123
- **Login URL**: http://localhost:3301/login

### Test Tenant Details
- **Business Name**: Test Shop
- **Description**: A test handmade jewelry shop
- **Tenant ID**: VQR8V-NLi6_T4GINKLDIM

---

## 📋 Quick Start Guide

### 1. Log In to Admin
```
1. Visit: http://localhost:3301
2. You'll be redirected to login page
3. Enter: admin@test.com / admin123
4. Click "Sign In"
```

### 2. Access Dashboard
After login, you'll see the admin dashboard with:
- Piece count (inventory items)
- Media count (uploaded images)
- Orders count
- Enquiries count

### 3. Add Your First Product
```
1. Go to Dashboard > Inventory
2. Click "New Piece"
3. Fill in product details
4. Upload images
5. Publish to website
```

### 4. View Your Storefront
Visit: http://localhost:3302/VQR8V-NLi6_T4GINKLDIM

This is what your customers will see.

---

## 🧪 Testing the Platform

### Test Admin Features
- ✅ **Login** - http://localhost:3301/login
- ✅ **Dashboard** - http://localhost:3301/dashboard
- ✅ **Inventory** - http://localhost:3301/dashboard/inventory
- ✅ **Media Library** - http://localhost:3301/dashboard/media
- ✅ **Materials** - http://localhost:3301/dashboard/materials
- ✅ **Orders** - http://localhost:3301/dashboard/orders
- ✅ **Enquiries** - http://localhost:3301/dashboard/enquiries
- ✅ **Promotions** - http://localhost:3301/dashboard/promotions
- ✅ **Publish** - http://localhost:3301/dashboard/publish
- ✅ **Social Settings** - http://localhost:3301/settings/social

### Test Customer Features
- ✅ **Shop Home** - http://localhost:3302/VQR8V-NLi6_T4GINKLDIM
- ✅ **Cart** - http://localhost:3302/VQR8V-NLi6_T4GINKLDIM/cart
- ✅ **Checkout** - http://localhost:3302/VQR8V-NLi6_T4GINKLDIM/checkout

---

## 🔧 Troubleshooting

### "Cannot connect" or "Site can't be reached"
```bash
# Check PM2 status
pm2 list

# If apps are stopped, restart them
pm2 restart all

# View logs for errors
pm2 logs
```

### "Invalid credentials" on login
- Make sure you're using: **admin@test.com** / **admin123**
- Check MongoDB is running: `pm2 list`

### Shop shows "No products available"
This is normal! You haven't added any products yet. Log in to admin and create your first piece.

### 404 on web app root URL
The web app requires a tenant ID in the URL. Always use:
- ✅ `http://localhost:3302/VQR8V-NLi6_T4GINKLDIM`
- ❌ `http://localhost:3302` (will show 404)

---

## 🎨 Customizing Your Shop

### Change Business Name
1. Currently requires MongoDB update
2. Or implement settings page in admin

### Add Products (Pieces)
1. Login to admin
2. Go to Inventory
3. Click "New Piece"
4. Fill details and upload images

### Upload Media
1. Go to Media Library
2. Click upload
3. Requires R2 storage credentials (see Environment Variables)

---

## 📊 PM2 Management

### View Status
```bash
pm2 list
```

### View Logs
```bash
pm2 logs              # All apps
pm2 logs madebuy-admin  # Admin only
pm2 logs madebuy-web    # Web only
```

### Restart Apps
```bash
pm2 restart all       # Restart both
pm2 restart madebuy-admin  # Admin only
```

### Stop Apps
```bash
pm2 stop all
```

### Start Apps
```bash
pm2 start all
```

---

## 🔄 Making Updates

When you modify code:

```bash
# Rebuild and restart
pnpm build && pm2 restart all

# Or use convenience script
pnpm deploy:local
```

---

## 📝 Next Steps

### 1. Configure Integrations

**Stripe** (for payments):
Edit `apps/web/.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

**Resend** (for order emails):
Edit `apps/web/.env.local`:
```env
RESEND_API_KEY=re_your_key
DEFAULT_FROM_EMAIL=orders@yourdomain.com
```

**Cloudflare R2** (for image storage):
Edit `apps/admin/.env.local`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=madebuy-media
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

After editing, restart:
```bash
pm2 restart all
```

### 2. Create Products
1. Login to admin
2. Add pieces (products)
3. Upload images
4. Publish to website

### 3. Test Checkout
1. Add product to cart on storefront
2. Go through checkout
3. Test with Stripe test cards

### 4. Monitor Your Shop
- View orders in admin
- Check enquiries
- Review analytics (when implemented)

---

## 🎓 Learning Resources

- **Full Documentation**: `README.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Autostart Setup**: `AUTOSTART_SETUP.md`
- **Setup Summary**: `SETUP_COMPLETE.md`

---

## 🆘 Getting Help

### Check Logs
```bash
pm2 logs
```

### Check MongoDB
```bash
# Test connection
MONGODB_URI="mongodb://localhost:27017/madebuy" npx tsx scripts/create-test-tenant.ts
```

### Rebuild Everything
```bash
pnpm clean
pnpm install
pnpm build
pm2 restart all
```

---

## ✨ You're All Set!

Your MadeBuy platform is ready to use:

1. **Admin**: http://localhost:3301 (admin@test.com / admin123)
2. **Shop**: http://localhost:3302/VQR8V-NLi6_T4GINKLDIM

Start by logging in and creating your first product! 🎨
