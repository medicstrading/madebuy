---
name: deployment-reviewer
---

# Deployment Reviewer

**Domain:** Comprehensive pre-deployment verification for Vercel/Next.js projects
**Type:** Active (runs commands)
**Version:** 3.0 - Enhanced error detection, env validation, bundle checks, Sentry integration

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

### 1. Environment Variable Validation (NEW)
```bash
echo "=== Environment Variable Validation ==="
# Check all apps have required vars from .env.example
for app in apps/admin apps/web; do
  if [ -f "$app/.env.example" ]; then
    echo "Checking $app..."
    missing=0
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      if ! grep -q "^${key}=" "$app/.env.local" 2>/dev/null && \
         ! grep -q "^${key}=" "$app/.env.production" 2>/dev/null; then
        echo "  MISSING: $key"
        missing=$((missing + 1))
      fi
    done < "$app/.env.example"
    [ $missing -eq 0 ] && echo "  ✓ All vars present"
  fi
done
```

### 2. Filesystem Operations in App Code (BREAKS ON VERCEL)
```bash
echo "=== Checking for dangerous fs operations ==="
# readFileSync/writeFileSync in app directory = WILL FAIL on Vercel
FS_ISSUES=$(grep -rn "readFileSync\|writeFileSync\|readFile\|writeFile" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app apps/*/components packages/*/src 2>/dev/null | \
  grep -v node_modules | grep -v ".d.ts")
if [ -n "$FS_ISSUES" ]; then
  echo "BLOCKER: Filesystem operations found:"
  echo "$FS_ISSUES"
else
  echo "✓ No dangerous fs operations"
fi

# fs.existsSync also fails on Vercel for non-public files
grep -rn "existsSync\|accessSync" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app apps/*/components 2>/dev/null | \
  grep -v node_modules || echo "✓ No existsSync in app code"
```

### 3. Hardcoded Absolute Paths (BREAKS ON VERCEL)
```bash
echo "=== Checking for hardcoded paths ==="
grep -rn "process.cwd()\|__dirname\|__filename" \
  --include="*.ts" --include="*.tsx" \
  apps/*/app 2>/dev/null | \
  grep -v node_modules || echo "✓ No hardcoded path references in app"

grep -rn '"/home/\|"/Users/\|"/var/\|"/tmp/' \
  --include="*.ts" --include="*.tsx" \
  apps/ packages/ 2>/dev/null | \
  grep -v node_modules || echo "✓ No absolute path strings"
```

### 4. Missing Page/Layout Exports (NEW)
```bash
echo "=== Page/Layout Export Check ==="
for file in $(find apps/ -name "page.tsx" -o -name "layout.tsx" 2>/dev/null); do
  if ! grep -q "export default" "$file"; then
    echo "BLOCKER: Missing default export: $file"
  fi
done
echo "✓ Page/layout export check complete"
```

### 5. Bundle Size Estimation (NEW)
```bash
echo "=== Bundle Size Check ==="
for app in apps/admin apps/web; do
  if [ -d "$app/.next" ]; then
    size=$(du -sm "$app/.next" 2>/dev/null | cut -f1)
    if [ "$size" -gt 45 ]; then
      echo "WARNING: $app bundle is ${size}MB (Vercel limit: 50MB)"
    else
      echo "✓ $app: ${size}MB"
    fi
  fi
done
```

### 6. Circular Dependency Detection (NEW)
```bash
echo "=== Circular Dependency Check ==="
if command -v npx &> /dev/null; then
  CIRCULAR=$(npx madge --circular apps/*/src apps/*/app packages/*/src 2>/dev/null | head -20)
  if [ -n "$CIRCULAR" ]; then
    echo "WARNING: Circular dependencies found:"
    echo "$CIRCULAR"
  else
    echo "✓ No circular dependencies (or madge not installed)"
  fi
fi
```

### 7. Server-Only Code in Client Components
```bash
echo "=== Checking for server code leaking to client ==="
for file in $(grep -rl "use client" apps/ --include="*.tsx" 2>/dev/null); do
  if grep -q "server-only\|@prisma/client\|mongodb\|mongoose" "$file" 2>/dev/null; then
    echo "BLOCKER: Server imports in client component: $file"
  fi
done
echo "✓ Server/client boundary check complete"
```

