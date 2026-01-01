# Deployment Reviewer

**Domain:** Comprehensive pre-deployment verification for Vercel/Next.js projects
**Type:** Active (runs commands)
**Version:** 2.0 - Enhanced with runtime error detection

---

## Required MCP Servers

| MCP | Package | Purpose |
|-----|---------|---------|
| **Vercel** | `vercel-mcp` | Check deployments, logs, environment variables |
| **Sentry** | `@sentry/mcp-server` | Monitor errors after deployment |
| **GitHub** | `@modelcontextprotocol/server-github` | Check CI/CD status, PR checks |

### Install Commands
```bash
claude mcp add vercel -e VERCEL_TOKEN=xxx -- npx -y vercel-mcp
claude mcp add sentry -e SENTRY_AUTH_TOKEN=xxx -e SENTRY_ORG=xxx -- npx -y @sentry/mcp-server
claude mcp add github -e GITHUB_TOKEN=xxx -- npx -y @modelcontextprotocol/server-github
```

---

## ⚠️ CRITICAL CHECKS (Run First)

These catch errors that pass TypeScript but FAIL on Vercel:

### 1. Filesystem Operations in App Code (BREAKS ON VERCEL)
```bash
# readFileSync/writeFileSync in app directory = WILL FAIL on Vercel
echo "=== Checking for dangerous fs operations ==="
grep -rn "readFileSync\|writeFileSync\|readFile\|writeFile" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app apps/*/components packages/*/src 2>/dev/null | \
  grep -v node_modules | grep -v ".d.ts" || echo "✓ No dangerous fs operations"

# fs.existsSync also fails on Vercel for non-public files
grep -rn "existsSync\|accessSync" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app apps/*/components 2>/dev/null | \
  grep -v node_modules || echo "✓ No existsSync in app code"
```

### 2. Hardcoded Absolute Paths (BREAKS ON VERCEL)
```bash
echo "=== Checking for hardcoded paths ==="
# Paths that work locally but fail on Vercel
grep -rn "process.cwd()\|__dirname\|__filename" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app 2>/dev/null | \
  grep -v node_modules || echo "✓ No hardcoded path references in app"

# Check for absolute path strings
grep -rn '"/home/\|"/Users/\|"/var/\|"/tmp/' \
  --include="*.ts" --include="*.tsx" \
  apps/ packages/ 2>/dev/null | \
  grep -v node_modules || echo "✓ No absolute path strings"
```

### 3. Missing Static Assets Referenced in Code
```bash
echo "=== Checking for missing static assets ==="
# Find CSS/image imports and verify files exist
for file in $(grep -roh "from ['\"].*\.css['\"]" apps/ packages/ 2>/dev/null | \
  sed "s/from ['\"]//;s/['\"]//"); do
  if [[ ! -f "$file" ]] && [[ ! "$file" =~ ^@ ]]; then
    echo "⚠️  Missing CSS: $file"
  fi
done

# Check public directory references
grep -rn "'/[^']*\.\(png\|jpg\|svg\|css\|ico\)'" \
  --include="*.ts" --include="*.tsx" \
  apps/ 2>/dev/null | while read line; do
  file=$(echo "$line" | grep -o "'/[^']*'" | tr -d "'")
  if [[ -n "$file" ]] && [[ ! -f "apps/web/public$file" ]] && [[ ! -f "apps/admin/public$file" ]]; then
    echo "⚠️  Referenced but missing: $file"
  fi
done
echo "✓ Static asset check complete"
```

