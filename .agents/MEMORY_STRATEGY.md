# Memory Strategy

This document defines how the MadeBuy project uses MCP memory and context management.

## MCP Servers for Memory

### Context Management MCP

The context MCP server provides persistent memory across sessions.

**Available Operations:**
- `context_get_session_summary` - Retrieve summary of previous sessions
- `context_store_decision` - Store architectural or implementation decisions
- `context_search_knowledge` - Search stored knowledge and patterns
- `context_store_pattern` - Save reusable code/architecture patterns
- `context_store_error` - Log errors and their solutions
- `context_get_recent_errors` - Retrieve recent error patterns
- `context_get_recent_sessions` - Get recent session summaries

### Orchestration MCP

The orchestration MCP server handles agent coordination and feature management.

**Available Operations:**
- `orchestration_get_agent_assignment` - Determine which agent should handle a task
- `orchestration_get_ready_features` - Get features ready for implementation
- `orchestration_suggest_next_agent` - Get AI-suggested next agent
- `orchestration_check_completion` - Verify feature completion status
- `orchestration_get_blocked_features` - Find features blocked by dependencies
- `orchestration_report_stuck` - Report when stuck on a feature

---

## What to Store

### Store in Context:

**1. Architectural Decisions**
```
Decision: Use Stripe Connect for vendor payouts
Rationale: Simplifies compliance, handles international payments
Date: 2025-12-15
Files: apps/web/src/app/api/webhooks/stripe-connect/route.ts
```

**2. Patterns**
```
Pattern: Transaction ledger with MongoDB aggregation
Usage: Financial reporting, GST calculations
Location: packages/db/src/repositories/transactions.ts
```

**3. Errors & Solutions**
```
Error: Docker build failing - missing public directories
Solution: Create placeholder public/images dirs in both apps
Date: 2025-12-20
Commit: 75b8f99
```

**4. Integration Details**
```
Integration: Sendle Shipping API
Auth: API key in SENDLE_API_KEY
Endpoints: /api/shipping/quote, /api/shipping/label
Webhook: /api/webhooks/sendle
```

### Don't Store in Context:

- Temporary debugging notes
- Environment-specific configs (use .env)
- Secrets or API keys
- Code snippets (use architectural-memory.md instead)

---

## Usage Examples

### At Session Start

```
"use context to get session summary for today"
"use context to search knowledge about stripe integration"
```

### During Development

```
"use context to store decision: chose MongoDB over PostgreSQL for flexible product schemas"
"use context to store pattern: transaction processing with retry logic"
```

### When Blocked

```
"use orchestration to suggest next agent"
"use orchestration to check if feature is blocked by dependencies"
```

### At Session End

```
"use context to store error: docker build requires public directories"
"use context to get recent sessions for handoff notes"
```

---

## Integration with Beads

The context MCP complements (not replaces) Beads issue tracking:

| System | Purpose | When to Use |
|--------|---------|-------------|
| **Beads** | Task/issue tracking, work queue | Daily work items, bugs, features |
| **Context MCP** | Knowledge retention, decisions, patterns | Long-term memory, architectural choices |
| **architectural-memory.md** | Code patterns, tech debt | Reference documentation |

**Workflow:**
1. Use Beads for "what to work on"
2. Use Context MCP for "why we did it this way"
3. Use architectural-memory.md for "how to implement common patterns"

---

## Maintenance

### Weekly Review
- Archive old sessions
- Update architectural-memory.md with frequent patterns
- Clean up outdated decisions

### Monthly Audit
- Review stored patterns for relevance
- Update integration documentation
- Remove obsolete error logs

---

## Best Practices

1. **Be specific** - Include file paths, dates, commit hashes
2. **Include rationale** - Explain why, not just what
3. **Link to code** - Reference actual implementations
4. **Update on change** - Mark decisions as superseded when changed
5. **Use consistently** - Store after every significant decision or discovery
