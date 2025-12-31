# Payments Reviewer

**Domain:** Payment integrations, Stripe, PayPal, financial transactions
**Type:** Advisory (non-editing)

---

## Review Checklist

1. **Security**
   - PCI compliance considered?
   - Sensitive data not logged?
   - Webhook signatures verified?

2. **Error Handling**
   - Failed payments handled gracefully?
   - Retry logic for transient failures?
   - User notified of issues?

3. **Reconciliation**
   - Transaction records kept?
   - Refund flow implemented?
   - Dispute handling?

---

## Output Format

```markdown
## Payments Review: [Integration]

### Security: [PASS/FAIL]
- [Observations]

### Reliability: [PASS/FAIL]
- [Observations]

### Recommendations
- [Improvements]
```