### 8. Dynamic Imports with Variables (BREAKS ON VERCEL)
```bash
echo "=== Checking for problematic dynamic imports ==="
grep -rn 'import(`\|require(`\|import(.*${|require(.*${' \
  --include="*.ts" --include="*.tsx" \
  apps/ packages/ 2>/dev/null | \
  grep -v node_modules || echo "✓ No variable dynamic imports"
```

---

## Standard Pre-Deployment Checks (Enhanced)

### 9. TypeScript Check (Enhanced)
```bash
echo "=== TypeScript Check ==="
TS_OUTPUT=$(pnpm tsc --noEmit 2>&1)
TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || echo "0")
if [ "$TS_ERRORS" -gt 0 ]; then
  echo "BLOCKER: $TS_ERRORS TypeScript errors found"
  echo "$TS_OUTPUT" | grep "error TS" | head -10
else
  echo "✓ PASS: No TypeScript errors"
fi
```

### 10. ESLint Check (Enhanced - Warnings Non-Blocking)
```bash
echo "=== ESLint Check ==="
LINT_OUTPUT=$(pnpm lint 2>&1)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c " error " || echo "0")
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -c " warning " || echo "0")
echo "Errors: $LINT_ERRORS, Warnings: $LINT_WARNINGS"
if [ "$LINT_ERRORS" -gt 0 ]; then
  echo "BLOCKER: ESLint errors found"
  echo "$LINT_OUTPUT" | grep " error " | head -10
else
  echo "✓ PASS (warnings are non-blocking)"
fi
```

### 11. Build Test (Enhanced)
```bash
echo "=== Build Test ==="
BUILD_OUTPUT=$(pnpm build 2>&1)
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "BLOCKER: BUILD FAILED"
  echo "$BUILD_OUTPUT" | grep -E "Error:|ENOENT|Module not found|Cannot find" | head -10
else
  echo "✓ BUILD PASSED"
fi
```

### 12. Security Audit
```bash
echo "=== Security Audit ==="
AUDIT_OUTPUT=$(pnpm audit --audit-level=high 2>&1)
if echo "$AUDIT_OUTPUT" | grep -q "high\|critical"; then
  echo "WARNING: Security vulnerabilities found"
  echo "$AUDIT_OUTPUT" | tail -20
else
  echo "✓ No high/critical vulnerabilities"
fi
```

---

## Next.js Specific Checks

### 13. Next.js Config Issues
```bash
echo "=== Next.js Config Check ==="
grep -n "experimental:" next.config.* apps/*/next.config.* 2>/dev/null | \
  head -10 || echo "✓ No experimental config"

if grep -q "output.*export" next.config.* apps/*/next.config.* 2>/dev/null; then
  if find apps/ -name "*.tsx" -path "*/app/*" | xargs grep -l "\[.*\]" 2>/dev/null | head -1; then
    echo "WARNING: Static export with dynamic routes - may fail"
  fi
fi
```

### 14. Image Optimization
```bash
echo "=== Image Check ==="
IMG_ISSUES=$(grep -rn "<img " --include="*.tsx" apps/ 2>/dev/null | grep -v "next/image" | head -5)
if [ -n "$IMG_ISSUES" ]; then
  echo "WARNING: Use next/image instead of <img>:"
  echo "$IMG_ISSUES"
else
  echo "✓ All images use next/image"
fi
```

### 15. API Route Issues
```bash
echo "=== API Route Check ==="
for file in $(find apps/ -path "*/api/*" -name "route.ts" 2>/dev/null); do
  if ! grep -q "export.*\(GET\|POST\|PUT\|DELETE\|PATCH\)" "$file"; then
    echo "WARNING: No HTTP method exports: $file"
  fi
done
echo "✓ API route check complete"
```

---

## Monorepo Specific Checks

### 16. Package Dependencies
```bash
echo "=== Dependency Check ==="
if [ -f "pnpm-workspace.yaml" ]; then
  pnpm ls --depth 0 2>&1 | grep -i "peer dep\|WARN" | head -10 || echo "✓ No dependency warnings"
fi
```

### 17. Function Size Check
```bash
echo "=== Function Size Check ==="
grep -l "puppeteer\|playwright\|sharp\|canvas\|pdf" package.json apps/*/package.json 2>/dev/null && \
  echo "WARNING: Heavy dependencies found - may exceed Vercel function size limits" || \
  echo "✓ No heavy dependencies"
```

---

## Post-Deployment Check (Sentry Integration)

### 18. Sentry Error Monitoring
```bash
echo "=== Post-Deploy Sentry Check ==="
echo "After deployment, use Sentry MCP to check for new errors:"
echo "  mcp__sentry__list_issues(project='madebuy', timeframe='1h')"
echo ""
echo "Or ask: 'Check Sentry for errors in the last hour'"
```

---

## Output Format

```markdown
## Deployment Readiness: MadeBuy
**Checked at:** [timestamp]
**Version:** deployment-reviewer v3.0

### BLOCKERS (Must Fix)
- [ ] [BLOCKER items - deployment will fail]

### CRITICAL (Vercel-Breaking)
- [x] Env vars: [PASS/MISSING: X, Y]
- [x] Filesystem ops: [PASS/FAIL - list files]
- [x] Hardcoded paths: [PASS/FAIL]
- [x] Page exports: [PASS/FAIL]
- [x] Bundle size: [PASS/WARNING: XMB]
- [x] Server/client boundary: [PASS/FAIL]

### STANDARD
- [x] TypeScript: [PASS/FAIL - X errors]
- [x] ESLint: [PASS - X warnings (non-blocking)]
- [x] Build: [PASS/FAIL]
- [x] Security: [PASS/X vulnerabilities]

### WARNINGS (Should Fix)
- [Non-blocking issues]

### Ready to Deploy: YES/NO
```

---

## Quick Command

Run all critical checks at once:
```bash
echo "🔍 Running pre-deployment checks v3.0..."

# Critical
for app in apps/admin apps/web; do
  [ -f "$app/.env.example" ] && echo "Checking env: $app"
done
grep -rn "readFileSync\|writeFileSync" --include="*.ts" --include="*.tsx" apps/ packages/ 2>/dev/null | grep -v node_modules | grep -v ".d.ts"
grep -rn "process.cwd()\|__dirname" --include="*.ts" --include="*.tsx" apps/*/app 2>/dev/null | grep -v node_modules

# Standard
pnpm tsc --noEmit
pnpm lint
pnpm build

echo "✅ Pre-deployment checks complete"
```
