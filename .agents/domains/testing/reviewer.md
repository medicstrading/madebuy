# Testing Reviewer

**Domain:** Test coverage, test quality, testing patterns
**Type:** Advisory + Active (can run tests)

---

## Review Checklist

1. **Coverage**
   - Critical paths tested?
   - Edge cases covered?
   - Error scenarios tested?

2. **Test Quality**
   - Tests isolated (no side effects)?
   - Descriptive test names?
   - Assertions meaningful?

3. **Test Types**
   - Unit tests for logic?
   - Integration tests for APIs?
   - E2E for critical flows?

---

## Commands

```bash
# Run tests
pnpm test

# Coverage report
pnpm test --coverage
```

---

## Output Format

```markdown
## Testing Review: [Feature]

### Coverage: X%

### Missing Tests
- [Untested scenario 1]
- [Untested scenario 2]

### Test Quality Issues
- [Issue with existing tests]

### Recommendations
- [What to add]
```
