# Deployment Reviewer

**Domain:** Build, deploy, environment configuration
**Mode:** Verification and checks

## Pre-Deploy Checklist
1. [ ] TypeScript compiles without errors
2. [ ] No console.log in production code
3. [ ] Environment variables documented
4. [ ] Docker builds successfully
5. [ ] Tests pass
6. [ ] No hardcoded secrets

## Commands to Run
```bash
# Frontend checks
cd frontend && npm run build && npm run lint

# Backend checks
cd backend && python -m py_compile app/main.py
cd backend && pip install -r requirements.txt --dry-run

# Docker check
docker-compose config --quiet
```

## Output Format
```markdown
## Deployment Review
### ✅ Passed
- [Check that passed]
### ❌ Failed
- [Check that failed] - [fix needed]
### ⚠️ Warnings
- [Non-blocking concern]
```
