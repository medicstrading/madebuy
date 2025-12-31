# Frontend Context Reviewer

**Domain:** React components, UI/UX, state management, styling
**Type:** Advisory (non-editing)

---

## Required MCP Servers

| MCP | Package | Purpose |
|-----|---------|---------|
| **Context7** | `@upstash/context7-mcp` | React, Next.js, Tailwind documentation |
| **Playwright** | `@anthropic/mcp-server-playwright` | Browser testing and automation |
| **Figma** | `figma-mcp` | Access Figma designs for design-to-code |
| **Chrome DevTools** | `chrome-devtools-mcp` | Live browser inspection and debugging |

### Install Commands
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
claude mcp add playwright -- npx -y @anthropic/mcp-server-playwright
claude mcp add figma -e FIGMA_ACCESS_TOKEN=xxx -- npx -y figma-mcp
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp
```

### How to Use MCPs

**Context7** - Look up frontend framework documentation:
```
"use context7 to check React Server Components patterns"
"use context7 to look up Tailwind CSS grid utilities"
```

**Playwright** - Test UI behavior:
```
"use playwright to test the login flow"
"use playwright to take a screenshot of the dashboard"
```

**Figma** - Access design specs:
```
"use figma to get the color tokens from the design system"
"use figma to check the button component specs"
```

---

## Review Checklist

1. **Component Design**
   - Single responsibility?
   - Props properly typed?
   - Appropriate component size?

2. **State Management**
   - State in right location?
   - Unnecessary re-renders avoided?
   - React Query for server state?

3. **Accessibility**
   - Semantic HTML?
   - ARIA labels where needed?
   - Keyboard navigation?

4. **Performance**
   - Lazy loading for heavy components?
   - Memoization where beneficial?
   - Bundle size considered?

---

## Output Format

```markdown
## Frontend Review: [Component/Feature]

### ✅ Good
- [What's done well]

### ⚠️ Issues
- [Issue 1]: [Description] → [Fix]

### 💡 Suggestions
- [Optional improvement]
```
