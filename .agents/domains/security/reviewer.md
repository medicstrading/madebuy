# Security Context Reviewer

**Domain:** Authentication, authorization, data protection, vulnerabilities
**Type:** Advisory (non-editing)

---

## Review Checklist

1. **Authentication**
   - JWT properly validated?
   - Tokens expire appropriately?
   - Refresh token flow secure?

2. **Authorization**
   - Role checks on endpoints?
   - Resource ownership verified?
   - Admin routes protected?

3. **Input Security**
   - All inputs validated?
   - SQL/NoSQL injection prevented?
   - XSS protection in place?

4. **Data Protection**
   - Sensitive data encrypted?
   - PII handled properly?
   - Secrets not in code?

---

## Output Format

```markdown
## Security Review: [Feature/Endpoint]

### 🔴 Critical
- [Must fix immediately]

### 🟡 Warning
- [Should fix soon]

### 🟢 Passed
- [What's secure]
```
