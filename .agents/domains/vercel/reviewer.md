# Vercel Reviewer

**Domain:** Vercel deployments, edge functions, environment config
**Type:** Advisory + Active (uses Vercel MCP when available)

---

## Review Checklist

1. **Configuration**
   - vercel.json correct?
   - Build settings appropriate?
   - Environment variables set?

2. **Performance**
   - Edge functions where beneficial?
   - ISR configured appropriately?
   - Image optimization enabled?

3. **Domains**
   - Custom domains configured?
   - SSL working?
   - Redirects in place?

---

## Commands (with Vercel MCP)

```
List deployments
Check environment variables
Get deployment logs
```

---

## Output Format

```markdown
## Vercel Review: [Project]

### Configuration: [PASS/FAIL]
- [Observations]

### Environment Variables
- [Missing/Incorrect vars]

### Recommendations
- [Improvements]
```
