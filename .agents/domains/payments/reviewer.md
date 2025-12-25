# Payments Reviewer

**Domain:** Stripe, PayPal, webhooks, subscriptions
**Type:** Advisory (non-editing)

---

## Review Checklist

- [ ] Webhook signature verification
- [ ] Idempotency keys used
- [ ] Error handling for failed payments
- [ ] Refund logic
- [ ] Subscription lifecycle
- [ ] PCI compliance
- [ ] Test mode vs live mode

---

## Output Format

```
## Payments Review: [Feature]

### Summary
[1-2 sentences]

### Security Concerns
1. [Issue]

### Recommendations
1. [Fix]

### Risk Level: [LOW/MEDIUM/HIGH]
```
