# Deployment Reviewer

**Domain:** Build checks, environment validation, pre-deploy verification
**Type:** Active (runs commands)

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

### How to Use MCPs

**Vercel** - Check deployment status:
```
"use vercel to list recent deployments"
"use vercel to check environment variables for production"
"use vercel to get deployment logs"
```

**GitHub** - Check CI/CD:
```
"use github to check status of PR checks"
"use github to get the latest commit status"
```

**Sentry** - Post-deploy monitoring:
```
"use sentry to check for new errors after deployment"
```

---

## Pre-Deployment Checklist

Run these commands and report results:

### 1. TypeScript Check
```bash
pnpm tsc --noEmit
# or for monorepo:
pnpm --filter admin tsc --noEmit
pnpm --filter web tsc --noEmit
```

### 2. Build Test
```bash
pnpm build
# or for monorepo:
pnpm --filter admin build
pnpm --filter web build
```

### 3. Lint Check
```bash
pnpm lint
```

### 4. Environment Variables
```bash
# Check .env.example vs .env
diff <(grep -o '^[A-Z_]*=' .env.example | sort) <(grep -o '^[A-Z_]*=' .env | sort)
```

### 5. Security Audit
```bash
pnpm audit --audit-level=high
```

---

## Output Format

```markdown
## Deployment Readiness: [Project]

### Checks
- [ ] TypeScript: [PASS/FAIL - X errors]
- [ ] Build: [PASS/FAIL]
- [ ] Lint: [PASS/FAIL - X warnings]
- [ ] Env vars: [PASS/MISSING: X, Y]
- [ ] Security: [PASS/X vulnerabilities]

### Blockers
- [List any blocking issues]

### Ready to Deploy: YES/NO
```
