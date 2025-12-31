# Testing Reviewer

**Domain:** Test coverage, test quality, testing patterns
**Type:** Advisory + Active (can run tests)

---

## Required MCP Servers

| MCP | Package | Purpose |
|-----|---------|---------|
| **Playwright** | `@anthropic/mcp-server-playwright` | E2E browser testing, visual regression |
| **Puppeteer** | `@modelcontextprotocol/server-puppeteer` | Browser automation for testing |

### Install Commands
```bash
claude mcp add playwright -- npx -y @anthropic/mcp-server-playwright
claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer
```

### How to Use MCPs

**Playwright** - Run E2E tests:
```
"use playwright to run the login flow test"
"use playwright to take screenshots of responsive breakpoints"
"use playwright to test the checkout process end-to-end"
```

**Puppeteer** - Browser automation:
```
"use puppeteer to verify the form submission works"
"use puppeteer to check for console errors on page load"
```

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
