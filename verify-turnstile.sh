#!/bin/bash

echo "🔍 Turnstile Configuration Verification"
echo "========================================"
echo ""

# Check env file exists
if [ ! -f "apps/web/.env.local" ]; then
  echo "❌ ERROR: apps/web/.env.local not found"
  exit 1
fi

# Check site key is configured
SITE_KEY=$(grep NEXT_PUBLIC_TURNSTILE_SITE_KEY apps/web/.env.local | cut -d'=' -f2)
SECRET_KEY=$(grep -v NEXT_PUBLIC apps/web/.env.local | grep TURNSTILE_SECRET_KEY | cut -d'=' -f2)

echo "✅ Environment file found"
echo ""

if [[ "$SITE_KEY" == "your_site_key_here" ]] || [[ -z "$SITE_KEY" ]]; then
  echo "❌ NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured"
  echo "   Current value: ${SITE_KEY:-<empty>}"
  exit 1
else
  echo "✅ NEXT_PUBLIC_TURNSTILE_SITE_KEY configured"
  echo "   Value: ${SITE_KEY:0:20}..."
fi

if [[ "$SECRET_KEY" == "your_secret_key_here" ]] || [[ -z "$SECRET_KEY" ]]; then
  echo "❌ TURNSTILE_SECRET_KEY not configured"
  echo "   Current value: ${SECRET_KEY:-<empty>}"
  exit 1
else
  echo "✅ TURNSTILE_SECRET_KEY configured"
  echo "   Value: ${SECRET_KEY:0:20}..."
fi

echo ""
echo "📦 Checking Turnstile package..."
if [ -d "apps/web/node_modules/@marsidev/react-turnstile" ]; then
  echo "✅ @marsidev/react-turnstile installed"
else
  echo "⚠️  @marsidev/react-turnstile not found in node_modules"
  echo "   Run: cd apps/web && pnpm install"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Start dev server: pnpm dev"
echo "2. Visit: http://localhost:3302/test-turnstile"
echo "3. Complete the Turnstile challenge"
echo "4. Look for green checkmark ✅"
echo ""
echo "📋 Cloudflare Hotlink Protection:"
echo "1. Visit: https://dash.cloudflare.com"
echo "2. Select your domain"
echo "3. Go to: Scrape Shield → Hotlink Protection"
echo "4. Toggle ON"
echo ""
echo "✨ Verification complete!"
