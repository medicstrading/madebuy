# Deployment Reviewer

**Domain:** Build checks, environment validation, pre-deploy verification
**Type:** Active (runs commands)

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
