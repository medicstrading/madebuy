# Turnstile Setup Checklist

You have the Cloudflare Turnstile keys ready. Follow these steps to complete the setup:

## Step 1: Add Keys to Environment

**File:** `/apps/web/.env.local`

Replace the placeholder values on lines 7-8 with your actual keys:

```bash
# Before (placeholders):
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here

# After (your actual keys from Cloudflare):
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...  # Your site key
TURNSTILE_SECRET_KEY=0x4AAAAAAA...            # Your secret key
```

**How to edit:**
```bash
# Open the file
nano /home/aaron/claude-project/madebuy/apps/web/.env.local

# Or use your preferred editor
code /home/aaron/claude-project/madebuy/apps/web/.env.local
```

---

## Step 2: Restart Dev Server

The `NEXT_PUBLIC_` prefix means Next.js needs to be restarted to pick up the new value.

```bash
# Stop current dev server (Ctrl+C if running)
# Then restart:
cd /home/aaron/claude-project/madebuy
pnpm dev
```

This will start:
- Admin app: http://localhost:3301
- Web app: http://localhost:3302

---

## Step 3: Test Turnstile Integration

**Visit:** http://localhost:3302/test-turnstile

You should see:
1. ✅ Green dot next to `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (means configured)
2. Turnstile challenge widget appears
3. Complete the challenge (usually automatic/invisible)
4. Green checkmark: "Verification Successful!"

**If you see errors:**
- ❌ Red dot: Keys not configured correctly
- ❌ "Invalid site key": Wrong key or domain mismatch
- ❌ "Verification failed": Secret key incorrect or server can't reach Cloudflare

---

## Step 4: Enable Cloudflare Hotlink Protection

**Quick win (2 minutes):**

1. Go to: https://dash.cloudflare.com
2. Select your domain: `madebuy.com`
3. Navigate to: **Scrape Shield** (left sidebar)
4. Find: **Hotlink Protection**
5. Toggle: **ON**
6. Done! ✅

This prevents other sites from embedding your images.

---

## Step 5: Verify Everything Works

### Test Checklist:

- [ ] Turnstile test page shows green checkmark
- [ ] Product images have right-click disabled
- [ ] Cloudflare hotlink protection enabled
- [ ] Dev server running without errors

### Quick Test Commands:

```bash
# Check Turnstile keys are loaded
cd /home/aaron/claude-project/madebuy/apps/web
node -e "require('dotenv').config({ path: '.env.local' }); console.log('Site Key:', process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.substring(0, 20))"

# Run type check (should pass)
cd /home/aaron/claude-project/madebuy
pnpm --filter @madebuy/web build
```

---

## What's Protected Now?

✅ **Right-click/drag disabled** - Casual users can't easily save images
✅ **Hotlink protection** - Images blocked when embedded on other sites
✅ **Turnstile bot detection** - Automated scrapers blocked
✅ **pHash calculation** - Ownership proof for all new uploads
✅ **Watermarked variants** - Ready to use in upload flow

---

## Next Steps (Optional)

### 1. Update Media Upload Endpoints

Replace basic upload with protected upload:

```typescript
// Before:
const variant = await uploadToR2({ tenantId, fileName, buffer, contentType })

// After:
const result = await uploadProtectedImage({ tenantId, fileName, buffer, contentType })
await media.createMedia({
  hash: result.original.hash,
  variants: {
    original: result.original,
    watermarked: result.watermarked,
    thumb: result.thumbnail,
  },
})
```

**Files to update:**
- `/apps/admin/src/app/api/media/upload/route.ts`
- Any other upload endpoints

### 2. Backfill pHash for Existing Images

Run the migration script to add pHash to existing images:

```bash
# Create the script first (see implementation guide)
npx tsx scripts/backfill-phash.ts
```

### 3. Test Full Flow

1. Upload a product image (admin)
2. List product on marketplace
3. Visit product page as anonymous user
4. Verify Turnstile challenge appears
5. Verify watermarked image is displayed
6. Try right-clicking image (should be blocked)

---

## Troubleshooting

### "Invalid site key" error
- Check you copied the **site key** (not secret key)
- Verify domain in Cloudflare matches `localhost` (for dev) or `madebuy.com` (production)
- Restart dev server after adding keys

### "Verification failed" error
- Check **secret key** is correct
- Ensure server can reach `challenges.cloudflare.com`
- Check no firewall/VPN blocking Cloudflare

### Turnstile not showing on test page
- Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` starts with `NEXT_PUBLIC_`
- Check browser console for errors
- Clear browser cache and hard reload

---

## Success Criteria

You're ready to go when:

✅ Test page shows green checkmark
✅ No errors in terminal/browser console
✅ Hotlink protection enabled in Cloudflare
✅ Right-click disabled on images

**Estimated time:** 5-10 minutes

---

## Support

**Need help?**
- Check: `/docs/setup/TURNSTILE_SETUP.md` (detailed guide)
- Check: `/docs/IP_PROTECTION_IMPLEMENTATION_SUMMARY.md` (full overview)
- Test page: http://localhost:3302/test-turnstile
