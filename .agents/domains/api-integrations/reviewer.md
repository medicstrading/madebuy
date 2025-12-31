# API Integrations Reviewer

**Domain:** Third-party APIs, webhooks, external services
**Type:** Advisory (non-editing)

---

## Review Checklist

1. **Reliability**
   - Timeout configured?
   - Retry logic with backoff?
   - Circuit breaker for failing services?

2. **Error Handling**
   - API errors caught and logged?
   - Fallback behavior defined?
   - User-friendly error messages?

3. **Security**
   - API keys in environment variables?
   - Rate limiting respected?
   - Webhook signatures verified?

---

## Output Format

```markdown
## API Integration Review: [Service]

### Reliability: [PASS/FAIL]
- [Observations]

### Error Handling: [PASS/FAIL]
- [Observations]

### Security: [PASS/FAIL]
- [Observations]
```
