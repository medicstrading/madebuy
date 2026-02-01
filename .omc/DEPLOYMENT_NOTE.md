# Deployment Note - Security Hardening

## Required Actions Before Next Deployment

### 1. Install Dependencies
The security hardening added `isomorphic-dompurify` to `packages/shared/package.json`.

**On NUC (before deploying):**
```bash
cd ~/nuc-projects/madebuy
pnpm install
```

Or rebuild the Docker containers (recommended):
```bash
ssh nuc-dev "cd ~/nuc-projects/madebuy && docker compose down && docker compose up -d --build"
```

### 2. Verify Installation
```bash
ssh nuc-dev "docker exec madebuy-admin-dev ls node_modules/isomorphic-dompurify"
```

Should show the package directory.

### 3. Test Security Features

**Test Rate Limiting:**
```bash
# Attempt 6+ registrations from same IP - should get 429 after 5 attempts
curl -X POST http://admin.madebuy.nuc/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","businessName":"Test"}'
```

**Test HTML Sanitization:**
```javascript
// In browser console on admin dashboard
const html = '<script>alert("XSS")</script><p>Safe content</p>'
// Should strip <script> tags but keep <p> tags
```

### 4. Monitor Logs
After deployment, monitor for:
- Rate limit hits (should see in logs)
- Any DOMPurify errors
- Auth endpoint performance

## Changes Summary

✅ **Registration Rate Limiting** - 5 attempts per 15 minutes per IP
✅ **Password Reset Rate Limiting** - 5 attempts per 15 minutes per IP
✅ **DOMPurify HTML Sanitization** - Industry-standard XSS protection
✅ **Order Tenant Isolation** - Verified all queries properly scoped

## No Breaking Changes

All changes are backward compatible:
- Rate limiting returns proper 429 responses
- HTML sanitization only removes dangerous content
- Order queries unchanged (already properly scoped)

## Performance Impact

- **Rate limiting:** Negligible (in-memory checks)
- **DOMPurify:** Slightly slower than regex, but still fast (<1ms per sanitize)
- **Overall:** No noticeable impact

## Rollback Plan

If issues arise, revert these commits:
```bash
git revert HEAD  # Revert security hardening changes
pnpm install      # Restore old package.json
```

Then redeploy.