### 4. Dynamic Imports with Variables (BREAKS ON VERCEL)
```bash
echo "=== Checking for problematic dynamic imports ==="
# Dynamic imports with template literals can fail
grep -rn 'import(`\|require(`\|import(.*${\|require(.*${' \
  --include="*.ts" --include="*.tsx" \
  apps/ packages/ 2>/dev/null | \
  grep -v node_modules || echo "✓ No variable dynamic imports"
```

### 5. Server-Only Code in Client Components
```bash
echo "=== Checking for server code leaking to client ==="
# 'use client' files importing server-only modules
for file in $(grep -rl "use client" apps/ --include="*.tsx" 2>/dev/null); do
  if grep -q "server-only\|@prisma/client\|mongodb\|mongoose" "$file" 2>/dev/null; then
    echo "⚠️  Server imports in client component: $file"
  fi
done
echo "✓ Server/client boundary check complete"
```

---

## Standard Pre-Deployment Checks

### 6. TypeScript Check
```bash
echo "=== TypeScript Check ==="
pnpm tsc --noEmit 2>&1 | tail -20
# For monorepo:
# pnpm --filter admin tsc --noEmit
# pnpm --filter web tsc --noEmit
```

### 7. ESLint Check
```bash
echo "=== ESLint Check ==="
pnpm lint 2>&1 | tail -30
```

### 8. Build Test (MOST IMPORTANT)
```bash
echo "=== Build Test ==="
pnpm build 2>&1
# Capture exit code
if [ $? -ne 0 ]; then
  echo "❌ BUILD FAILED - Do not deploy!"
fi
```

### 9. Environment Variables
```bash
echo "=== Environment Variable Check ==="
# Check .env.example vs .env
if [ -f ".env.example" ]; then
  echo "Missing in .env:"
  diff <(grep -o '^[A-Z_]*=' .env.example | sort) \
       <(grep -o '^[A-Z_]*=' .env 2>/dev/null | sort) | grep "^<" || echo "✓ All vars present"
fi

# Check for placeholder values
grep -n "xxx\|YOUR_\|CHANGE_ME\|placeholder" .env 2>/dev/null && \
  echo "⚠️  Placeholder values found in .env"
```

### 10. Security Audit
```bash
echo "=== Security Audit ==="
pnpm audit --audit-level=high 2>&1 | tail -20
```

---

## Next.js Specific Checks

### 11. Next.js Config Issues
```bash
echo "=== Next.js Config Check ==="
# Check for experimental features that might break
grep -n "experimental:" next.config.* apps/*/next.config.* 2>/dev/null | \
  head -10 || echo "✓ No experimental config"

# Check for output: 'export' with dynamic routes (incompatible)
if grep -q "output.*export" next.config.* apps/*/next.config.* 2>/dev/null; then
  if find apps/ -name "*.tsx" -path "*/app/*" | xargs grep -l "\[.*\]" 2>/dev/null | head -1; then
    echo "⚠️  Static export with dynamic routes - may fail"
  fi
fi
```

### 12. Image Optimization
```bash
echo "=== Image Check ==="
# Check for unoptimized images
grep -rn "<img " --include="*.tsx" apps/ 2>/dev/null | \
  grep -v "next/image" | head -5 && \
  echo "⚠️  Use next/image instead of <img> for optimization"
```

### 13. API Route Issues
```bash
echo "=== API Route Check ==="
# Check for missing exports in API routes
for file in $(find apps/ -path "*/api/*" -name "route.ts" 2>/dev/null); do
  if ! grep -q "export.*\(GET\|POST\|PUT\|DELETE\|PATCH\)" "$file"; then
    echo "⚠️  No HTTP method exports: $file"
  fi
done
echo "✓ API route check complete"
```

---

## Monorepo Specific Checks

### 14. Package Dependencies
```bash
echo "=== Dependency Check ==="
# Check for version mismatches in monorepo
if [ -f "pnpm-workspace.yaml" ]; then
  pnpm ls --depth 0 2>&1 | grep -i "peer dep\|WARN" | head -10
fi
```

### 15. Workspace Build Order
```bash
echo "=== Workspace Build Order ==="
# Ensure shared packages build before apps
if [ -d "packages" ]; then
  for pkg in packages/*/; do
    if [ -f "$pkg/package.json" ] && grep -q '"build"' "$pkg/package.json"; then
      echo "Package needs build: $pkg"
    fi
  done
fi
```

---

## Vercel-Specific Checks

### 16. Vercel Config
```bash
echo "=== Vercel Config Check ==="
if [ -f "vercel.json" ]; then
  # Validate JSON
  cat vercel.json | python3 -m json.tool > /dev/null 2>&1 || echo "❌ Invalid vercel.json"
  # Check for common issues
  grep -n "functions\|builds\|routes" vercel.json 2>/dev/null | head -5
else
  echo "No vercel.json (using defaults)"
fi
```

### 17. Function Size Check
```bash
echo "=== Function Size Check ==="
# Large dependencies that bloat serverless functions
grep -l "puppeteer\|playwright\|sharp\|canvas\|pdf" package.json apps/*/package.json 2>/dev/null && \
  echo "⚠️  Heavy dependencies found - may exceed Vercel function size limits"
```

---

## Output Format

```markdown
## Deployment Readiness: [Project]

### Critical Checks (Vercel-Breaking)
- [ ] Filesystem ops: [PASS/FAIL - list files]
- [ ] Hardcoded paths: [PASS/FAIL]
- [ ] Static assets: [PASS/FAIL - missing files]
- [ ] Dynamic imports: [PASS/FAIL]
- [ ] Server/client boundary: [PASS/FAIL]

### Standard Checks
- [ ] TypeScript: [PASS/FAIL - X errors]
- [ ] ESLint: [PASS/FAIL - X warnings]
- [ ] Build: [PASS/FAIL]
- [ ] Env vars: [PASS/MISSING: X, Y]
- [ ] Security: [PASS/X vulnerabilities]

### Next.js Checks
- [ ] Config: [PASS/WARNINGS]
- [ ] Images: [PASS/NEEDS OPTIMIZATION]
- [ ] API routes: [PASS/FAIL]

### Blockers
- [List any blocking issues with file:line references]

### Warnings
- [Non-blocking issues to address]

### Ready to Deploy: YES/NO
```

---

## Quick Command

Run all critical checks at once:
```bash
# Save this as scripts/pre-deploy-check.sh
echo "🔍 Running pre-deployment checks..."

# Critical
grep -rn "readFileSync\|writeFileSync" --include="*.ts" --include="*.tsx" apps/ packages/ 2>/dev/null | grep -v node_modules | grep -v ".d.ts"
grep -rn "process.cwd()\|__dirname" --include="*.ts" --include="*.tsx" apps/*/app 2>/dev/null | grep -v node_modules

# Standard
pnpm tsc --noEmit
pnpm lint
pnpm build

echo "✅ Pre-deployment checks complete"
```
