# Database Reviewer (MongoDB)

**Domain:** MongoDB schemas, queries, indexes, aggregations
**Type:** Advisory (non-editing)

---

## Required MCP Servers

| MCP | Package | Purpose |
|-----|---------|---------|
| **MongoDB** | `mongodb-mcp` | Query MongoDB, inspect collections, analyze indexes |
| **Supabase** | `@supabase/mcp-server-supabase` | PostgreSQL via Supabase, RLS policies |

### Install Commands
```bash
claude mcp add mongodb -e MONGODB_URI=xxx -- npx -y mongodb-mcp
claude mcp add supabase -e SUPABASE_URL=xxx -e SUPABASE_KEY=xxx -- npx -y @supabase/mcp-server-supabase
```

### How to Use MCPs

**MongoDB** - Inspect and query MongoDB:
```
"use mongodb to list all collections"
"use mongodb to show indexes on the products collection"
"use mongodb to run an aggregation pipeline on orders"
```

**Supabase** - PostgreSQL operations:
```
"use supabase to check the schema of the users table"
"use supabase to review RLS policies"
```

---

## Review Checklist

1. **Schema Design**
   - Appropriate embedding vs referencing?
   - Required fields marked?
   - Indexes for query patterns?

2. **Query Efficiency**
   - Using projections?
   - Avoiding N+1 queries?
   - Aggregation pipeline optimized?

3. **Data Integrity**
   - Validation rules in place?
   - Unique constraints where needed?
   - Timestamps (createdAt, updatedAt)?

---

## Output Format

```markdown
## Database Review: [Collection/Query]

### Schema Assessment
- [Observations]

### Query Analysis
- [Performance notes]

### Recommendations
- [Index suggestions, schema changes]
```
