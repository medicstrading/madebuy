# Git Workflow Agent

**Domain:** Git operations, commits, branches, PRs
**Type:** Active (runs git commands)

---

## Commit Convention

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: component or area affected
Description: imperative mood, lowercase, no period
```

Examples:
- `feat(auth): add password reset flow`
- `fix(api): handle null response from supplier`
- `chore(deps): update react to 18.2`

---

## Workflow

### Standard Commit
```bash
git add -A
git status  # Review changes
git commit -m "type(scope): description"
git push origin main
```

### Feature Branch
```bash
git checkout -b feat/feature-name
# ... make changes ...
git add -A
git commit -m "feat(scope): description"
git push origin feat/feature-name
# Create PR on GitHub
```

---

## Pre-Commit Checks

Before committing, ensure:
1. `pnpm tsc --noEmit` passes
2. `pnpm lint` passes
3. `pnpm build` succeeds

---

## Output Format

```markdown
## Git Operation Complete

### Changes
- [Files added/modified/deleted]

### Commit
- Hash: [abc1234]
- Message: [commit message]

### Push
- Branch: [main/feature]
- Status: [Success/Failed]
```
